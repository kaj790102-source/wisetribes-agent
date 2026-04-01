require('dotenv').config();

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   WiseTribes AI Marketing Team v2.0     ║');
console.log('║   Starting all systems...                ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Check AI provider
const hasAnthropic = process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');
const hasGroq = !!process.env.GROQ_API_KEY;

if (hasGroq && !hasAnthropic) {
  console.log('[AI] Provider: Groq (Llama 3.1 70B - FREE)');
  console.log('[AI] Model: ' + (process.env.GROQ_MODEL || 'llama-3.1-70b'));
} else if (hasAnthropic) {
  console.log('[AI] Provider: Anthropic (Claude Sonnet 4)');
} else {
  console.error('[ERROR] No AI provider configured!');
  console.error('  Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env');
  process.exit(1);
}

// Validate required env vars
const required = ['DASHBOARD_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('[ERROR] Missing required environment variables:');
  missing.forEach(k => console.error(`  → ${k}`));
  console.error('\nCopy .env.example to .env and fill in the values.');
  process.exit(1);
}

// Warn about optional keys
const optional = {
  TAVILY_API_KEY: 'Tavily research (real-time trends)',
  HEYGEN_API_KEY: 'HeyGen video generation',
  WHATSAPP_TOKEN: 'WhatsApp messaging',
  SMTP_USER: 'Email digest'
};
console.log('[Config] Optional integrations:');
for (const [key, desc] of Object.entries(optional)) {
  const status = process.env[key] ? '✓ configured' : '○ not set';
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
