import { ADUserRaw, ADUserProcessed, KnownBoolean, RiskEvidence, RiskProfile } from './types';

export const MAX_CSV_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 10_000;

export const REQUIRED_CSV_HEADERS = [
  'UserName',
  'SamAccountName',
  'Enabled',
  'LastLogonDate',
  'MemberOf',
  'PasswordExpiryDate',
  'MFAStatus',
  'PasswordNeverExpires',
] as const;

export const OPTIONAL_CSV_HEADERS = [
  'Role',
  'Department',
  'PasswordLastSet',
  'DormantAccountFlag',
] as const;

const HIGH_PRIVILEGE_GROUPS = new Set([
  'domain admins',
  'enterprise admins',
  'schema admins',
  'administrators',
  'account operators',
  'backup operators',
  'server operators',
  'print operators',
]);

const UNKNOWN_VALUES = new Set(['', 'unknown', 'n/a', 'na', 'null', 'not set', 'not available']);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class CSVValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVValidationError';
  }
}

export interface CSVImportOptions {
  maxBytes?: number;
  maxRows?: number;
}

const normalizeText = (value: string | undefined): string => value?.trim() ?? '';

export const displayValue = (value: string | undefined | null): string => {
  const normalized = normalizeText(value ?? '');
  return UNKNOWN_VALUES.has(normalized.toLowerCase()) ? 'Unknown' : normalized;
};

const parseBoolean = (value: string | undefined): KnownBoolean => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
};

const parseDateOnly = (value: string | undefined): Date | null => {
  const normalized = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? parsed
    : null;
};

const parseRFC4180 = (content: string, maxRows: number): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let closedQuote = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ',') {
        row.push(field);
        field = '';
        closedQuote = false;
      } else if (character === '\n') {
        row.push(field);
        rows.push(row);
        if (rows.length > maxRows + 1) throw new CSVValidationError(`CSV exceeds the ${maxRows.toLocaleString()} row import limit.`);
        row = [];
        field = '';
        closedQuote = false;
      } else if (character !== '\r') {
        throw new CSVValidationError('Invalid CSV: characters after a closing quote must be a comma or line break.');
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) throw new CSVValidationError('Invalid CSV: a quote must begin a field.');
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      if (rows.length > maxRows + 1) throw new CSVValidationError(`CSV exceeds the ${maxRows.toLocaleString()} row import limit.`);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (inQuotes) throw new CSVValidationError('Invalid CSV: an opening quote is not closed.');
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
    if (rows.length > maxRows + 1) throw new CSVValidationError(`CSV exceeds the ${maxRows.toLocaleString()} row import limit.`);
  }
  return rows;
};

export const parseAndValidateCSV = (content: string, options: CSVImportOptions = {}): ADUserRaw[] => {
  const maxBytes = options.maxBytes ?? MAX_CSV_FILE_BYTES;
  const maxRows = options.maxRows ?? MAX_CSV_ROWS;
  if (new TextEncoder().encode(content).byteLength > maxBytes) {
    throw new CSVValidationError('CSV file exceeds the 5 MB import limit.');
  }

  if (!Number.isInteger(maxRows) || maxRows < 1) throw new CSVValidationError('CSV row limit must be a positive integer.');
  const rows = parseRFC4180(content, maxRows);
  if (rows.length === 0 || rows[0].every((cell) => normalizeText(cell) === '')) {
    throw new CSVValidationError('CSV is empty or has no header row.');
  }

  const headers = rows[0].map((header, index) => normalizeText(index === 0 ? header.replace(/^\uFEFF/, '') : header));
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length > 0) throw new CSVValidationError(`CSV has duplicate header "${duplicates[0]}".`);

  const missingHeaders = REQUIRED_CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new CSVValidationError(`CSV is missing required header(s): ${missingHeaders.join(', ')}.`);
  }

  const users: ADUserRaw[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex];
    if (values.every((cell) => normalizeText(cell) === '')) continue;
    if (values.length !== headers.length) {
      throw new CSVValidationError(`CSV row ${rowIndex + 1} has ${values.length} columns; expected ${headers.length}.`);
    }
    if (users.length >= maxRows) {
      throw new CSVValidationError(`CSV exceeds the ${maxRows.toLocaleString()} row import limit.`);
    }

    const record = Object.fromEntries(headers.map((header, index) => [header, normalizeText(values[index])]));
    users.push({
      UserName: record.UserName ?? '',
      SamAccountName: record.SamAccountName ?? '',
      Enabled: record.Enabled ?? '',
      LastLogonDate: record.LastLogonDate ?? '',
      MemberOf: record.MemberOf ?? '',
      Role: record.Role,
      Department: record.Department,
      PasswordLastSet: record.PasswordLastSet,
      PasswordExpiryDate: record.PasswordExpiryDate ?? '',
      MFAStatus: record.MFAStatus ?? '',
      PasswordNeverExpires: record.PasswordNeverExpires ?? '',
      DormantAccountFlag: record.DormantAccountFlag,
    });
  }

  if (users.length === 0) throw new CSVValidationError('CSV has no non-empty data rows.');
  return users;
};

