const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const jobs = new Map();
let db;

// Only a local Ollama server is allowed, so source code never leaves this computer.
const local = s => {
  const x = new URL(s);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(x.hostname)) throw new Error('Only a local Ollama address is allowed');
  return x.origin;
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, backgroundColor: '#FFFFFF', title: 'NEXUS FORGE AI',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  db = new Database(path.join(app.getPath('userData'), 'nexus-forge.db'));
  db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');

  ipcMain.on('db:load', e => { const r = db.prepare('SELECT v FROM kv WHERE k = ?').get('state'); e.returnValue = r ? r.v : 'null'; });
  ipcMain.handle('db:save', (_, v) => {
    if (typeof v !== 'string' || v.length > 5e7) throw new Error('Invalid state');
    db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('state', v);
  });
  ipcMain.handle('ollama:tags', async (_, url) => (await fetch(local(url) + '/api/tags')).json());

  ipcMain.on('ollama:chat', async (e, id, url, model, messages) => {
    const ctl = new AbortController(); jobs.set(id, ctl);
    const send = (...a) => { if (!e.sender.isDestroyed()) e.sender.send('chat:' + id, ...a); };
    try {
      const r = await fetch(local(url) + '/api/chat', { method: 'POST', body: JSON.stringify({ model, messages, stream: true }), signal: ctl.signal });
      if (!r.ok) throw new Error('Ollama ' + r.status + ': ' + await r.text());
      const dec = new TextDecoder(); let buf = '';
      for await (const chunk of r.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          const j = JSON.parse(line);
          if (j.error) throw new Error(j.error);
          send('tok', j.message?.content || '');
        }
      }
      send('done');
    } catch (err) {
      send('done', ctl.signal.aborted ? 'aborted' : String(err.message || err));
    } finally { jobs.delete(id); }
  });
  ipcMain.on('ollama:abort', (_, id) => jobs.get(id)?.abort());

  createWindow();
});
app.on('window-all-closed', () => app.quit());
