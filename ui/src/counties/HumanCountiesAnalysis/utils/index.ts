import { HumanApplicant } from '../types/index.ts';

export function getNumericScore(app: HumanApplicant): number {
  const v = app['Sum of weighted scores - Penalty(if any)'];
  if (v === null || v === undefined) return -Infinity;
  return Number(v) || 0;
}

export function getPassFailStatus(app: HumanApplicant): string {
  return String(app['PASS/FAIL'] || '').toLowerCase();
}

export function formatScore(score: number): string {
  return (Number(score) || 0).toFixed(1);
}

export function processCountyName(countyRaw: string): string {
  let county = (typeof countyRaw === 'string' ? countyRaw.trim() : String(countyRaw || 'Unknown')).toUpperCase();
  if (countyRaw === 'NIL' || countyRaw === '') {
    county = "UNKNOWN";
  }
  return county;
}

export function isCohortOneApplicant(applicationId: string): boolean {
  if (!applicationId) return false;
  // Cohort 1 IDs look like "Applicant_123" or "Applicant_1"
  // Latest cohort IDs look like "Applicant_KJET-..."
  const parts = applicationId.split('_');
  if (parts.length !== 2) return false;
  const idPart = parts[1];
  return /^\d+$/.test(idPart);
}