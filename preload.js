const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  invoke: (ch, ...a) => ipcRenderer.invoke(ch, ...a),
  onProject: fn => ipcRenderer.on('project', (_e, p) => fn(p)),
  onClosedProjector: fn => ipcRenderer.on('projector-closed', () => fn())
});
