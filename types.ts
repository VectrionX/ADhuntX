export interface ADUserRaw {
  UserName: string;
  SamAccountName: string;
  Enabled: string;
  LastLogonDate: string;
  MemberOf: string;
  Role?: string;
  Department?: string;
  PasswordLastSet?: string;
  PasswordExpiryDate: string;
  MFAStatus: string;
  PasswordNeverExpires: string;
  DormantAccountFlag?: string;
}

export type KnownBoolean = boolean | null;

export interface RiskEvidence {
  ruleId: string;
  sourceField: keyof ADUserRaw;
  sourceValue: string;
  description: string;
}

export interface RiskProfile {
  privilegeScore: number;
  passwordHygieneScore: number;
  totalRiskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  issues: string[];
  recommendations: string[];
  evidence: RiskEvidence[];
}

export interface ADUserProcessed extends ADUserRaw {
  id: string;
  groups: string[];
  daysSinceLogin: number | null;
  isDormant: KnownBoolean;
  hasMFA: KnownBoolean;
  passwordExpired: KnownBoolean;
  passwordNeverExpires: KnownBoolean;
  isEnabled: KnownBoolean;
  risk: RiskProfile;
}

export interface DashboardMetrics {
  totalUsers: number;
  criticalRiskCount: number;
  highRiskCount: number;
  avgRiskScore: number;
  dormantCount: number;
  mfaAdoptionRate: number | null;
}
