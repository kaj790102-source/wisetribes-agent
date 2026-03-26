require('dotenv').config();
const cron = require('node-cron');
const { fetchWeeklyResearch } = require('./research');
const { runWeeklyPipeline, runAnalytics, runLeadNurture } = require('./runner');
const { submitVideo, waitForVideo } = require('./heygen');
const db = require('./db');
const { notifyKajol, sendLeadMessage, sendEmail, buildWeeklyDigestEmail } = require('./notifications');

// ── MONDAY 7AM IST — Full weekly pipeline ────────────────────────
// IST = UTC+5:30, so 7am IST = 1:30am UTC
cron.schedule('30 1 * * 1', async () => {
  console.log('\n[Scheduler] === WEEKLY PIPELINE STARTING ===');
  const run = db.startRun('weekly');

  try {
    // 1. Fetch research
    const research = await fetchWeeklyResearch();

    // 2. Get last week's metrics
    const lastMetrics = db.getLastMetrics();

    // 3. Run all agents
    const results = await runWeeklyPipeline(research, lastMetrics);

    // 4. Save strategy + content outputs (require approval)
    db.saveOutput({ agent: 'strategist', type: 'strategy_brief', content: results.strategy, runId: run.id, requiresApproval: false });
    db.saveOutput({ agent: 'content', type: 'content_calendar', content: results.content, runId: run.id, requiresApproval: true });
    db.saveOutput({ agent: 'seo', type: 'seo_package', content: results.seo, runId: run.id, requiresApproval: true });

    // 5. Ads auto-publish (no approval needed)
    db.saveOutput({ agent: 'ads', type: 'ad_scripts', content: results.ads, runId: run.id, requiresApproval: false });
    console.log('[Scheduler] Ad scripts saved — marked for auto-publish');

    // 6. Submit Reel video to HeyGen
    if (results.reelProduction?.heygen_brief) {
      console.log('[Scheduler] Submitting Reel to HeyGen...');
      const video = await submitVideo(results.reelProduction.heygen_brief);
      db.saveOutput({ agent: 'producer', type: 'heygen_reel', content: { ...results.reelProduction, videoId: video.id, videoStatus: video.status }, runId: run.id, requiresApproval: true });
    }

    // 7. Analytics report
    if (lastMetrics) {
      const analyticsReport = await runAnalytics(lastMetrics);
      db.saveOutput({ agent: 'analytics', type: 'weekly_report', content: analyticsReport, runId: run.id, requiresApproval: false });
      const pendingApprovals = db.getPendingApprovals();
      const emailHtml = buildWeeklyDigestEmail(results, analyticsReport, pendingApprovals);
      await sendEmail('WiseTribes Weekly Report — Action Required', emailHtml);
      await notifyKajol('Weekly plan ready', `${pendingApprovals.length} content pieces need your approval. Check dashboard or email.`);
    } else {
      await notifyKajol('Weekly plan ready', 'First run complete. Open dashboard to review content and add last week\'s metrics.');
    }

    db.finishRun(run.id, 'complete');
    console.log('[Scheduler] === WEEKLY PIPELINE COMPLETE ===\n');

  } catch (err) {
    console.error('[Scheduler] Weekly pipeline error:', err);
    db.finishRun(run.id, 'error');
    await notifyKajol('Pipeline Error', `Weekly pipeline failed: ${err.message}`);
  }
}, { timezone: 'UTC' });

// ── DAILY 6AM IST — Single Reel script ───────────────────────────
// 6am IST = 12:30am UTC
cron.schedule('30 0 * * *', async () => {
  console.log('[Scheduler] Daily Reel generation...');
  // Only runs Mon–Sat (skip Sunday)
  const day = new Date().getDay();
  if (day === 0) return;

  try {
    const { research } = require('./research');
    const trendingTopics = await research('What is trending on Instagram India in education and parenting right now? What fear-based or inspirational topics are going viral?');
    const { runAgent } = require('./runner');

    const content = await runAgent('content', `
Daily single Reel request.
TRENDING TODAY: ${trendingTopics}
Produce one high-quality Reel script based on what is trending right now.
    `);

    db.saveOutput({ agent: 'content', type: 'daily_reel', content, runId: 'daily', requiresApproval: true });
    console.log('[Scheduler] Daily Reel ready for approval');

  } catch (err) {
    console.error('[Scheduler] Daily Reel error:', err.message);
  }
}, { timezone: 'UTC' });

// ── EVERY 30 MINS — Lead follow-up check ─────────────────────────
cron.schedule('*/30 * * * *', async () => {
  const dueleads = db.getLeadsDueForFollowup();
  if (dueleads.length === 0) return;

  console.log(`[Scheduler] Processing ${dueleads.length} lead follow-ups...`);

  for (const lead of dueleads) {
    try {
      const result = await runLeadNurture(lead);
      // Send the WhatsApp message
      await sendLeadMessage(lead.phone, result.message);
      // Update lead stage
      db.updateLeadStage(lead.phone, result.next_stage, result.next_action_in_hours);
      console.log(`[Scheduler] Lead ${lead.phone} → stage: ${result.next_stage}`);
    } catch (err) {
      console.error(`[Scheduler] Lead nurture error for ${lead.phone}:`, err.message);
    }
  }
});

console.log('[Scheduler] All cron jobs registered:');
console.log('  → Monday 7am IST: Full weekly pipeline');
console.log('  → Daily 6am IST: Single Reel generation');
console.log('  → Every 30 mins: Lead follow-up check');
