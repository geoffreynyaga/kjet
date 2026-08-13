export interface StructureProblem {
  kind: string;
  index?: number;
  old?: string | null;
  new?: string | null;
  scored?: boolean;
  message: string;
}

export interface DiffCell {
  index: number;
  column: string;
  old: string;
  new: string;
  scored: boolean;
}

export interface DiffRow {
  application_id: string;
  county: string;
  cells: DiffCell[];
}

export interface DiffTotals {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  scored_cells_changed: number;
}

export interface CsvDiff {
  added?: { application_id: string; county: string }[];
  removed?: { application_id: string; county: string }[];
  changed?: DiffRow[];
  totals?: DiffTotals;
}

export interface ChangedOutput {
  name: string;
  bytes: number;
  existed: boolean;
}

export interface PipelineRun {
  id: number;
  status: string;
  current_step: string;
  steps_done: number;
  steps_total: number;
  error: string;
  changed_outputs: ChangedOutput[];
  published_keys: string[];
  created_at: string;
  finished_at: string | null;
  diff?: CsvDiff;
  log_tail?: string;
  csv?: {
    id: number;
    original_filename: string;
    source: string;
    row_count: number;
    status: string;
  };
}

export interface CsvVersion {
  id: number;
  cohort: string;
  original_filename: string;
  source: string;
  source_url: string;
  status: string;
  row_count: number;
  uploaded_by: string | null;
  created_at: string;
  published_at: string | null;
}

const BASE = '/api/pipeline';

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'X-CSRFToken': csrfToken(),
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(payload?.detail || `Request failed (${response.status})`);
    (error as any).status = response.status;
    (error as any).payload = payload;
    throw error;
  }

  return payload as T;
}

export function whoAmI() {
  return request<{ username: string; is_staff: boolean }>('/me/');
}

export function submitFile(file: File, cohort: string) {
  const body = new FormData();
  body.append('file', file);
  body.append('cohort', cohort);
  return request<PipelineRun>('/submit/', { method: 'POST', body });
}

export function submitSheet(sheetUrl: string, cohort: string) {
  const body = new FormData();
  body.append('sheet_url', sheetUrl);
  body.append('cohort', cohort);
  return request<PipelineRun>('/submit/', { method: 'POST', body });
}

export function getRun(id: number) {
  return request<PipelineRun>(`/runs/${id}/`);
}

export function publishRun(id: number) {
  return request<PipelineRun>(`/runs/${id}/publish/`, { method: 'POST' });
}

export function discardRun(id: number) {
  return request<PipelineRun>(`/runs/${id}/discard/`, { method: 'POST' });
}

export function listVersions(cohort: string) {
  return request<CsvVersion[]>(`/versions/?cohort=${encodeURIComponent(cohort)}`);
}

export function rerunVersion(id: number) {
  return request<PipelineRun>(`/versions/${id}/rerun/`, { method: 'POST' });
}
