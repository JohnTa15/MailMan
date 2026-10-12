const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },
  dialog: {
    open: (options) => ipcRenderer.invoke('dialog:open', options),
  },
  deepLink: (callback) => {
    ipcRenderer.on('deep-link', (_, url) => callback(url));
  },
  platform: process.platform,
});
