# ADhuntX Local CSV Triage

ADhuntX is a browser-local tool for conservative, evidence-linked triage of one CSV export. It applies basic heuristics to the values supplied by the user and renders the results in the current tab.

## Scope and privacy boundary

- CSV only; maximum 5 MB and 10,000 data rows.
- Parsing, scoring, charts, and report generation run in browser memory.
- Imports are not uploaded, sent to connectors, logged, or written to local/session storage.
- Resetting the dashboard drops the in-memory dataset; reloading the page starts empty.
- ADhuntX does not query Active Directory or Entra, build an AD graph, calculate effective permissions, or analyze attack paths.
- Do not use this tool as a substitute for an authorized directory assessment or your organization's data-handling controls.

## Run locally

Requires Node.js 18+ and a modern browser.

```bash
npm install
npm run dev
```

The app is intentionally client-only. No API key, server endpoint, or AI connector is required.

## CSV input

The required headers are shown in the onboarding panel and enforced by `utils.ts`. Use a synthetic or approved export; never commit sensitive exports to this repository.

## Verification

```bash
npm test
npm run build
```

The parser boundary tests cover size, row-count, malformed input, and the no-persistence contract.
