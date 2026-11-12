const $ = (s, e = document) => e.querySelector(s);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const k in a) { if (k.startsWith('on')) e[k] = a[k]; else if (k === 'class') e.className = a[k]; else if (k === 'value') e.value = a[k]; else e.setAttribute(k, a[k]); } c.flat().forEach(x => e.append(x && x.nodeType ? x : document.createTextNode(x == null ? '' : x))); return e; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let D, tab = 'service', sel = {}, live = { title: '', slides: [], i: -1 }, mode = 'blank';
const DEF = { church: 'My Church', logo: '', size: 60, bg: '#1b0d2e', fg: '#ffffff', maxLines: 4, displayId: null, currentService: null };
async function reload() { D = await api.invoke('db:load'); D.settings = Object.assign({}, DEF, D.settings); }
const save = k => api.invoke('db:set', k, D[k]);
const S = () => D.settings;

function splitSlides(text, max) { const out = []; for (const b of text.replace(/\r/g, '').split(/\n\s*\n/)) { const l = b.split('\n').filter(x => x.trim()); for (let i = 0; i < l.length; i += max) out.push({ text: l.slice(i, i + max).join('\n') }); } return out; }

/* ---------- live output ---------- */
function renderLive() {
  const p = $('#preview'); p.innerHTML = '';
  if (mode === 'logo') p.append(S().logo ? h('img', { src: S().logo }) : S().church);
  else if (mode === 'slide' && live.slides[live.i]) { const s = live.slides[live.i]; p.textContent = s.text + (s.ref ? '\n— ' + s.ref : ''); } else p.textContent = 'Blank';
  const box = $('#slides'); box.innerHTML = '';
  if (live.title) box.append(h('b', { style: 'font-size:12px;color:var(--grey)' }, live.title));
  live.slides.forEach((s, i) => box.append(h('div', { class: 'slide' + (i === live.i && mode === 'slide' ? ' on' : ''), onclick: () => go(i) }, s.text.slice(0, 120))));
}
function send() { const s = live.slides[live.i]; api.invoke('project', mode === 'slide' && s ? { mode, text: s.text, ref: s.ref || '' } : { mode: mode === 'logo' ? 'logo' : 'blank' }); renderLive(); }
function go(i) { if (i < 0 || i >= live.slides.length) return; live.i = i; mode = 'slide'; send(); }
function load(title, slides, start = true) { if (!slides.length) return toast('Nothing to project (empty content).', 1); live = { title, slides, i: -1 }; mode = 'blank'; start ? go(0) : renderLive(); }
$('#next').onclick = () => go(live.i + 1); $('#prev').onclick = () => go(live.i - 1);
$('#blank').onclick = () => { mode = 'blank'; send(); }; $('#logoBtn').onclick = () => { mode = 'logo'; send(); };
$('#pOpen').onclick = async () => { const r = await api.invoke('projector:open'); toast(r.external ? 'Projector opened on the second display.' : 'Only one display detected: projector opened as a window (drag it to the projector screen).'); send(); };
$('#pClose').onclick = () => api.invoke('projector:close');
document.addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(live.i + 1); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(live.i - 1); if (e.key === 'b') $('#blank').click(); });
function toast(m, err) { const e = h('div', { class: 'msg' + (err ? ' err' : '') }, m); const v = $('#view'); v.prepend(e); setTimeout(() => e.remove(), 6000); }

/* ---------- service planning helpers ---------- */
function currentService() { return D.services.find(s => s.id === S().currentService); }
function addToService(item) { const s = currentService(); if (!s) return toast('Create/select a service in the Service tab first.', 1); s.items.push({ id: uid(), ...item }); save('services'); toast('Added to "' + s.name + '".'); }
const songSlides = s => splitSlides(s.lyrics, +S().maxLines).map(x => ({ ...x }));
function itemSlides(it) {
  if (it.type === 'song') { const s = D.songs.find(x => x.id === it.refId); return s ? songSlides(s) : []; }
  if (it.type === 'doc') { const d = D.docs.find(x => x.id === it.refId); return d ? splitSlides(d.text, +S().maxLines) : []; }
  if (it.type === 'pres') { const p = D.presentations.find(x => x.id === it.refId); return p ? p.slides : []; }
  return it.slides || [];
}

