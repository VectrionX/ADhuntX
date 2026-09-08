import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
execFileSync('npm', ['audit', '--omit=dev', '--audit-level=high'], { stdio: 'inherit' });

const localOnlyFiles = ['App.tsx', 'utils.ts'];
const localOnlySource = localOnlyFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const forbiddenPatterns = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(localOnlySource)) {
    throw new Error(`High production audit failed: local-only source matches ${pattern}`);
  }
}

console.log('High production audit passed: clean diff and browser-local import/export boundaries verified.');