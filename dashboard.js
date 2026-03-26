require('dotenv').config();
const express = require('express');
const db = require('./db');
const { runWeeklyPipeline, runAnalytics } = require('./runner');
const { fetchWeeklyResearch } = require('./research');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Simple auth middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  const secret = req.headers['x-secret'] || req.query.secret;
  if (secret !== process.env.DASHBOARD_SECRET) {
    if (req.path === '/') {
      return res.send(loginPage());
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── Dashboard HTML ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  const pending = db.getPendingApprovals();
  const recent = db.getRecentOutputs(10);
  const runs = db.getRecentRuns(5);
  res.send(dashboardPage(pending, recent, runs));
});

// ── API: Approve content ──────────────────────────────────────────
app.post('/approve/:id', (req, res) => {
  const item = db.approveOutput(req.params.id);
  res.json({ ok: true, item });
});

// ── API: Reject content ───────────────────────────────────────────
app.post('/reject/:id', (req, res) => {
  const item = db.rejectOutput(req.params.id, req.body.reason || '');
  res.json({ ok: true, item });
});

// ── API: Add weekly metrics ───────────────────────────────────────
app.post('/metrics', (req, res) => {
  const { weekEnding, leads, demos, showUpRate, paid, revenue, cpl } = req.body;
  db.saveMetrics(weekEnding, {
    funnel: {
      leads: { actual: Number(leads), target: 750 },
      demos: { actual: Number(demos), target: 210 },  // 70% of assessments
      show_up_rate: { actual: Number(showUpRate), target: 80 },
      paid: { actual: Number(paid), target: 37 },  // 15-20% of demo watches
      revenue: { actual: Number(revenue), target: 222000 },  // 37 x Rs.6000
      cpl: { actual: Number(cpl), target: 100 }
    }
  });
  res.json({ ok: true });
});

// ── API: Add a lead manually ──────────────────────────────────────
app.post('/lead', (req, res) => {
  const lead = db.upsertLead(req.body);
  res.json({ ok: true, lead });
});

// ── Webhook: WhatsApp incoming (new lead) ─────────────────────────
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const phone = message.from;
    const text = message.text?.body || '';

    // Create/update lead
    db.upsertLead({ phone, name: '', childName: '', childClass: '', scorecard: null });
    console.log(`[Webhook] New WhatsApp lead: ${phone} — "${text}"`);
    res.sendStatus(200);
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.sendStatus(500);
  }
});

// WhatsApp webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.DASHBOARD_SECRET) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

// ── API: Manual pipeline trigger ─────────────────────────────────
app.post('/run/weekly', async (req, res) => {
  res.json({ ok: true, message: 'Pipeline started — check dashboard in a few minutes' });
  try {
    const research = await fetchWeeklyResearch();
    const lastMetrics = db.getLastMetrics();
    await runWeeklyPipeline(research, lastMetrics);
  } catch (err) {
    console.error('[Manual run] Error:', err.message);
  }
});

// ── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Dashboard] Running at http://localhost:${PORT}`);
  console.log(`[Dashboard] Secret: ${process.env.DASHBOARD_SECRET || 'NOT SET'}`);
});

// ── HTML helpers ──────────────────────────────────────────────────
function loginPage() {
  return `<!DOCTYPE html><html><head><title>WiseTribes Dashboard</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
.box{background:white;padding:40px;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.1);text-align:center}
h2{color:#4A3EC7}input{padding:10px 16px;border:1px solid #ddd;border-radius:8px;width:240px;font-size:14px}
button{display:block;width:100%;margin-top:12px;padding:10px;background:#4A3EC7;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}
</style></head><body>
<div class="box"><h2>WiseTribes Dashboard</h2>
<form onsubmit="window.location='/?secret='+document.getElementById('s').value;return false">
<input id="s" type="password" placeholder="Enter dashboard secret">
<button>Enter</button></form></div></body></html>`;
}

