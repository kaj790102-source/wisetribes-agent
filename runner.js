require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const groq = require('./groq');
const { AGENTS } = require('./agents');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20250929'],
    defaultModel: 'claude-sonnet-4-5-20250929'
  },
  groq: {
    name: 'Groq Llama',
    models: ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b'],
    defaultModel: 'llama-3.1-70b'
  }
};

function getProvider() {
  if (process.env.AI_PROVIDER === 'groq') {
    return 'groq';
  }
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  if (process.env.GROQ_API_KEY) {
    console.log('[Runner] No Anthropic key found, using Groq...');
    return 'groq';
  }
  return 'anthropic';
}

async function runAgent(agentKey, userMessage) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  const provider = getProvider();
  console.log(`[Agent] Running ${agent.name} via ${PROVIDERS[provider].name}...`);

  let result;
  if (provider === 'groq') {
    result = await runGroq(agent, userMessage);
  } else {
    result = await runAnthropic(agent, userMessage);
  }

  return parseResult(result, agent.name);
}

async function runAnthropic(agent, userMessage) {
  const response = await anthropic.messages.create({
    model: agent.model,
    max_tokens: 2000,
    system: agent.system,
    messages: [{ role: 'user', content: userMessage }]
  });

  return {
    text: response.content[0].text,
    provider: 'anthropic'
  };
}

async function runGroq(agent, userMessage) {
  const model = process.env.GROQ_MODEL || 'llama-3.1-70b';
  
  const response = await groq.complete({
    model,
    system: agent.system,
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: 2000,
    temperature: 0.7
  });

  return {
    text: response.content,
    provider: 'groq'
  };
}

function parseResult(result, agentName) {
  const raw = result.text;

  let parsed;
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    console.warn(`[Agent] ${agentName} returned non-JSON - using raw text`);
    parsed = { raw };
  }

  console.log(`[Agent] ${agentName} complete (${result.provider})`);
  return parsed;
}

async function runWeeklyPipeline(research, lastMetrics) {
  const results = {};

  const strategistInput = `
PERPLEXITY RESEARCH THIS WEEK:
Trending topics: ${research.trending_topics}
Competitor content: ${research.competitor_content}
Viral hooks: ${research.viral_hooks}

LAST WEEK METRICS:
${lastMetrics ? JSON.stringify(lastMetrics, null, 2) : 'No metrics yet - first run.'}

Produce the weekly strategy brief.
  `;
  results.strategy = await runAgent('strategist', strategistInput);

  const strategyBrief = JSON.stringify(results.strategy, null, 2);

  // Run sequentially to respect Groq rate limits
  results.content = await runAgent('content', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

TRENDING TOPICS FROM RESEARCH:
${research.trending_topics}
${research.viral_hooks}

Produce today's content output.
  `);
  await delay(8000); // Wait between requests for rate limit

  results.ads = await runAgent('ads', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

META AD TRENDS FROM RESEARCH:
${research.meta_ad_trends}

Current CPL data: ${lastMetrics ? `Rs.${lastMetrics.funnel?.cpl?.actual || 'unknown'}` : 'No data yet'}

Produce 3 ad copy variants.
  `);
  await delay(8000);

  results.seo = await runAgent('seo', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

YOUTUBE TRENDING FROM RESEARCH:
${research.youtube_trending}
${research.trending_topics}

Produce this week's YouTube + SEO content package.
  `);
  await delay(8000);

  results.reelProduction = await runAgent('producer', `
FORMAT THIS REEL SCRIPT FOR HEYGEN:
${JSON.stringify(results.content.reel, null, 2)}
Platform: Instagram Reel
Duration: 60 seconds
  `);
  await delay(8000);

  results.shortProduction = await runAgent('producer', `
FORMAT THIS YOUTUBE SHORT FOR HEYGEN:
${JSON.stringify(results.content.shorts_script, null, 2)}
Platform: YouTube Short
Duration: 45 seconds
  `);

  return results;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAnalytics(metricsData) {
  return await runAgent('analytics', `
Here are last week's actual metrics:
${JSON.stringify(metricsData, null, 2)}

Produce the Weekly Pulse Report.
  `);
}

async function runLeadNurture(lead) {
  return await runAgent('nurture', `
LEAD DATA:
Name: ${lead.name || 'Parent'}
Child name: ${lead.childName || 'their child'}
Child class: ${lead.childClass || 'unknown'}
Current stage: ${lead.stage}
Scorecard: ${lead.scorecard ? JSON.stringify(lead.scorecard) : 'not yet taken'}

Produce the WhatsApp message for this lead's current stage.
  `);
}

module.exports = { runAgent, runWeeklyPipeline, runAnalytics, runLeadNurture, PROVIDERS, getProvider };
