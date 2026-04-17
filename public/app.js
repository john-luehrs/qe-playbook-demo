// ─── State ───────────────────────────────────────────────────
let conversationHistory = [];

// ─── DOM References ──────────────────────────────────────────
const messagesEl    = document.getElementById('messages');
const userInput     = document.getElementById('userInput');
const sendBtn       = document.getElementById('sendBtn');
const fileList      = document.getElementById('fileList');
const viewerPanel   = document.getElementById('viewerPanel');
const viewerTitle   = document.getElementById('viewerTitle');
const viewerBody    = document.getElementById('viewerBody');
const closeViewer   = document.getElementById('closeViewer');
const refreshFiles  = document.getElementById('refreshFiles');
const newChatBtn    = document.getElementById('newChatBtn');
const reviewBtn     = document.getElementById('reviewBtn');
const reviewOverlay = document.getElementById('reviewOverlay');
const reviewModalBody = document.getElementById('reviewModalBody');
const closeReview   = document.getElementById('closeReview');
const setupOverlay  = document.getElementById('setupOverlay');
const tokenInput    = document.getElementById('tokenInput');
const saveTokenBtn  = document.getElementById('saveTokenBtn');
const setupError    = document.getElementById('setupError');

// ─── Utilities ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function textToParagraphs(text) {
  return text
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${renderInlineMarkdown(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ─── PLAYBOOK_ENTRY Parsing ───────────────────────────────────
function parseEntryFromText(text) {
  const match = text.match(/<PLAYBOOK_ENTRY>([\s\S]*?)<\/PLAYBOOK_ENTRY>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function stripEntryTag(text) {
  return text.replace(/<PLAYBOOK_ENTRY>[\s\S]*?<\/PLAYBOOK_ENTRY>/g, '').trim();
}

// ─── Render: Chat Messages ────────────────────────────────────
function appendMessage(role, text, entry = null) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const content = document.createElement('div');
  content.className = 'message-content';

  const displayText = role === 'assistant' ? stripEntryTag(text) : text;
  content.innerHTML = textToParagraphs(displayText);

  if (entry) {
    content.appendChild(buildEntryCard(entry));
  }

  wrapper.appendChild(content);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrapper;
}

function appendTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message assistant';
  wrapper.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrapper;
}

// ─── Render: Entry Card ───────────────────────────────────────
function buildEntryCard(entry) {
  const card = document.createElement('div');
  card.className = 'entry-card';

  const fields = [
    ['Observed Issue', entry.observed_issue],
    ['Root Cause', entry.root_cause],
    ['Decision / Fix', entry.decision_fix],
    ['Prevention', entry.prevention],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div class="entry-field"><strong>${k}:</strong> ${escapeHtml(v)}</div>`)
    .join('');

  card.innerHTML = `
    <div class="entry-card-header">✦ Ready to Save — Playbook Entry</div>
    <div class="entry-field"><strong>Title:</strong> ${escapeHtml(entry.title || '')}</div>
    <div class="entry-field"><strong>Context:</strong> ${escapeHtml(entry.context || '')}</div>
    ${fields}
    <div class="entry-target">Save to: <strong>${escapeHtml(entry.target_file || '')}</strong></div>
    <div class="entry-actions">
      <button class="btn-save">Save to Playbook</button>
      <button class="btn-discard">Discard</button>
    </div>`;

  const saveBtn    = card.querySelector('.btn-save');
  const discardBtn = card.querySelector('.btn-discard');

  saveBtn.addEventListener('click', async function () {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      });

      if (res.ok) {
        saveBtn.textContent = 'Saved ✓';
        saveBtn.style.background = '#86efac';
        saveBtn.style.color = '#166534';
        discardBtn.style.display = 'none';
        appendMessage(
          'assistant',
          `Entry saved to **${entry.target_file}**. Your playbook has been updated.\n\nWould you like to reflect on anything else, or review the file in the sidebar?`
        );
        loadFiles();
      } else {
        const data = await res.json();
        saveBtn.textContent = 'Save failed — retry';
        saveBtn.disabled = false;
        console.error('Save error:', data.error);
      }
    } catch (err) {
      saveBtn.textContent = 'Save failed — retry';
      saveBtn.disabled = false;
      console.error('Network error:', err);
    }
  });

  discardBtn.addEventListener('click', () => {
    card.style.opacity = '0.4';
    saveBtn.disabled = true;
    discardBtn.disabled = true;
    discardBtn.textContent = 'Discarded';
  });

  return card;
}

// ─── Send Message ─────────────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || sendBtn.disabled) return;

  appendMessage('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;

  conversationHistory.push({ role: 'user', content: text });

  const typing = appendTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    typing.remove();

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      appendMessage('assistant', `Error: ${data.error || res.statusText}`);
      sendBtn.disabled = false;
      return;
    }

    const data = await res.json();
    const assistantText = data.message?.content || '';
    conversationHistory.push({ role: 'assistant', content: assistantText });

    const entry = parseEntryFromText(assistantText);
    appendMessage('assistant', assistantText, entry);
  } catch (err) {
    typing.remove();
    appendMessage('assistant', 'Could not reach the server. Make sure the assistant is running.');
    console.error(err);
  }

  sendBtn.disabled = false;
  userInput.focus();
}

// ─── New Chat ─────────────────────────────────────────────────
function newChat() {
  conversationHistory = [];
  messagesEl.innerHTML = '';
  appendMessage(
    'assistant',
    "Starting fresh. Tell me about an issue, near-miss, or decision you'd like to capture."
  );
  userInput.focus();
}

// ─── Playbook File Management ─────────────────────────────────
async function loadFiles() {
  try {
    const res = await fetch('/api/playbook');
    const data = await res.json();

    fileList.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      fileList.innerHTML = '<p class="muted-text">No playbook files found.</p>';
      return;
    }

    data.files.forEach((filename) => {
      const btn = document.createElement('button');
      btn.className = 'file-item';
      btn.textContent = filename;
      btn.addEventListener('click', () => openFile(filename, btn));
      fileList.appendChild(btn);
    });
  } catch {
    fileList.innerHTML = '<p class="muted-text">Error loading files.</p>';
  }
}

async function openFile(filename, itemEl) {
  document.querySelectorAll('.file-item').forEach((el) => el.classList.remove('active'));
  itemEl.classList.add('active');

  viewerTitle.textContent = filename;
  viewerBody.innerHTML = '<p class="muted-text">Loading…</p>';
  viewerPanel.classList.remove('hidden');

  try {
    const res = await fetch(`/api/playbook/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    viewerBody.innerHTML = renderMarkdownToHtml(data.content);
  } catch {
    viewerBody.innerHTML = '<p class="muted-text">Error loading file.</p>';
  }
}

function renderMarkdownToHtml(md) {
  const lines = md.split('\n');
  let out = '';
  let buf = '';
  let listType = '';

  function flushPara() {
    if (buf.trim()) { out += '<p>' + buf.trim() + '</p>'; buf = ''; }
  }
  function flushList() {
    if (listType) { out += '</' + listType + '>'; listType = ''; }
  }
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed === '') { flushPara(); flushList(); continue; }

    const h3 = trimmed.match(/^### (.+)$/);
    const h2 = trimmed.match(/^## (.+)$/);
    const h1 = trimmed.match(/^# (.+)$/);
    if (h1 || h2 || h3) {
      flushPara(); flushList();
      const lvl = h3 ? 3 : h2 ? 2 : 1;
      out += `<h${lvl}>${inline((h3 || h2 || h1)[1])}</h${lvl}>`;
      continue;
    }

    if (trimmed === '---') { flushPara(); flushList(); out += '<hr>'; continue; }

    if (trimmed.startsWith('|')) {
      if (/^[|\s\-:]+$/.test(trimmed)) continue; // skip separator rows
      flushPara(); flushList();
      const cells = trimmed.split('|').slice(1, -1)
        .map(c => `<td>${inline(c.trim())}</td>`).join('');
      out += `<tr>${cells}</tr>`;
      continue;
    }

    const liU = trimmed.match(/^[-*] (.+)$/);
    if (liU) {
      flushPara();
      if (listType !== 'ul') { flushList(); out += '<ul>'; listType = 'ul'; }
      out += `<li>${inline(liU[1])}</li>`;
      continue;
    }

    const liO = trimmed.match(/^\d+\. (.+)$/);
    if (liO) {
      flushPara();
      if (listType !== 'ol') { flushList(); out += '<ol>'; listType = 'ol'; }
      out += `<li>${inline(liO[1])}</li>`;
      continue;
    }

    flushList();
    buf += (buf ? ' ' : '') + inline(trimmed);
  }

  flushPara();
  flushList();
  return out;
}

// ─── Auto-resize textarea ─────────────────────────────────────
userInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

// ─── Event Listeners ──────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

closeViewer.addEventListener('click', () => {
  viewerPanel.classList.add('hidden');
  document.querySelectorAll('.file-item').forEach((el) => el.classList.remove('active'));
});

refreshFiles.addEventListener('click', loadFiles);
newChatBtn.addEventListener('click', newChat);

// ─── Playbook Review ──────────────────────────────────────────
function openReviewModal() {
  reviewModalBody.innerHTML = `
    <div class="review-loading">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
      <p>Analysing your playbook&hellip;</p>
    </div>`;
  reviewOverlay.classList.remove('hidden');

  fetch('/api/review', { method: 'POST' })
    .then((r) => {
      if (!r.ok) {
        return r.text().then((body) => {
          try {
            const d = JSON.parse(body);
            return Promise.reject(d.error || r.statusText);
          } catch {
            return Promise.reject(`HTTP ${r.status} ${r.statusText}`);
          }
        });
      }
      return r.json();
    })
    .then(renderReview)
    .catch((err) => {
      reviewModalBody.innerHTML = `<p class="review-error">Could not load review: ${escapeHtml(String(err))}</p>`;
    });
}

let lastReviewData = null;

function renderReview(data) {
  lastReviewData = data;

  if (data.empty) {
    reviewModalBody.innerHTML = `<p class="review-empty">No playbook entries yet — start capturing issues to see a review here.</p>`;
    return;
  }

  const issueTypesHtml = (data.issue_types || [])
    .map((it) => `
      <div class="review-issue-row">
        <div class="review-issue-badge">${escapeHtml(String(it.count || ''))}</div>
        <div>
          <div class="review-issue-category">${escapeHtml(it.category || '')}</div>
          <div class="review-issue-desc">${escapeHtml(it.description || '')}</div>
        </div>
      </div>`)
    .join('');

  const decisionsHtml = (data.decisions || [])
    .map((d) => `
      <div class="review-decision-row">
        <div class="review-decision-title">${escapeHtml(d.title || '')}</div>
        <div class="review-decision-summary">${escapeHtml(d.summary || '')}</div>
      </div>`)
    .join('');

  const preventionsHtml = (data.top_preventions || [])
    .map((p) => `
      <div class="review-prevention-row">
        <div class="review-prevention-rank">${escapeHtml(String(p.rank || ''))}</div>
        <div>
          <div class="review-prevention-measure">${escapeHtml(p.measure || '')}</div>
          <div class="review-prevention-rationale">${escapeHtml(p.rationale || '')}</div>
        </div>
      </div>`)
    .join('');

  reviewModalBody.innerHTML = `
    <section class="review-section">
      <h3 class="review-section-title">&#x26A0; General Issue Types</h3>
      <div class="review-issue-list">${issueTypesHtml}</div>
    </section>

    <section class="review-section">
      <h3 class="review-section-title">&#x2714; Decisions Made</h3>
      <div class="review-decision-list">${decisionsHtml}</div>
    </section>

    <section class="review-section">
      <h3 class="review-section-title">&#x1F6E1; Top 5 Preventative Measures</h3>
      <p class="review-prevention-intro">Ranked by breadth of impact across issue types.</p>
      <div class="review-prevention-list">${preventionsHtml}</div>
    </section>

    <div class="review-export-bar">
      <button class="btn-copy-report" id="copyReportBtn">&#x1F4CB; Copy as Email Report</button>
      <p class="review-copy-hint">Copies a plain-text summary to your clipboard for sharing with your team.</p>
    </div>`;

  document.getElementById('copyReportBtn').addEventListener('click', copyReportToClipboard);
}

function buildEmailReport(data) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const hr = '─'.repeat(52);
  const lines = [];

  lines.push(`Subject: QE Playbook Review — ${today}`);
  lines.push('');
  lines.push('Hi team,');
  lines.push('');
  lines.push('Below is a summary of our QE Playbook review, covering general issue types,');
  lines.push('key decisions made, and the top preventative measures to prioritise.');
  lines.push('');
  lines.push(hr);
  lines.push('QE PLAYBOOK REVIEW');
  lines.push(`Generated: ${today}`);
  lines.push(hr);

  lines.push('');
  lines.push('GENERAL ISSUE TYPES');
  lines.push('─'.repeat(20));
  (data.issue_types || []).forEach((it, i) => {
    lines.push(`${i + 1}. ${it.category || ''}  [${it.count || 0} ${it.count === 1 ? 'entry' : 'entries'}]`);
    lines.push(`   ${it.description || ''}`);
  });

  lines.push('');
  lines.push('DECISIONS MADE');
  lines.push('─'.repeat(14));
  (data.decisions || []).forEach((d) => {
    lines.push(`• ${d.title || ''}`);
    lines.push(`  ${d.summary || ''}`);
  });

  lines.push('');
  lines.push('TOP 5 PREVENTATIVE MEASURES');
  lines.push('(ranked by breadth of impact across issue types)');
  lines.push('─'.repeat(27));
  (data.top_preventions || []).forEach((p) => {
    lines.push(`${p.rank}. ${p.measure || ''}`);
    lines.push(`   ${p.rationale || ''}`);
  });

  lines.push('');
  lines.push(hr);
  lines.push('Generated by QE Playbook Assistant');

  return lines.join('\n');
}

function copyReportToClipboard() {
  const btn = document.getElementById('copyReportBtn');
  if (!lastReviewData) return;

  const text = buildEmailReport(lastReviewData);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ Copied to clipboard!';
      btn.classList.add('btn-copy-success');
      setTimeout(() => {
        btn.textContent = '\u{1F4CB} Copy as Email Report';
        btn.classList.remove('btn-copy-success');
      }, 2500);
    }).catch(() => showFallbackTextarea(text));
  } else {
    showFallbackTextarea(text);
  }
}

