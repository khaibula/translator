import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

function videoToAudioChunks(videoPath, outputDir, chunkSizeMB = 4) {
  return new Promise((resolve, reject) => {
    const chunkSize = chunkSizeMB * 1024 * 1024;  // convert MB to bytes
    let partNum = 0;
    let byteCount = 0;
    let writeStream;

    ffmpeg(videoPath)
      .audioBitrate(128)  // reduce audio quality to shrink file size
      .format('mp3')
      .on('error', reject)
      .on('end', resolve)
      .stream()
      .on('data', chunk => {
        if (!writeStream || byteCount + chunk.length > chunkSize) {
          // Start a new file
          if (writeStream) {
            writeStream.end();
          }
          writeStream = fs.createWriteStream(path.join(outputDir, `audio_part_${++partNum}.mp3`));
          byteCount = 0;
        }

        writeStream.write(chunk);
        byteCount += chunk.length;
      })
      .on('end', () => {
        if (writeStream) {
          writeStream.end();
        }
      });
  });
}

videoToAudioChunks('./index.mp4', './output')
  .then((res) => {
    console.log('res', res)
  })
  .catch(console.error);
