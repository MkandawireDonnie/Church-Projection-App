// Pure logic (no Electron) so it can be unit-tested with plain Node.
const fs = require('fs'), path = require('path');

class Store {
  constructor(file) { this.file = file; this.data = { songs: [], docs: [], presentations: [], services: [], bible: [], translations: [], settings: {} }; this.load(); }
  load() {
    try { Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
    catch (e) { if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + '.corrupt-' + Date.now()); }
  }
  save() { // atomic write: temp file then rename
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(this.data)); fs.renameSync(tmp, this.file);
  }
  set(key, val) { this.data[key] = val; this.save(); }
}

// Bible import format: one verse per line  "John 3:16 For God so loved..."
function parseBibleText(text, translation) {
  const out = [], re = /^\s*((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+(\d+):(\d+)\s+(.+?)\s*$/;
  for (const line of text.split(/\r?\n/)) { const m = re.exec(line); if (m) out.push({ b: m[1].trim(), c: +m[2], v: +m[3], t: m[4], tr: translation }); }
  return out;
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const ABBR = { gen:'genesis', ex:'exodus', exo:'exodus', lev:'leviticus', num:'numbers', deut:'deuteronomy', josh:'joshua', judg:'judges', sam:'samuel', kgs:'kings', chr:'chronicles', neh:'nehemiah', est:'esther', ps:'psalms', psa:'psalms', psalm:'psalms', prov:'proverbs', eccl:'ecclesiastes', isa:'isaiah', jer:'jeremiah', lam:'lamentations', ezek:'ezekiel', dan:'daniel', hos:'hosea', obad:'obadiah', mic:'micah', nah:'nahum', hab:'habakkuk', zeph:'zephaniah', hag:'haggai', zech:'zechariah', mal:'malachi', matt:'matthew', mt:'matthew', mk:'mark', lk:'luke', jn:'john', rom:'romans', cor:'corinthians', gal:'galatians', eph:'ephesians', phil:'philippians', col:'colossians', thess:'thessalonians', tim:'timothy', tit:'titus', phm:'philemon', heb:'hebrews', jas:'james', pet:'peter', rev:'revelation' };
function parseRef(q) {
  const m = /^\s*((?:[1-3]\s?)?[A-Za-z][A-Za-z ]*?)\s*(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/.exec(q);
  if (!m) return null;
  let book = norm(m[1]).split(' ').map(w => ABBR[w] || w).join(' ');
  return { book, c: +m[2], v1: m[3] ? +m[3] : null, v2: m[4] ? +m[4] : (m[3] ? +m[3] : null) };
}
function searchBible(verses, query, tr, limit = 100) {
  const pool = tr ? verses.filter(v => v.tr === tr) : verses;
  const ref = parseRef(query);
  if (ref) {
    const hit = pool.filter(v => { const nb = norm(v.b), nb2 = nb.replace(/^(\d) /, '$1'); const q = ref.book.replace(/^(\d) /, '$1'); return (nb === ref.book || nb2 === q || nb.startsWith(ref.book)) && v.c === ref.c && (ref.v1 == null || (v.v >= ref.v1 && v.v <= ref.v2)); });
    if (hit.length) return hit.sort((a, b) => a.v - b.v).slice(0, limit);
  }
  const words = norm(query).split(' ').filter(Boolean); if (!words.length) return [];
  return pool.filter(v => { const t = norm(v.t); return words.every(w => t.includes(w)); }).slice(0, limit);
}
// Split text into projector slides: blank-line separated blocks, long blocks chunked by maxLines.
function splitSlides(text, maxLines = 4) {
  const slides = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
    for (let i = 0; i < lines.length; i += maxLines) slides.push({ text: lines.slice(i, i + maxLines).join('\n') });
  }
  return slides;
}
module.exports = { Store, parseBibleText, parseRef, searchBible, splitSlides };
