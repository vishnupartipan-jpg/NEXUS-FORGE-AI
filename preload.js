const { contextBridge, ipcRenderer: ipc } = require('electron');
contextBridge.exposeInMainWorld('nf', {
  loadSync: () => ipc.sendSync('db:load'),
  save: v => ipc.invoke('db:save', v),
  tags: url => ipc.invoke('ollama:tags', url),
  abort: id => ipc.send('ollama:abort', id),
  chat: (id, url, model, msgs, onTok, onDone) => {
    const ch = 'chat:' + id;
    const h = (_, t, d) => { if (t === 'tok') onTok(d); else { ipc.removeListener(ch, h); onDone(d); } };
    ipc.on(ch, h);
    ipc.send('ollama:chat', id, url, model, msgs);
  }
});
