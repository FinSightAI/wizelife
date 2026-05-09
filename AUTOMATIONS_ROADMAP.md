# WizeLife Automations & Agents — Roadmap

> What's already shipped, what needs your action, what needs further build.

---

## ✅ Built & active

### 1. Daily QA workflow
- File: `.github/workflows/daily-qa.yml`
- Runs: 06:00 UTC daily (09:00 Israel)
- Posts: `📊 Daily QA Status` rolling issue + alert issues on failures
- GitHub email notification automatic.

### 2. Render keep-alive
- File: `tax master/.github/workflows/keepalive.yml`
- Runs: every 5 minutes
- Pings: `master-backend-79jx.onrender.com/health`
- Prevents free-tier sleep.

### 3. Tax Law Watcher (newly built)
- File: `wizelife/.github/workflows/tax-law-watcher.yml`
- Runs: Monday 07:00 UTC (09:00 Israel)
- Searches Tavily for IL/BR/US tax law updates
- Opens GitHub issue with summary + sources
- **Action needed:** add `TAVILY_API_KEY` to GitHub Secrets at
  `https://github.com/FinSightAI/wizelife/settings/secrets/actions`
  (same value as in Render). Without it, the workflow skips silently.

### 4. Stock price alerts (newly built)
- File: `finance dashboard/js/stock-alerts.js`
- Runs: in the user's browser whenever stocks page polls prices
- User flow:
  1. Open `pages/stocks.html`
  2. Click "🔔 Set alert" on any holding (UI in stock-alerts.html or wherever surfaced)
  3. Allow browser notifications when prompted
  4. When triggered → desktop/mobile notification with symbol + threshold
- **Already wired**, just needs UI pinned somewhere prominent + user opts in once.

---

## 🔧 Built skeleton, needs your wiring

### 5. Weekly digest email (item #1)
**Goal:** every Sunday, each user receives an email summarizing their cross-app
state — bank balance change, goal progress %, top stock movers, days
since last health record, etc.

**What's needed:**
1. Email service. Pick one (free tiers):
   - **Resend** (recommended) — 100 emails/day free, Node SDK, modern.
     Sign up at https://resend.com → create API key.
   - SendGrid — 100/day free
   - Mailgun — 1k/month free
2. Cloud Function or cron worker. Cheapest = Render Background Worker ($0
   on free, runs 750h/month) OR GitHub Actions cron (free).
3. Code outline (paste into `master-backend/digest_worker.py`):

```python
# digest_worker.py — runs daily, sends Sunday digests
import asyncio, os, datetime, httpx
from firebase_admin import firestore, initialize_app
initialize_app()
db = firestore.client()

async def send_digest(user):
    # Compose digest using user's portfolio + goals + health data
    body_html = build_digest_html(user)
    async with httpx.AsyncClient() as client:
        await client.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {os.environ["RESEND_API_KEY"]}'},
            json={
                'from': 'WizeLife <noreply@wizelife.ai>',
                'to': [user['email']],
                'subject': f'WizeLife Weekly — {datetime.date.today()}',
                'html': body_html,
            },
        )

async def main():
    if datetime.date.today().weekday() != 6:  # Sunday only
        return
    users = db.collection('users').where('digestOptIn', '==', True).stream()
    await asyncio.gather(*[send_digest(u.to_dict()) for u in users])

if __name__ == '__main__':
    asyncio.run(main())
```

4. Add `RESEND_API_KEY` to Render env vars
5. Schedule with Render Cron Job ($0 free) OR GitHub Action

**Effort: ~2 hours once you have the Resend key.**

### 6. Tax deadline reminders (item #2)
Same infrastructure as #5. Reuse the digest worker but check known dates:

```python
DEADLINES = {
    'IL': [(5, 31, 'Israeli annual tax return due')],
    'BR': [(4, 30, 'Brazilian IRPF deadline')],
    'US': [(4, 15, 'US 1040 deadline'), (10, 15, 'extended deadline')],
}
```

If today is 14/30/60 days before any deadline relevant to the user's
country, send reminder. **Effort: ~1 hour after #5.**

### 7. Goal progress nudge (item #3)
Pure frontend, no email needed. Add to `pages/goals.html`:

