require('dotenv').config();

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   WiseTribes AI Marketing Team v1.0      ║');
console.log('║   Starting all systems...                ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Validate required env vars
const required = ['ANTHROPIC_API_KEY', 'DASHBOARD_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('[ERROR] Missing required environment variables:');
  missing.forEach(k => console.error(`  → ${k}`));
  console.error('\nCopy .env.example to .env and fill in the values.');
  process.exit(1);
}

// Warn about optional keys
const optional = {
  PERPLEXITY_API_KEY: 'Perplexity research (agents will run without real-time trends)',
  HEYGEN_API_KEY: 'HeyGen video generation (scene briefs will be saved but not submitted)',
  WHATSAPP_TOKEN: 'WhatsApp messaging (lead nurture will log instead of send)',
  META_ACCESS_TOKEN: 'Meta ad auto-publish (ad scripts saved but not submitted)',
  SMTP_USER: 'Email digest (weekly report will be skipped)'
};
console.log('[Config] Optional integrations status:');
for (const [key, desc] of Object.entries(optional)) {
  const status = process.env[key] ? '✓ configured' : '✗ not set';
  console.log(`  ${status.padEnd(16)} ${desc}`);
}
console.log('');

// Start dashboard
require('./dashboard');

// Start scheduler
require('./scheduler');

console.log('');
console.log('[System] All systems running.');
console.log(`[System] Dashboard: http://localhost:${process.env.PORT || 3000}`);
console.log('[System] Press Ctrl+C to stop.');
