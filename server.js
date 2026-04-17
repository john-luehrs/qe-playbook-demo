require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// ── Configuration ────────────────────────────────────────────────────────────
const PORT              = parseInt(process.env.PORT, 10) || 3000;
const SECRETS_PATH      = path.join(__dirname, 'secrets.json');
const PLAYBOOK_DIR      = path.join(__dirname, 'playbook');
const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com';
const MODEL             = 'gpt-4o';

// ── Token management ─────────────────────────────────────────────────────────
let githubToken = '';

function loadToken() {
  if (!fs.existsSync(SECRETS_PATH)) return;
  try {
    const s = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
    if (s.GITHUB_TOKEN) githubToken = s.GITHUB_TOKEN.trim();
  } catch { /* ignore, setup UI will collect it */ }
}

function saveToken(token) {
  fs.writeFileSync(SECRETS_PATH, JSON.stringify({ GITHUB_TOKEN: token }, null, 2), 'utf-8');
  githubToken = token;
}

function getClient() {
  return new OpenAI({ baseURL: GITHUB_MODELS_URL, apiKey: githubToken });
}

loadToken();

if (githubToken) {
  console.log('\n✅  GitHub token loaded from secrets.json');
} else {
  console.log('\n⚠️   No GitHub token found — open http://localhost:' + PORT + ' to complete setup');
}

// ── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(PLAYBOOK_DIR)) fs.mkdirSync(PLAYBOOK_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────
function readPlaybookFiles() {
  const files = {};
  try {
    const filenames = fs.readdirSync(PLAYBOOK_DIR).filter((f) => f.endsWith('.md'));
    filenames.forEach((f) => {
      const content = fs.readFileSync(path.join(PLAYBOOK_DIR, f), 'utf-8');
      files[f] = content.length > 3000 ? content.slice(-3000) : content;
    });
  } catch (err) {
    console.error('Error reading playbook files:', err.message);
  }
  return files;
}

function buildSystemPrompt(playbookContent) {
  const today = new Date().toISOString().split('T')[0];
  const playbookSection =
    Object.keys(playbookContent).length > 0
      ? Object.entries(playbookContent)
          .map(([name, content]) => `### ${name}\n${content}`)
          .join('\n\n')
      : 'No entries captured yet — this is a fresh playbook.';

  return `You are a Quality Engineering reflection partner for a senior QE engineer. Your role is to help them maintain a personal operating playbook that captures real project experiences.

Your responsibilities:
1. Help the user reflect on QE issues, near-misses, decisions, and recurring patterns
2. Ask focused clarifying questions (one at a time) to extract the full picture
3. Identify when something resembles a past pattern — call it out explicitly
4. Generate structured playbook entries when you have enough context
5. Suggest which section the entry belongs in (patterns, checklist, principle, or metric)

When capturing an issue, guide the user through:
- What happened (observed issue)
- Why it happened (root cause)
- What was decided or done (decision/fix)
- How to prevent recurrence (prevention)

When you have enough detail to write an entry, output it using EXACTLY this format (valid JSON inside the XML tags):

<PLAYBOOK_ENTRY>
{"title":"...","date":"${today}","context":"...","observed_issue":"...","root_cause":"...","decision_fix":"...","prevention":"...","target_file":"01-patterns-and-failures.md"}
</PLAYBOOK_ENTRY>

Target file options:
- "00-principles.md" — core QE beliefs and standing rules
- "01-patterns-and-failures.md" — recurring issues and failure modes
- "02-checklists-and-templates.md" — actionable process items
- "03-metrics-and-decisions.md" — data-driven decisions and measurements

When you see similarities to past entries, say explicitly: "This resembles a pattern from [date/title]" and note what's recurring.

Keep responses conversational and concise. Do not over-explain. Match the user's pace.

Today's date: ${today}

--- Current Playbook Contents ---
${playbookSection}`;
}

// ── API: Status ───────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ configured: !!githubToken });
});

// ── API: Setup (save + validate GitHub token) ─────────────────────────────────
app.post('/api/setup', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return res.status(400).json({ error: 'Please enter a valid GitHub personal access token.' });
  }
  const trimmed = token.trim();

  // Validate by making a minimal call to GitHub Models
  try {
    const testClient = new OpenAI({ baseURL: GITHUB_MODELS_URL, apiKey: trimmed });
    await testClient.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
      max_tokens: 5,
    });
  } catch (err) {
    const msg = err?.status === 401 || err?.status === 403
      ? 'Token rejected by GitHub. Make sure it is a valid PAT with Models access.'
      : `Validation failed: ${err.message}`;
    return res.status(401).json({ error: msg });
  }

  saveToken(trimmed);
  console.log('✅  GitHub token saved via setup UI');
  res.json({ ok: true });
});

