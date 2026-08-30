import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PAPACHITO_CONNECTOR_PORT || 8188);
const apiPort = Number(process.env.PAPACHITO_API_PORT || 8090);
const webPort = Number(process.env.PAPACHITO_WEB_PORT || 8091);

function localAddress() {
  const all = Object.values(os.networkInterfaces()).flatMap((items) => items || []);
  const valid = all.filter((item) => item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'));
  return valid.find((item) => /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(item.address))?.address || valid[0]?.address || '';
}

async function probe(url) {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1800) }); return response.ok || response.status < 500; } catch { return false; }
}

async function state() {
  const host = localAddress();
  const apiBase = `http://${host || '127.0.0.1'}:${apiPort}`;
  const webUrl = `http://${host || '127.0.0.1'}:${webPort}`;
  const expoUrl = host ? `exp://${host}:8081` : '';
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
  return { host, apiBase, webUrl, expoUrl, connectionUrl, api, web, devices, deviceConnected: devices.length > 0, ready: Boolean(host && api && web), qrDataUrl: await QRCode.toDataURL(connectionUrl, { width: 420, margin: 2, errorCorrectionLevel: 'M' }) };
}

function openSystemWindow() {
  const browsers = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter(existsSync);
  if (!browsers.length) throw new Error('No se encontró un navegador compatible.');
  const profile = path.join(os.tmpdir(), 'Papachito-system-window');
  const child = spawn(browsers[0], ['--app=http://127.0.0.1:8091/', '--new-window', `--user-data-dir=${profile}`], { detached: true, stdio: 'ignore' });
  child.unref();
}

const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
http.createServer(async (request, response) => {
  try {
    if (request.url === '/state') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(await state())); return; }
    if (request.method === 'POST' && request.url === '/open-system') { openSystemWindow(); response.writeHead(202); response.end(); return; }
    const requested = request.url === '/' ? 'index.html' : request.url.slice(1).split('?')[0];
    const file = path.resolve(root, requested);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end(); return; }
    response.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404); response.end('No encontrado'); }
}).listen(port, '127.0.0.1');
