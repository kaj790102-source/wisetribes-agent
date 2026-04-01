require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const NOTION_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';

const headers = {
  'Authorization': `Bearer ${NOTION_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json'
};

// Notion page mapping - update with your actual page IDs
const PAGE_MAP = {
  'content-strategy.md': '335133c5-aab8-81c8-abd2-e303ccd54a85',      // Content Strategy - Pillars, Hooks & Schedule
  '4week-content-calendar.md': '330133c5-aab8-81bb-a17c-d3b112247b89', // Week 1 - Ready to Post Content
  'viral-scripts-batch1.md': '330133c5-aab8-81bb-a17c-d3b112247b89',  // Week 1 - Ready to Post Content
  'viral-scripts-batch2.md': '330133c5-aab8-81bb-a17c-d3b112247b89',  // Week 1 - Ready to Post Content
  'instagram-story-templates.md': '330133c5-aab8-8188-bab4-ec2abba1fb78', // Organic Content Strategy
  'carousel-slides-batch1.md': '330133c5-aab8-81bb-a17c-d3b112247b89', // Week 1
  'carousel-slides-batch2.md': '330133c5-aab8-81bb-a17c-d3b112247b89', // Week 1
  'email-templates.md': '330133c5-aab8-81dc-a6f0-d40e873068d5',         // Command Center
  'whatsapp-api-templates.md': '330133c5-aab8-81dc-a6f0-d40e873068d5',  // Command Center
  'trial-offer-scripts.md': '330133c5-aab8-81bb-a17c-d3b112247b89',    // Week 1
  'n8n-marketing-workflows.md': '330133c5-aab8-81df-809d-ed6c17d7de7a', // Agent System
  'instagram-profile-setup.md': '330133c5-aab8-8188-bab4-ec2abba1fb78', // Organic Content Strategy
  'filming-production-guide.md': '330133c5-aab8-81bb-a17c-d3b112247b89', // Week 1
};

async function updateNotionPage(pageId, content, title) {
  try {
    // Split content into chunks (Notion has limits per request)
    const chunks = chunkContent(content, 1900);
    
    // Build blocks array
    const blocks = [];
    for (const chunk of chunks) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: chunk }
          }]
        }
      });
    }
    
    // Append blocks to page
    await axios.patch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      { children: blocks },
      { headers }
    );
    
    console.log(`  ✅ Updated: ${title}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

function chunkContent(content, maxLength) {
  const chunks = [];
  const lines = content.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += '\n' + line;
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

async function syncMarketingFiles() {
  console.log('🔄 WiseTribes → Notion Sync');
  console.log('=' .repeat(40));
  
  if (!NOTION_KEY) {
    console.error('❌ NOTION_API_KEY not set in .env');
    process.exit(1);
  }
  
  const marketingDir = path.join(__dirname, '..', 'wisetribes-website', 'marketing');
  
  if (!fs.existsSync(marketingDir)) {
    console.error(`❌ Marketing directory not found: ${marketingDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(marketingDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} marketing files\n`);
  
  let synced = 0;
  let skipped = 0;
  
  for (const file of files) {
    const pageId = PAGE_MAP[file];
    const title = file.replace('.md', '');
    
    if (!pageId) {
      console.log(`⏭️  Skipped (no mapping): ${file}`);
      skipped++;
      continue;
    }
    
    const filePath = path.join(marketingDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📤 Syncing: ${file}`);
    const success = await updateNotionPage(pageId, content, title);
    if (success) synced++;
  }
  
  console.log('\n' + '=' .repeat(40));
  console.log(`✅ Synced: ${synced} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
}

async function listNotionPages() {
  console.log('📋 Notion Pages with IDs:');
  console.log('=' .repeat(40));
  
  try {
    const response = await axios.post(
      'https://api.notion.com/v1/search',
      { filter: { value: 'page', property: 'object' } },
      { headers }
    );
    
    for (const page of response.data.results) {
      const title = page.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      console.log(`${page.id} | ${title}`);
    }
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
  }
}

// CLI commands
const args = process.argv.slice(2);
const command = args[0] || 'sync';

if (command === 'list') {
  listNotionPages();
} else if (command === 'sync') {
  syncMarketingFiles();
} else {
  console.log('Usage:');
  console.log('  node notion-sync.js list    - List Notion pages');
  console.log('  node notion-sync.js sync    - Sync marketing files to Notion');
}
