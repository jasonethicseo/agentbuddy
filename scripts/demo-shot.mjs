#!/usr/bin/env node
// Development tool, not part of the product (submission task 6): serves dist/demo on 127.0.0.1, opens it in a
// headless Chrome (no window on screen), presses Start demo, waits, reports what the page shows and any
// script error, and saves a screenshot. Everything it starts is stopped before it exits, at the latest
// after 120 s.
//
//   node scripts/demo-shot.mjs [--wait 16] [--out docs/demo.png] [--width 1000] [--height 700]
//
// Chrome: $CHROME, or Google Chrome in /Applications. Needs `npm run build:demo` first.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const WAIT_S = Number(arg('wait', '16'));
const OUT = arg('out', 'docs/demo.png');
const WIDTH = Number(arg('width', '1100'));
const HEIGHT = Number(arg('height', '700'));
const PORT = 4399;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const children = [];
const profile = mkdtempSync(join(tmpdir(), 'agentbuddy-shot-'));
async function cleanup() {
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  await Promise.all(children.map((c) => (c.exitCode !== null ? null : new Promise((r) => c.once('exit', r)))));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
const hardStop = setTimeout(() => {
  console.error('timeout: stopping');
  void cleanup().finally(() => process.exit(1));
}, 120_000);

function waitFor(child, pattern) {
  return new Promise((resolve, reject) => {
    let text = '';
    const on = (b) => {
      text += b.toString();
      const m = text.match(pattern);
      if (m) resolve(m);
    };
    child.stdout?.on('data', on);
    child.stderr?.on('data', on);
    child.on('exit', () => reject(new Error(`exited before ${pattern}`)));
  });
}

async function main() {
  const preview = spawn('npx', ['vite', 'preview', '--config', 'vite.demo.config.ts', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  children.push(preview);
  await waitFor(preview, /127\.0\.0\.1:4399/);

  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'pipe' });
  children.push(chrome);
  const [, wsBrowser] = await waitFor(chrome, /DevTools listening on (ws:\/\/\S+)/);
  const port = new URL(wsBrowser).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id !== undefined) pending.get(msg.id)?.(msg);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, (m) => resolve(m.result));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, userGesture: true, awaitPromise: true })).result?.value;

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await sleep(2500);
  await evaluate("document.querySelector('.demo-start-btn').click()");
  await sleep(WAIT_S * 1000);

  const report = await evaluate(`(() => {
    const win = document.querySelector('.demo-window').contentDocument;
    const text = (sel) => win.querySelector(sel)?.innerText.trim() ?? '';
    return {
      status: text('.statusbar'),
      alert: text('.alert-strip'),
      buddies: [...win.querySelectorAll('.buddy-main')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim()),
      popups: [...document.querySelectorAll('.demo-popup')].map((f) => f.contentDocument?.querySelector('.card')?.innerText.replace(/\\s+/g, ' ').trim() ?? ''),
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    };
  })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ ...report, errors, out: OUT }, null, 2));
  ws.close();
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    clearTimeout(hardStop);
    await cleanup();
  });
