# QE Playbook Assistant — Demo

An AI-powered assistant for managing a quality engineering playbook. Chat with your
documented principles, failure patterns, checklists, and metrics to surface insights,
capture new entries, and generate sprint retrospective reports.

**Powered by [GitHub Models](https://docs.github.com/en/github-models) — free for any GitHub account, no payment method required.**

---

## What it does

- **Chat with your playbook** — ask questions about past failures, principles, or checklists; the assistant answers using your documented content as context
- **Capture new entries** — describe a sprint retrospective finding in natural language; the assistant formats it as a playbook entry ready to save
- **Review reports** — generate a structured review of a conversation (issue types, key decisions, prevention measures) with one click
- **Browse playbook files** — view any markdown file from the sidebar with full formatting

---

## Setup (5 minutes)

### 1. Install Node.js

Node.js 18 or later is required. Download from [nodejs.org](https://nodejs.org).

### 2. Install dependencies

```bash
npm install
```

### 3. Get a GitHub personal access token

This app uses [GitHub Models](https://docs.github.com/en/github-models) — GitHub's free AI inference API.
You need a free GitHub account and a personal access token.

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
   - Or visit: https://github.com/settings/tokens/new
2. Create a token with **no special scopes** — the default is sufficient
3. Copy the token (starts with `ghp_`)

> **Fine-grained tokens** (starting with `github_pat_`) also work, but classic tokens are
> simpler to create for demos.

### 4. Start the server

```bash
node server.js
```

Open http://localhost:3000. On first run, a setup screen guides you through entering your token.
The token is saved to `secrets.json` (git-ignored) and reloaded automatically on server restarts.

---

## GitHub Models — what you need to know

| Limit | Free tier |
|---|---|
| Requests per minute | 15 |
| Requests per day | 150 |
| Context window | 128k tokens |
| Model | gpt-4o |

Rate limits are per GitHub account, not per app. 150 requests/day is plenty for demos and personal use.

If you hit rate limits, the server returns a clear error message.

For production workloads, GitHub Models also offers [paid tiers](https://docs.github.com/en/github-models/prototyping-with-ai-models#rate-limits).

---

## Project structure

```
qe-playbook-demo/
  server.js              — Express server, GitHub Models integration, all API routes
  package.json
  .gitignore
  secrets.example.json   — Reference format (copy to secrets.json and add your token)
  .env                   — Optional: PORT=3000 override
  playbook/              — Markdown files loaded as AI context
    00-principles.md
    01-patterns-and-failures.md
    02-checklists-and-templates.md
    03-metrics-and-decisions.md
  public/
    index.html           — App shell
    app.js               — Client-side logic
    style.css            — Styles
```

---

## Customizing the playbook

Add, edit, or remove any `.md` files in the `playbook/` folder. The server reads all markdown files
at request time, so changes take effect immediately — no restart needed.

The assistant's system prompt instructs it to answer using the playbook content as context and to
generate structured `PLAYBOOK_ENTRY` XML when users want to capture new findings.

---

## Security notes

- `secrets.json` and `.env` are git-ignored — never committed
- The GitHub token is stored locally on your machine only
- Token is sent only to `models.inference.ai.azure.com` (GitHub Models endpoint)
- The setup UI accepts any non-empty string, but token validity is verified via a test API call before saving

---

## Troubleshooting

**Server starts but setup overlay doesn't appear**
- Open browser DevTools → Network → check that `/api/status` returns `{ "configured": false }`
- Hard-refresh the page (Ctrl+Shift+R)

**"Token validation failed" error during setup**
- Confirm the token starts with `ghp_` or `github_pat_`
- Check that your GitHub account has Models access (visit https://github.com/marketplace/models)
- Try creating a new token — tokens expire if you set an expiration date

**Rate limit errors during use**
- GitHub Models free tier: 15 requests/minute, 150/day
- Wait a minute and try again, or use a different GitHub account

**Port already in use**
- Change the port: edit `.env` and set `PORT=3001` (or any open port)
