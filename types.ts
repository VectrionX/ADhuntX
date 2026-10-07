export interface ADUserRaw {
  UserName: string;
  SamAccountName: string;
  Enabled: string; // "True" | "False"
  LastLogonDate: string;
  MemberOf: string; // Comma or pipe separated
  Role?: string;
  Department?: string;
  PasswordLastSet: string;
  PasswordExpiryDate: string;
  MFAStatus: string; // "True" | "False"
  PasswordNeverExpires: string; // "True" | "False"
  DormantAccountFlag?: string; // "True" | "False"
}

export interface RiskProfile {
  privilegeScore: number;
  passwordHygieneScore: number;
  totalRiskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  issues: string[];
  recommendations: string[];
}

export interface ADUserProcessed extends ADUserRaw {
  id: string;
  groups: string[];
  daysSinceLogin: number;
  isDormant: boolean;
  hasMFA: boolean;
  passwordExpired: boolean;
  passwordNeverExpires: boolean;
  isEnabled: boolean;
  risk: RiskProfile;
}

export interface DashboardMetrics {
  totalUsers: number;
  criticalRiskCount: number;
  highRiskCount: number;
  avgRiskScore: number;
  dormantCount: number;
  mfaAdoptionRate: number;
}
