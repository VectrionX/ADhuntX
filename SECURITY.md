# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of ADhuntX seriously. If you have found a vulnerability, please refrain from posting it publicly on the issue tracker.

### How to Report

1.  **Do not open a public issue.**
2.  Email the details of the vulnerability to the maintainer or use GitHub's "Report a vulnerability" feature if enabled.
3.  Include steps to reproduce the issue.

### Response

We will acknowledge your report within 48 hours and provide an estimated timeline for a fix.

### Data Privacy & Processing Boundary

ADhuntX processes one user-selected CSV in browser memory using deterministic, basic heuristics. Imports stay in the current tab, are not uploaded or saved, and are discarded on reset or reload. The application has no backend, telemetry, API key, AI connector, directory connector, or cloud-processing path. Initial assets are served from this application; user-initiated footer links are not data-processing calls.

If you discover a mechanism that transmits imported CSV content or derived findings externally, please report it as a critical vulnerability immediately.