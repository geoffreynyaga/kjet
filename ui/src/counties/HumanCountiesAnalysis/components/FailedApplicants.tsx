import React from 'react';
import { HumanApplicant } from '../types/index.ts';

interface FailedApplicantsProps {
  failed: HumanApplicant[];
}

export default function FailedApplicants({ failed }: FailedApplicantsProps) {
  if (failed.length === 0) return null;

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm chart-card">
      <h3 className="mb-4">Failed / Ineligible Applicants</h3>
      <div className="space-y-3">
        {failed.map((app) => (
          <div key={app['Application ID']} className="p-4 border border-red-300 rounded-lg shadow-lg bg-gradient-to-br from-red-500 via-red-600 to-pink-600">
            <div className="flex items-start justify-between mb-2">
              <div>
                <strong className="font-bold text-white">{app['Application ID']}</strong>
                <span className="ml-2 text-sm text-red-100">(Reason: {app['REASON(Evaluators Comments)']})</span>
              </div>
              <div className="px-2 py-1 text-sm font-semibold text-white bg-red-800 bg-opacity-50 rounded">N/A</div>
            </div>
            <div className="text-sm text-red-50">
              <div><strong className="text-white">County:</strong> <span className="text-red-100">{app['E2. County Mapping']}</span></div>
              <div><strong className="text-white">Composite (sum - penalty):</strong> <span className="text-red-100">{app['Sum of weighted scores - Penalty(if any)']}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}