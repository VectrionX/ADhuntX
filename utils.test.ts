import { describe, expect, it } from 'vitest';
import {
  CSVValidationError,
  buildCSVReport,
  parseAndValidateCSV,
  processUserData,
} from './utils';

const headers = [
  'UserName',
  'SamAccountName',
  'Enabled',
  'LastLogonDate',
  'MemberOf',
  'Role',
  'Department',
  'PasswordLastSet',
  'PasswordExpiryDate',
  'MFAStatus',
  'PasswordNeverExpires',
  'DormantAccountFlag',
];

const csv = (rows: string[]) => `${headers.join(',')}\n${rows.join('\n')}`;

const safeRow = [
  'Alex Example',
  'aexample',
  'True',
  '2026-08-30',
  'Users',
  'User',
  'IT',
  '2026-08-01',
  '2027-08-01',
  'True',
  'False',
  'False',
].join(',');

describe('parseAndValidateCSV', () => {
  it('parses RFC4180 quoted commas and newlines without discarding fields', () => {
    const content = csv([
      '"Alex, Example",aexample,True,2026-08-30,"Users;Tier 1",User,"Security\nOperations",2026-08-01,2027-08-01,True,False,False',
    ]);

    const imported = parseAndValidateCSV(content);

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      UserName: 'Alex, Example',
      Department: 'Security\nOperations',
    });
  });

  it('rejects a CSV missing a required header instead of guessing a schema', () => {
    const invalidHeaders = headers.filter((header) => header !== 'MFAStatus');
    const content = `${invalidHeaders.join(',')}\n${safeRow}`;

    expect(() => parseAndValidateCSV(content)).toThrow(CSVValidationError);
    expect(() => parseAndValidateCSV(content)).toThrow('MFAStatus');
  });

  it('rejects an import that exceeds its byte limit before processing rows', () => {
    expect(() => parseAndValidateCSV(csv([safeRow]), { maxBytes: 10 })).toThrow('5 MB');
  });

  it('stops parsing once the bounded row limit is exceeded', () => {
    const oversized = `${headers.join(',')}\n${safeRow}\n${safeRow}\n${safeRow}\n"unterminated`;

    expect(() => parseAndValidateCSV(oversized, { maxRows: 2 })).toThrow('2 row import limit');
  });

  it('rejects characters appended after a closing quote', () => {
    const malformed = `${headers.join(',')}\n"Alex Example"oops,aexample,True,2026-08-30,Users,User,IT,2026-08-01,2027-08-01,True,False,False`;

    expect(() => parseAndValidateCSV(malformed)).toThrow('characters after a closing quote');
  });
});

describe('processUserData', () => {
  it('keeps missing and unknown values explicit and does not score them as failures', () => {
    const [user] = processUserData(parseAndValidateCSV(csv([
      'Unknown user,unknown,Unknown,,Users,,, , ,Unknown,Unknown,Unknown',
    ])));

    expect(user.hasMFA).toBeNull();
    expect(user.isEnabled).toBeNull();
    expect(user.isDormant).toBeNull();
    expect(user.passwordExpired).toBeNull();
    expect(user.risk.totalRiskScore).toBe(0);
    expect(user.risk.issues).toEqual([]);
  });

  it('only flags exact supplied privileged-group evidence and never claims a path', () => {
    const [user] = processUserData(parseAndValidateCSV(csv([
      'Priya Admin,padmin,True,2026-08-30,"Domain Admins;Domain Admins Support",Admin,IT,2026-08-01,2027-08-01,True,False,False',
    ])));

    expect(user.risk.privilegeScore).toBe(40);
    expect(user.risk.issues).toEqual(['Rule P1: Direct membership in supplied group "Domain Admins".']);
    expect(user.risk.evidence).toEqual([
      expect.objectContaining({ ruleId: 'P1', sourceField: 'MemberOf', sourceValue: 'Domain Admins' }),
    ]);
    expect(user.risk.issues.join(' ')).not.toMatch(/path|escalat/i);
  });
});

describe('buildCSVReport', () => {
  it('quotes cells, escapes embedded quotes, and neutralizes spreadsheet formulas', () => {
    const [user] = processUserData(parseAndValidateCSV(csv([
      '"=HYPERLINK(""https://example.test"")",formula,True,2026-08-30,Users,User,"x, y",2026-08-01,2027-08-01,True,False,False',
    ])));

    const report = buildCSVReport([user]);

    expect(report).toContain('"\'=HYPERLINK(\"\"https://example.test\"\")"');
    expect(report).toContain('"x, y"');
    expect(report.split('\n')).toHaveLength(2);
  });
});
