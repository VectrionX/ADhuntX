import type { ADUserRaw, ADUserProcessed, RiskProfile } from './types';

// Constants for Risk Calculation
const HIGH_PRIVILEGE_GROUPS = [
  'Domain Admins',
  'Enterprise Admins',
  'Schema Admins',
  'Administrators',
  'Account Operators',
  'Backup Operators',
  'Server Operators',
  'Print Operators'
];

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 10_000;
export const REQUIRED_CSV_HEADERS = [
  'UserName', 'SamAccountName', 'Enabled', 'LastLogonDate', 'MemberOf',
  'Role', 'Department', 'PasswordLastSet', 'PasswordExpiryDate', 'MFAStatus',
  'PasswordNeverExpires', 'DormantAccountFlag'
] as const;

export class CSVValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVValidationError';
  }
}

const csvByteLength = (content: string) => new TextEncoder().encode(content).byteLength;

const parseCSVRow = (line: string, lineNumber: number): string[] => {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  if (quoted) throw new CSVValidationError(`Malformed CSV: unterminated quote on row ${lineNumber}.`);
  values.push(value.trim());
  return values;
};

export const validateCSVContent = (content: string): void => {
  if (csvByteLength(content) > MAX_CSV_BYTES) {
    throw new CSVValidationError('CSV exceeds the 5MB limit. Choose a smaller export.');
  }
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  if (!lines.length) throw new CSVValidationError('CSV is empty.');
  if (lines.length - 1 > MAX_CSV_ROWS) {
    throw new CSVValidationError('CSV exceeds the 10,000-row limit.');
  }
  const headers = parseCSVRow(lines[0], 1).map(header => header.trim());
  const missing = REQUIRED_CSV_HEADERS.filter(header => !headers.includes(header));
  if (missing.length) throw new CSVValidationError(`Missing required headers: ${missing.join(', ')}.`);
  if (new Set(headers).size !== headers.length) throw new CSVValidationError('Malformed CSV: duplicate headers.');
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCSVRow(lines[index], index + 1);
    if (values.length !== headers.length) {
      throw new CSVValidationError(`Malformed CSV: row ${index + 1} has ${values.length} columns; expected ${headers.length}.`);
    }
  }
};

export const parseCSV = (content: string): ADUserRaw[] => {
  validateCSVContent(content);
  const lines = content.split(/\r\n|\n/).filter(line => line.trim());
  const headers = parseCSVRow(lines[0], 1);
  return lines.slice(1).map((line, index) => {
    const values = parseCSVRow(line, index + 2);
    const user: Record<string, string> = {};
    headers.forEach((header, column) => { user[header] = values[column] ?? ''; });
    return user as unknown as ADUserRaw;
  });
};

const calculateDaysSince = (dateString: string): number => {
  if (!dateString) return 9999;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 9999;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / ONE_DAY_MS);
};

const calculatePrivilegeRisk = (user: ADUserRaw, groups: string[], isDormant: boolean): { score: number, issues: string[] } => {
  let score = 0;
  const issues: string[] = [];
  
  // 1. High Privilege Groups
  const highPrivCount = groups.filter(g => HIGH_PRIVILEGE_GROUPS.some(hp => g.toLowerCase().includes(hp.toLowerCase()))).length;
  
  if (highPrivCount > 0) {
    score += 40;
    issues.push(`Member of ${highPrivCount} high-privilege group(s)`);
  }

  // 2. Privilege Chains (Heuristic: Many groups or Specific sensitive keywords like 'Shadow', 'Owner')
  const potentialEscalation = groups.length > 15 || groups.some(g => g.toLowerCase().includes('owner') || g.toLowerCase().includes('write'));
  if (potentialEscalation) {
    score += 30;
    issues.push('Potential Privilege Escalation Path (High group count or sensitive keywords)');
  }

  // 3. Dormant but Privileged
  if (isDormant && (highPrivCount > 0 || potentialEscalation)) {
    score += 30;
    issues.push('Dormant account with privileges');
  }

  return { score: Math.min(100, score), issues };
};

const calculatePasswordRisk = (
  user: ADUserRaw, 
  isDormant: boolean, 
  hasMFA: boolean, 
  passwordNeverExpires: boolean,
  passwordExpired: boolean
): { score: number, issues: string[] } => {
  let score = 0;
  const issues: string[] = [];

  // 1. Expired or Weak
  if (passwordExpired) {
    score += 40;
    issues.push('Password expired');
  }
  if (passwordNeverExpires) {
    score += 40; // High risk
    issues.push('Password set to never expire');
  }

  // 2. Dormant
  if (isDormant) {
    score += 30;
    issues.push('Account is dormant');
  }

  // 3. Missing MFA
  if (!hasMFA) {
    score += 30;
    issues.push('MFA not enabled');
  }

  return { score: Math.min(100, score), issues };
};

