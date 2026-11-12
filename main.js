const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path'), fs = require('fs');
const { Store, parseBibleText, searchBible } = require('./lib');
let store, win, proj, last = { mode: 'blank' };

function createMain() {
  win = new BrowserWindow({ width: 1366, height: 820, minWidth: 1000, minHeight: 650, title: 'Church Projector', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.setMenuBarVisibility(false);
  win.loadFile('renderer/index.html');
  win.on('closed', () => { win = null; if (proj && !proj.isDestroyed()) proj.close(); });
}
function displays() { const p = screen.getPrimaryDisplay().id; return screen.getAllDisplays().map((d, i) => ({ id: d.id, label: `Display ${i + 1} (${d.bounds.width}x${d.bounds.height})${d.id === p ? ' - primary' : ''}`, primary: d.id === p })); }
function openProjector() {
  const all = screen.getAllDisplays(), want = store.data.settings.displayId;
  let d = all.find(x => x.id === want) || all.find(x => x.id !== screen.getPrimaryDisplay().id);
  if (proj && !proj.isDestroyed()) proj.close();
  const common = { title: 'Projector', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } };
  if (d) proj = new BrowserWindow({ ...common, x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height, frame: false, fullscreen: true, backgroundColor: '#000' });
  else proj = new BrowserWindow({ ...common, width: 960, height: 540, backgroundColor: '#000' }); // single-screen fallback: preview window
  proj.setMenuBarVisibility(false);
  proj.loadFile('renderer/projector.html');
  proj.webContents.once('did-finish-load', () => proj.webContents.send('project', { ...last, settings: store.data.settings }));
  proj.on('closed', () => { proj = null; win && !win.isDestroyed() && win.webContents.send('projector-closed'); });
  return { external: !!d };
}
const getJson = async url => { const r = await fetch(url, { signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

app.whenReady().then(() => {
  store = new Store(path.join(app.getPath('userData'), 'church-data.json'));
  ipcMain.handle('db:load', () => store.data);
  ipcMain.handle('db:set', (_e, k, v) => { store.set(k, v); return true; });
  ipcMain.handle('displays', displays);
  ipcMain.handle('projector:open', openProjector);
  ipcMain.handle('projector:close', () => { if (proj && !proj.isDestroyed()) proj.close(); return true; });
  ipcMain.handle('projector:state', () => !!(proj && !proj.isDestroyed()));
  ipcMain.handle('project', (_e, p) => { last = p; if (proj && !proj.isDestroyed()) proj.webContents.send('project', { ...p, settings: store.data.settings }); return true; });
  ipcMain.handle('bible:search', (_e, q, tr) => searchBible(store.data.bible, q, tr));
  ipcMain.handle('bible:import', async (_e, name) => {
    const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Text', extensions: ['txt'] }], properties: ['openFile'] });
    if (r.canceled) return { count: 0 };
    const v = parseBibleText(fs.readFileSync(r.filePaths[0], 'utf8'), name);
    if (!v.length) return { count: 0, error: 'No verses recognised. Use lines like: John 3:16 For God so loved...' };
    store.data.bible = store.data.bible.filter(x => x.tr !== name).concat(v);
    if (!store.data.translations.includes(name)) store.data.translations.push(name);
    store.save(); return { count: v.length };
  });
  ipcMain.handle('bible:online', async (_e, ref, tr) => { // bible-api.com, public-domain translations; results are cached for offline use
    const j = await getJson(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${tr}`);
    const label = tr.toUpperCase(), vs = (j.verses || []).map(x => ({ b: x.book_name, c: x.chapter, v: x.verse, t: x.text.replace(/\s+/g, ' ').trim(), tr: label }));
    store.data.bible = store.data.bible.filter(o => !vs.some(n => n.tr === o.tr && n.b === o.b && n.c === o.c && n.v === o.v)).concat(vs);
    if (!store.data.translations.includes(label)) store.data.translations.push(label);
    store.save(); return vs;
  });
  ipcMain.handle('lyrics:online', async (_e, artist, title) => { // lyrics.ovh public API
    const j = await getJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!j.lyrics) throw new Error('No lyrics found'); return j.lyrics.replace(/\r/g, '').replace(/^Paroles de la chanson.*\n/, '').trim();
  });
  ipcMain.handle('doc:import', async () => {
    const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Documents', extensions: ['txt', 'md', 'docx', 'pdf', 'rtf', 'html'] }], properties: ['openFile', 'multiSelections'] });
    const out = [];
    for (const f of r.canceled ? [] : r.filePaths) {
      const ext = path.extname(f).slice(1).toLowerCase(), name = path.basename(f); let text = '';
      try {
        if (ext === 'docx') text = (await require('mammoth').extractRawText({ path: f })).value;
        else if (ext === 'pdf') text = (await require('pdf-parse/lib/pdf-parse.js')(fs.readFileSync(f))).text;
        else if (ext === 'html') text = fs.readFileSync(f, 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/(p|div|h\d|li|br)>/gi, '\n\n').replace(/<[^>]+>/g, '');
        else if (ext === 'rtf') text = fs.readFileSync(f, 'utf8').replace(/\\par[d]?/g, '\n').replace(/\\'[0-9a-f]{2}/gi, '').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
        else text = fs.readFileSync(f, 'utf8');
        out.push({ name, text: text.replace(/\r/g, '').trim() });
      } catch (e) { out.push({ name, error: e.message }); }
    }
    return out;
  });
  ipcMain.handle('logo:choose', async () => {
    const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }], properties: ['openFile'] });
    if (r.canceled) return null; const f = r.filePaths[0], ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml');
    return `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
  });
  createMain();
});
app.on('window-all-closed', () => app.quit());
