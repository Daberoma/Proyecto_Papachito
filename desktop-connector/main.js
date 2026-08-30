import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
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
  let devices = [];
  if (api) {
    try {
      const response = await fetch(`${apiBase}/api/conexion/estado`, { signal: AbortSignal.timeout(1800) });
      const payload = await response.json();
      devices = Array.isArray(payload.devices) ? payload.devices : [];
    } catch {}
  }
  const connectionUrl = `papachito://connect?api=${encodeURIComponent(apiBase)}&web=${encodeURIComponent(webUrl)}`;
  const qrDataUrl = await QRCode.toDataURL(connectionUrl, { width: 420, margin: 2, errorCorrectionLevel: 'M' });
  return { host, apiBase, webUrl, connectionUrl, qrDataUrl, api, web, devices, deviceConnected: devices.length > 0, ready: Boolean(host && api && web) };
}

function openSystemWindow() {
  const browsers = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  const browser = browsers.find((candidate) => candidate && existsSync(candidate));
  if (!browser) throw new Error('No se encontró un navegador compatible.');
  const child = spawn(browser, ['--app=http://127.0.0.1:8091/', '--new-window', '--start-maximized'], { detached: true, stdio: 'ignore' });
  child.unref();
}

function createWindow() {
  const window = new BrowserWindow({
    width: 560,
    height: 760,
    minWidth: 480,
    minHeight: 640,
    resizable: true,
    maximizable: true,
    show: false,
    backgroundColor: '#f6f1e8',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  window.loadFile(path.join(__dirname, 'index.html'));
  window.once('ready-to-show', () => { window.maximize(); window.show(); });
}

ipcMain.handle('connection:state', connectionState);
ipcMain.handle('system:open', openSystemWindow);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