/* ---------- generic list+editor layout ---------- */
function listPane(items, label, selKey, onPick, filterable) {
  const box = h('div', { class: 'list' }); let q = '';
  const draw = () => { box.querySelectorAll('.item').forEach(n => n.remove()); items.filter(i => label(i).toLowerCase().includes(q)).forEach(i => box.append(h('div', { class: 'item' + (sel[selKey] === i.id ? ' on' : ''), onclick: () => onPick(i) }, label(i)))); };
  const wrap = h('div', {}, filterable ? h('input', { placeholder: 'Filter…', oninput: e => { q = e.target.value.toLowerCase(); draw(); } }) : '', box); draw(); return wrap;
}

/* ---------- views ---------- */
const views = {
  songs() {
    const cur = D.songs.find(s => s.id === sel.song) || { title: '', artist: '', lyrics: '' };
    const t = h('input', { value: cur.title }), a = h('input', { value: cur.artist }), l = h('textarea', { value: cur.lyrics, placeholder: 'Lyrics. Separate verses/choruses with a blank line.' }), m = h('div');
    const rec = () => ({ id: cur.id || uid(), title: t.value.trim(), artist: a.value.trim(), lyrics: l.value });
    const persist = () => { const r = rec(); if (!r.title) return toast('Title required.', 1); const i = D.songs.findIndex(s => s.id === r.id); i < 0 ? D.songs.push(r) : D.songs[i] = r; D.songs.sort((x, y) => x.title.localeCompare(y.title)); save('songs'); sel.song = r.id; render(); toast('Song saved.'); return r; };
    return h('div', { class: 'cols' },
      h('div', {}, h('button', { class: 'b g', style: 'width:100%;margin-bottom:8px', onclick: () => { sel.song = null; render(); } }, '+ New song'), listPane(D.songs, s => s.title + (s.artist ? ' – ' + s.artist : ''), 'song', s => { sel.song = s.id; render(); }, true)),
      h('div', { class: 'card' }, h('h2', {}, 'Song'), h('label', {}, 'Title'), t, h('label', {}, 'Artist'), a, h('label', {}, 'Lyrics'), l,
        h('div', { class: 'row', style: 'margin-top:10px' },
          h('button', { class: 'g', onclick: persist }, 'Save'),
          h('button', { onclick: () => load(t.value, songSlides(rec())) }, 'Project'),
          h('button', { class: 'w', onclick: () => { const r = persist(); r && addToService({ type: 'song', refId: r.id, title: r.title }); } }, '+ Service'),
          h('button', { class: 'w', onclick: async () => { if (!t.value.trim()) return toast('Enter a title (and artist) first.', 1); m.textContent = 'Searching online…'; try { l.value = await api.invoke('lyrics:online', a.value.trim() || 'unknown', t.value.trim()); m.textContent = 'Lyrics imported. Review them, then Save.'; m.className = 'msg'; } catch (e) { m.textContent = 'Online search failed: ' + (navigator.onLine ? 'not found or service unavailable.' : 'you are offline.'); m.className = 'msg err'; } } }, 'Find lyrics online'),
          cur.id ? h('button', { class: 'x', onclick: () => { if (confirm('Delete this song?')) { D.songs = D.songs.filter(s => s.id !== cur.id); save('songs'); sel.song = null; render(); } } }, 'Delete') : ''), m));
  },
  bible() {
    const trs = D.translations, trSel = h('select', {}, trs.map(x => h('option', {}, x))), q = h('input', { placeholder: 'Reference (John 3:16-18) or keywords (love neighbour)' }), res = h('div', { class: 'card' }, 'Search results appear here.'), m = h('div'), trName = h('input', { placeholder: 'Translation name, e.g. NIV', style: 'width:200px' });
    if (sel.tr) trSel.value = sel.tr; trSel.onchange = () => sel.tr = trSel.value;
    let found = [];
    const vSlide = v => ({ text: v.t, ref: `${v.b} ${v.c}:${v.v} (${v.tr})` });
    const show = () => { res.innerHTML = ''; if (!found.length) return res.append('No verses found.' + (trs.length ? '' : ' Import a Bible file or fetch online first.'));
      res.append(h('div', { class: 'row' }, h('button', { onclick: () => load('Passage', found.map(vSlide)) }, 'Project all'), h('button', { class: 'w', onclick: () => addToService({ type: 'verse', title: `${found[0].b} ${found[0].c}:${found[0].v}${found.length > 1 ? '…' : ''}`, slides: found.map(vSlide) }) }, '+ Service (all)')));
      found.forEach(v => res.append(h('div', { class: 'verse' }, h('b', {}, `${v.b} ${v.c}:${v.v}`), h('span', { style: 'flex:1' }, v.t), h('button', { onclick: () => load(`${v.b} ${v.c}:${v.v}`, [vSlide(v)]) }, 'Project'), h('button', { class: 'w', onclick: () => addToService({ type: 'verse', title: `${v.b} ${v.c}:${v.v}`, slides: [vSlide(v)] }) }, '+')))); };
    const doSearch = async () => { found = await api.invoke('bible:search', q.value, trSel.value || null); show(); };
    q.onkeydown = e => e.key === 'Enter' && doSearch();
    const online = async code => { if (!q.value.trim()) return toast('Type a reference such as John 3:16-18 first.', 1); m.textContent = 'Fetching…'; try { found = await api.invoke('bible:online', q.value.trim(), code); await reload(); m.textContent = `Fetched and saved ${found.length} verse(s) for offline use.`; m.className = 'msg'; show(); } catch (e) { m.textContent = 'Online fetch failed (' + (navigator.onLine ? 'reference not found / service unavailable' : 'offline') + ').'; m.className = 'msg err'; } };
    return h('div', {}, h('div', { class: 'card' }, h('h2', {}, 'Bible'), h('div', { class: 'row' }, h('div', { style: 'width:130px' }, trSel), h('div', { style: 'flex:1' }, q), h('button', { class: 'g', onclick: doSearch }, 'Search offline')),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { style: 'font-size:13px' }, 'Fetch passage online (saved for offline):'), h('button', { class: 'w', onclick: () => online('kjv') }, 'KJV'), h('button', { class: 'w', onclick: () => online('web') }, 'WEB'), trName, h('button', { class: 'w', onclick: async () => { const n = trName.value.trim(); if (!n) return toast('Type a name for the translation first (e.g. NIV).', 1); const r = await api.invoke('bible:import', n.toUpperCase()); await reload(); r.count ? toast(`Imported ${r.count} verses.`) : r.error && toast(r.error, 1); render(); } }, 'Import Bible file…')), m,
      h('div', { style: 'font-size:12px;color:var(--grey);margin-top:6px' }, 'Local verses: ' + D.bible.length + (trs.length ? ' (' + trs.join(', ') + ')' : ''))), res);
  },
  docs() {
    const cur = D.docs.find(d => d.id === sel.doc), name = h('input', { value: cur ? cur.name : '' }), text = h('textarea', { value: cur ? cur.text : '', style: 'min-height:320px' });
    return h('div', { class: 'cols' }, h('div', {}, h('button', { class: 'b g', style: 'width:100%;margin-bottom:8px', onclick: async () => { const r = await api.invoke('doc:import'); r.forEach(f => f.error ? toast(f.name + ': ' + f.error, 1) : D.docs.push({ id: uid(), name: f.name, text: f.text })); save('docs'); if (r.length) { sel.doc = D.docs[D.docs.length - 1].id; render(); } } }, 'Import documents…'), listPane(D.docs, d => d.name, 'doc', d => { sel.doc = d.id; render(); }, true)),
      cur ? h('div', { class: 'card' }, h('h2', {}, 'Document'), h('label', {}, 'Name'), name, h('label', {}, 'Text (blank line = new slide; edit freely)'), text,
        h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'g', onclick: () => { cur.name = name.value; cur.text = text.value; save('docs'); render(); toast('Saved.'); } }, 'Save'), h('button', { onclick: () => load(name.value, splitSlides(text.value, +S().maxLines)) }, 'Project'), h('button', { class: 'w', onclick: () => addToService({ type: 'doc', refId: cur.id, title: cur.name }) }, '+ Service'),
          h('button', { class: 'w', onclick: () => { D.presentations.push({ id: uid(), name: cur.name, slides: splitSlides(text.value, +S().maxLines) }); save('presentations'); toast('Converted to a presentation.'); } }, 'Make presentation'), h('button', { class: 'x', onclick: () => { D.docs = D.docs.filter(d => d.id !== cur.id); save('docs'); sel.doc = null; render(); } }, 'Delete'))) : h('div', { class: 'card' }, 'Import .txt, .md, .docx, .pdf, .rtf or .html files; their text is extracted and split into slides.'));
  },
  pres() {
    const cur = D.presentations.find(p => p.id === sel.pres), name = h('input', { value: cur ? cur.name : '' }), text = h('textarea', { value: cur ? cur.slides.map(s => s.text).join('\n---\n') : '', placeholder: 'Slide 1 text\n---\nSlide 2 text' });
    const parse = () => text.value.split(/\n-{3,}\n?/).map(x => x.trim()).filter(Boolean).map(x => ({ text: x }));
    return h('div', { class: 'cols' }, h('div', {}, h('button', { class: 'b g', style: 'width:100%;margin-bottom:8px', onclick: () => { sel.pres = null; render(); } }, '+ New presentation'), listPane(D.presentations, p => p.name + ' (' + p.slides.length + ')', 'pres', p => { sel.pres = p.id; render(); }, true)),
      h('div', { class: 'card' }, h('h2', {}, 'Presentation'), h('label', {}, 'Name'), name, h('label', {}, 'Slides (separate with a line containing ---)'), text,
        h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'g', onclick: () => { if (!name.value.trim()) return toast('Name required.', 1); const r = { id: cur ? cur.id : uid(), name: name.value.trim(), slides: parse() }; const i = D.presentations.findIndex(p => p.id === r.id); i < 0 ? D.presentations.push(r) : D.presentations[i] = r; save('presentations'); sel.pres = r.id; render(); toast('Saved.'); } }, 'Save'), h('button', { onclick: () => load(name.value, parse()) }, 'Project'), cur ? [h('button', { class: 'w', onclick: () => addToService({ type: 'pres', refId: cur.id, title: cur.name }) }, '+ Service'), h('button', { class: 'x', onclick: () => { D.presentations = D.presentations.filter(p => p.id !== cur.id); save('presentations'); sel.pres = null; render(); } }, 'Delete')] : '')));
  },
  service() {
    const cur = currentService(), name = h('input', { placeholder: 'New service name, e.g. Sunday 10:00' }), date = h('input', { type: 'date', value: cur ? cur.date : '' });
    const items = cur ? cur.items : [], mv = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; save('services'); render(); };
    return h('div', { class: 'cols' }, h('div', {}, h('div', { class: 'card' }, name, h('button', { class: 'b g', style: 'width:100%;margin-top:6px', onclick: () => { if (!name.value.trim()) return; const s = { id: uid(), name: name.value.trim(), date: new Date().toISOString().slice(0, 10), items: [] }; D.services.unshift(s); S().currentService = s.id; save('services'); save('settings'); render(); } }, '+ Create service')),
      listPane(D.services, s => s.name + ' · ' + s.date, 'svc', s => { S().currentService = s.id; sel.svc = s.id; save('settings'); render(); })),
      cur ? h('div', { class: 'card' }, h('h2', {}, 'Order of service: ' + cur.name), h('div', { class: 'row' }, h('div', { style: 'width:170px' }, date), h('button', { class: 'g', onclick: () => { cur.date = date.value; save('services'); render(); } }, 'Set date'), h('button', { onclick: () => { const all = items.flatMap(it => itemSlides(it).map(s => ({ ...s, text: s.text }))); load(cur.name, all, false); } }, 'Load entire service'), h('button', { class: 'x', onclick: () => { if (confirm('Delete service?')) { D.services = D.services.filter(s => s.id !== cur.id); S().currentService = null; save('services'); save('settings'); render(); } } }, 'Delete service')),
        h('p', { style: 'font-size:13px;color:var(--grey)' }, 'Add items using the “+ Service” buttons in Songs, Bible, Documents and Presentations.'),
        items.length ? items.map((it, i) => h('div', { class: 'verse' }, h('b', {}, (i + 1) + '. [' + it.type + ']'), h('span', { style: 'flex:1' }, it.title), h('button', { onclick: () => load(it.title, itemSlides(it)) }, 'Project'), h('button', { class: 'w', onclick: () => mv(i, -1) }, '↑'), h('button', { class: 'w', onclick: () => mv(i, 1) }, '↓'), h('button', { class: 'x', onclick: () => { items.splice(i, 1); save('services'); render(); } }, '✕'))) : 'No items yet.') : h('div', { class: 'card' }, 'Create or select a service.'));
  },
  async settings() {
    const f = (k, type = 'text') => h('input', { type, value: S()[k] ?? '', onchange: e => { S()[k] = type === 'number' ? +e.target.value : e.target.value; } });
    const ds = await api.invoke('displays'), dsel = h('select', { onchange: e => S().displayId = e.target.value ? +e.target.value : null }, h('option', { value: '' }, 'Automatic (first non-primary display)'), ds.map(d => h('option', { value: d.id }, d.label)));
    dsel.value = S().displayId ?? '';
    return h('div', { class: 'card', style: 'max-width:640px' }, h('h2', {}, 'Settings'),
      h('label', {}, 'Church name'), f('church'), h('label', {}, 'Church logo'),
      h('div', { class: 'row' }, S().logo ? h('img', { src: S().logo, style: 'height:50px' }) : 'No logo', h('button', { class: 'w', onclick: async () => { const d = await api.invoke('logo:choose'); if (d) { S().logo = d; await commitSettings(); } } }, 'Choose logo…'), S().logo ? h('button', { class: 'x', onclick: async () => { S().logo = ''; await commitSettings(); } }, 'Remove') : ''),
      h('label', {}, 'Projector display'), dsel, h('label', {}, 'Font size (px at 1080p)'), f('size', 'number'), h('label', {}, 'Max lines per slide'), f('maxLines', 'number'),
      h('label', {}, 'Background colour'), f('bg', 'color'), h('label', {}, 'Text colour'), f('fg', 'color'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'g', onclick: async () => { await commitSettings(); toast('Settings saved.'); } }, 'Save settings')));
  }
};
async function commitSettings() { await save('settings'); applyHeader(); await render(); send(); }
function applyHeader() { $('#church').textContent = S().church; const l = $('#logo'); l.hidden = !S().logo; if (S().logo) l.src = S().logo; }
const TABS = [['service', 'Service'], ['songs', 'Songs'], ['bible', 'Bible'], ['docs', 'Documents'], ['pres', 'Presentations'], ['settings', 'Settings']];
async function render() { const nav = $('#nav'); nav.innerHTML = ''; TABS.forEach(([k, n]) => nav.append(h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; render(); } }, n))); const v = $('#view'); v.innerHTML = ''; v.append(await views[tab]()); renderLive(); }
function net() { const n = $('#net'); n.textContent = navigator.onLine ? 'Online' : 'Offline mode'; n.className = navigator.onLine ? '' : 'off'; }
addEventListener('online', net); addEventListener('offline', net);
api.onClosedProjector(() => toast('Projector closed.'));
(async () => { await reload(); applyHeader(); net(); await render(); })();