export const processUserData = (rawUsers: ADUserRaw[]): ADUserProcessed[] => {
  return rawUsers.map((user, idx) => {
    // Basic Parsing
    const groups = user.MemberOf ? user.MemberOf.split(/;|\||,/).map(g => g.trim()) : [];
    const isEnabled = user.Enabled?.toLowerCase() === 'true';
    const daysSinceLogin = calculateDaysSince(user.LastLogonDate);
    
    // Explicit dormant flag or > 90 days inactive
    const isDormant = (user.DormantAccountFlag?.toLowerCase() === 'true') || (daysSinceLogin > 90);
    
    const hasMFA = user.MFAStatus?.toLowerCase() === 'true';
    const passwordNeverExpires = user.PasswordNeverExpires?.toLowerCase() === 'true';
    
    const daysUntilExpiry = calculateDaysSince(user.PasswordExpiryDate) * -1; // Negative if past
    const passwordExpired = daysUntilExpiry < 0 && !passwordNeverExpires;

    // Risk Calculations
    const privRisk = calculatePrivilegeRisk(user, groups, isDormant);
    const passRisk = calculatePasswordRisk(user, isDormant, hasMFA, passwordNeverExpires, passwordExpired);

    // Total Score Weighted: Priv 0.6, Pass 0.4
    const totalScore = Math.round((privRisk.score * 0.6) + (passRisk.score * 0.4));

    let riskLevel: RiskProfile['riskLevel'] = 'Low';
    if (totalScore >= 70) riskLevel = 'Critical';
    else if (totalScore >= 50) riskLevel = 'High';
    else if (totalScore >= 30) riskLevel = 'Medium';

    const allIssues = [...privRisk.issues, ...passRisk.issues];
    const recommendations: string[] = [];
    
    if (privRisk.score > 0) recommendations.push('Review group memberships');
    if (!hasMFA) recommendations.push('Enforce MFA');
    if (passwordNeverExpires) recommendations.push('Disable "Password Never Expires"');
    if (isDormant) recommendations.push('Disable or remove dormant account');

    return {
      ...user,
      id: `user-${idx}`,
      groups,
      daysSinceLogin,
      isDormant,
      hasMFA,
      passwordExpired,
      passwordNeverExpires,
      isEnabled,
      risk: {
        privilegeScore: privRisk.score,
        passwordHygieneScore: passRisk.score,
        totalRiskScore: totalScore,
        riskLevel,
        issues: allIssues,
        recommendations
      }
    };
  });
};

export const generateSampleCSV = () => {
  return `UserName,SamAccountName,Enabled,LastLogonDate,MemberOf,Role,Department,PasswordLastSet,PasswordExpiryDate,MFAStatus,PasswordNeverExpires,DormantAccountFlag
John Doe,jdoe,True,2023-10-01,Domain Admins;Users,Admin,IT,2023-09-01,2024-09-01,True,False,False
Jane Smith,jsmith,True,2023-05-15,Users,User,HR,2022-01-01,2022-04-01,False,True,False
Bob Martin,bmartin,False,2022-12-01,Enterprise Admins,Admin,IT,2022-11-01,2023-02-01,False,False,True
Alice Wonder,awonder,True,2023-10-25,Users;Marketing Team,Manager,Marketing,2023-08-15,2023-11-15,True,False,False
Dave Grohl,dgrohl,True,2023-10-20,Administrators;Backup Operators,Admin,IT,2023-10-01,2024-01-01,False,False,False`;
};

export const downloadCSVTemplate = () => {
  const headers = [
    'UserName', 'SamAccountName', 'Enabled', 'LastLogonDate', 
    'MemberOf', 'Role', 'Department', 'PasswordLastSet', 
    'PasswordExpiryDate', 'MFAStatus', 'PasswordNeverExpires', 
    'DormantAccountFlag'
  ];
  const csvContent = headers.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'adhuntx_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToCSV = (users: ADUserProcessed[]) => {
  if (!users.length) return;
  
  const headers = [
    'UserName', 'SamAccountName', 'Department', 'Enabled', 
    'RiskLevel', 'TotalRiskScore', 'PrivilegeScore', 'HygieneScore', 
    'Issues', 'Recommendations', 'LastLogonDate', 'MFAEnabled'
  ];

  const csvContent = [
    headers.join(','),
    ...users.map(u => {
      const row = [
        `"${u.UserName}"`,
        `"${u.SamAccountName}"`,
        `"${u.Department || ''}"`,
        u.Enabled,
        u.risk.riskLevel,
        u.risk.totalRiskScore,
        u.risk.privilegeScore,
        u.risk.passwordHygieneScore,
        `"${u.risk.issues.join('; ')}"`,
        `"${u.risk.recommendations.join('; ')}"`,
        u.LastLogonDate,
        u.hasMFA
      ];
      return row.join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `adhuntx_report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};