function showFallbackTextarea(text) {
  const bar = document.querySelector('.review-export-bar');
  if (!bar) return;
  bar.innerHTML = `
    <p class="review-copy-hint">Select all and copy:</p>
    <textarea class="review-copy-textarea" readonly>${escapeHtml(text)}</textarea>`;
  const ta = bar.querySelector('textarea');
  ta.focus();
  ta.select();
}

reviewBtn.addEventListener('click', openReviewModal);

closeReview.addEventListener('click', () => reviewOverlay.classList.add('hidden'));

reviewOverlay.addEventListener('click', (e) => {
  if (e.target === reviewOverlay) reviewOverlay.classList.add('hidden');
});

// ─── Setup ────────────────────────────────────────────────────
async function checkSetup() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.configured) {
      setupOverlay.classList.add('visible');
      tokenInput.focus();
    }
  } catch {
    setupOverlay.classList.add('visible');
    tokenInput.focus();
  }
}

async function saveToken() {
  const token = tokenInput.value.trim();
  setupError.textContent = '';

  if (!token) {
    setupError.textContent = 'Please paste your GitHub personal access token.';
    return;
  }

  saveTokenBtn.disabled = true;
  saveTokenBtn.textContent = 'Validating…';

  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    if (res.ok) {
      setupOverlay.classList.remove('visible');
      loadFiles();
    } else {
      setupError.textContent = data.error || 'Setup failed. Check your token and try again.';
      saveTokenBtn.disabled = false;
      saveTokenBtn.textContent = 'Connect';
    }
  } catch (err) {
    setupError.textContent = 'Could not reach the server.';
    saveTokenBtn.disabled = false;
    saveTokenBtn.textContent = 'Connect';
  }
}

saveTokenBtn.addEventListener('click', saveToken);
tokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveToken(); });

// ─── Init ─────────────────────────────────────────────────────
loadFiles();
checkSetup();
userInput.focus();
