// Zero-dependency local server (Node 18+). Run: node server.js
// Loads OPENROUTER_API_KEY from .env, serves index.html, proxies /api/chat.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// minimal .env loader (real environment variables win over .env)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
} catch (e) { /* no .env file */ }

const PORT = process.env.PORT || 8888;

http.createServer(async (req, res) => {
  if (req.url === '/api/chat' && req.method === 'POST') {
    const key = (req.headers['x-user-key'] || process.env.OPENROUTER_API_KEY || '').trim();
    if (!key) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Server has no OPENROUTER_API_KEY set. Add it to .env' } }));
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try {
      const up = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Nova Chat' },
        body: Buffer.concat(chunks),
      });
      res.writeHead(up.status, {
        'Content-Type': up.headers.get('content-type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      Readable.fromWeb(up.body).pipe(res);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Upstream error: ' + e.message } }));
    }
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => console.log(`Nova running at http://localhost:${PORT}`));
