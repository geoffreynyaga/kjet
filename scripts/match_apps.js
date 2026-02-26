const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function collectApplications(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.applications && Array.isArray(data.applications)) return data.applications;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

function normalizeAppId(raw) {
  if (!raw && raw !== 0) return '';
  return String(raw);
}

// load human file
const humanPath = path.join('ui', 'public', 'latest', 'kjet-human-final.json');
const humanData = readJson(humanPath);
const humanApps = collectApplications(humanData);

// load gemini files
const geminiDir = path.join('ui', 'public', 'latest', 'gemini');
let llmApps = [];
try {
  const files = fs.readdirSync(geminiDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const p = path.join(geminiDir, f);
    const data = readJson(p);
    llmApps = llmApps.concat(collectApplications(data));
  }
} catch (e) {
  // dir may not exist or be empty
}

function normalizeForCompare(s) {
  if (!s && s !== 0) return '';
  return String(s).toLowerCase();
}

const llmIds = llmApps
  .map(a => normalizeForCompare(a.application_id || a.id || a.applicationId || a.applicationId || ''))
  .filter(Boolean);

function findNumericMatch(human) {
  const candidates = [];
  const rawId = normalizeAppId(human.application_id || human.id || human.applicationId || human.name || '');
  const m = rawId.match(/\d+/);
  if (m) candidates.push(m[0]);
  const tokens = rawId.split(/[ _]/);
  for (const t of tokens) {
    const mt = t.match(/^\d+$/);
    if (mt) candidates.push(mt[0]);
  }
  for (const c of candidates) {
    if (!c) continue;
    for (const lid of llmIds) {
      if (lid.includes(c)) return true;
    }
  }
  return false;
}

function last4Alnum(s) {
  if (!s && s !== 0) return '';
  const filtered = String(s).replace(/[^a-z0-9]/gi, '');
  if (filtered.length <= 4) return filtered.toLowerCase();
  return filtered.slice(-4).toLowerCase();
}

const llmSuffixes = new Set(llmApps.map(a => last4Alnum(a.application_id || a.id || a.applicationId || '')));

let total = 0;
let matchedNumeric = 0;
let matchedSuffix = 0;
let unmatched = 0;

const matchedByNumericList = [];
const matchedBySuffixList = [];
const unmatchedList = [];

function humanIdCandidates(h) {
  // Try a variety of common field names
  return [
    h.application_id,
    h['Application ID'],
    h['ApplicationId'],
    h.applicationId,
    h.id,
    h.name,
    h['Applicant ID'],
    h['Applicant']
  ].map(normalizeAppId).filter(Boolean);
}

for (const h of humanApps) {
  total += 1;
  // Build a candidate raw id string to feed into matching functions
  const candidates = humanIdCandidates(h);
  let numericMatched = false;
  for (const cand of candidates) {
    if (findNumericMatch({ application_id: cand, id: cand, applicationId: cand })) {
      matchedNumeric += 1;
      matchedByNumericList.push(cand);
      numericMatched = true;
      break;
    }
  }
  if (numericMatched) continue;

  let suffixMatched = false;
  for (const cand of candidates) {
    const suf = last4Alnum(cand);
    if (suf && llmSuffixes.has(suf)) {
      matchedSuffix += 1;
      matchedBySuffixList.push(cand);
      suffixMatched = true;
      break;
    }
  }
  if (suffixMatched) continue;

  unmatched += 1;
  unmatchedList.push(candidates[0] || '');
}

const result = {
  total_human_apps: total,
  matched_by_numeric_id: matchedNumeric,
  matched_by_suffix_fallback: matchedSuffix,
  unmatched: unmatched,
  matchedByNumericList: matchedByNumericList.slice(0,200),
  matchedBySuffixList: matchedBySuffixList.slice(0,200),
  unmatchedList: unmatchedList.slice(0,200)
};

// Write a report file to ui/public/latest
try {
  const outDir = path.join('ui', 'public', 'latest');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'matching_report.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log('Wrote ui/public/latest/matching_report.json');
} catch (e) {
  console.warn('Failed to write matching_report.json', e);
}

console.log(JSON.stringify(result));
