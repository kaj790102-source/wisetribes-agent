require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { AGENTS } = require('./agents');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAgent(agentKey, userMessage) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  console.log(`[Agent] Running ${agent.name}...`);

  const response = await client.messages.create({
    model: agent.model,
    max_tokens: 2000,
    system: agent.system,
    messages: [{ role: 'user', content: userMessage }]
  });

  const raw = response.content[0].text;

  // Parse JSON — strip markdown fences if present
  let parsed;
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    console.warn(`[Agent] ${agent.name} returned non-JSON — using raw text`);
    parsed = { raw };
  }

  console.log(`[Agent] ${agent.name} complete`);
  return parsed;
}

// ── Pipeline steps ────────────────────────────────────────────────

async function runWeeklyPipeline(research, lastMetrics) {
  const results = {};

  // Step 1: Strategist reads research + metrics → produces brief
  const strategistInput = `
PERPLEXITY RESEARCH THIS WEEK:
Trending topics: ${research.trending_topics}
Competitor content: ${research.competitor_content}
Viral hooks: ${research.viral_hooks}

LAST WEEK METRICS:
${lastMetrics ? JSON.stringify(lastMetrics, null, 2) : 'No metrics yet — first run.'}

Produce the weekly strategy brief.
  `;
  results.strategy = await runAgent('strategist', strategistInput);

  // Step 2–5: Run content, ads, SEO, nurture in parallel with strategy brief
  const strategyBrief = JSON.stringify(results.strategy, null, 2);

  const [content, ads, seo] = await Promise.all([

    runAgent('content', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

TRENDING TOPICS FROM RESEARCH:
${research.trending_topics}
${research.viral_hooks}

Produce today's content output.
    `),

    runAgent('ads', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

META AD TRENDS FROM RESEARCH:
${research.meta_ad_trends}

Current CPL data: ${lastMetrics ? `₹${lastMetrics.funnel?.cpl?.actual || 'unknown'}` : 'No data yet'}

Produce 3 ad copy variants.
    `),

    runAgent('seo', `
WEEKLY STRATEGY BRIEF:
${strategyBrief}

YOUTUBE TRENDING FROM RESEARCH:
${research.youtube_trending}
${research.trending_topics}

Produce this week's YouTube + SEO content package.
    `)
  ]);

  results.content = content;
  results.ads = ads;
  results.seo = seo;

  // Step 6: Producer formats content + seo for HeyGen
  const [reelProduction, shortProduction] = await Promise.all([

    runAgent('producer', `
FORMAT THIS REEL SCRIPT FOR HEYGEN:
${JSON.stringify(content.reel, null, 2)}
Platform: Instagram Reel
Duration: 60 seconds
    `),

    runAgent('producer', `
FORMAT THIS YOUTUBE SHORT FOR HEYGEN:
${JSON.stringify(content.shorts_script, null, 2)}
Platform: YouTube Short
Duration: 45 seconds
    `)
  ]);

  results.reelProduction = reelProduction;
  results.shortProduction = shortProduction;

  return results;
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

module.exports = { runAgent, runWeeklyPipeline, runAnalytics, runLeadNurture };
