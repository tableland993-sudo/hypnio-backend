const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');

const { requireAuth, requireSubscription, supabase } = require('../middleware/auth');
const { generateScript } = require('../services/scriptGenerator');
const { generateNarration } = require('../services/elevenlabs');
const { mixAudio } = require('../services/audioMixer');
const { uploadAudio, getSignedAudioUrl } = require('../services/s3');

/**
 * GET /audio/library
 * Returns the user's personalised audio — fetched from pre-generated library
 * or generates fresh if not yet created for this combination
 */
router.get('/library', requireAuth, requireSubscription, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('sleep_blocker, audio_mode, voice_preference')
      .eq('id', req.user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Check if pre-generated audio exists for this combo
    const audioKey = `library/${profile.sleep_blocker}_${profile.audio_mode}_${profile.voice_preference}.mp3`;
    const signedUrl = await getSignedAudioUrl(audioKey);

    return res.json({
      url: signedUrl,
      mode: profile.audio_mode,
      expires_in: 86400,
    });
  } catch (err) {
    console.error('Audio library error:', err.message);
    res.status(500).json({ error: 'Could not fetch audio' });
  }
});

/**
 * POST /audio/generate
 * Generates a fresh personalised audio for the user on demand
 * (Used after free trial to ensure freshness — throttled to 1/day)
 */
router.post('/generate', requireAuth, requireSubscription, async (req, res) => {
  const { sleep_blocker, voice_preference, soundscape, audio_mode } = req.body;

  if (!sleep_blocker || !voice_preference || !soundscape) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypnio-'));
  const narrationPath = path.join(tmpDir, 'narration.mp3');
  const finalPath = path.join(tmpDir, 'final.mp3');

  try {
    // 1. Generate script
    const script = generateScript(sleep_blocker, voice_preference);

    // 2. Generate voice narration via ElevenLabs
    await generateNarration(script, voice_preference, narrationPath);

    // 3. For now skip soundscape mixing (no S3 soundscapes yet)
    // TODO: fetch soundscape from S3 and mix when AWS is connected
    fs.copyFileSync(narrationPath, finalPath);

    // 4. Upload to S3 under user's folder
    const s3Key = `users/${req.user.id}/${Date.now()}.mp3`;
    const audioUrl = await uploadAudio(finalPath, s3Key);

    // 5. Save record to Supabase
    await supabase.from('audio_generations').insert({
      user_id: req.user.id,
      s3_key: s3Key,
      sleep_blocker,
      voice_preference,
      soundscape,
      audio_mode,
    });

    res.json({ url: audioUrl, s3_key: s3Key });
  } catch (err) {
    console.error('Audio generation error:', err.message);
    res.status(500).json({ error: 'Audio generation failed' });
  } finally {
    // Clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

module.exports = router;
