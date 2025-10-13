import React from 'react';
import { HumanApplicant, CountyGroup } from '../types/index.ts';
import { getNumericScore, formatScore } from '../utils/index.ts';

interface OtherRankedCandidatesProps {
  otherRanked: HumanApplicant[];
  currentGroup: CountyGroup | null;
}

export default function OtherRankedCandidates({ otherRanked, currentGroup }: OtherRankedCandidatesProps) {
  if (otherRanked.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden bg-white border border-yellow-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-[#f3ce7a] to-[#feb062]">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900">
          <div className="w-2 h-2 bg-[#f3ce7a] rounded-full" />Other Ranked Candidates
        </h3>
      </div>
      <div className="p-4 divide-y divide-yellow-100">
        {otherRanked.map((app, idx) => {
          const globalRank = currentGroup
            ? currentGroup.applicants.findIndex(a => String(a['Application ID']) === String(app['Application ID'])) + 1
            : idx + 3;
          const score = getNumericScore(app);
          return (
            <div key={`${app['Application ID']}-other-${idx}`} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium text-yellow-900">#{globalRank} {app['Application ID']}</div>
                <div className="text-sm text-yellow-700">{app['REASON(Evaluators Comments)'] || ''}</div>
              </div>
              <div className="text-sm font-semibold text-yellow-800">{formatScore(score)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}