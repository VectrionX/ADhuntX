# Performance remediation

## Scope

The dashboard chart module is loaded only after imported/demo data is available. The public landing/import screen no longer downloads Recharts as part of the initial entry chunk. Chart behavior, data handling, and navigation remain unchanged.

## Changed files

- `App.tsx` — replaces the static chart import with `React.lazy` dynamic imports; adds a fixed-size `Suspense` fallback and an error boundary around the dashboard charts.
- `components/ChartErrorBoundary.tsx` — provides a user-visible recovery state if the deferred chart chunk fails to load or render.
- `scripts/check-bundle-size.mjs` — fails the build if any JavaScript asset exceeds the configured byte limit (`500000` by default).
- `package.json` — runs the bundle-size safeguard after every production build and exposes `check:bundle` for local/CI use.

## Verification

Run from the repository root:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

`npm run build` emits the deferred chart chunk and runs the 500,000-byte JavaScript asset guard. Override the threshold only for an explicitly reviewed exception:

```bash
BUNDLE_SIZE_LIMIT_BYTES=600000 npm run check:bundle
```

After serving `dist`, verify that the landing screen does not request the chart chunk before loading demo/CSV data, and that demo data renders all three charts. If the deferred chunk cannot be loaded, the dashboard displays a clear reload action; because imported data is held in memory only, the user must load the CSV/demo data again after the reload.

## Rollback

Revert the performance-remediation commit. This restores the previous static chart import and removes the bundle guard. If reverting a deployment, publish the complete reverted `dist/` directory atomically so HTML and hashed assets stay aligned; do not mix old HTML with new asset hashes.
