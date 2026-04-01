require('dotenv').config();
const runner = require('./runner');
const instagram = require('./instagram');
const groq = require('./groq');

const META_PAGE_ID = process.env.META_PAGE_ID;

async function generateAndPostReel() {
  console.log('[AutoPost] Generating reel content...');
  
  try {
    // Get recent posts to avoid repetition
    const recentPosts = await instagram.getRecentPosts(5);
    const recentTopics = recentPosts.map(p => p.caption?.slice(0, 50) || '').join(', ');

    // Generate content using Groq
    const prompt = `
Generate a viral Instagram Reel script for WiseTribes (AI education for Indian kids).

Recent posts were about: ${recentTopics || 'general AI education'}

Create a NEW, DIFFERENT hook and script about AI education for Indian Class 5-10 parents.

Format as JSON:
{
  "hook": "3-second hook line (bold statement or question)",
  "script": "Full 60-second script in Hinglish",
  "caption": "Instagram caption with hashtags",
  "pillars": ["Awareness" or "Education" or "Proof" or "Empowerment"]
}

Make it engaging, different from recent content, and suitable for Indian parents.
`;

    const result = await groq.complete({
      model: 'llama-3.3-70b-versatile',
      system: 'You are a viral content creator for Indian edtech. Always respond with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.8
    });

    // Parse JSON - strip markdown fences if present
    let cleanContent = result.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const content = JSON.parse(cleanContent);
    console.log('[AutoPost] Generated content:', content.hook);

    // For now, log the content - image/video upload requires actual media
    console.log('\n📱 Generated Reel Content:');
    console.log('─'.repeat(40));
    console.log('HOOK:', content.hook);
    console.log('\nSCRIPT:', content.script);
    console.log('\nCAPTION:', content.caption);
    console.log('─'.repeat(40));

    return {
      success: true,
      content,
      message: 'Content generated. Ready for posting (requires media file).'
    };

  } catch (err) {
    console.error('[AutoPost] Error:', err.message);
    return { success: false, error: err.message };
  }
}

async function generateWeeklyContentPackage() {
  console.log('[AutoPost] Generating weekly content package...');
  
  try {
    const prompt = `
Generate a complete WEEKLY content package for WiseTribes Instagram.

BRAND: WiseTribes - AI education for Indian Class 5-10 students
AUDIENCE: Indian parents, 25-45 years

Generate for this week:
1. 2 Reel scripts (viral hooks)
2. 1 Carousel concept (5-7 slides)
3. 7 Story ideas (one for each day)
4. 1 YouTube Short script

Format as JSON with all content in Hinglish.
`;

    const result = await groq.complete({
      model: 'llama-3.3-70b-versatile',
      system: 'You are a content strategist for Indian edtech. Always respond with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7
    });

    // Parse JSON - strip markdown fences if present
    let cleanPackage = result.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const package = JSON.parse(cleanPackage);
    console.log('[AutoPost] Weekly package generated!');

    return { success: true, package };

  } catch (err) {
    console.error('[AutoPost] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  generateAndPostReel,
  generateWeeklyContentPackage
};
