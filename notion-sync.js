require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const NOTION_KEY = process.env.NOTION_API_KEY;
const headers = {
  'Authorization': `Bearer ${NOTION_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

// Notion page mapping - 3 NEW clean pages
const PAGE_MAP = {
  '00-CREATOR-BRIEF.md':   '335133c5-aab8-81d3-89da-e9d751b33674',  // CREATOR BRIEF - Read First
  '01-WEEKLY-CALENDAR.md': '330133c5-aab8-81bb-a17c-d3b112247b89',  // WEEKLY CALENDAR (existing)
  '02-SCRIPTS.md':         '330133c5-aab8-81bb-a17c-d3b112247b89',  // SCRIPTS (same page)
};

async function updateNotionPage(pageId, content, title) {
  try {
    // Split into blocks
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = '';
    
    for (const line of lines) {
      if (line.startsWith('# ') && currentBlock) {
        // Heading 1
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: { rich_text: [{ type: 'text', text: { content: line.substring(2) } }] }
        });
      } else if (line.startsWith('## ')) {
        if (currentBlock) {
          blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: currentBlock } }] } });
        }
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: line.substring(3) } }] }
        });
        currentBlock = '';
      } else if (line.startsWith('### ')) {
        if (currentBlock) {
          blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: currentBlock } }] } });
        }
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: [{ type: 'text', text: { content: line.substring(4) } }] }
        });
        currentBlock = '';
      } else if (line.startsWith('---')) {
        if (currentBlock) {
          blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: currentBlock } }] } });
        }
        blocks.push({ object: 'block', type: 'divider', divider: {} });
        currentBlock = '';
      } else if (line.trim() === '') {
        if (currentBlock) {
          blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: currentBlock } }] } });
          currentBlock = '';
        }
      } else {
        currentBlock += (currentBlock ? '\n' : '') + line;
      }
    }
    
    if (currentBlock) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: currentBlock } }] } });
    }
    
    // Send in chunks
    const chunkSize = 90;
    for (let i = 0; i < blocks.length; i += chunkSize) {
      const chunk = blocks.slice(i, i + chunkSize);
      await axios.patch(
        `https://api.notion.com/v1/blocks/${pageId}/children`,
        { children: chunk },
        { headers }
      );
    }
    
    console.log(`  ✅ ${title}`);
    return true;
  } catch (err) {
    console.error(`  ❌ ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function syncMarketingFiles() {
  console.log('🔄 WiseTribes → Notion Sync (Clear & Replace)');
  console.log('='.repeat(40));
  
  if (!NOTION_KEY) {
    console.error('❌ NOTION_API_KEY not set');
    process.exit(1);
  }
  
  const marketingDir = path.join(__dirname, '..', 'wisetribes-website', 'marketing');
  const files = fs.readdirSync(marketingDir).filter(f => f.endsWith('.md'));
  
  console.log(`Found ${files.length} files\n`);
  
  let synced = 0;
  
  for (const file of files) {
    const pageId = PAGE_MAP[file];
    
    if (!pageId) {
      console.log(`  ⏭️  Skipped: ${file}`);
      continue;
    }
    
    const filePath = path.join(marketingDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📤 Syncing: ${file}`);
    if (await updateNotionPage(pageId, content, file.replace('.md', ''))) {
      synced++;
    }
  }
  
  console.log('\n' + '='.repeat(40));
  console.log(`✅ Synced: ${synced} files (old content replaced)`);
}

async function listPages() {
  console.log('📋 Notion Pages:\n');
  try {
    const r = await axios.post('https://api.notion.com/v1/search', 
      { filter: { value: 'page', property: 'object' } }, 
      { headers }
    );
    for (const p of r.data.results) {
      const title = p.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      console.log(`${p.id} | ${title}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

const cmd = process.argv[2];
if (cmd === 'list') listPages();
else if (cmd === 'sync') syncMarketingFiles();
else console.log('Usage: node notion-sync.js [list|sync]');
