/**
 * Hypnio Pipeline Test
 * Tests: ElevenLabs TTS → MP3 file → S3 upload → signed URL
 * Run: node scripts/testPipeline.js
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.AWS_BUCKET_NAME || 'hypnio-audio';

// Short test script (keeps API costs minimal)
const TEST_SCRIPT = `Close your eyes and take a slow, deep breath in. Hold it gently... and release. Feel your body becoming heavy and still. You are safe. You are resting. Let sleep find you.`;

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah — calm female

async function testElevenLabs() {
  console.log('\n1. Testing ElevenLabs TTS...');

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text: TEST_SCRIPT,
      model_id: 'eleven_turbo_v2',
      voice_settings: { stability: 0.75, similarity_boost: 0.75 }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`ElevenLabs error ${res.statusCode}: ${err}`)));
        return;
      }

      const tmpPath = path.join(os.tmpdir(), `hypnio-test-${Date.now()}.mp3`);
      const file = fs.createWriteStream(tmpPath);
      res.pipe(file);
      file.on('finish', () => {
        const size = fs.statSync(tmpPath).size;
        console.log(`   ✅ Audio generated: ${(size/1024).toFixed(1)}KB saved to temp`);
        resolve(tmpPath);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testS3Upload(localPath) {
  console.log('\n2. Testing AWS S3 upload...');

  // Use the AWS SDK that's already installed
  const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    }
  });

  const s3Key = `test/pipeline-test-${Date.now()}.mp3`;
  const fileBuffer = fs.readFileSync(localPath);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg',
  }));

  console.log(`   ✅ Uploaded to s3://${BUCKET}/${s3Key}`);

  // Generate signed URL
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 3600 });
  console.log(`   ✅ Signed URL generated (valid 1hr):`);
  console.log(`   ${url.substring(0, 80)}...`);

  return url;
}

async function run() {
  console.log('🎵 Hypnio Pipeline Test');
  console.log('=======================');
  console.log(`ElevenLabs key: ${ELEVENLABS_API_KEY ? '✅ present' : '❌ missing'}`);
  console.log(`AWS key:        ${AWS_ACCESS_KEY_ID ? '✅ present' : '❌ missing'}`);
  console.log(`S3 bucket:      ${BUCKET}`);

  try {
    const audioPath = await testElevenLabs();
    const signedUrl = await testS3Upload(audioPath);
    fs.unlinkSync(audioPath);

    console.log('\n✅ PIPELINE TEST PASSED');
    console.log('ElevenLabs → S3 → Signed URL: all working');
    console.log('\nReady to run full audio library generation.');
  } catch (err) {
    console.error('\n❌ PIPELINE TEST FAILED:', err.message);
    process.exit(1);
  }
}

run();