// Backwards-compatible alias for callers outside the UI. New imports must use parseAndValidateCSV.
export const parseCSV = (content: string): ADUserRaw[] => parseAndValidateCSV(content);

const daysBetween = (date: Date, referenceDate: Date): number =>
  Math.floor((Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()) - date.getTime()) / ONE_DAY_MS);

const addEvidence = (
  evidence: RiskEvidence[],
  ruleId: string,
  sourceField: keyof ADUserRaw,
  sourceValue: string,
  description: string,
): void => {
  evidence.push({ ruleId, sourceField, sourceValue: displayValue(sourceValue), description });
};

const groupList = (memberOf: string): string[] =>
  normalizeText(memberOf)
    .split(/[;|]/)
    .map((group) => group.trim())
    .filter(Boolean);

export const processUserData = (rawUsers: ADUserRaw[], referenceDate = new Date()): ADUserProcessed[] => rawUsers.map((user, index) => {
  const groups = groupList(user.MemberOf);
  const isEnabled = parseBoolean(user.Enabled);
  const hasMFA = parseBoolean(user.MFAStatus);
  const passwordNeverExpires = parseBoolean(user.PasswordNeverExpires);
  const lastLogon = parseDateOnly(user.LastLogonDate);
  const passwordExpiry = parseDateOnly(user.PasswordExpiryDate);
  const explicitDormant = parseBoolean(user.DormantAccountFlag);
  const daysSinceLogin = lastLogon ? daysBetween(lastLogon, referenceDate) : null;
  const isDormant: KnownBoolean = explicitDormant === true
    ? true
    : explicitDormant === false && daysSinceLogin === null
      ? false
      : daysSinceLogin === null
        ? null
        : daysSinceLogin > 90;
  const passwordExpired: KnownBoolean = passwordNeverExpires === true
    ? false
    : passwordExpiry === null
      ? null
      : daysBetween(passwordExpiry, referenceDate) > 0;

  const privilegeEvidence: RiskEvidence[] = [];
  const hygieneEvidence: RiskEvidence[] = [];
  const privilegedGroups = groups.filter((group) => HIGH_PRIVILEGE_GROUPS.has(group.toLowerCase()));
  let privilegeScore = 0;
  let passwordHygieneScore = 0;

  if (privilegedGroups.length > 0) {
    privilegeScore += 40;
    addEvidence(
      privilegeEvidence,
      'P1',
      'MemberOf',
      privilegedGroups.join('; '),
      `Rule P1: Direct membership in supplied group "${privilegedGroups.join('; ')}".`,
    );
  }
  if (isDormant === true && privilegedGroups.length > 0) {
    privilegeScore += 30;
    addEvidence(
      privilegeEvidence,
      'P2',
      'LastLogonDate',
      user.LastLogonDate || user.DormantAccountFlag || '',
      'Rule P2: Supplied account inactivity evidence with direct privileged-group membership.',
    );
  }
  if (passwordExpired === true) {
    passwordHygieneScore += 40;
    addEvidence(hygieneEvidence, 'H1', 'PasswordExpiryDate', user.PasswordExpiryDate, 'Rule H1: Supplied password expiry date is before the review date.');
  }
  if (passwordNeverExpires === true) {
    passwordHygieneScore += 40;
    addEvidence(hygieneEvidence, 'H2', 'PasswordNeverExpires', user.PasswordNeverExpires, 'Rule H2: Supplied PasswordNeverExpires value is True.');
  }
  if (isDormant === true) {
    passwordHygieneScore += 30;
    addEvidence(hygieneEvidence, 'H3', explicitDormant === true ? 'DormantAccountFlag' : 'LastLogonDate', explicitDormant === true ? user.DormantAccountFlag ?? '' : user.LastLogonDate, 'Rule H3: Supplied inactivity evidence indicates a dormant account.');
  }
  if (hasMFA === false) {
    passwordHygieneScore += 30;
    addEvidence(hygieneEvidence, 'H4', 'MFAStatus', user.MFAStatus, 'Rule H4: Supplied MFAStatus value is False.');
  }

  privilegeScore = Math.min(100, privilegeScore);
  passwordHygieneScore = Math.min(100, passwordHygieneScore);
  const totalRiskScore = Math.round((privilegeScore * 0.6) + (passwordHygieneScore * 0.4));
  const riskLevel: RiskProfile['riskLevel'] = totalRiskScore >= 70 ? 'Critical'
    : totalRiskScore >= 50 ? 'High'
      : totalRiskScore >= 30 ? 'Medium'
        : 'Low';
  const evidence = [...privilegeEvidence, ...hygieneEvidence];
  const issues = evidence.map((item) => item.description);
  const recommendations: string[] = [];
  if (privilegedGroups.length > 0) recommendations.push('Review the supplied direct privileged-group memberships.');
  if (hasMFA === false) recommendations.push('Verify and remediate the supplied MFA status.');
  if (passwordNeverExpires === true) recommendations.push('Review the PasswordNeverExpires setting.');
  if (isDormant === true) recommendations.push('Review whether the dormant account should remain enabled.');
  if (passwordExpired === true) recommendations.push('Review the supplied password expiry date and reset process.');

  return {
    ...user,
    UserName: displayValue(user.UserName),
    SamAccountName: displayValue(user.SamAccountName),
    Role: displayValue(user.Role),
    Department: displayValue(user.Department),
    PasswordLastSet: displayValue(user.PasswordLastSet),
    LastLogonDate: displayValue(user.LastLogonDate),
    PasswordExpiryDate: displayValue(user.PasswordExpiryDate),
    id: `user-${index}`,
    groups,
    daysSinceLogin,
    isDormant,
    hasMFA,
    passwordExpired,
    passwordNeverExpires,
    isEnabled,
    risk: { privilegeScore, passwordHygieneScore, totalRiskScore, riskLevel, issues, recommendations, evidence },
  };
});

