import React, { useMemo, useState } from 'react';

import { CsvDiff } from './api';

const PAGE_SIZE = 25;

interface Props {
  diff: CsvDiff;
}

export default function DiffTable({ diff }: Props) {
  const [scoredOnly, setScoredOnly] = useState(false);
  const [page, setPage] = useState(0);

  const changed = useMemo(() => {
    const rows = diff.changed || [];
    if (!scoredOnly) return rows;
    return rows
      .map((row) => ({ ...row, cells: row.cells.filter((cell) => cell.scored) }))
      .filter((row) => row.cells.length > 0);
  }, [diff.changed, scoredOnly]);

  const totals = diff.totals;
  const pageCount = Math.max(1, Math.ceil(changed.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = changed.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (!totals) {
    return (
      <p className="text-sm text-gray-500">
        No previous version to compare against — this is the first CSV for this cohort.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Changed" value={totals.changed} tone="amber" />
        <Stat label="Added" value={totals.added} tone="green" />
        <Stat label="Removed" value={totals.removed} tone="red" />
        <Stat label="Unchanged" value={totals.unchanged} tone="gray" />
        <Stat label="Score cells" value={totals.scored_cells_changed} tone="blue" />
      </div>

      {(diff.added?.length || 0) > 0 && (
        <IdList title="Rows added" rows={diff.added || []} tone="text-green-700" />
      )}
      {(diff.removed?.length || 0) > 0 && (
        <IdList title="Rows removed" rows={diff.removed || []} tone="text-red-700" />
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={scoredOnly}
            onChange={(event) => {
              setScoredOnly(event.target.checked);
              setPage(0);
            }}
          />
          Only show changes to scored columns
        </label>
        <span className="text-sm text-gray-500">
          {changed.length} row{changed.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-medium text-left text-gray-600">County</th>
              <th className="px-3 py-2 font-medium text-left text-gray-600">Application ID</th>
              <th className="px-3 py-2 font-medium text-left text-gray-600">Column</th>
              <th className="px-3 py-2 font-medium text-left text-gray-600">Before</th>
              <th className="px-3 py-2 font-medium text-left text-gray-600">After</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) =>
              row.cells.map((cell, cellIndex) => (
                <tr key={`${row.application_id}-${cell.index}`} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{cellIndex === 0 ? row.county : ''}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {cellIndex === 0 ? row.application_id : ''}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {cell.column}
                    {cell.scored && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        score
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-red-700 truncate" title={cell.old}>
                    {cell.old || <span className="text-gray-400">empty</span>}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-green-700 truncate" title={cell.new}>
                    {cell.new || <span className="text-gray-400">empty</span>}
                  </td>
                </tr>
              ))
            )}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No cell changes to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={current === 0}
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {current + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            disabled={current >= pageCount - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-800',
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-800',
    gray: 'bg-gray-50 text-gray-700',
    blue: 'bg-blue-50 text-blue-800',
  };
  return (
    <div className={`rounded-lg px-3 py-2 ${tones[tone] || tones.gray}`}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function IdList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { application_id: string; county: string }[];
  tone: string;
}) {
  return (
    <div className="text-sm">
      <div className={`font-medium ${tone}`}>{title}</div>
      <ul className="mt-1 space-y-0.5">
        {rows.slice(0, 20).map((row) => (
          <li key={row.application_id} className="font-mono text-xs text-gray-600">
            {row.county} — {row.application_id}
          </li>
        ))}
        {rows.length > 20 && (
          <li className="text-xs text-gray-500">+{rows.length - 20} more</li>
        )}
      </ul>
    </div>
  );
}
