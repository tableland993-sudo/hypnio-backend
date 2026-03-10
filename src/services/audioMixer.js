const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Soundscape files — stored locally or fetched from S3
// For MVP, we bundle a small set of high-quality free soundscapes
const SOUNDSCAPE_URLS = {
  rain:   'https://hypnio-audio.s3.amazonaws.com/soundscapes/rain_8min.mp3',
  ocean:  'https://hypnio-audio.s3.amazonaws.com/soundscapes/ocean_8min.mp3',
  forest: 'https://hypnio-audio.s3.amazonaws.com/soundscapes/forest_8min.mp3',
  silence: null,
};

/**
 * Mix narration + soundscape into a single MP3
 * narrationPath: local path to narration .mp3
 * soundscape: 'rain' | 'ocean' | 'forest' | 'silence'
 * outputPath: where to save the final mix
 */
async function mixAudio(narrationPath, soundscapePath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!soundscapePath) {
      // No soundscape — just copy narration as output
      fs.copyFileSync(narrationPath, outputPath);
      return resolve(outputPath);
    }

    ffmpeg()
      .input(narrationPath)
      .input(soundscapePath)
      .complexFilter([
        // Narration at full volume, soundscape at 30% (-10dB)
        '[0:a]volume=1.0[narration]',
        '[1:a]volume=0.3[soundscape]',
        '[narration][soundscape]amix=inputs=2:duration=longest[out]'
      ])
      .outputOptions(['-map [out]', '-codec:a libmp3lame', '-b:a 128k'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

/**
 * Mix music + soundscape (no voice) for "music mode" users
 */
async function mixMusicAndSoundscape(musicPath, soundscapePath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(musicPath)
      .input(soundscapePath)
      .complexFilter([
        '[0:a]volume=0.7[music]',
        '[1:a]volume=0.5[soundscape]',
        '[music][soundscape]amix=inputs=2:duration=longest[out]'
      ])
      .outputOptions(['-map [out]', '-codec:a libmp3lame', '-b:a 128k'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

module.exports = { mixAudio, mixMusicAndSoundscape, SOUNDSCAPE_URLS };
