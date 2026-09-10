import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const meta = (property: string) => html.match(new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]+)"`, 'i'))?.[1];

describe('ADhuntX static indexability metadata', () => {
  it('publishes truthful canonical and social metadata', () => {
    expect(html).toContain('<title>ADhuntX | Offline Active Directory Security Dashboard</title>');
    expect(html).toContain('name="description" content="ADhuntX is an offline dashboard for reviewing provided Active Directory security data; it does not connect to or scan directory services."');
    expect(html).toContain('<link rel="canonical" href="https://adhuntx.vectrionx.com/">');
    expect(meta('og:title')).toBe('ADhuntX | Offline Active Directory Security Dashboard');
    expect(meta('og:url')).toBe('https://adhuntx.vectrionx.com/');
  });

  it('publishes a minimal accurate application schema', () => {
    expect(html).toContain('"@type":["WebApplication","Product"]');
    expect(html).toContain('"url":"https://adhuntx.vectrionx.com/"');
  });

  it('provides an allowed-root sitemap', () => {
    expect(readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8')).toContain('<loc>https://adhuntx.vectrionx.com/</loc>');
    expect(readFileSync(resolve(root, 'public/robots.txt'), 'utf8')).toContain('Allow: /');
  });
});
