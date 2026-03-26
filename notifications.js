require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

// ── WhatsApp ──────────────────────────────────────────────────────

async function sendWhatsApp(to, message) {
  if (!process.env.WHATSAPP_TOKEN) {
    console.warn('[WhatsApp] No token — logging message instead');
    console.log(`[WhatsApp] To: ${to}\n${message}`);
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[WhatsApp] Sent to ${to}`);
  } catch (err) {
    console.error('[WhatsApp] Error:', err.response?.data || err.message);
  }
}

// Send digest to Kajol
async function notifyKajol(subject, body) {
  const message = `*WiseTribes Alert*\n\n${subject}\n\n${body.slice(0, 800)}`;
  await sendWhatsApp(process.env.KAJOL_WHATSAPP, message);
}

// Send nurture message to a lead
async function sendLeadMessage(phone, message) {
  await sendWhatsApp(phone, message);
}

// ── Email ─────────────────────────────────────────────────────────

function getMailer() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendEmail(subject, htmlBody) {
  const mailer = getMailer();
  if (!mailer) {
    console.warn('[Email] Not configured — skipping');
    return;
  }

  try {
    await mailer.sendMail({
      from: `"WiseTribes AI Team" <${process.env.SMTP_USER}>`,
      to: process.env.DIGEST_TO,
      subject,
      html: htmlBody
    });
    console.log(`[Email] Sent: ${subject}`);
  } catch (err) {
    console.error('[Email] Error:', err.message);
  }
}

// ── Weekly digest email ───────────────────────────────────────────

function buildWeeklyDigestEmail(runResults, analyticsReport, pendingApprovals) {
  const approvalCount = pendingApprovals.length;
  const dashboardUrl = `http://your-vps-ip:${process.env.PORT || 3000}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1a1a1a}
h1{color:#4A3EC7;border-bottom:2px solid #4A3EC7;padding-bottom:10px}
h2{color:#085041;margin-top:30px}
.metric{display:inline-block;background:#f5f5f5;border-radius:8px;padding:10px 16px;margin:5px;text-align:center}
.metric .val{font-size:24px;font-weight:bold;color:#4A3EC7}
.metric .label{font-size:12px;color:#666}
.alert{background:#FCEBEB;border-left:4px solid #E24B4A;padding:10px 14px;margin:10px 0;border-radius:4px}
.success{background:#E1F5EE;border-left:4px solid #1D9E75;padding:10px 14px;margin:10px 0;border-radius:4px}
.btn{display:inline-block;background:#4A3EC7;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;font-weight:bold}
pre{background:#f5f5f5;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto}
</style>
</head>
<body>
<h1>WiseTribes Weekly Agent Report</h1>
<p>Your AI marketing team has completed this week's run.</p>

<h2>Funnel This Week</h2>
${analyticsReport ? `
<div>
  <div class="metric"><div class="val">${analyticsReport.funnel?.leads?.actual || 0}</div><div class="label">Leads</div></div>
  <div class="metric"><div class="val">${analyticsReport.funnel?.demos?.actual || 0}</div><div class="label">Demo Signups</div></div>
  <div class="metric"><div class="val">${analyticsReport.funnel?.paid?.actual || 0}</div><div class="label">Paid Students</div></div>
  <div class="metric"><div class="val">₹${analyticsReport.funnel?.revenue?.actual || 0}</div><div class="label">Revenue</div></div>
</div>
${analyticsReport.breaking?.map(b => `<div class="alert"><strong>${b.metric}</strong>: ${b.value} vs target ${b.target}. ${b.likely_cause}</div>`).join('') || ''}
<div class="success"><strong>Scale this:</strong> ${analyticsReport.scale_this}</div>
<div class="alert"><strong>Kill this:</strong> ${analyticsReport.kill_this}</div>
` : '<p>No metrics data yet — submit last week\'s numbers in the dashboard.</p>'}

<h2>Content Ready for Approval (${approvalCount} items)</h2>
<p>${approvalCount} content pieces are waiting for your approval before publishing.</p>

<h2>Ads Auto-Published</h2>
<p>Ad copies have been submitted to Meta automatically per your settings.</p>

<h2>Action Required</h2>
<a href="${dashboardUrl}" class="btn">Open Dashboard → Approve Content</a>

<p style="margin-top:40px;font-size:12px;color:#999">WiseTribes AI Agent System · ${new Date().toLocaleDateString('en-IN')}</p>
</body>
</html>
  `;
}

module.exports = { sendWhatsApp, notifyKajol, sendLeadMessage, sendEmail, buildWeeklyDigestEmail };
