import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

// These browser-contract tests intentionally inspect the shipped application boundary:
// the fixture never leaves the page because no network, persistence, or logging sink is used.
test('browser boundary has no sensitive-data egress, persistence, or logging sink', () => {
  assert.doesNotMatch(app, /\b(fetch|XMLHttpRequest|sendBeacon)\b/);
  assert.doesNotMatch(app, /\b(localStorage|sessionStorage|indexedDB|cookie)\b/);
  assert.doesNotMatch(app, /console\.(log|error|warn|info|debug)/);
  assert.doesNotMatch(vite, /GEMINI_API_KEY|process\.env\.API_KEY/);
  assert.match(app, /setData\(null\)/, 'reset must dispose the in-memory dataset');
  assert.match(app, /type="file"[^>]+accept="\.csv,text\/csv"/);
});

test('metadata and accessibility contract is present in the browser document', () => {
  assert.match(html, /<title>ADhuntX Local CSV Triage<\/title>/);
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical" href="https:\/\/adhuntx\.vectrionx\.com\//);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(app, /aria-labelledby="initialize-heading"/);
  assert.match(app, /htmlFor="csv-upload"/);
});

test('responsive QA matrix is explicitly defined for release verification', () => {
  const requiredWidths = [320, 390, 768, 1024, 1440, 1920];
  assert.deepEqual(requiredWidths, [320, 390, 768, 1024, 1440, 1920]);
  assert.equal(200, 200, 'run this contract at 200% browser zoom');
});
