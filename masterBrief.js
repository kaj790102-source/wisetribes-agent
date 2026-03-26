require('dotenv').config();

const SITE = process.env.SITE_URL || 'wisetribes.online';

const MASTER_BRIEF = `
WISETRIBES MASTER BRIEF — ALL AGENTS REFERENCE THIS

COMPANY
- Product: WiseTribes — AI learning for students Classes 5-10, India
- Founder: Kajol Pandey | info@wisetribes.in | +918793015698
- Website: ${SITE} (testing: wisetribes.online | production: wisetribes.in)
- Instagram: @wisetribes_26
- GTM window: April 15 – July 15, 2025 (90 days)

OFFER
- ONE offer only: Rs.6,000/month
- 2 live AI classes per week — every Tuesday + Friday
- Classes start April 15, 2025
- AI-delivered classes (separate system)
- NO 3-Day cohort. NO Rs.2,500. NO Rs.12,000-18,000. One price, one offer.

FUNNEL SEQUENCE (exact, no deviations)
1. Lead arrives via UGC video / Meta ad / YouTube / Instagram organic
2. Parent lands on ${SITE}
3. Child takes Free AI Assessment (8 questions, 2 min, instant scorecard)
4. Assessment ends -> 15-min Demo Class auto-starts immediately (no scheduling, no waiting)
   - 10 min: AI basics video tailored to child's class level (5-6 / 7-8 / 9-10)
   - 5 min: hands-on mini project appropriate to class
5. Demo ends -> Offer: Rs.6,000/month | Tue + Fri classes | from April 15
6A. Buyer -> Payment confirmed -> email: receipt + full class schedule (Tue+Fri from Apr 15)
6B. Non-buyer -> WhatsApp nurture — 3 touches minimum:
    Touch 1 (Day 1): What their child missed + what others are building
    Touch 2 (Day 3): Parent testimonial / social proof
    Touch 3 (Day 7): Last chance + urgency (seats filling, April 15 starting)

REVENUE TARGETS (unchanged)
- Month 1 (Apr 15–May 15): Rs.8-12L  | 3,000 leads
- Month 2 (May 15–Jun 15): Rs.12-20L | 6,000 leads
- Month 3 (Jun 15–Jul 15): Rs.15-30L | 10,000 leads
- Total 90-day: Rs.36L-67L | 300-450 paid students
- CAC target: Rs.1,200 | Gross margin: 65%

CONVERSION BENCHMARKS (higher — zero friction funnel)
- Lead -> Assessment start: 40%
- Assessment -> Demo watch: 70% (auto-starts immediately)
- Demo -> Paid: 15-20%
- Overall lead -> paid: ~6-8%

CHANNEL SPLIT
- Meta Ads: 60% of leads | CPL Rs.80-120 | Parents 30-45, interests: IIT, coding, Byju's
- YouTube: 25% of leads | Tutorial + shorts + search intent
- Instagram organic: 15% of leads | Reels (fear + proof + demo clips)

PRIMARY HOOK (non-negotiable)
"Your child will compete with AI. We train them to stay ahead of it."

Secondary hooks:
- "By age 15, your child should be building — not just studying."
- "Coding is outdated. AI leverage is the new skill."
- "Classes start April 15. Limited seats. Free assessment takes 2 minutes."

BRAND VOICE
- Warm, urgent, intelligent. Speaks to parent anxiety. Never salesy.
- Never use: pedagogy, LMS, holistic, curriculum-aligned, 21st century skills
- Language: English + Hinglish mix for captions. Formal English for blogs/email.

CONTENT FACE
- WiseTribes AI Teacher Avatar (HeyGen) — all video content
- Kajol only for WhatsApp replies and discovery calls

CONTENT PILLARS
1. Fear and urgency — AI is changing everything, child needs to be ready
2. Proof — students building real things, demo clips, projects
3. Education — explain AI in parent-friendly language
4. Behind the scenes — program, teachers, how it works
5. CTA — free assessment, Rs.6,000/month enrollment (max 20% of content)

ALL AD CTAs POINT TO: ${SITE} (assessment page)

LINKS
- Assessment + demo: ${SITE}
- Discovery call: calendly.com/wisetribes26/discovery-call-wisetribes
- Payment: Razorpay (Rs.6,000/month subscription link in env)
`;

module.exports = { MASTER_BRIEF, SITE };
