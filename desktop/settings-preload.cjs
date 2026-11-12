'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('draftcraftSettings', {
  status: () => ipcRenderer.invoke('ai:status'),
  save: (key) => ipcRenderer.invoke('ai:save', key),
  clear: () => ipcRenderer.invoke('ai:clear'),
  close: () => ipcRenderer.invoke('ai:close'),
});
