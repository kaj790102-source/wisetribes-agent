const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure data dir exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Init DB structure
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      outputs: [],       // All agent outputs
      leads: [],         // Lead records + nurture state
      metrics: [],       // Weekly metrics snapshots
      approvals: [],     // Pending approval items
      runs: []           // Pipeline run history
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function read() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Outputs ──────────────────────────────────────────────────────
function saveOutput({ agent, type, content, runId, requiresApproval = false }) {
  const db = read();
  const item = {
    id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    runId,
    agent,
    type,
    content,
    requiresApproval,
    approved: requiresApproval ? null : true, // auto-approved if no approval needed
    createdAt: new Date().toISOString()
  };
  db.outputs.push(item);
  write(db);
  return item;
}

function getPendingApprovals() {
  const db = read();
  return db.outputs.filter(o => o.requiresApproval && o.approved === null);
}

function approveOutput(id) {
  const db = read();
  const item = db.outputs.find(o => o.id === id);
  if (item) { item.approved = true; item.approvedAt = new Date().toISOString(); }
  write(db);
  return item;
}

function rejectOutput(id, reason = '') {
  const db = read();
  const item = db.outputs.find(o => o.id === id);
  if (item) { item.approved = false; item.rejectedAt = new Date().toISOString(); item.rejectionReason = reason; }
  write(db);
  return item;
}

function getRecentOutputs(limit = 20) {
  const db = read();
  return db.outputs.slice(-limit).reverse();
}

// ── Leads ─────────────────────────────────────────────────────────
function upsertLead({ phone, name, childName, childClass, scorecard }) {
  const db = read();
  let lead = db.leads.find(l => l.phone === phone);
  if (!lead) {
    lead = {
      id: `lead_${Date.now()}`,
      phone, name, childName, childClass, scorecard,
      stage: 'new_lead',
      nextActionAt: new Date().toISOString(),
      messages: [],
      createdAt: new Date().toISOString()
    };
    db.leads.push(lead);
  } else {
    Object.assign(lead, { name, childName, childClass, scorecard });
  }
  write(db);
  return lead;
}

function updateLeadStage(phone, stage, nextActionInHours) {
  const db = read();
  const lead = db.leads.find(l => l.phone === phone);
  if (lead) {
    lead.stage = stage;
    lead.nextActionAt = new Date(Date.now() + nextActionInHours * 3600000).toISOString();
  }
  write(db);
  return lead;
}

function getLeadsDueForFollowup() {
  const db = read();
  const now = new Date();
  return db.leads.filter(l =>
    l.stage !== 'welcome_paid' &&
    l.nextActionAt &&
    new Date(l.nextActionAt) <= now
  );
}

// ── Metrics ───────────────────────────────────────────────────────
function saveMetrics(weekEnding, data) {
  const db = read();
  db.metrics.push({ weekEnding, ...data, savedAt: new Date().toISOString() });
  write(db);
}

function getLastMetrics() {
  const db = read();
  return db.metrics[db.metrics.length - 1] || null;
}

// ── Runs ──────────────────────────────────────────────────────────
function startRun(type) {
  const db = read();
  const run = {
    id: `run_${Date.now()}`,
    type,
    status: 'running',
    startedAt: new Date().toISOString(),
    outputs: []
  };
  db.runs.push(run);
  write(db);
  return run;
}

function finishRun(runId, status = 'complete') {
  const db = read();
  const run = db.runs.find(r => r.id === runId);
  if (run) { run.status = status; run.finishedAt = new Date().toISOString(); }
  write(db);
}

function getRecentRuns(limit = 10) {
  const db = read();
  return db.runs.slice(-limit).reverse();
}

module.exports = {
  saveOutput, getPendingApprovals, approveOutput, rejectOutput, getRecentOutputs,
  upsertLead, updateLeadStage, getLeadsDueForFollowup,
  saveMetrics, getLastMetrics,
  startRun, finishRun, getRecentRuns
};
