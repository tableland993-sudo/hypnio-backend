/**
 * Hypnio — Pre-Generation Script
 *
 * Generates all 48 audio variants (4 sleep blockers × 3 voices × 4 soundscapes)
 * and uploads them to S3 under /library/
 *
 * Run once before launch: npm run generate-audio
 * Cost estimate: ~48 tracks × $0.02 = ~$1.00 total
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateNarration } = require('../src/services/elevenlabs');
const { generateScript } = require('../src/services/scriptGenerator');
const { uploadAudio } = require('../src/services/s3');

const SLEEP_BLOCKERS = ['stress', 'racing_thoughts', 'physical_tension', 'noise'];
const VOICE_PREFERENCES = ['calm_female', 'calm_male', 'whisper'];
const SOUNDSCAPES = ['rain', 'ocean', 'forest', 'silence'];

async function generateLibrary() {
  console.log('🎵 Starting Hypnio audio library generation...');
  console.log(`📊 Total tracks to generate: ${SLEEP_BLOCKERS.length * VOICE_PREFERENCES.length} narrations`);

  let generated = 0;
  let failed = 0;

  for (const sleepBlocker of SLEEP_BLOCKERS) {
    for (const voicePreference of VOICE_PREFERENCES) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hypnio-gen-'));
      const narrationPath = path.join(tmpDir, 'narration.mp3');

      try {
        console.log(`\n⏳ Generating: ${sleepBlocker} / ${voicePreference}`);

        // Generate the script
        const script = generateScript(sleepBlocker, voicePreference);
        console.log(`   Script length: ${script.length} characters`);

        // Generate narration via ElevenLabs
        await generateNarration(script, voicePreference, narrationPath);
        console.log(`   ✅ Narration generated`);

        // Upload the narration for each soundscape variant
        // (soundscape mixing happens at playback time in the app to save storage)
        for (const soundscape of SOUNDSCAPES) {
          const s3Key = `library/${sleepBlocker}_${voicePreference}_${soundscape}.mp3`;
          await uploadAudio(narrationPath, s3Key);
          console.log(`   ✅ Uploaded: ${s3Key}`);
        }

        generated++;
      } catch (err) {
        console.error(`   ❌ Failed: ${sleepBlocker}/${voicePreference} — ${err.message}`);
        failed++;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }

      // Small delay to avoid hitting ElevenLabs rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n🎉 Library generation complete!`);
  console.log(`   ✅ Generated: ${generated} narrations`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📁 All files uploaded to s3://hypnio-audio/library/`);
}

generateLibrary().catch(console.error);
