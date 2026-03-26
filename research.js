require('dotenv').config();
const axios = require('axios');

// ── Tavily search (free: 1,000 credits/month, no credit card) ──────
// Sign up at: https://app.tavily.com → get key starting with tvly-
async function search(query, depth = 'basic') {
  if (!process.env.TAVILY_API_KEY) {
    console.warn('[Research] No TAVILY_API_KEY — skipping research, agents will run on general knowledge');
    return `No live research available. Proceed with general knowledge about Indian edtech trends and AI education.`;
  }

  try {
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: depth,        // 'basic' = 1 credit | 'advanced' = 2 credits
      max_results: 5,
      include_answer: true,       // Tavily summarises results into one answer — perfect for agents
      include_raw_content: false
    }, { timeout: 15000 });

    // Return the AI-summarised answer + top sources
    const answer = res.data.answer || '';
    const sources = (res.data.results || []).map(r => `• ${r.title}: ${r.content?.slice(0, 200)}`).join('\n');
    return `${answer}\n\nSources:\n${sources}`;
  } catch (err) {
    console.error('[Research] Tavily error:', err.response?.data?.message || err.message);
    return `Research unavailable this run. Proceed with general knowledge.`;
  }
}

// ── Weekly research — runs every Monday before agents start ───────
// 5 queries × 1 credit each = 5 credits per week = ~20/month (well within 1,000 free)
async function fetchWeeklyResearch() {
  console.log('[Research] Fetching weekly trends via Tavily...');

  const queries = {
    trending_topics:
      'What are Indian parents talking about regarding AI education and their children\'s future in 2025? Latest trends and anxieties.',

    competitor_content:
      'What content are Vedantu, Physics Wallah, WhiteHatJr posting on Instagram and YouTube this week? What hooks are working for Indian edtech?',

    viral_hooks:
      'Most viral Instagram Reels and YouTube Shorts hooks in Indian education and parenting content this week',

    youtube_trending:
      'Trending YouTube searches India 2025: AI for kids, coding alternatives, future skills children, AI education',

    meta_ad_trends:
      'Best performing Facebook Instagram ad formats for online education kids India 2025. What creative angles get most leads?'
  };

  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    console.log(`[Research] → ${key}`);
    results[key] = await search(query);
    await sleep(1500);
  }

  console.log('[Research] Weekly research complete — 5 credits used');
  return results;
}

// ── Daily research — single query, 1 credit ───────────────────────
async function fetchDailyTrend() {
  return await search(
    'What is trending on Instagram India today in education, parenting, and AI? What fear or inspiration topics are going viral?'
  );
}

// ── Lead research — used when a new lead comes in ────────────────
async function fetchLeadResearch(childClass) {
  return await search(
    `What are Indian parents of Class ${childClass} students most worried about in 2025 regarding their child's future career and education?`
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { search, fetchWeeklyResearch, fetchDailyTrend, fetchLeadResearch };