// ── API: Chat ─────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!githubToken) return res.status(401).json({ error: 'Not configured. Complete setup first.' });

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const trimmedMessages = messages.slice(-30);

  try {
    const playbookContent = readPlaybookFiles();
    const systemPrompt = buildSystemPrompt(playbookContent);

    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...trimmedMessages],
      temperature: 0.7,
      max_tokens: 1500,
    });

    res.json({ message: response.choices[0].message });
  } catch (err) {
    console.error('GitHub Models error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: List playbook files ──────────────────────────────────────────────────
app.get('/api/playbook', (req, res) => {
  try {
    const files = fs.readdirSync(PLAYBOOK_DIR).filter((f) => f.endsWith('.md'));
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

// ── API: Read a playbook file ─────────────────────────────────────────────────
app.get('/api/playbook/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename.endsWith('.md')) {
    return res.status(400).json({ error: 'Only .md files are accessible' });
  }
  const filepath = path.join(PLAYBOOK_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  res.json({ filename, content });
});

// ── API: Save a structured entry ──────────────────────────────────────────────
app.post('/api/entries', (req, res) => {
  const { entry } = req.body;
  if (!entry || typeof entry !== 'object') {
    return res.status(400).json({ error: 'entry object is required' });
  }

  const { title, date, context, observed_issue, root_cause, decision_fix, prevention, target_file } = entry;

  const allowedFiles = [
    '00-principles.md',
    '01-patterns-and-failures.md',
    '02-checklists-and-templates.md',
    '03-metrics-and-decisions.md',
  ];
  const filename = path.basename(target_file || '');
  if (!allowedFiles.includes(filename)) {
    return res.status(400).json({ error: 'Invalid target file' });
  }

  const filepath = path.join(PLAYBOOK_DIR, filename);

  const markdown = `
## ${title || 'Untitled Entry'}

**Date:** ${date || new Date().toISOString().split('T')[0]}  
**Context:** ${context || ''}

**Observed Issue**  
${observed_issue || ''}

**Root Cause**  
${root_cause || ''}

**Decision / Fix**  
${decision_fix || ''}

**Prevention**  
${prevention || ''}

---
`;

  try {
    fs.appendFileSync(filepath, markdown, 'utf-8');
    res.json({ success: true, file: filename });
  } catch (err) {
    console.error('Error writing entry:', err.message);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// ── API: Playbook review ──────────────────────────────────────────────────────
app.post('/api/review', async (req, res) => {
  if (!githubToken) return res.status(401).json({ error: 'Not configured. Complete setup first.' });

  const playbookContent = readPlaybookFiles();

  const combinedContent =
    Object.keys(playbookContent).length > 0
      ? Object.entries(playbookContent)
          .map(([name, content]) => `### ${name}\n${content}`)
          .join('\n\n')
      : null;

  if (!combinedContent) {
    return res.json({ issue_types: [], decisions: [], top_preventions: [], empty: true });
  }

  const reviewPrompt = `You are analysing a Quality Engineering playbook to produce an executive-level review.

Below is the full playbook content. Read it carefully and return a JSON object with exactly these three keys:

1. "issue_types" — an array of up to 8 general issue category objects. Each has:
   - "category": short label (e.g. "Timeline / Schedule Pressure")
   - "count": integer — how many distinct entries map to this category
   - "description": one sentence summary of the pattern

2. "decisions" — an array of the most significant decisions made across all entries (up to 8 items). Each has:
   - "title": short label for the decision
   - "summary": one sentence describing what was decided and why

3. "top_preventions" — an array of exactly 5 preventative measures ranked by how broadly they would prevent recurrence across multiple issue types. Each has:
   - "rank": 1–5
   - "measure": concise action title (e.g. "Centralise version tracking")
   - "rationale": one to two sentences explaining the impact and which issue types it addresses

Return ONLY the JSON object — no markdown fences, no preamble, no explanation.

--- PLAYBOOK CONTENT ---
${combinedContent}`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: reviewPrompt }],
      temperature: 0.3,
      max_tokens: 1800,
    });

    const raw = response.choices[0].message.content || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    }
    res.json(parsed);
  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nQE Playbook Assistant  →  http://localhost:${PORT}`);
  console.log('   Model  : GitHub Models / gpt-4o (free tier)');
  if (!githubToken) {
    console.log('   Status : ⚠️  Setup required — visit the URL above to add your GitHub token\n');
  } else {
    console.log('   Status : ✅ Ready\n');
  }
});
