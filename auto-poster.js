require('dotenv').config();
const groq = require('./groq');
const heygen = require('./heygen');
const instagram = require('./instagram');

async function createAndPostReel() {
  console.log('[AutoPoster] Starting full pipeline...');

  try {
    // Step 1: Generate content
    console.log('[1/4] Generating reel script...');
    const scriptResult = await generateReelScript();
    if (!scriptResult.success) throw new Error(scriptResult.error);
    
    const { hook, script, caption } = scriptResult.content;
    console.log('[✓] Script generated:', hook);

    // Step 2: Create HeyGen video
    console.log('[2/4] Creating AI avatar video...');
    const videoResult = await heygen.generateFromScript(script, 'WiseTribes Reel');
    if (!videoResult.success) throw new Error(videoResult.error);
    
    console.log('[✓] Video created:', videoResult.videoUrl);

    // Step 3: Post to Instagram
    console.log('[3/4] Posting to Instagram...');
    const postResult = await instagram.postToInstagram({
      videoUrl: videoResult.videoUrl,
      caption: caption
    });
    
    console.log('[✓] Posted to Instagram!');

    return {
      success: true,
      hook,
      videoUrl: videoResult.videoUrl,
      postUrl: postResult.url,
      caption
    };

  } catch (err) {
    console.error('[AutoPoster] Error:', err.message);
    return { success: false, error: err.message };
  }
}

async function generateReelScript() {
  const prompt = `
Generate a viral Instagram Reel script for WiseTribes (AI education for Indian kids, Class 5-10).

Output ONLY valid JSON like this:
{
  "hook": "3-second hook line - bold question or statement",
  "script": "Full 45-60 second script in Hindi-English (Hinglish), conversational tone",
  "caption": "Instagram caption with 3-5 relevant hashtags"
}

Rules:
- Hook must stop the scroll in 3 seconds
- Script should be 45-60 seconds when spoken
- Use conversational Hinglish
- Make parents feel understood first, then educate
- No fear-mongering, be calm and informative
- Include CTA at the end for free assessment
`;

  try {
    const result = await groq.complete({
      model: 'llama-3.3-70b-versatile',
      system: 'You are a viral content creator. Always respond with ONLY valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.8
    });

    let clean = result.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const content = JSON.parse(clean);
    return { success: true, content };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function generateWeeklyPackage() {
  console.log('[AutoPoster] Generating weekly content package...');

  const prompt = `
Generate a WEEKLY content package for WiseTribes Instagram.

Output ONLY valid JSON:
{
  "reels": [
    {
      "day": "Monday",
      "hook": "hook line",
      "script": "45-60 sec script",
      "caption": "caption with hashtags",
      "pillar": "Awareness/Education/Proof/Empowerment"
    }
  ],
  "carousels": [
    {
      "day": "Thursday",
      "topic": "carousel topic",
      "slides": ["slide 1", "slide 2", "slide 3"],
      "caption": "caption"
    }
  ],
  "stories": [
    {"day": "Monday", "type": "poll", "question": "poll question"},
    {"day": "Tuesday", "type": "quiz", "question": "quiz question"}
  ]
}
`;

  try {
    const result = await groq.complete({
      model: 'llama-3.3-70b-versatile',
      system: 'You are a content strategist. Always respond with ONLY valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7
    });

    let clean = result.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const content = JSON.parse(clean);
    return { success: true, content };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  createAndPostReel,
  generateReelScript,
  generateWeeklyPackage
};
