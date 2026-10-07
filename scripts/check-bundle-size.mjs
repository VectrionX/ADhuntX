import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const threshold = Number(process.env.BUNDLE_SIZE_LIMIT_BYTES ?? 500_000);

if (!Number.isFinite(threshold) || threshold <= 0) {
  console.error('Bundle size check failed: BUNDLE_SIZE_LIMIT_BYTES must be a positive number.');
  process.exit(1);
}

const files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js'));
const sizes = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(join(assetsDir, file))).size })));
const oversized = sizes.filter(({ bytes }) => bytes > threshold);

if (oversized.length > 0) {
  console.error(`Bundle size check failed: JavaScript chunks must be <= ${threshold} bytes.`);
  for (const { file, bytes } of oversized) console.error(`- ${file}: ${bytes} bytes`);
  process.exit(1);
}

console.log(`Bundle size check passed: ${sizes.length} JavaScript chunks <= ${threshold} bytes.`);