```js
// On page load, check for milestone crossings
const goals = Storage.get('finance_goals') || [];
const lastSeen = JSON.parse(localStorage.getItem('finance_goal_lastseen') || '{}');
goals.forEach(g => {
    const pct = Math.floor((g.currentAmount / g.targetAmount) * 100);
    const milestones = [25, 50, 75, 90, 100];
    const last = lastSeen[g.id] || 0;
    const crossed = milestones.find(m => last < m && pct >= m);
    if (crossed) {
        showBanner(`🎯 You're at ${crossed}% of "${g.name}"! Keep going.`);
        lastSeen[g.id] = crossed;
    }
});
localStorage.setItem('finance_goal_lastseen', JSON.stringify(lastSeen));
```

**Effort: ~30 min, pure JS in goals.html / dashboard.html.**

### 8. Inactivity nudge (item #4)
Same email infra as #5. Track `lastSeenAt` in Firestore on each login,
nightly worker scans `users` for `lastSeenAt < 30 days ago` and sends
"we miss you, here's what's new" email.

### 9. Auto-categorize bank transactions (item #6)
Frontend addition to `pages/bank.html`. Batch unprocessed transactions,
send to Gemini, get categories back.

```js
// In bank.html, after import
async function autoCategorize(transactions) {
    const uncategorized = transactions.filter(t => !t.category);
    if (!uncategorized.length) return;
    const prompt = `Categorize each transaction into one of: Food, Rent, Transport, Bills, Salary, Investment, Entertainment, Health, Other. Reply ONLY as JSON array of {id, category}.\n\n` +
        uncategorized.map(t => `${t.id}: ${t.description} (${t.amount})`).join('\n');
    const res = await fetch('https://master-backend-79jx.onrender.com/api/ai-proxy', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: [{role:'user',parts:[{text:prompt}]}], maxTokens: 1024 })
    });
    const json = await res.json();
    try {
        const cats = JSON.parse(json.text.match(/\[[\s\S]+\]/)[0]);
        cats.forEach(c => {
            const tx = transactions.find(t => t.id === c.id);
            if (tx) tx.category = c.category;
        });
        Storage.set('finance_transactions', transactions);
    } catch {}
}
```

**Effort: ~1 hour. No new infra — uses existing /api/ai-proxy.**

---

## 🤖 Agents (need Anthropic API + worker infra)

### 10. GitHub Bot agent (item #22)
**Goal:** When daily QA opens a `qa-alert` issue, an agent reads the
report, makes the obvious fixes, opens a PR.

**What's needed:**
1. Anthropic API key (paid, ~$0.05-$0.50 per fix run — bills as you go)
2. GitHub Action workflow listening to `issues` event with `qa-alert` label
3. Workflow runs Node script that:
   - Reads the issue body
   - Calls Claude API with project context + issue
   - Applies returned diff to code
   - Pushes branch + opens PR
4. Add `ANTHROPIC_API_KEY` to GitHub Secrets

**Sketch (`.github/workflows/qa-fix-bot.yml`):**
```yaml
on:
  issues:
    types: [labeled]
jobs:
  fix:
    if: github.event.label.name == 'qa-alert'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install @anthropic-ai/sdk
      - run: node scripts/qa-fix-agent.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ISSUE_BODY: ${{ github.event.issue.body }}
```

**Risk:** AI making code changes without human review. Mitigation: open
PR (don't merge), require manual review.

**Effort: ~6 hours to build correctly.**

### 11. Email reply agent (item #23)
**Goal:** User feedback emails go to a dedicated inbox; agent reads,
classifies, opens GitHub issue, optionally drafts a reply.

**What's needed:**
1. Dedicated email address (e.g., `feedback@wizelife.ai` — use a Google
   Workspace user OR a Resend inbox webhook)
2. IMAP poller OR Resend inbound webhook
3. Anthropic API for classification + draft reply
4. Worker on Render Cron or GitHub Actions

**Effort: ~8 hours. Best deferred until 100+ users actually email feedback.**

### 12. Customer support chat agent (item #25)
**Goal:** Chat widget on wizelife.ai/dashboard answers basic questions
from a knowledge base + escalates real issues to you.

**What's needed:**
1. Knowledge base (FAQ doc) — start from your existing FAQ section
2. Vector DB (Pinecone/Qdrant free tier OR pgvector on Supabase free)
3. Embedding the FAQ + every chat message
4. Frontend widget (or use existing `chat-widget` component)
5. Anthropic API for response generation
6. Escalation flow (button "Talk to a human" → Telegram/email)

**Effort: ~12 hours to do it right. Best deferred until 500+ users.**

---

## 📋 Order of operations recommendation

For your stage (post-launch, low traffic, solo dev):

**This week (~2 hours):**
- Add `TAVILY_API_KEY` to GitHub Secrets → tax-law-watcher activates Monday
- Build #7 (goal progress nudge) — pure frontend, no infra

**Next week (~3 hours):**
- Sign up for Resend, get API key
- Build #5 (weekly digest) skeleton + #6 (deadline reminders)
- Add `RESEND_API_KEY` to Render env, schedule a daily cron

**Within the month (~3 hours):**
- Build #9 (auto-categorize transactions)

**When you have 100+ users (~6 hours):**
- Build #8 (inactivity nudge)
- Build #10 (GitHub Bot fix-agent)

**When you have 500+ users:**
- #11 + #12

---

_This file lives in the repo and stays alongside ARCHITECTURE.md. Update
it when you complete an item or add a new one._
