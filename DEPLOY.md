# WiseTribes — Hostinger VPS Deployment Guide

## Where to upload on Hostinger VPS

Your files go here: `/var/www/wisetribes-agent/`

---

## Step 1 — Connect to your VPS

Open terminal on your laptop and SSH in:
```bash
ssh root@YOUR_VPS_IP
```
(Find your VPS IP in Hostinger hPanel → VPS → Manage → Overview)

---

## Step 2 — Create the folder and upload files

On your VPS, create the directory:
```bash
mkdir -p /var/www/wisetribes-agent
cd /var/www/wisetribes-agent
```

Then upload the tar file from your laptop (run this on YOUR laptop, not VPS):
```bash
scp wisetribes-agent-v3.tar.gz root@YOUR_VPS_IP:/var/www/
```

Back on the VPS, extract it:
```bash
cd /var/www
tar -xzf wisetribes-agent-v3.tar.gz
cd wisetribes-agent
```

---

## Step 3 — Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version   # should show v20+
```

---

## Step 4 — Install dependencies

```bash
cd /var/www/wisetribes-agent
npm install
```

---

## Step 5 — Create your .env file

```bash
cp .env.example .env
nano .env
```

Fill in these values in nano:
- ANTHROPIC_API_KEY → your existing key
- TAVILY_API_KEY → get free at app.tavily.com (2 min, no card)
- HEYGEN_API_KEY → your existing key
- HEYGEN_AVATAR_ID → after you create avatar in HeyGen
- KAJOL_WHATSAPP → 918793015698 (already set)
- DASHBOARD_SECRET → change to something you'll remember
- SITE_URL → wisetribes.online (change to wisetribes.in when ready)

Save: Ctrl+X → Y → Enter

---

## Step 6 — Test it runs

```bash
node index.js
```

You should see:
```
╔══════════════════════════════════════════╗
║   WiseTribes AI Marketing Team v1.0      ║
╚══════════════════════════════════════════╝
[Config] Optional integrations status:
  ✓ configured     Tavily research
  ✓ configured     HeyGen video generation
  ...
[Dashboard] Running at http://localhost:3000
[Scheduler] All cron jobs registered
```

Press Ctrl+C to stop for now.

---

## Step 7 — Keep it running forever with PM2

```bash
npm install -g pm2
pm2 start index.js --name wisetribes-agent
pm2 save
pm2 startup   # copy and run the command it gives you
```

Now it runs forever — restarts on crash, restarts on VPS reboot.

Check it's running:
```bash
pm2 status
pm2 logs wisetribes-agent
```

---

## Step 8 — Open dashboard from your browser

The dashboard runs on port 3000. To access from outside:

Option A — Open port 3000 in Hostinger firewall:
- Hostinger hPanel → VPS → Firewall → Add Rule → Port 3000 → TCP → Save
- Then visit: http://YOUR_VPS_IP:3000?secret=YOUR_DASHBOARD_SECRET

Option B — Point a subdomain to it (recommended):
- Add DNS: admin.wisetribes.in → A record → YOUR_VPS_IP
- Install nginx as reverse proxy (ask Claude Code to do this)

---

## Step 9 — Trigger your first run

In your browser, open:
```
http://YOUR_VPS_IP:3000/run/weekly?secret=YOUR_DASHBOARD_SECRET
```

This manually triggers the full pipeline. Watch the logs:
```bash
pm2 logs wisetribes-agent
```

In 3-5 minutes, check the dashboard — you'll see the first outputs ready for approval.

---

## Switching to production domain (wisetribes.in)

When ready to go live:
```bash
nano /var/www/wisetribes-agent/.env
# Change: SITE_URL=wisetribes.online
# To:     SITE_URL=wisetribes.in
pm2 restart wisetribes-agent
```

That's it. Every agent, email, and WhatsApp message now uses wisetribes.in.

---

## Updating agents (zero copy-paste)

Whenever you want to change agent behaviour:
```bash
cd /var/www/wisetribes-agent
nano agents.js          # edit the system prompt
pm2 restart wisetribes-agent
```

All 7 agents update instantly on the next pipeline run.

---

## Common commands

```bash
pm2 status                          # is it running?
pm2 logs wisetribes-agent           # see what's happening
pm2 restart wisetribes-agent        # apply changes
pm2 stop wisetribes-agent           # stop
curl localhost:3000/run/weekly?secret=YOUR_SECRET -X POST   # trigger pipeline
```
