export interface AcquisitionRoute {
  id: string;
  name: string;
  recommended?: boolean;
  authorization: string;
  ownership: string;
  accessLevel: string;
  source: string;
  provenance: string;
  freshness: string;
  requiredFields: string;
  limitations: string;
}

/** Documentation only: ADhuntX never executes any of these acquisition routes. */
export const ACQUISITION_ROUTES: AcquisitionRoute[] = [
  {
    id: 'directory-export',
    name: 'Reviewed directory / identity administration export',
    recommended: true,
    authorization: 'Written approval from the service owner and an authorized directory administrator.',
    ownership: 'The directory or identity data owner reviews population, purpose, and export scope.',
    accessLevel: 'Existing read-only reporting or delegated export access; no new privilege grant.',
    source: 'Approved directory or identity administration console.',
    provenance: 'Record report name, filters, organizational scope, export timestamp, and data owner.',
    freshness: 'Use the export timestamp and confirm it is suitable for the review window.',
    requiredFields: 'All required CSV headers; optional Role, Department, PasswordLastSet, DormantAccountFlag when available.',
    limitations: 'Point-in-time supplied values; no nested-group resolution, reachability, or current-state validation.',
  },
  {
    id: 'powershell-report',
    name: 'Read-only PowerShell report',
    authorization: 'An authorized administrator runs a reviewed report under existing delegated read access.',
    ownership: 'Directory owner approves the query, target population, and output handling.',
    accessLevel: 'Read-only properties selected explicitly; do not request secret material in ADhuntX.',
    source: 'An administrator-generated report from the approved directory environment.',
    provenance: 'Retain the reviewed query, operator, filters, export timestamp, and source system.',
    freshness: 'Freshness is the report execution time; stale fields must remain documented.',
    requiredFields: 'Map output to the exact required CSV headers before import; do not invent unavailable values.',
    limitations: 'Command execution is outside ADhuntX; output can omit calculated, nested, or unavailable attributes.',
  },
  {
    id: 'iga-export',
    name: 'Identity governance or access-review export',
    authorization: 'Campaign owner authorizes export for the stated review purpose.',
    ownership: 'IGA data steward confirms population, source lineage, and report scope.',
    accessLevel: 'Read-only report access within the approved campaign or inventory.',
    source: 'Previously curated identity-governance account inventory or access-review report.',
    provenance: 'Keep campaign/report ID, source timestamp, filters, and steward approval.',
    freshness: 'Use the platform timestamp; note synchronization lag from the directory.',
    requiredFields: 'Required headers mapped from available attributes; unknown values stay blank or Unknown.',
    limitations: 'Governance data may lag directory state and may not include every requested field.',
  },
  {
    id: 'siem-export',
    name: 'Saved SIEM or data-lake identity inventory export',
    authorization: 'Data owner approves the saved query and the review population.',
    ownership: 'Security-data owner confirms the dataset and retention window.',
    accessLevel: 'Read-only access to an existing, peer-reviewed query result.',
    source: 'Previously ingested identity inventory; ADhuntX does not run the saved query.',
    provenance: 'Record query ID/version, dataset, ingestion time, export time, and transformations.',
    freshness: 'Report ingestion age and identify fields that are stale or unavailable.',
    requiredFields: 'Required headers after a reviewed mapping; preserve Unknown for missing source values.',
    limitations: 'Ingested data can be delayed, normalized, or incomplete and is not current-state evidence.',
  },
  {
    id: 'correlated-steward-file',
    name: 'CMDB or HR-correlated steward file',
    authorization: 'Data stewards approve the correlation purpose and minimum necessary fields.',
    ownership: 'Directory and business-data owners review account matching and scope.',
    accessLevel: 'Controlled read-only handoff of an approved CSV; no account access exchange.',
    source: 'Existing CMDB, HR, or directory inventory combined by an authorized steward.',
    provenance: 'Document source files, matching rule, steward, review date, and unmatched records.',
    freshness: 'Record freshness independently for each source and the correlation date.',
    requiredFields: 'Required account fields plus only approved contextual fields such as Department.',
    limitations: 'A correlation match is not proof of ownership, access, or current directory state.',
  },
  {
    id: 'approved-audit-evidence',
    name: 'Reused approved audit evidence',
    authorization: 'Audit or access-review owner approves reuse for the new review purpose.',
    ownership: 'Evidence owner confirms the original scope, handling, and permitted reuse.',
    accessLevel: 'Read-only copy of the approved evidence file.',
    source: 'Existing owner-approved CSV produced for an audit or access review.',
    provenance: 'Retain evidence ID, original scope, creator, approval, and reuse decision.',
    freshness: 'Record original creation time and explicitly accept or reject its age for this review.',
    requiredFields: 'Required headers must be present; no missing value may be silently reconstructed.',
    limitations: 'Historical evidence can be stale and reflects only its original scope and collection method.',
  },
  {
    id: 'manual-review-sheet',
    name: 'Small-scope manual review sheet',
    authorization: 'Authorized reviewer documents the narrow purpose and selected accounts.',
    ownership: 'Reviewer and data owner attest that each value is source-traceable.',
    accessLevel: 'Controlled, read-only handoff of a locally prepared CSV.',
    source: 'Verified records already available to the reviewer; no page extraction or current lookup.',
    provenance: 'Record source reference per row or field, reviewer, preparation time, and scope.',
    freshness: 'Use the verification time for each value where practical; mark older values.',
    requiredFields: 'Required headers; leave uncertain values blank or Unknown rather than guessing.',
    limitations: 'Manual entry is error-prone, narrow, and not a substitute for a complete approved export.',
  },
];