export const generateSampleCSV = (): string => `UserName,SamAccountName,Enabled,LastLogonDate,MemberOf,Role,Department,PasswordLastSet,PasswordExpiryDate,MFAStatus,PasswordNeverExpires,DormantAccountFlag
Alex Example,aexample,True,2026-08-30,Users,User,IT,2026-08-01,2027-08-01,True,False,False
Priya Admin,padmin,True,2026-01-01,Domain Admins,Admin,IT,2026-08-01,2027-08-01,False,False,False
No Data,nodata,Unknown,,Users,,, , ,Unknown,Unknown,Unknown`;

const csvCell = (value: string | number | boolean | null | undefined): string => {
  let cell = value === null || value === undefined || value === '' ? 'Unknown' : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
};

const booleanForExport = (value: KnownBoolean): string => value === null ? 'Unknown' : String(value);

export const buildCSVReport = (users: ADUserProcessed[]): string => {
  const headers = [
    'UserName', 'SamAccountName', 'Department', 'Enabled',
    'RiskLevel', 'TotalRiskScore', 'PrivilegeScore', 'HygieneScore',
    'Issues', 'Evidence', 'Recommendations', 'LastLogonDate', 'MFAStatus',
  ];
  const rows = users.map((user) => [
    user.UserName,
    user.SamAccountName,
    user.Department,
    booleanForExport(user.isEnabled),
    user.risk.riskLevel,
    user.risk.totalRiskScore,
    user.risk.privilegeScore,
    user.risk.passwordHygieneScore,
    user.risk.issues.join('; '),
    user.risk.evidence.map((item) => `${item.ruleId}: ${item.sourceField}=${item.sourceValue}`).join('; '),
    user.risk.recommendations.join('; '),
    user.LastLogonDate,
    booleanForExport(user.hasMFA),
  ].map(csvCell).join(','));
  return [headers.map(csvCell).join(','), ...rows].join('\r\n');
};

const downloadCSV = (content: string, fileName: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCSVTemplate = (): void => {
  const headers = [...REQUIRED_CSV_HEADERS, ...OPTIONAL_CSV_HEADERS];
  downloadCSV(headers.map(csvCell).join(','), 'adhuntx_template.csv');
};

export const exportToCSV = (users: ADUserProcessed[]): void => {
  if (users.length === 0) return;
  downloadCSV(buildCSVReport(users), `adhuntx_report_${new Date().toISOString().slice(0, 10)}.csv`);
};
