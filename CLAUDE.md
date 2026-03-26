# WiseTribes — Master Rules (Root CLAUDE.md)

Read this before doing ANYTHING across any WiseTribes project.
These rules override everything else.

## Company
- Product: WiseTribes — AI learning for Class 5–10, India
- Founder: Kajol Pandey | info@wisetribes.in | +918793015698
- Instagram: @wisetribes_26

## The offer — never change this without explicit command
- ONE price only: ₹6,000/month
- 2 live AI classes/week — Tuesday + Friday
- Classes start April 15, 2025
- No ₹2,500. No ₹12,000. No other pricing. Ever.

## The funnel — never deviate
1. Lead → wisetribes.online
2. Free AI Assessment (8 questions, 2 min)
3. 15-min Demo Class auto-starts instantly after assessment
4. Offer: ₹6,000/month
5. Paid → email confirmation + schedule
6. Not paid → WhatsApp nurture (3 touches: Day 1, Day 3, Day 7)

## Domain — LOCKED
- Active domain: wisetribes.online
- Production domain: wisetribes.in
- DO NOT switch to wisetribes.in unless Kajol says exactly: "switch to production domain"
- Every file, every agent, every email uses wisetribes.online until that command

## Non-negotiable rules
- Never change pricing
- Never create new pages on the website
- Never change website design, colors, fonts, layout
- Never touch the assessment tool on the website
- All 7 agent prompts live in agents.js — edit there only
- After every website change: commit + push to main branch
- After every agent change: restart PM2 on VPS
- Never expose API keys in code or commits
- GitHub token and API keys stay in .env only

## Projects in this workspace
- website/ → wisetribes.online source code
- wisetribes-agent/ → autonomous AI marketing team (Node.js, VPS)
- heygen-videos/ → demo class video generation
- classes/ → AI-delivered Tuesday/Friday classes (future project)

## When Kajol gives a task
1. Read the relevant sub-project CLAUDE.md
2. Do the task completely
3. Report what was done
4. Never ask "should I proceed" — just do it
5. Never leave tasks half-done

---

# WiseTribes — Claude Code Project Brief

You are working on the WiseTribes autonomous AI marketing system.
Read this file completely before doing anything. It is your source of truth.

## What this project is

An autonomous Node.js pipeline running on a Hostinger VPS that:
- Runs 7 AI marketing agents (Anthropic API) on a cron schedule
- Fetches real-time research via Perplexity before each run
- Produces content, ad scripts, nurture messages, and analytics reports
- Sends outputs to a web dashboard for approval (content) or auto-publishes (ads)
- Sends weekly digest via WhatsApp + email to Kajol

## File map — what each file does

| File | Purpose |
|------|---------|
| `index.js` | Entry point — starts dashboard + scheduler |
| `masterBrief.js` | Single source of truth — all agents read from here |
| `agents.js` | All 7 agent system prompts — edit here to update all agents |
| `runner.js` | Pipeline orchestrator — calls agents in correct sequence |
| `scheduler.js` | Cron jobs — weekly pipeline, daily reel, lead follow-ups |
| `research.js` | Perplexity API — fetches trends before agents run |
| `heygen.js` | HeyGen API — submits scene briefs, polls for video |
| `notifications.js` | WhatsApp + email delivery |
| `db.js` | JSON database — outputs, leads, metrics, approvals |
| `dashboard.js` | Express web UI — approve content, add metrics, trigger runs |
| `.env` | All API keys and config — never commit this file |
| `CLAUDE.md` | This file — your brief |

## The one rule about updates

**NEVER update agent system prompts in claude.ai Projects.**
All 7 agent prompts live in `agents.js`. When you edit `agents.js`, all agents update instantly on the next pipeline run. That is the only way changes should be made.

## Domain switching

The site URL is controlled by `SITE_URL` in `.env`:
- Testing: `SITE_URL=wisetribes.online`
- Production: `SITE_URL=wisetribes.in`

Change that one value. Every agent, every email, every WhatsApp message updates automatically.

## The funnel (never deviate from this)

```
Lead (UGC/Ad/YouTube/Instagram)
  → wisetribes.online (or .in in production)
  → Free AI Assessment (8 questions, 2 min)
  → 15-min Demo Class auto-starts (10 min video + 5 min project, class-specific)
  → Offer: Rs.6,000/month | Tue + Fri | from April 15
  → Paid: email confirmation + schedule
  → Not paid: WhatsApp nurture Touch 1 (Day 1) / Touch 2 (Day 3) / Touch 3 (Day 7)
```

## Revenue targets

| Month | Leads | Paid students | Revenue |
|-------|-------|---------------|---------|
| Apr 15–May 15 | 3,000 | 150 | Rs.8-12L |
| May 15–Jun 15 | 6,000 | 300 | Rs.12-20L |
| Jun 15–Jul 15 | 10,000 | 450 | Rs.15-30L |

## When making changes

1. **Agent prompt change** → edit `agents.js` only. The change applies to all 7 agents on the next run.
2. **Funnel change** → edit `masterBrief.js` first, then update `agents.js` to match.
3. **New integration** → add API key to `.env.example`, read it in the relevant module.
4. **Domain switch** → change `SITE_URL` in `.env`. Done.
5. **New cron schedule** → edit `scheduler.js`.

## Environment variables required

| Variable | Required | Description |
|----------|----------|-------------|
| ANTHROPIC_API_KEY | YES | Runs all 7 agents |
| DASHBOARD_SECRET | YES | Dashboard login |
| SITE_URL | YES | wisetribes.online or wisetribes.in |
| PERPLEXITY_API_KEY | recommended | Real-time research |
| HEYGEN_API_KEY | recommended | Video generation |
| HEYGEN_AVATAR_ID | recommended | Your created avatar ID |
| WHATSAPP_TOKEN | recommended | Lead nurture messages |
| WHATSAPP_PHONE_ID | recommended | WhatsApp Business phone |
| KAJOL_WHATSAPP | recommended | Kajol's number for digest |
| META_ACCESS_TOKEN | recommended | Ad auto-publish |
| RAZORPAY_PAYMENT_LINK | recommended | Rs.6,000/month payment link |
| SMTP_USER | optional | Email digest |
| SMTP_PASS | optional | Email app password |

## How to run

```bash
# First time setup
cp .env.example .env
nano .env          # fill in your keys
npm install
node index.js      # starts everything

# To trigger the full pipeline manually right now
curl -X POST http://localhost:3000/run/weekly?secret=YOUR_DASHBOARD_SECRET

# To add a new lead manually
curl -X POST http://localhost:3000/lead?secret=YOUR_SECRET \
  -H "Content-Type: application/json" \
  -d '{"phone":"919999999999","name":"Parent Name","childName":"Child","childClass":"7"}'
```

## Common tasks for Claude Code

- "Update all agents to reflect new pricing" → edit `agents.js` MASTER_BRIEF section + agent-specific prompts
- "Switch to production domain" → change `SITE_URL` in `.env`
- "Add a new cron job" → add to `scheduler.js`
- "The nurture sequence isn't working" → check `db.js` getLeadsDueForFollowup() + `scheduler.js` 30-min cron
- "Add Instagram API for auto-posting" → new module `instagram.js`, call from `scheduler.js`
