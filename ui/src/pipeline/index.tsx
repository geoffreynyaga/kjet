import React, { useCallback, useEffect, useRef, useState } from 'react';

import DiffTable from './DiffTable';
import {
  CsvVersion,
  PipelineRun,
  StructureProblem,
  discardRun,
  getRun,
  listVersions,
  publishRun,
  rerunVersion,
  submitFile,
  submitSheet,
  whoAmI,
} from './api';

const POLL_INTERVAL_MS = 1500;
const IN_FLIGHT = ['PENDING', 'RUNNING', 'PUBLISHING'];

export default function PipelinePanel() {
  const [cohort] = useState('latest');
  const [staff, setStaff] = useState<boolean | null>(null);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [versions, setVersions] = useState<CsvVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<StructureProblem[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshVersions = useCallback(() => {
    listVersions(cohort).then(setVersions).catch(() => undefined);
  }, [cohort]);

  useEffect(() => {
    whoAmI()
      .then((me) => setStaff(me.is_staff))
      .catch(() => setStaff(false));
  }, []);

  useEffect(() => {
    if (staff) refreshVersions();
  }, [staff, refreshVersions]);

  // Poll while a build or publish is in flight. State lives on the server, so a
  // refresh mid-run picks up where it left off.
  useEffect(() => {
    if (!run || !IN_FLIGHT.includes(run.status)) return undefined;
    const timer = setInterval(() => {
      getRun(run.id)
        .then((next) => {
          setRun(next);
          if (!IN_FLIGHT.includes(next.status)) refreshVersions();
        })
        .catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [run, refreshVersions]);

  const lastSheetUrl = versions.find((version) => version.source_url)?.source_url || '';

  async function start(action: () => Promise<PipelineRun>) {
    setBusy(true);
    setError('');
    setProblems([]);
    try {
      setRun(await action());
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setProblems(err.payload?.structure_problems || []);
    } finally {
      setBusy(false);
    }
  }

  if (staff === null) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  if (!staff) {
    return (
      <div className="max-w-2xl p-8 mx-auto mt-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Not available</h1>
        <p className="mt-2 text-gray-600">
          Publishing evaluation results requires a staff account.
        </p>
        <a href="/" className="inline-block mt-4 text-blue-700">
          Back to dashboard
        </a>
      </div>
    );
  }

  const canPublish = run?.status === 'BUILT' && (run.changed_outputs || []).length > 0;

  return (
    <div className="max-w-5xl px-6 py-10 mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Human results pipeline</h1>
        <p className="mt-1 text-gray-600">
          Upload a new human results CSV or fetch it from Google Sheets. Nothing is
          published until you review the changes and approve them.
        </p>
      </header>

      <section className="p-5 space-y-4 border border-gray-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="text-sm" />
          <button
            type="button"
            disabled={busy}
            className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-40"
            onClick={() => {
              const file = fileInput.current?.files?.[0];
              if (!file) {
                setError('Choose a CSV file first.');
                return;
              }
              start(() => submitFile(file, cohort));
            }}
          >
            Upload and build
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="url"
            value={sheetUrl}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            onChange={(event) => setSheetUrl(event.target.value)}
            className="flex-1 min-w-[280px] rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            className="px-4 py-2 text-white bg-gray-700 rounded disabled:opacity-40"
            onClick={() => start(() => submitSheet(sheetUrl, cohort))}
          >
            Fetch and build
          </button>
        </div>
        {lastSheetUrl && lastSheetUrl !== sheetUrl && (
          <button
            type="button"
            className="text-xs text-blue-700 underline"
            onClick={() => setSheetUrl(lastSheetUrl)}
          >
            Use last fetched sheet
          </button>
        )}
      </section>

      {error && (
        <div className="p-4 border rounded-lg border-red-300 bg-red-50">
          <p className="font-medium text-red-800">{error}</p>
          {problems.length > 0 && (
            <>
              <p className="mt-2 text-sm text-red-700">
                Scores are read by column position downstream, so a shifted column would
                publish wrong numbers without raising an error. Fix the sheet structure,
                or update the pipeline scripts, before retrying.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-800">
                {problems.slice(0, 15).map((problem, index) => (
                  <li key={index}>
                    {problem.message}
                    {problem.scored && (
                      <span className="ml-2 rounded bg-red-200 px-1.5 py-0.5 text-xs">
                        affects a score column
                      </span>
                    )}
                  </li>
                ))}
                {problems.length > 15 && (
                  <li className="text-xs">+{problems.length - 15} more</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {run && (
        <section className="p-5 space-y-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Run #{run.id}</h2>
            <span className="px-2 py-1 text-xs bg-gray-100 rounded">{run.status}</span>
          </div>

          {IN_FLIGHT.includes(run.status) && (
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{run.current_step || 'Starting…'}</span>
                <span>
                  {run.steps_done}/{run.steps_total || 4}
                </span>
              </div>
              <div className="h-2 mt-1 bg-gray-200 rounded">
                <div
                  className="h-2 transition-all bg-blue-600 rounded"
                  style={{
                    width: `${((run.steps_done / (run.steps_total || 4)) * 100).toFixed(0)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {run.error && (
            <div className="p-3 text-sm text-red-800 border rounded border-red-300 bg-red-50">
              {run.error}
              {run.log_tail && (
                <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">
                  {run.log_tail}
                </pre>
              )}
            </div>
          )}

          {run.status === 'PUBLISHED' && (
            <div className="p-3 text-sm text-green-800 border rounded border-green-300 bg-green-50">
              Published {run.published_keys.length} file(s) to static storage.
            </div>
          )}

          {(run.changed_outputs || []).length > 0 && (
            <div className="text-sm">
              <div className="font-medium text-gray-800">Output files that changed</div>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                {run.changed_outputs.map((output) => (
                  <li key={output.name}>
                    {output.name}{' '}
                    <span className="text-xs text-gray-400">
                      ({(output.bytes / 1024).toFixed(0)} KB
                      {output.existed ? '' : ', new'})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {run.diff && <DiffTable diff={run.diff} />}

          {run.status === 'BUILT' && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={!canPublish}
                className="px-4 py-2 text-white bg-green-600 rounded disabled:opacity-40"
                onClick={() =>
                  publishRun(run.id)
                    .then(setRun)
                    .catch((err) => setError(err.message))
                }
              >
                Publish to S3
              </button>
              <button
                type="button"
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded"
                onClick={() =>
                  discardRun(run.id)
                    .then((next) => {
                      setRun(next);
                      refreshVersions();
                    })
                    .catch((err) => setError(err.message))
                }
              >
                Discard
              </button>
            </div>
          )}
        </section>
      )}

      <section className="p-5 border border-gray-200 rounded-lg">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Version history</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-600">#</th>
                <th className="px-3 py-2 text-left text-gray-600">Status</th>
                <th className="px-3 py-2 text-left text-gray-600">Source</th>
                <th className="px-3 py-2 text-left text-gray-600">Rows</th>
                <th className="px-3 py-2 text-left text-gray-600">Uploaded</th>
                <th className="px-3 py-2 text-left text-gray-600">By</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{version.id}</td>
                  <td className="px-3 py-2">{version.status}</td>
                  <td className="px-3 py-2">{version.source}</td>
                  <td className="px-3 py-2">{version.row_count}</td>
                  <td className="px-3 py-2">
                    {new Date(version.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{version.uploaded_by || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {version.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        className="text-blue-700 underline"
                        onClick={() => start(() => rerunVersion(version.id))}
                      >
                        Rebuild
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    No versions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
