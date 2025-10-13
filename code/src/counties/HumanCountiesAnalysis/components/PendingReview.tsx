import React from 'react';
import { HumanApplicant } from '../types/index.ts';

interface PendingReviewProps {
  pending: HumanApplicant[];
}

export default function PendingReview({ pending }: PendingReviewProps) {
  if (pending.length === 0) return null;

  return (
    <div className="mb-8 overflow-hidden border border-yellow-200 rounded-lg shadow-sm bg-yellow-50">
      <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />Pending Review
        </h3>
      </div>
      <div className="p-4 divide-y divide-yellow-100">
        {pending.map((app, idx) => (
          <div key={`${app['Application ID']}-pending-${idx}`} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-yellow-900">{app['Application ID']}</div>
              <div className="text-sm text-yellow-700">{app['REASON(Evaluators Comments)'] || ''}</div>
            </div>
            <div className="text-sm font-semibold text-yellow-800">0.0</div>
          </div>
        ))}
      </div>
    </div>
  );
}