import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const sensitive = 'SENSITIVE-ADHUNTX-DO-NOT-EXPORT';
const csv = [
  'UserName,SamAccountName,Enabled,LastLogonDate,MemberOf,Role,Department,PasswordLastSet,PasswordExpiryDate,MFAStatus,PasswordNeverExpires,DormantAccountFlag',
  `Sensitive User,sensitive.user,true,2026-09-01,"Domain Admins;${sensitive}",Administrator,Security,2026-09-01,2027-09-01,Disabled,false,false`,
].join('\n');

type Json = Record<string, unknown>;

function serveDist() {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const file = join(dist.pathname, relative);
    const chosen = existsSync(file) ? file : join(dist.pathname, 'index.html');
    const type = extname(chosen) === '.js' ? 'text/javascript' : extname(chosen) === '.css' ? 'text/css' : 'text/html';
    response.writeHead(200, { 'content-type': type });
    response.end(readFileSync(chosen));
  });
  return new Promise<{ server: ReturnType<typeof createServer>; url: string }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/` });
    });
  });
}

async function cdp(port: number, url: string) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  assert.equal(response.ok, true, 'Chrome must expose a new page target');
  const target = await response.json() as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { socket.onopen = () => resolve(); socket.onerror = () => reject(new Error('CDP websocket failed')); });
  let sequence = 0;
  const pending = new Map<number, (value: Json) => void>();
  const events: Json[] = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: Json };
    if (message.id) pending.get(message.id)?.(message.result ?? {});
    if (message.id) pending.delete(message.id);
    if (!message.id && message.result) events.push(message.result);
  };
  const command = (method: string, params: Json = {}) => new Promise<Json>((resolve) => {
    const id = ++sequence;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression: string) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    const remote = result as { result?: { value?: unknown; description?: string }; exceptionDetails?: { text?: string } };
    if (remote.exceptionDetails) return undefined;
    return remote.result?.value;
  };
  return { command, evaluate, events, close: () => socket.close() };
}

async function waitFor(cdpClient: Awaited<ReturnType<typeof cdp>>, expression: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await cdpClient.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`Timed out waiting for ${expression}; DOM=${String(await cdpClient.evaluate('document.body?.innerText || document.documentElement?.outerHTML')).slice(0, 800)}`);
}

test('real Chromium proves CSV stays in browser memory and metadata/UI contracts hold', async (t) => {
  const chromeProfile = mkdtempSync(join(tmpdir(), 'adhuntx-chrome-'));
  const fixture = join(chromeProfile, 'sensitive.csv');
  writeFileSync(fixture, csv, 'utf8');
  const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
    '--remote-debugging-port=0', `--user-data-dir=${chromeProfile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  t.after(() => { chrome.kill('SIGTERM'); rmSync(chromeProfile, { recursive: true, force: true }); });
  const port = await new Promise<number>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start: ${output}`)), 10_000);
    chrome.stderr.on('data', (chunk) => {
      output += String(chunk);
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    chrome.once('exit', (code) => reject(new Error(`Chrome exited (${code}): ${output}`)));
  });
  const { server, url } = await serveDist();
  t.after(() => server.close());
  const browser = await cdp(port, url);
  t.after(() => browser.close());
  await browser.command('Runtime.enable');
  await browser.command('Page.enable');
  await browser.command('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const leaks = window.__adhuntxLeaks = [];
    const sensitive = ${JSON.stringify(sensitive)};
    const inspect = (value) => { try { if (String(value).includes(sensitive)) leaks.push(String(value)); } catch {} };
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket']) {
      const Original = window[name];
      if (!Original) continue;
      if (name === 'fetch') window.fetch = (...args) => { args.forEach(inspect); leaks.push('fetch'); return Promise.reject(new Error('network blocked by test')); };
      if (name === 'WebSocket') window.WebSocket = class { constructor(...args) { args.forEach(inspect); leaks.push('websocket'); } };
      if (name === 'XMLHttpRequest') window.XMLHttpRequest = class { open(...args) { args.forEach(inspect); leaks.push('xhr'); } send(body) { inspect(body); leaks.push('xhr-send'); } };
    }
    navigator.sendBeacon = (...args) => { args.forEach(inspect); leaks.push('beacon'); return false; };
    for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { args.forEach(inspect); leaks.push('storage'); return original.apply(this, args); }; }
    indexedDB.open = (...args) => { args.forEach(inspect); leaks.push('indexeddb'); throw new Error('indexedDB blocked by test'); };
    for (const method of ['log', 'error', 'warn', 'info', 'debug']) { const original = console[method]; console[method] = (...args) => { args.forEach(inspect); leaks.push('console'); return original(...args); }; }
  })()` });
  await browser.command('Page.navigate', { url });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await waitFor(browser, `document.querySelector('#csv-upload') !== null`);
  const metadata = await browser.evaluate(`JSON.stringify({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    twitter: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
    jsonLd: document.querySelector('script[type="application/ld+json"]')?.textContent,
    heading: document.querySelector('#initialize-heading')?.textContent,
    label: document.querySelector('label[for="csv-upload"]')?.textContent,
  })`);
  const parsed = JSON.parse(String(metadata)) as Record<string, string>;
  assert.equal(parsed.title, 'ADhuntX Local CSV Triage');
  assert.equal(parsed.canonical, 'https://adhuntx.vectrionx.com/');
  assert.match(parsed.description, /local CSV/i);
  assert.equal(parsed.ogTitle, parsed.title);
  assert.equal(parsed.twitter, 'summary');
  assert.match(parsed.jsonLd, /ADhuntX/);
  const jsonLd = JSON.parse(parsed.jsonLd) as { name?: string; url?: string; description?: string };
  assert.equal(jsonLd.name, parsed.title);
  assert.equal(jsonLd.url, parsed.canonical);
  assert.equal(jsonLd.description, parsed.description);
  assert.match(parsed.heading, /Initialize Dashboard/);
  assert.match(parsed.label, /Select CSV file/);
  const accessibility = await browser.evaluate(`JSON.stringify((() => {
    const label = document.querySelector('label[for="csv-upload"]');
    const heading = document.querySelector('#initialize-heading');
    const input = document.querySelector('#csv-upload');
    const style = label ? getComputedStyle(label) : null;
    return { labelledInput: input?.getAttribute('id') === label?.getAttribute('for'), heading: heading?.id, labelColor: style?.color, labelBackground: style?.backgroundImage };
  })())`);
  const accessibilityResult = JSON.parse(String(accessibility)) as { labelledInput: boolean; heading?: string; labelColor?: string; labelBackground?: string };
  assert.equal(accessibilityResult.labelledInput, true);
  assert.equal(accessibilityResult.heading, 'initialize-heading');
  assert.equal(accessibilityResult.labelColor, 'rgb(255, 255, 255)');
  assert.match(accessibilityResult.labelBackground ?? '', /gradient/);

  // The historically broken deep link must be served by the same SPA entry point.
  await browser.command('Page.navigate', { url: `${url}qa-direct-route/` });
  await waitFor(browser, `document.querySelector('#csv-upload') !== null`);
  assert.equal(await browser.evaluate('document.title'), parsed.title);
  await browser.command('Page.navigate', { url });
  await waitFor(browser, `document.querySelector('#csv-upload') !== null`);

  const documentResult = await browser.command('DOM.getDocument');
  const rootNode = (documentResult.root as { nodeId: number }).nodeId;
  const input = await browser.command('DOM.querySelector', { nodeId: rootNode, selector: '#csv-upload' });
  const inputNode = (input as { nodeId: number }).nodeId;
  await browser.command('DOM.setFileInputFiles', { nodeId: inputNode, files: [fixture] });
  await waitFor(browser, `document.body.innerText.includes('Total Users')`);
  await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Users')?.click()`);
  await waitFor(browser, `document.body.innerText.includes('Sensitive User')`);
  const state = await browser.evaluate(`(async () => JSON.stringify({ body: document.body.innerText, leaks: window.__adhuntxLeaks, local: Object.keys(localStorage), session: Object.keys(sessionStorage), indexedDb: indexedDB.databases ? (await indexedDB.databases()).map(db => db.name) : [] }))()`);
  const afterUpload = JSON.parse(String(state)) as { body: string; leaks: string[]; local: string[]; session: string[]; indexedDb: string[] };
  assert.match(afterUpload.body, /Sensitive User/);
  assert.doesNotMatch(afterUpload.body, new RegExp(sensitive));
  assert.deepEqual(afterUpload.leaks, []);
  assert.deepEqual(afterUpload.local, []);
  assert.deepEqual(afterUpload.session, []);
  assert.deepEqual(afterUpload.indexedDb, []);

  await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Reset Data'))?.click()`);
  await waitFor(browser, `document.querySelector('#csv-upload') !== null`);
  assert.match(String(await browser.evaluate('document.body.innerText')), /Initialize Dashboard/);
  await browser.command('Page.reload', { waitUntil: 'load' });
  await waitFor(browser, `document.querySelector('#csv-upload') !== null`);
  assert.doesNotMatch(String(await browser.evaluate('document.body.innerText')), /Sensitive User/);
  assert.deepEqual(await browser.evaluate('window.__adhuntxLeaks'), []);

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await browser.command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    const visible = await browser.evaluate(`JSON.stringify({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`);
    const dimensions = JSON.parse(String(visible)) as { width: number; scrollWidth: number; clientWidth: number };
    assert.equal(dimensions.width, width);
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `horizontal overflow at ${width}px`);
  }
});