function dashboardPage(pending, recent, runs) {
  const secret = process.env.DASHBOARD_SECRET;
  return `<!DOCTYPE html><html><head>
<title>WiseTribes AI Team Dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:0;background:#f0f0f8;color:#1a1a1a}
.header{background:#4A3EC7;color:white;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{margin:0;font-size:20px}
.badge{background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:13px}
.main{padding:24px;max-width:1100px;margin:0 auto}
.section{margin-bottom:28px}
.section h2{font-size:15px;font-weight:600;color:#444;margin:0 0 12px;letter-spacing:.04em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.card{background:white;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden}
.card-head{padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:13px;font-weight:600;color:#1a1a1a}
.card-agent{font-size:11px;padding:2px 8px;border-radius:20px;background:#EEEDFE;color:#3C3489}
.card-body{padding:12px 16px;font-size:12px;color:#555;line-height:1.6;max-height:200px;overflow-y:auto}
.card-foot{padding:10px 16px;border-top:1px solid #f0f0f0;display:flex;gap:8px}
.btn-approve{background:#1D9E75;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
.btn-reject{background:#E24B4A;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px}
.btn-run{background:#4A3EC7;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
.metrics-form{background:white;border-radius:12px;border:1px solid #e0e0e0;padding:20px}
.metrics-form input{padding:8px 12px;border:1px solid #ddd;border-radius:6px;width:120px;font-size:13px;margin:4px}
.metrics-form label{font-size:12px;color:#666;display:block;margin-top:8px}
.run-item{padding:8px 12px;border-bottom:1px solid #f5f5f5;font-size:12px;display:flex;justify-content:space-between}
.status-ok{color:#1D9E75;font-weight:600}
.status-err{color:#E24B4A;font-weight:600}
.empty{color:#999;font-size:13px;text-align:center;padding:20px}
pre{white-space:pre-wrap;word-break:break-word;font-size:11px}
</style></head>
<body>
<div class="header">
  <h1>WiseTribes AI Team</h1>
  <div style="display:flex;gap:10px;align-items:center">
    <span class="badge">${pending.length} pending approvals</span>
    <button class="btn-run" onclick="runWeekly()">Run Pipeline Now</button>
  </div>
</div>
<div class="main">

  ${pending.length > 0 ? `
  <div class="section">
    <h2>PENDING APPROVAL — ${pending.length} ITEMS</h2>
    <div class="grid">
      ${pending.map(item => `
      <div class="card" id="card-${item.id}">
        <div class="card-head">
          <span class="card-title">${item.type.replace(/_/g,' ').toUpperCase()}</span>
          <span class="card-agent">${item.agent}</span>
        </div>
        <div class="card-body"><pre>${JSON.stringify(item.content, null, 2).slice(0, 600)}...</pre></div>
        <div class="card-foot">
          <button class="btn-approve" onclick="approve('${item.id}')">Approve</button>
          <button class="btn-reject" onclick="reject('${item.id}')">Reject</button>
        </div>
      </div>`).join('')}
    </div>
  </div>` : `<div class="section"><p class="empty">No pending approvals.</p></div>`}

  <div class="section">
    <h2>ADD THIS WEEK'S METRICS</h2>
    <div class="metrics-form">
      <label>Week ending (YYYY-MM-DD)</label><input id="m-week" placeholder="2025-04-21">
      <label>Leads</label><input id="m-leads" type="number" placeholder="0">
      <label>Demo watches (auto-started after assessment)</label><input id="m-demos" type="number" placeholder="0">
      <label>Demo show-up rate %</label><input id="m-showup" type="number" placeholder="80">
      <label>Paid conversions</label><input id="m-paid" type="number" placeholder="0">
      <label>Revenue ₹</label><input id="m-rev" type="number" placeholder="0">
      <label>CPL ₹</label><input id="m-cpl" type="number" placeholder="100">
      <div style="margin-top:12px">
        <button class="btn-approve" onclick="saveMetrics()">Save Metrics</button>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>RECENT OUTPUTS</h2>
    <div class="grid">
      ${recent.slice(0,6).map(item => `
      <div class="card">
        <div class="card-head">
          <span class="card-title">${item.type.replace(/_/g,' ')}</span>
          <span class="card-agent" style="background:${item.approved===true?'#E1F5EE':item.approved===false?'#FCEBEB':'#FAEEDA'};color:${item.approved===true?'#085041':item.approved===false?'#A32D2D':'#633806'}">${item.approved===true?'approved':item.approved===false?'rejected':'pending'}</span>
        </div>
        <div class="card-body"><pre>${JSON.stringify(item.content, null, 2).slice(0, 400)}</pre></div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <h2>PIPELINE RUNS</h2>
    <div class="card" style="padding:0">
      ${runs.length > 0 ? runs.map(r => `
      <div class="run-item">
        <span>${r.type} — ${new Date(r.startedAt).toLocaleString('en-IN')}</span>
        <span class="${r.status==='complete'?'status-ok':'status-err'}">${r.status}</span>
      </div>`).join('') : '<p class="empty">No runs yet.</p>'}
    </div>
  </div>

</div>

<script>
const S = '${secret}';
async function approve(id) {
  await fetch('/approve/'+id+'?secret='+S, {method:'POST'});
  document.getElementById('card-'+id).style.opacity='.4';
  document.getElementById('card-'+id).querySelector('.btn-approve').textContent='Approved';
}
async function reject(id) {
  const reason = prompt('Reason for rejection (optional):') || '';
  await fetch('/reject/'+id+'?secret='+S, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});
  document.getElementById('card-'+id).style.opacity='.4';
}
async function saveMetrics() {
  const body = {
    weekEnding: document.getElementById('m-week').value,
    leads: document.getElementById('m-leads').value,
    demos: document.getElementById('m-demos').value,
    showUpRate: document.getElementById('m-showup').value,
    paid: document.getElementById('m-paid').value,
    revenue: document.getElementById('m-rev').value,
    cpl: document.getElementById('m-cpl').value
  };
  await fetch('/metrics?secret='+S, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  alert('Metrics saved. Analytics agent will process on next run.');
}
async function runWeekly() {
  if (!confirm('Run the full weekly pipeline now? This will take 3-5 minutes.')) return;
  await fetch('/run/weekly?secret='+S, {method:'POST'});
  alert('Pipeline started. Refresh in 5 minutes to see outputs.');
}
</script>
</body></html>`;
}

module.exports = app;
