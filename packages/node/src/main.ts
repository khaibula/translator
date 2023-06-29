import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import {Configuration, OpenAIApi} from "openai";

const generateAudioPath = () => {
  let addNumCount = 0;
  let readNumCount = 0;
  let deleteNumCount = 0;

  return {
    addFile: () => `audio_part_${++addNumCount}.mp3`,
    deleteFile: () => `audio_part_${++deleteNumCount}.mp3`,
    readFile: () => `audio_part_${++readNumCount}.mp3`,
  }
}

const { addFile, deleteFile, readFile } = generateAudioPath();


function videoToAudioChunks(videoPath, outputDir, chunkSizeMB = 4) {
  return new Promise((resolve, reject) => {
    const chunkSize = chunkSizeMB * 1024 * 1024;  // convert MB to bytes
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
            audioChunksToText(readFile());
          }
          writeStream = fs.createWriteStream(path.join(outputDir, addFile()));
          byteCount = 0;
        }

        writeStream.write(chunk);
        byteCount += chunk.length;
      })
      .on('end', () => {
        if (writeStream) {
          writeStream.end();
          audioChunksToText(readFile());
        }
      });
  });
}

async function audioChunksToText(filePath: string) {
  try {
    const configuration = new Configuration({
      organization: "org-wifCiRmsXjUtw09PqWxLVuhH",
      apiKey: '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',
    });

    const fileUrl = path.resolve(`./output/${filePath}`);
    const openai = new OpenAIApi(configuration);
    const response = await openai.createTranscription(
      fs.createReadStream(fileUrl) as any,
      "whisper-1",
      undefined,
      'text',
      undefined,
      'ru',
    );

    fs.unlink(`./output/${deleteFile()}`, (error) => {
      if (error) {
        console.error('Error deleting file:', error);
      } else {
        console.log('File deleted successfully');
      }
    });

    fs.appendFile(path.resolve('./assets/result.text'), response.data as any as string, (error) => {
      if (error) {
        console.error('Error appending to file:', error);
      } else {
        console.log('Text appended to file successfully');
      }
    });
  } catch (e) {
    console.log('Error is ', e);
  }
}

videoToAudioChunks(path.resolve('./assets/index.mp4'), path.resolve('./output'))
  .catch(console.error);
