import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('papachitoConnector', {
  readState: () => ipcRenderer.invoke('connection:state'),
  openSystem: () => ipcRenderer.invoke('system:open'),
});
