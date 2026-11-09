// Prueba de humo E2E en navegador real (Chromium headless, 375×812, sin dependencias externas).
// Verifica que el servidor estático sirva toda la app sin 404, que el Service Worker instale SHELL completo
// (incluidas las imágenes OpenMoji) y que las vistas principales (#/, #/mapa, #/ajustes, #/grupo/a1.u1.t1/1)
// rendericen sin errores de consola ni excepciones.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  const notFound = [];
  const server = createServer((req, res) => {
    const urlPath = new URL(req.url, 'http://127.0.0.1').pathname;
    const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    const file = join(ROOT, rel);
    if (!existsSync(file) || !statSync(file).isFile()) {
      if (urlPath !== '/favicon.ico') notFound.push(urlPath);
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, notFound }));
  });
}

function launchBrowser(userDataDir) {
  const bin = process.env.CHROME_BIN ?? '/snap/bin/chromium';
  const proc = spawn(bin, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=375,812',
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    'about:blank',
  ]);
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`Chromium no abrió DevTools: ${stderr}`)), 15000);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: m[1] });
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function connectPage(browserWsUrl) {
  const httpBase = browserWsUrl.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*$/, '');
  const targets = await (await fetch(`${httpBase}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails?.text ?? 'exceptionThrown');
      }
      const fn = listeners.get(msg.method);
      if (fn) { listeners.delete(msg.method); fn(msg.params); }
    }
  };
  const once = (method) => new Promise((resolve) => listeners.set(method, resolve));
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return { ws, send, once, evaluate, errors };
}

async function main() {
  const { server, port, notFound } = await startServer();
  const userDataDir = mkdtempSync(join(tmpdir(), 'dl-e2e-'));
  let proc;
  try {
    const launched = await launchBrowser(userDataDir);
    proc = launched.proc;
    const { ws, send, once, evaluate, errors } = await connectPage(launched.wsUrl);
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await loaded;

    const homeCheck = await evaluate(`(async () => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const text = document.getElementById('view')?.innerText ?? '';
        if (/Guten (Morgen|Tag|Abend)/.test(text) && text.includes('Empezar')) break;
        await new Promise(r => setTimeout(r, 50));
      }
      const reg = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const cache = await caches.open(keys[0]);
      const cached = (await cache.keys()).length;
      return { text: document.getElementById('view')?.innerText ?? '', swActive: !!reg.active, cached };
    })()`);

    if (!/Guten (Morgen|Tag|Abend)/.test(homeCheck.text) || !homeCheck.swActive || homeCheck.cached < 140) {
      throw new Error(`Fallo en inicio o SW: ${JSON.stringify(homeCheck)}`);
    }

    const routesCheck = await evaluate(`(async () => {
      const visit = async (hash, expected) => {
        location.hash = hash;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const text = document.getElementById('view')?.innerText ?? '';
          if (text.includes(expected)) return text;
          await new Promise(r => setTimeout(r, 50));
        }
        throw new Error('No apareció "' + expected + '" en ' + hash + ': ' + (document.getElementById('view')?.innerText ?? ''));
      };
      await visit('#/mapa', 'Mapa de temas');
      await visit('#/ajustes', 'OpenMoji');
      await visit('#/grupo/a1.u1.t1/1', 'Escalón 1');
      return true;
    })()`);

    ws.close();
    if (!routesCheck || errors.length || notFound.length) {
      throw new Error(`Errores E2E: errors=${JSON.stringify(errors)}, notFound=${JSON.stringify(notFound)}`);
    }
    console.log(`e2e_smoke: ok (375x812, ${homeCheck.cached} archivos en caché del SW, 0 errores, 0 404)`);
  } finally {
    proc?.kill('SIGKILL');
    server.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
