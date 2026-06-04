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

### Data Privacy & Offline Assurance

ADhuntX is explicitly designed to run 100% offline in the client's browser.
- **No Telemetry:** We do not collect usage data.
- **No External Calls:** The application should not make outbound network requests (except for loading local resources or explicitly defined CDN assets like fonts/icons during development).

If you discover a mechanism where data is inadvertently transmitted externally, please report this as a critical vulnerability immediately.