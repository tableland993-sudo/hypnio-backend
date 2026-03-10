const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for each preference (ElevenLabs built-in voices)
const VOICES = {
  calm_female: 'EXAVITQu4vr4xnSDxMaL',  // Sarah — calm, warm
  calm_male:   'TX3LPaxmHKxFdv7VOQHJ',  // Liam — deep, soothing
  whisper:     'XrExE9yKIg1WjnnlVkGX',  // Matilda — soft whisper
};

// Generate a narration audio file using ElevenLabs TTS
async function generateNarration(script, voicePreference, outputPath) {
  const voiceId = VOICES[voicePreference] || VOICES.calm_female;

  const response = await axios({
    method: 'POST',
    url: `${API_URL}/text-to-speech/${voiceId}`,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    data: {
      text: script,
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: false,
      },
    },
    responseType: 'arraybuffer',
  });

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

// Get available voices (useful for testing)
async function listVoices() {
  const response = await axios.get(`${API_URL}/voices`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  return response.data.voices;
}

module.exports = { generateNarration, listVoices, VOICES };
