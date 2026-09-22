/* =========================================================================
   AAIS Receipts — students list + canvas receipts + guardian sharing
   Calibrated field coordinates (1024 x 603 canvas on receipt.jpg)
   ========================================================================= */

const LS = {
  settings: 'aaic_settings_v2',
  contacts: 'aaic_contacts_v1'
};

const DEFAULT_SETTINGS = {
  jsonUrl: 'https://sheet.spacet.me/1Yxh7vhxyQI2HisBqNbck8mFfoAAwBH0_VJJfyJwVpV4/Sheet1.json',
  className: 'Primary 3',
  term: '1st Term',
  signature: 'AAIS Bursar',
  signatureFont: "'Great Vibes', cursive",
  signatureSize: 24,
  signatureX: 800,
  signatureY: 560
};

const CURSIVE_FONTS = [
  { label: 'Great Vibes', value: "'Great Vibes', cursive" },
  { label: 'Dancing Script', value: "'Dancing Script', cursive" },
  { label: 'Pacifico', value: "'Pacifico', cursive" },
  { label: 'Sacramento', value: "'Sacramento', cursive" },
  { label: 'Allura', value: "'Allura', cursive" },
  { label: 'Alex Brush', value: "'Alex Brush', cursive" }
];

/* -------- Calibrated field map ----------------------------------------- */
/* Global text transform: bigger, bolder, 5px top + 10px left padding. */
const TEXT = { scale: 1.25, bold: true, padTop: 5, padLeft: 10 };

function field(x, y, fontSize, fontFamily, textAlign) {
  return {
    x: x + TEXT.padLeft,
    y: y + TEXT.padTop,
    fontSize: Math.round(fontSize * TEXT.scale),
    fontWeight: TEXT.bold ? 'bold' : '',
    fontFamily,
    textAlign
  };
}

const receiptFields = {
  canvas: { width: 1024, height: 603, image: 'receipt.jpg' },
  fields: {
    /* HEADER AREA */
    date: field(780, 136, 16, 'Arial, sans-serif', 'left'),
    receivedFrom: field(230, 198, 16, 'Arial, sans-serif', 'left'),
    studentClass: field(120, 234, 16, 'Arial, sans-serif', 'left'),
    term: field(580, 234, 16, 'Arial, sans-serif', 'left'),

    /* TABLE ROWS (33px intervals) */
    feesPaid: field(570, 305, 15, 'Courier New, monospace', 'right'),
    feesTotal: field(735, 305, 15, 'Courier New, monospace', 'right'),
    feesBalance: field(895, 305, 15, 'Courier New, monospace', 'right'),

    uniformPaid: field(570, 338, 15, 'Courier New, monospace', 'right'),
    uniformTotal: field(735, 338, 15, 'Courier New, monospace', 'right'),
    uniformBalance: field(895, 338, 15, 'Courier New, monospace', 'right'),

    booksPaid: field(570, 371, 15, 'Courier New, monospace', 'right'),
    booksTotal: field(735, 371, 15, 'Courier New, monospace', 'right'),
    booksBalance: field(895, 371, 15, 'Courier New, monospace', 'right'),

    totalPaid: field(570, 403, 15, 'Courier New, monospace', 'right'),
    totalCost: field(735, 403, 15, 'Courier New, monospace', 'right'),
    totalBalance: field(895, 403, 15, 'Courier New, monospace', 'right'),

    /* WORDS & BOXES */
    sumInWords: field(260, 444, 15, 'Arial, sans-serif', 'left'),
    paidBox: field(310, 501, 17, 'Arial, sans-serif', 'left'),
    balanceBox: field(850, 501, 17, 'Arial, sans-serif', 'left')
  }
};

/* -------- State --------------------------------------------------------- */
let settings = loadSettings();
let contacts = loadJSON(LS.contacts, {});
let students = [];
let activeStudent = null;
let bgImage = null;

