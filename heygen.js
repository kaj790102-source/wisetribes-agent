require('dotenv').config();
const axios = require('axios');

const HEYGEN_KEY = process.env.HEYGEN_API_KEY;
const AVATAR_ID = process.env.HEYGEN_AVATAR_ID || 'Abigail_expressive_2024112501';

async function generateVideo(script, options = {}) {
  const {
    title = 'WiseTribes Video',
    duration = 60
  } = options;

  console.log('[HeyGen] Generating video...');

  try {
    // Create video task
    const response = await axios.post(
      'https://api.heygen.com/v1/video/generate',
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: AVATAR_ID,
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: script,
              voice_id: '2d5b4e85ed5141cf9e675c6e3c4c0eaa' // Indian English voice
            },
            background: {
              type: 'color',
              value: '#050d1f'
            }
          }
        ],
        dimension: {
          width: 1080,
          height: 1920
        },
        aspect_ratio: '9:16',
        resolution = '720p'
      },
      {
        headers: {
          'Authorization': 'Bearer ' + HEYGEN_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const videoId = response.data.data.video_id;
    console.log('[HeyGen] Video started! ID:', videoId);

    // Poll for completion
    const videoUrl = await pollForVideo(videoId);

    console.log('[HeyGen] Video ready:', videoUrl);
    return { success: true, videoId, videoUrl };

  } catch (err) {
    console.error('[HeyGen] Error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

async function pollForVideo(videoId, maxAttempts = 60) {
  console.log('[HeyGen] Polling for video...');

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    try {
      const status = await axios.get(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        {
          headers: { 'Authorization': 'Bearer ' + HEYGEN_KEY }
        }
      );

      const data = status.data.data;
      console.log(`[HeyGen] Status: ${data.status}`);

      if (data.status === 'completed') {
        return data.video_url;
      } else if (data.status === 'failed') {
        throw new Error('Video generation failed');
      }
    } catch (err) {
      console.error('[HeyGen] Poll error:', err.message);
    }
  }

  throw new Error('Video timeout');
}

async function generateFromScript(scriptContent, title) {
  // Extract the script for HeyGen
  const heyenScript = scriptContent
    .replace(/\*\*/g, '')
    .replace(/#/g, '')
    .trim()
    .slice(0, 500); // Limit for HeyGen

  return await generateVideo(heyenScript, { title });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateVideo,
  generateFromScript
};
