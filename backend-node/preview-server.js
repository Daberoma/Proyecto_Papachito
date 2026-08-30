import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PREVIEW_PORT || 8091);
const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, '..', 'mobile', 'dist');

// Vista remota deliberadamente de solo lectura: nunca publica POST, PUT, PATCH
// ni DELETE de la API local.
app.use('/api', async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Vista remota de solo lectura' });
  try {
    const upstream = await fetch(`http://127.0.0.1:8090${req.originalUrl}`);
    const body = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
  } catch {
    res.status(502).json({ ok: false, message: 'La API local no responde' });
  }
});

app.use(express.static(webRoot));
app.get(/.*/, (_req, res) => res.sendFile(path.join(webRoot, 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`Papachito preview en http://0.0.0.0:${port}`));