/* -------- Tiny helpers -------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const moneyFmt = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function loadSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, loadJSON(LS.settings, {}));
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function money(v) { return moneyFmt.format(Number.isFinite(+v) ? +v : 0); }
function num(v) {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function isoToDMY(iso) {
  const [y, m, d] = String(iso).split('-');
  return (y && m && d) ? `${d}/${m}/${y}` : iso;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

/* -------- Number to words (Naira) -------------------------------------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n) {
  let out = '';
  if (n >= 100) { out += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n >= 20) { out += TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') + ' '; }
  else if (n > 0) { out += ONES[n] + ' '; }
  return out.trim();
}
function intToWords(n) {
  if (n === 0) return 'Zero';
  const scales = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
  let out = '';
  for (const [val, name] of scales) {
    if (n >= val) { out += chunkToWords(Math.floor(n / val)) + ' ' + name + ' '; n %= val; }
  }
  if (n > 0) out += chunkToWords(n);
  return out.trim();
}
function nairaInWords(amount) {
  const whole = Math.floor(Math.abs(amount));
  const kobo = Math.round((Math.abs(amount) - whole) * 100);
  let s = intToWords(whole) + ' Naira';
  if (kobo > 0) s += ' and ' + intToWords(kobo) + ' Kobo';
  return s + ' Only';
}

/* -------- Sheet parsing ------------------------------------------------- */
function parseSheet(values) {
  if (!Array.isArray(values) || !values.length) return [];
  const [header, ...rows] = values;
  const norm = (h) => String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const idx = {};
  header.forEach((h, i) => { const k = norm(h); if (k && !(k in idx)) idx[k] = i; });

  const pick = (row, ...names) => {
    for (const nm of names) { const j = idx[nm]; if (j != null) return row[j]; }
    return '';
  };

  return rows
    .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))
    .map((r) => ({
      name: String(pick(r, 'name', 'student', 'student name', 'full name') || '').trim(),
      paid: pick(r, 'paid', 'total paid', 'amount paid'),
      p70: pick(r, '70%', '70', 'school fees paid'),
      p20: pick(r, '20%', '20', 'uniform paid'),
      p10: pick(r, '10%', '10', 'books paid'),
      uniform: pick(r, 'uniform', 'uniform total'),
      books: pick(r, 'books', 'books total'),
      schoolFees: pick(r, 'school fees', 'schoolfees', 'fees', 'school fee')
    }))
    .filter((s) => s.name);
}

/* -------- Compute receipt data ----------------------------------------- */
function buildReceipt(student, isoDate) {
  const fees = num(student.schoolFees);
  const uniform = num(student.uniform);
  const books = num(student.books);
  const p70 = num(student.p70);
  const p20 = num(student.p20);
  const p10 = num(student.p10);
  const paid = num(student.paid) || (p70 + p20 + p10);

  const feesBal = Math.max(0, fees - p70);
  const uniBal = Math.max(0, uniform - p20);
  const bookBal = Math.max(0, books - p10);
  const totalCost = fees + uniform + books;
  const totalBal = feesBal + uniBal + bookBal;

  return {
    date: isoToDMY(isoDate),
    receivedFrom: student.name,
    studentClass: settings.className,
    term: settings.term,
    feesPaid: money(p70),
    feesTotal: money(fees),
    feesBalance: money(feesBal),
    uniformPaid: money(p20),
    uniformTotal: money(uniform),
    uniformBalance: money(uniBal),
    booksPaid: money(p10),
    booksTotal: money(books),
    booksBalance: money(bookBal),
    totalPaid: money(paid),
    totalCost: money(totalCost),
    totalBalance: money(totalBal),
    sumInWords: nairaInWords(paid),
    paidBox: money(paid),
    balanceBox: money(totalBal)
  };
}

