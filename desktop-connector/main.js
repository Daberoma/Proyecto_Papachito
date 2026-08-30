import { app, BrowserWindow, ipcMain } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_PORT = Number(process.env.PAPACHITO_API_PORT || 8090);
const WEB_PORT = Number(process.env.PAPACHITO_WEB_PORT || 8091);

function localAddress() {
  const all = Object.values(os.networkInterfaces()).flatMap((items) => items || []);
  const valid = all.filter((item) => item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'));
  return valid.find((item) => /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(item.address))?.address || valid[0]?.address || '';
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function connectionState() {
  const host = localAddress();
  const apiBase = `http://${host || '127.0.0.1'}:${API_PORT}`;
  const webUrl = `http://${host || '127.0.0.1'}:${WEB_PORT}`;
  const api = await probe(`${apiBase}/api/salud`);
  const web = await probe(webUrl);
  const connectionUrl = `papachito://connect?api=${encodeURIComponent(apiBase)}&web=${encodeURIComponent(webUrl)}`;
  const qrDataUrl = await QRCode.toDataURL(connectionUrl, { width: 420, margin: 2, errorCorrectionLevel: 'M' });
  return { host, apiBase, webUrl, connectionUrl, qrDataUrl, api, web, ready: Boolean(host && api && web) };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 560,
    height: 760,
    minWidth: 480,
    minHeight: 640,
    resizable: false,
    maximizable: false,
    show: false,
    backgroundColor: '#f6f1e8',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  window.loadFile(path.join(__dirname, 'index.html'));
  window.once('ready-to-show', () => window.show());
}

ipcMain.handle('connection:state', connectionState);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
