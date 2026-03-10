const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'hypnio-audio';

// Upload a local audio file to S3
async function uploadAudio(localFilePath, s3Key) {
  const fileBuffer = fs.readFileSync(localFilePath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg',
  }));
  return `https://${BUCKET}.s3.amazonaws.com/${s3Key}`;
}

// Generate a signed URL for temporary access (24 hours)
async function getSignedAudioUrl(s3Key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return await getSignedUrl(s3, command, { expiresIn: 86400 });
}

module.exports = { uploadAudio, getSignedAudioUrl };