/* -------- Canvas rendering --------------------------------------------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

async function drawReceipt(canvas, data) {
  const { width, height } = receiptFields.canvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  if (!bgImage) bgImage = await loadImage(receiptFields.canvas.image);
  ctx.drawImage(bgImage, 0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';

  for (const [key, f] of Object.entries(receiptFields.fields)) {
    const val = data[key];
    if (val === undefined || val === null || val === '') continue;
    ctx.font = `${f.fontWeight ? f.fontWeight + ' ' : ''}${f.fontSize}px ${f.fontFamily}`;
    ctx.textAlign = f.textAlign;
    ctx.fillText(String(val), f.x, f.y);
  }

  // Signature (cursive, configurable)
  if (settings.signature) {
    try { await document.fonts.load(`${settings.signatureSize}px ${settings.signatureFont}`); } catch { }
    ctx.font = `${settings.signatureSize}px ${settings.signatureFont}`;
    ctx.fillStyle = '#0f2c4d';
    ctx.textAlign = 'right';
    ctx.fillText(settings.signature, settings.signatureX, settings.signatureY);
  }
}

/* -------- Data loading -------------------------------------------------- */
async function loadData() {
  const status = $('#status');
  status.hidden = false;
  status.className = 'status';
  status.textContent = 'Loading data…';
  $('#grid').innerHTML = '';

  try {
    const res = await fetch(settings.jsonUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const values = json.values || json.data || json;
    students = parseSheet(values);
    if (!students.length) throw new Error('No student rows found in the sheet.');
    status.hidden = true;
    renderStudents();
  } catch (err) {
    status.className = 'status error';
    status.textContent = 'Could not load data: ' + err.message + ' — check the JSON URL in Settings.';
  }
}

/* -------- Student grid -------------------------------------------------- */
function studentStats(s) {
  const fees = num(s.schoolFees), uniform = num(s.uniform), books = num(s.books);
  const p70 = num(s.p70), p20 = num(s.p20), p10 = num(s.p10);
  const paid = num(s.paid) || (p70 + p20 + p10);
  const bal = Math.max(0, fees - p70) + Math.max(0, uniform - p20) + Math.max(0, books - p10);
  return { paid, bal };
}

function renderStudents(filter = '') {
  const grid = $('#grid');
  const q = filter.trim().toLowerCase();
  const list = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;

  $('#subtitle').textContent = `${students.length} student${students.length === 1 ? '' : 's'} • ${settings.className || 'no class'} • ${settings.term || 'no term'}`;

  if (!list.length) {
    grid.innerHTML = `<p class="status">No match for “${esc(filter)}”.</p>`;
    return;
  }

  grid.innerHTML = list.map((s, i) => {
    const { paid, bal } = studentStats(s);
    const idx = students.indexOf(s);
    return `
      <article class="card">
        <div class="card-top">
          <div>
            <div class="name">${esc(s.name)}</div>
            <div class="cls">${esc(settings.className || '—')} • ${esc(settings.term || '—')}</div>
          </div>
          <span class="pill ${bal > 0 ? '' : 'zero'}">${bal > 0 ? 'Owing' : 'Cleared'}</span>
        </div>
        <div class="metrics">
          <div class="metric"><span>Paid</span><strong>₦${money(paid)}</strong></div>
          <div class="metric"><span>Balance</span><strong>₦${money(bal)}</strong></div>
        </div>
        <div class="card-actions">
          <button class="btn primary" data-receipt="${idx}">Receipt</button>
          <button class="btn ghost" data-share="${idx}">Share</button>
        </div>
      </article>`;
  }).join('');
}

/* -------- Receipt / share sheet ---------------------------------------- */
async function openReceipt(student, focusShare = false) {
  activeStudent = student;
  $('#receiptName').textContent = student.name;
  const { paid, bal } = studentStats(student);
  $('#receiptMeta').textContent = `Paid ₦${money(paid)} • Balance ₦${money(bal)}`;
  $('#receiptDate').value = todayISO();

  const c = contacts[student.name] || {};
  $('#guardianPhone').value = c.phone || '';
  $('#guardianEmail').value = c.email || '';

  updateShareMessage();
  $('#receiptOverlay').hidden = false;

  await renderActiveReceipt();
  if (focusShare) $('.share-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function renderActiveReceipt() {
  if (!activeStudent) return;
  const data = buildReceipt(activeStudent, $('#receiptDate').value || todayISO());
  await document.fonts.ready;
  await drawReceipt($('#receiptCanvas'), data);
}

function updateShareMessage() {
  if (!activeStudent) return;
  const { paid, bal } = studentStats(activeStudent);
  const msg =
    `Hello, this is the ${settings.term || ''} fee receipt for ${activeStudent.name}` +
    ` (${settings.className || ''}).\n\n` +
    `Amount paid: ₦${money(paid)}\n` +
    `Outstanding balance: ₦${money(bal)}\n\n` +
    `Thank you.`;
  $('#shareMessage').value = msg.trim();
}

function persistActiveReceipt() {
  if (!activeStudent) return;
  const name = activeStudent.name;
  contacts[name] = {
    phone: $('#guardianPhone').value.trim(),
    email: $('#guardianEmail').value.trim()
  };
  saveJSON(LS.contacts, contacts);
}

function canvasBlob() {
  return new Promise((resolve) => $('#receiptCanvas').toBlob((b) => resolve(b), 'image/png'));
}

function fileName() {
  const safe = (activeStudent?.name || 'student').replace(/[^a-z0-9]+/gi, '_');
  return `AAIS_receipt_${safe}.png`;
}

async function downloadReceipt() {
  const blob = await canvasBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function shareNative() {
  try {
    const blob = await canvasBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    const text = $('#shareMessage').value;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Receipt — ${activeStudent.name}`, text });
      setHint('Receipt shared.', 'ok');
    } else {
      await downloadReceipt();
      setHint('Direct file sharing not supported here — receipt downloaded instead. Attach it to your message.', '');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    setHint('Share failed: ' + err.message, 'err');
  }
}

async function shareWhatsapp() {
  persistActiveReceipt();
  await downloadReceipt();
  const phone = $('#guardianPhone').value.trim().replace(/[^0-9]/g, '');
  const text = encodeURIComponent($('#shareMessage').value);
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
  setHint('Receipt downloaded — attach it to the WhatsApp chat that just opened.', 'ok');
}

async function shareEmail() {
  persistActiveReceipt();
  await downloadReceipt();
  const to = encodeURIComponent($('#guardianEmail').value.trim());
  const subject = encodeURIComponent(`Fee receipt for ${activeStudent.name} — ${settings.term || ''}`);
  const body = encodeURIComponent($('#shareMessage').value + '\n\n(The receipt image has been downloaded — attach it to this email.)');
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  setHint('Receipt downloaded — attach it to the email draft that just opened.', 'ok');
}

async function copyImage() {
  try {
    const blob = await canvasBlob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    setHint('Receipt copied to clipboard.', 'ok');
  } catch (err) {
    setHint('Copy not supported in this browser — use Download.', 'err');
  }
}

function printReceipt() {
  const dataUrl = $('#receiptCanvas').toDataURL('image/png');
  const w = window.open('', 'PRINT');
  if (!w) return;
  w.document.write(`<html><head><title>${esc(fileName())}</title>
    <style>body{margin:0}img{width:100%;max-width:1024px}</style></head>
    <body><img src="${dataUrl}" onload="window.print()"></body></html>`);
  w.document.close();
}

function setHint(msg, cls) {
  const h = $('#shareHint');
  h.textContent = msg;
  h.className = 'hint ' + (cls || '');
}

/* -------- Settings UI --------------------------------------------------- */
function openSettings() {
  $('#setJsonUrl').value = settings.jsonUrl;
  $('#setClass').value = settings.className;
  $('#setTerm').value = settings.term;
  $('#setSign').value = settings.signature;
  $('#setSignSize').value = settings.signatureSize;
  $('#setSignX').value = settings.signatureX;
  $('#setSignY').value = settings.signatureY;
  const sel = $('#setSignFont');
  sel.innerHTML = CURSIVE_FONTS.map((f) => `<option value="${f.value}">${f.label}</option>`).join('');
  sel.value = settings.signatureFont;
  updateSignPreview();
  $('#settingsOverlay').hidden = false;
}

function updateSignPreview() {
  const p = $('#signPreview');
  p.style.fontFamily = $('#setSignFont').value;
  p.style.fontSize = (+$('#setSignSize').value || 34) + 'px';
  p.textContent = $('#setSign').value || 'Signature';
}

async function saveSettings() {
  settings = {
    jsonUrl: $('#setJsonUrl').value.trim() || DEFAULT_SETTINGS.jsonUrl,
    className: $('#setClass').value.trim(),
    term: $('#setTerm').value.trim(),
    signature: $('#setSign').value.trim(),
    signatureFont: $('#setSignFont').value,
    signatureSize: +$('#setSignSize').value || DEFAULT_SETTINGS.signatureSize,
    signatureX: +$('#setSignX').value || DEFAULT_SETTINGS.signatureX,
    signatureY: +$('#setSignY').value || DEFAULT_SETTINGS.signatureY
  };
  saveJSON(LS.settings, settings);
  $('#settingsOverlay').hidden = true;
  toast('Settings saved');
  renderStudents($('#search').value);
  await loadData();
}

/* -------- Event wiring -------------------------------------------------- */
function closeOverlay(id) { $('#' + id).hidden = true; }

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-close]');
  if (t) { closeOverlay(t.dataset.close); return; }

  const r = e.target.closest('[data-receipt]');
  if (r) { openReceipt(students[+r.dataset.receipt]); return; }

  const sh = e.target.closest('[data-share]');
  if (sh) { openReceipt(students[+sh.dataset.share], true); return; }
});

document.querySelectorAll('.overlay').forEach((ov) => {
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.hidden = true; });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.overlay').forEach((o) => { o.hidden = true; });
});

$('#search').addEventListener('input', (e) => renderStudents(e.target.value));
$('#reload').addEventListener('click', loadData);
$('#openSettings').addEventListener('click', openSettings);
$('#saveSettings').addEventListener('click', saveSettings);
$('#resetSettings').addEventListener('click', () => {
  localStorage.removeItem(LS.settings);
  settings = loadSettings();
  openSettings();
  toast('Defaults restored');
});

$('#receiptDate').addEventListener('change', renderActiveReceipt);
$('#guardianPhone').addEventListener('change', persistActiveReceipt);
$('#guardianEmail').addEventListener('change', persistActiveReceipt);
$('#setSignFont').addEventListener('change', updateSignPreview);
$('#setSign').addEventListener('input', updateSignPreview);
$('#setSignSize').addEventListener('input', updateSignPreview);

$('#shareNative').addEventListener('click', shareNative);
$('#shareWhatsapp').addEventListener('click', shareWhatsapp);
$('#shareEmail').addEventListener('click', shareEmail);
$('#downloadPng').addEventListener('click', downloadReceipt);
$('#copyImage').addEventListener('click', copyImage);
$('#printReceipt').addEventListener('click', printReceipt);

/* -------- Boot ---------------------------------------------------------- */
window.addEventListener('load', () => {
  document.fonts.ready.then(loadData);
});
