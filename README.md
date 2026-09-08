# ADhuntX Local CSV Triage

ADhuntX is a browser-local CSV review tool for supplied account values. It imports one CSV into the current browser tab, applies a small set of deterministic rules, and lets the user export the resulting review list.

## Scope and limits

- Import processing, rule evaluation, and report creation run in the browser. ADhuntX does not upload imports, call an API, save an import to local storage, or use an Active Directory connector.
- Closing or resetting the tab clears the import from application memory.
- This is **not** an Active Directory graph tool. It does not query AD, resolve nested memberships, identify shadow administrators, infer permissions, or analyze attack paths.
- Results are review flags, not findings of compromise. Each flag identifies its source field and supplied value.
- Missing, invalid, and recognized unknown values (`Unknown`, `N/A`, `Not set`, blank) stay **Unknown**. They do not become `False` or generate a failure flag.

## Run locally

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Run checks:

```bash
npm test
npm run build
```

## CSV import contract

Only `.csv` files are accepted. Imports are limited to **5 MB** and **10,000 non-empty rows**. The parser supports quoted commas, quoted newlines, and escaped quotes. It rejects malformed quoting, duplicate headers, missing required headers, inconsistent row widths, and empty datasets.

Required headers (case-sensitive):

```text
UserName,SamAccountName,Enabled,LastLogonDate,MemberOf,PasswordExpiryDate,MFAStatus,PasswordNeverExpires
```

Optional headers:

```text
Role,Department,PasswordLastSet,DormantAccountFlag
```

Use ISO dates: `YYYY-MM-DD`. Boolean values are `True` or `False`; anything else is shown as `Unknown` and is not treated as a negative security condition. `MemberOf` may use semicolons (`;`) or pipes (`|`) between directly supplied groups. Commas should be quoted as normal CSV fields.

## Local rules

The score is a prioritization aid: 60% direct-group flags and 40% hygiene flags. Scores and levels are deterministic for the supplied CSV and review date. No inference is made from missing values.

| Rule | Condition from CSV | Points |
| --- | --- | ---: |
| P1 | Exact direct `MemberOf` match for a named built-in privileged group | 40 privilege |
| P2 | Supplied inactivity evidence plus P1 | 30 privilege |
| H1 | Supplied `PasswordExpiryDate` is before the review date | 40 hygiene |
| H2 | Supplied `PasswordNeverExpires` is `True` | 40 hygiene |
| H3 | Supplied `DormantAccountFlag` is `True`, or a valid `LastLogonDate` is over 90 days old | 30 hygiene |
| H4 | Supplied `MFAStatus` is `False` | 30 hygiene |

P1 only recognizes these exact, case-insensitive group names: `Domain Admins`, `Enterprise Admins`, `Schema Admins`, `Administrators`, `Account Operators`, `Backup Operators`, `Server Operators`, and `Print Operators`. It does not match substrings or claim membership paths.

## Export safety

Exports contain local rule results, source evidence, and recommendations. Every CSV cell is quoted, embedded quotes are escaped, and values beginning (after spaces or tabs) with `=`, `+`, `-`, or `@` are prefixed with an apostrophe. This reduces spreadsheet formula injection risk when the report is opened in spreadsheet software.

Review exported data under your organization’s handling requirements.

## License

MIT License. See [LICENSE](./LICENSE).
