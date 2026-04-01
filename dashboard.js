require('dotenv').config();
const express = require('express');
const db = require('./db');
const { runWeeklyPipeline, runAnalytics } = require('./runner');
const { fetchWeeklyResearch } = require('./research');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get('/', (req, res) => {
  const pending = db.getPendingApprovals();
  const recent = db.getRecentOutputs(10);
  const runs = db.getRecentRuns(5);
  const lastMetrics = db.getLastMetrics();
  res.send(dashboardPage(pending, recent, runs, lastMetrics));
});

app.post('/approve/:id', (req, res) => {
  const item = db.approveOutput(req.params.id);
  res.json({ ok: true, item });
});

app.post('/reject/:id', (req, res) => {
  const item = db.rejectOutput(req.params.id, req.body.reason || '');
  res.json({ ok: true, item });
});

app.post('/metrics', (req, res) => {
  const { weekEnding, leads, demos, showUpRate, paid, revenue, cpl } = req.body;
  db.saveMetrics(weekEnding, {
    funnel: {
      leads: { actual: Number(leads), target: 750 },
      demos: { actual: Number(demos), target: 210 },
      show_up_rate: { actual: Number(showUpRate), target: 80 },
      paid: { actual: Number(paid), target: 37 },
      revenue: { actual: Number(revenue), target: 222000 },
      cpl: { actual: Number(cpl), target: 100 }
    }
  });
  res.json({ ok: true });
});

app.post('/lead', (req, res) => {
  const lead = db.upsertLead(req.body);
  res.json({ ok: true, lead });
});

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.sendStatus(200);
    const phone = message.from;
    const text = message.text?.body || '';
    db.upsertLead({ phone, name: '', childName: '', childClass: '', scorecard: null });
    console.log(`[Webhook] New WhatsApp lead: ${phone} — "${text}"`);
    res.sendStatus(200);
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.sendStatus(500);
  }
});

app.get('/webhook/whatsapp', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.DASHBOARD_SECRET) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Dashboard] Running at http://localhost:${PORT}`);
  console.log(`[Dashboard] Secret: ${process.env.DASHBOARD_SECRET || 'NOT SET'}`);
});

function loginPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiseTribes Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',sans-serif;background:#050d1f;min-height:100vh;display:flex;align-items:center;justify-content:center}
.box{background:rgba(255,255,255,.03);border:1px solid rgba(0,196,167,.15);border-radius:20px;padding:48px;width:380px;text-align:center;backdrop-filter:blur(20px)}
.logo{font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:8px}
.logo span{color:#00c4a7}
.tagline{color:rgba(255,255,255,.4);font-size:.85rem;margin-bottom:32px}
input{padding:14px 18px;border:1.5px solid rgba(255,255,255,.1);border-radius:10px;width:100%;font-size:1rem;color:#fff;background:rgba(255,255,255,.05);margin-bottom:16px;font-family:'Space Grotesk',sans-serif}
input:focus{outline:none;border-color:#00c4a7;box-shadow:0 0 0 3px rgba(0,196,167,.15)}
button{display:block;width:100%;padding:14px;background:linear-gradient(135deg,#00c4a7,#00a88e);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;transition:transform .2s,box-shadow .2s}
button:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,196,167,.35)}
</style>
</head>
<body>
<div class="box">
  <div class="logo">Wise<span>Tribes</span></div>
  <p class="tagline">AI Marketing Team Dashboard</p>
  <form onsubmit="window.location='/?secret='+document.getElementById('s').value;return false">
    <input id="s" type="password" placeholder="Enter dashboard secret">
    <button>Enter Dashboard →</button>
  </form>
</div>
</body></html>`;
}

function dashboardPage(pending, recent, runs, lastMetrics) {
  const secret = process.env.DASHBOARD_SECRET;
  const funnel = lastMetrics?.funnel || {};
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiseTribes AI Team</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#050d1f;--navy2:#0a1628;--navy3:#0f2040;--teal:#00c4a7;--teal2:#00e8c6;--amber:#f5c842;--blue:#4a90d9;--red:#ef4444;--white:#fff;--gray:#8896b0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',sans-serif;background:var(--navy);color:var(--white);min-height:100vh}
.header{background:rgba(5,13,31,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,196,167,.12);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.logo{font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:#fff}
.logo span{color:var(--teal)}
.header-right{display:flex;gap:12px;align-items:center}
.badge{background:rgba(0,196,167,.15);border:1px solid rgba(0,196,167,.25);padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:600;color:var(--teal)}
.btn-primary{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;border:none;padding:10px 20px;border-radius:8px;font-family:'Syne',sans-serif;font-weight:700;font-size:.85rem;cursor:pointer;transition:transform .2s,box-shadow .2s}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,196,167,.3)}
.main{padding:28px 32px;max-width:1400px;margin:0 auto}
.section{margin-bottom:32px}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.section-title{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.5px;text-transform:uppercase}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.stat-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px;transition:border-color .3s,transform .3s}
.stat-card:hover{border-color:rgba(0,196,167,.25);transform:translateY(-2px)}
.stat-num{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:var(--teal);line-height:1}
.stat-label{font-size:.8rem;color:var(--gray);margin-top:6px}
.stat-target{font-size:.7rem;color:rgba(255,255,255,.3);margin-top:2px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}
.card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;transition:border-color .3s}
.card:hover{border-color:rgba(0,196,167,.2)}
.card-head{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between}
.card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem}
.agent-tag{background:rgba(74,144,217,.15);color:#64aaf0;padding:4px 10px;border-radius:6px;font-size:.7rem;font-weight:600}
.card-body{padding:16px 20px;font-size:.82rem;color:rgba(255,255,255,.5);line-height:1.6;max-height:220px;overflow-y:auto}
.card-body::-webkit-scrollbar{width:4px}
.card-body::-webkit-scrollbar-thumb{background:rgba(0,196,167,.3);border-radius:4px}
.card-body pre{white-space:pre-wrap;word-break:break-word;font-family:'Space Grotesk',sans-serif;font-size:.78rem}
.card-foot{padding:12px 20px;border-top:1px solid rgba(255,255,255,.05);display:flex;gap:10px}
.btn-approve{background:#00c4a7;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:.78rem;font-weight:700;cursor:pointer;transition:background .2s}
.btn-approve:hover{background:#00e8c6}
.btn-reject{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);padding:8px 18px;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-reject:hover{background:rgba(239,68,68,.25)}
.metrics-form{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
.metrics-form input{padding:12px 14px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.05);color:#fff;font-size:.85rem;font-family:'Space Grotesk',sans-serif;width:100%}
.metrics-form input:focus{outline:none;border-color:var(--teal)}
.metrics-form label{display:block;font-size:.72rem;color:var(--gray);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.form-submit{margin-top:8px;grid-column:1/-1;display:flex;justify-content:flex-end}
.run-item{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between;align-items:center;font-size:.85rem}
.run-item:last-child{border-bottom:none}
.status-ok{color:#00c4a7;font-weight:600}
.status-err{color:#f87171;font-weight:600}
.status-pending{color:var(--amber);font-weight:600}
.empty{text-align:center;padding:40px;color:var(--gray);font-size:.9rem}
.empty-icon{font-size:2rem;margin-bottom:12px;opacity:.5}
.approved-tag{background:rgba(0,196,167,.15);color:#00c4a7}
.pending-tag{background:rgba(245,200,66,.15);color:var(--amber)}
.rejected-tag{background:rgba(239,68,68,.15);color:#f87171}
.status-tag{padding:4px 10px;border-radius:6px;font-size:.7rem;font-weight:600}
@media(max-width:768px){.header{padding:14px 20px}.main{padding:20px}.grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div class="header">
  <div class="logo">Wise<span>Tribes</span> AI Team</div>
  <div class="header-right">
    <span class="badge">${pending.length} pending</span>
    <button class="btn-primary" onclick="runWeekly()">▶ Run Pipeline</button>
  </div>
</div>
<div class="main">

  <div class="section">
    <div class="section-header">
      <h2 class="section-title">📊 Funnel Overview</h2>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num">${funnel.leads?.actual || 0}</div>
        <div class="stat-label">Leads</div>
        <div class="stat-target">Target: ${funnel.leads?.target || 750}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${funnel.demos?.actual || 0}</div>
        <div class="stat-label">Demo Signups</div>
        <div class="stat-target">Target: ${funnel.demos?.target || 210}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${funnel.paid?.actual || 0}</div>
        <div class="stat-label">Paid Students</div>
        <div class="stat-target">Target: ${funnel.paid?.target || 37}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" style="color:${(funnel.revenue?.actual || 0) >= (funnel.revenue?.target || 222000) ? 'var(--teal)' : 'var(--amber)'}">₹${((funnel.revenue?.actual || 0)/100000).toFixed(1)}L</div>
        <div class="stat-label">Revenue</div>
        <div class="stat-target">Target: ₹${((funnel.revenue?.target || 222000)/100000).toFixed(1)}L</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" style="color:${(funnel.cpl?.actual || 0) <= 120 ? 'var(--teal)' : 'var(--red)'}">₹${funnel.cpl?.actual || 0}</div>
        <div class="stat-label">Cost Per Lead</div>
        <div class="stat-target">Target: ₹${funnel.cpl?.target || 100}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${funnel.show_up_rate?.actual || 0}%</div>
        <div class="stat-label">Demo Show Rate</div>
        <div class="stat-target">Target: ${funnel.show_up_rate?.target || 80}%</div>
      </div>
    </div>
  </div>

  ${pending.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">⏳ Pending Approvals (${pending.length})</h2>
    </div>
    <div class="grid">
      ${pending.map(item => `
      <div class="card" id="card-${item.id}">
        <div class="card-head">
          <span class="card-title">${item.type.replace(/_/g,' ').toUpperCase()}</span>
          <span class="agent-tag">${item.agent}</span>
        </div>
        <div class="card-body"><pre>${JSON.stringify(item.content, null, 2).slice(0, 800)}...</pre></div>
        <div class="card-foot">
          <button class="btn-approve" onclick="approve('${item.id}')">✓ Approve</button>
          <button class="btn-reject" onclick="reject('${item.id}')">✗ Reject</button>
        </div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-header">
      <h2 class="section-title">📝 Add This Week's Metrics</h2>
    </div>
    <div class="metrics-form">
      <div><label>Week Ending</label><input id="m-week" placeholder="2025-04-21"></div>
      <div><label>Leads</label><input id="m-leads" type="number" placeholder="0"></div>
      <div><label>Demo Signups</label><input id="m-demos" type="number" placeholder="0"></div>
      <div><label>Demo Show Rate %</label><input id="m-showup" type="number" placeholder="80"></div>
      <div><label>Paid Students</label><input id="m-paid" type="number" placeholder="0"></div>
      <div><label>Revenue ₹</label><input id="m-rev" type="number" placeholder="0"></div>
      <div><label>CPL ₹</label><input id="m-cpl" type="number" placeholder="100"></div>
      <div class="form-submit"><button class="btn-primary" onclick="saveMetrics()">Save Metrics</button></div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <h2 class="section-title">📜 Recent Outputs</h2>
    </div>
    <div class="grid">
      ${recent.length > 0 ? recent.slice(0,6).map(item => `
      <div class="card">
        <div class="card-head">
          <span class="card-title">${item.type.replace(/_/g,' ')}</span>
          <span class="status-tag ${item.approved === true ? 'approved-tag' : item.approved === false ? 'rejected-tag' : 'pending-tag'}">${item.approved === true ? 'approved' : item.approved === false ? 'rejected' : 'pending'}</span>
        </div>
        <div class="card-body"><pre>${JSON.stringify(item.content, null, 2).slice(0, 500)}</pre></div>
      </div>`).join('') : '<div class="empty"><div class="empty-icon">📭</div>No outputs yet. Run the pipeline to generate content.</div>'}
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <h2 class="section-title">⚡ Pipeline Runs</h2>
    </div>
    <div class="card">
      ${runs.length > 0 ? runs.map(r => `
      <div class="run-item">
        <span>${r.type} — ${new Date(r.startedAt).toLocaleString('en-IN')}</span>
        <span class="${r.status === 'complete' ? 'status-ok' : r.status === 'error' ? 'status-err' : 'status-pending'}">${r.status}</span>
      </div>`).join('') : '<div class="run-item"><span style="color:var(--gray)">No runs yet</span></div>'}
    </div>
  </div>

</div>

<script>
const S = '${secret}';
async function approve(id) {
  await fetch('/approve/'+id+'?secret='+S, {method:'POST'});
  document.getElementById('card-'+id).style.opacity='.4';
  document.getElementById('card-'+id).querySelector('.btn-approve').textContent='Approved ✓';
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
  alert('Metrics saved! Analytics will process on next run.');
  location.reload();
}
async function runWeekly() {
  if (!confirm('Run the full weekly pipeline now? This will take 3-5 minutes.')) return;
  await fetch('/run/weekly?secret='+S, {method:'POST'});
  alert('Pipeline started! Refresh in 5 minutes to see outputs.');
}
</script>
</body></html>`;
}

module.exports = app;
