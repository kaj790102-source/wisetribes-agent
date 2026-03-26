require('dotenv').config();
const axios = require('axios');

const HEYGEN_BASE = 'https://api.heygen.com';

async function submitVideo(heygenBrief) {
  if (!process.env.HEYGEN_API_KEY) {
    console.warn('[HeyGen] No API key — skipping video generation');
    return { id: 'mock_video_id', status: 'skipped' };
  }

  // Build HeyGen video generation payload
  const scenes = heygenBrief.scenes.map(scene => ({
    voice_settings: {
      type: 'text',
      input_text: scene.script,
      voice_id: 'en-US-Neural2-F', // update with your preferred voice
      speed: 1.0
    },
    avatar_settings: {
      avatar_id: process.env.HEYGEN_AVATAR_ID || 'default',
      scale: 1.0,
      background: getBackground(heygenBrief.background)
    },
    duration: getDuration(scene.start_time, scene.end_time)
  }));

  try {
    const res = await axios.post(`${HEYGEN_BASE}/v2/video/generate`, {
      video_inputs: scenes,
      dimension: { width: 1080, height: 1920 }, // 9:16 for Reels/Shorts
      caption: true
    }, {
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[HeyGen] Video submitted — ID: ${res.data.data.video_id}`);
    return { id: res.data.data.video_id, status: 'processing' };
  } catch (err) {
    console.error('[HeyGen] Submit error:', err.response?.data || err.message);
    return { id: null, status: 'error', error: err.message };
  }
}

async function pollVideoStatus(videoId) {
  if (!process.env.HEYGEN_API_KEY || videoId === 'mock_video_id') {
    return { status: 'skipped', url: null };
  }

  try {
    const res = await axios.get(`${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
    });

    const { status, video_url } = res.data.data;
    return { status, url: video_url };
  } catch (err) {
    console.error('[HeyGen] Poll error:', err.message);
    return { status: 'error', url: null };
  }
}

// Poll until video is ready — max 10 minutes
async function waitForVideo(videoId, maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await pollVideoStatus(videoId);
    if (result.status === 'completed' || result.status === 'skipped') return result;
    if (result.status === 'failed' || result.status === 'error') return result;
    console.log(`[HeyGen] Waiting for video ${videoId}... status: ${result.status}`);
    await sleep(30000); // poll every 30 seconds
  }
  return { status: 'timeout', url: null };
}

function getBackground(type) {
  const backgrounds = {
    classroom: { type: 'image', url: 'https://files.heygen.ai/bg/classroom.jpg' },
    white: { type: 'color', value: '#FFFFFF' },
    dark_tech: { type: 'color', value: '#0A0A1A' }
  };
  return backgrounds[type] || backgrounds.white;
}

function getDuration(start, end) {
  // Parse "0:08" → seconds
  const toSec = t => {
    const [m, s] = t.split(':').map(Number);
    return m * 60 + s;
  };
  return toSec(end) - toSec(start);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { submitVideo, waitForVideo };
