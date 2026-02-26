// In production, use S3 URL. In development, use empty string for local files
export const s3BaseUrl = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_S3_ENDPOINT_URL || "")
  : "";

export async function fetchJsonWithFallback<T>(urls: string[]): Promise<T> {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Expected JSON but got content-type: ${contentType || 'unknown'}`);
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Failed to load JSON from all candidate URLs'));
}

export function buildStaticDataUrl(filePath: string, cohort?: string | null): string {
  const normalizedPath = filePath.replace(/^\/+/, '');
  const urlCohort = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('cohort')
    : null;
  const effectiveCohort = (cohort ?? urlCohort ?? 'latest').toLowerCase();
  const cohortPrefix = effectiveCohort === 'c1' ? 'c1/' : 'latest/';
  return `${s3BaseUrl}/static/data/${cohortPrefix}${normalizedPath}`;
}

export function buildStaticDataUrls(filePath: string, cohort?: string | null): string[] {
  return [buildStaticDataUrl(filePath, cohort)];
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildCountyNameVariants(countyName: string): string[] {
  const normalized = countyName
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const variants = new Set<string>([
    normalized,
    normalized.replace(/'/g, '_'),
    normalized.replace(/'/g, ''),
    normalized.replace(/\s/g, '_'),
    normalized.replace(/\s/g, ''),
    titleCaseWords(normalized),
    titleCaseWords(normalized).replace(/\bPokot\b/g, 'pokot'),
  ]);

  const withKnownCountyAliases = Array.from(variants);
  for (const name of withKnownCountyAliases) {
    variants.add(name.replace(/\bHoma Bay\b/gi, 'Homabay'));
    variants.add(name.replace(/\bHomabay\b/gi, 'Homa Bay'));
    variants.add(name.replace(/\bElgeyo\b/gi, 'Elgeiyo'));
    variants.add(name.replace(/\bElgeiyo\b/gi, 'Elgeyo'));
    variants.add(name.replace(/\bMurang'a\b/gi, 'Murang_a'));
    variants.add(name.replace(/\bMurang_a\b/gi, "Murang'a"));
    variants.add(name.replace(/\bMurang_a\b/gi, 'Muranga'));
    variants.add(name.replace(/\bMuranga\b/gi, 'Murang_a'));
    variants.add(name.replace(/\bWest Pokot\b/gi, 'West pokot'));
    variants.add(name.replace(/\bWest pokot\b/gi, 'West Pokot'));
  }

  return Array.from(variants).filter(Boolean);
}

export function buildCountyEvaluationResultUrls(countyName: string, cohort?: string | null): string[] {
  const countyVariants = buildCountyNameVariants(countyName);
  return countyVariants.map((variant) => buildStaticDataUrl(`output-results/${variant}_evaluation_results.json`, cohort));
}
