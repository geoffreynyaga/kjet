import { ChevronDown, ChevronRight, Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

interface HumanApplicant {
  [key: string]: any;
}

interface CountyGroup {
  county: string;
  applicants: HumanApplicant[];
}

function getNumericScore(app: HumanApplicant) {
  const v = app['Sum of weighted scores - Penalty(if any)'];
  if (v === null || v === undefined) return -Infinity;
  return Number(v) || 0;
}

function HumanCountiesAnalysis() {
  const [groups, setGroups] = useState<CountyGroup[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHumanData();
  }, []);

  const loadHumanData = async () => {
    try {
      setLoading(true);
      const resp = await fetch('/kjet-human.json');
      const data: HumanApplicant[] = await resp.json();

      // Group by county (E2. County Mapping)
      const map = new Map<string, HumanApplicant[]>();
      data.forEach((row) => {
        const countyRaw = row['E2. County Mapping'] || row['E2. County Mapping'];
        const county = (typeof countyRaw === 'string' ? countyRaw.trim() : String(countyRaw || 'Unknown')).toUpperCase();
        if (!map.has(county)) map.set(county, []);
        map.get(county)!.push(row);
      });

      const groups: CountyGroup[] = [];
      map.forEach((apps, county) => {
        // sort applicants by Sum of weighted scores (desc)
        const sorted = apps.slice().sort((a, b) => getNumericScore(b) - getNumericScore(a));
        groups.push({ county, applicants: sorted });
      });

      // sort groups alphabetically
      groups.sort((a, b) => a.county.localeCompare(b.county));

      setGroups(groups);
      setSelectedCounty(groups.length ? groups[0].county : null);
      setExpandedRanks(new Set([1, 2]));
      setLoading(false);
    } catch (e: any) {
        console.log(e,"error loading json")
      setError(String(e));
      setLoading(false);
    }
  };

  const toggleExpand = (rank: number) => {
    const s = new Set(expandedRanks);
    if (s.has(rank)) s.delete(rank); else s.add(rank);
    setExpandedRanks(s);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-4 loading-spinner" />
          <p className="text-lg text-gray-600">Loading final evaluations...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const currentGroup = groups.find((g) => g.county === selectedCounty) || null;
  const topTwo = currentGroup ? currentGroup.applicants.filter(a => getNumericScore(a) > 0).slice(0, 2) : [];
  const topTwoIds = new Set(topTwo.map(a => String(a['Application ID'])));
  const pending = currentGroup ? currentGroup.applicants.filter(a => getNumericScore(a) === 0 && String(a['PASS/FAIL'] || '').toLowerCase() !== 'fail') : [];
  const failed = currentGroup ? currentGroup.applicants.filter(a => String(a['PASS/FAIL'] || '').toLowerCase() === 'fail') : [];
  const otherRanked = currentGroup ? currentGroup.applicants.filter(a => getNumericScore(a) > 0 && !topTwoIds.has(String(a['Application ID'])) && String(a['PASS/FAIL'] || '').toLowerCase() !== 'fail') : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex-1">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">Final Evaluations Dashboard</h1>
            <p className="text-xl text-gray-600">Final-scored applicant results grouped by county</p>
          </div>
        </div>
      </motion.header>

      <div className="flex mx-auto max-w-7xl">
        <motion.div className="sticky top-0 h-screen overflow-y-auto bg-white shadow-lg w-80" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Counties ({groups.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {groups.map((g, i) => (
              <div key={g.county} className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedCounty === g.county ? 'bg-blue-100 border-2 border-blue-500 shadow-md' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300'}`} onClick={() => { setSelectedCounty(g.county); setExpandedRanks(new Set([1, 2])); }}>
                 <div className="mb-2 font-semibold text-gray-900">{g.county}</div>
                 <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium text-blue-600">{g.applicants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass</span>
                    <span className="font-medium text-green-600">{g.applicants.filter(a => String(a['PASS/FAIL'] || '').toLowerCase() === 'pass').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fail</span>
                    <span className="font-medium text-red-600">{g.applicants.filter(a => String(a['PASS/FAIL'] || '').toLowerCase() === 'fail').length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="flex-1 p-8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
          {currentGroup ? (
            <>
              <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-green-900"><div className="w-2 h-2 bg-green-500 rounded-full" />Top Ranked Candidates</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {topTwo.map((app, idx) => {
                    const score = getNumericScore(app);
                    const globalRank = currentGroup ? currentGroup.applicants.findIndex(a => String(a['Application ID']) === String(app['Application ID'])) + 1 : idx + 1;
                    return (
                      <motion.div key={app['Application ID'] + idx} className="transition-all duration-200" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 0.3 }}>
                        <div className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-gray-50 group" onClick={() => toggleExpand(globalRank)}>
                          <div className="flex items-center flex-1 gap-4">
                            <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-br from-red-500 to-red-600">#{globalRank}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{app['Application ID']}</h4>
                              <p className="text-sm text-gray-600">{app['REASON(Evaluators Comments)'] || ''}</p>
                            </div>
                            <div className="text-right">
                              <div className="inline-block px-3 py-1 mb-1 text-sm font-bold text-white rounded-lg shadow-sm" style={{ backgroundColor: '#10B981' }}>{(Number(score) || 0).toFixed(1)}</div>
                              <div className="text-xs font-medium text-gray-600">Score</div>
                            </div>
                          </div>
                          <div className="ml-4 text-gray-400 transition-colors group-hover:text-gray-600">{expandedRanks.has(globalRank) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</div>
                        </div>

                        {expandedRanks.has(globalRank) && (
                          <motion.div className="px-4 pb-4 bg-gray-50" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                            <div className="mt-2 text-sm text-gray-700">
                              <div><strong>County:</strong> {app['E2. County Mapping']}</div>
                              <div><strong>Composite (sum - penalty):</strong> {app['Sum of weighted scores - Penalty(if any)']}</div>
                              <div className="mt-2"><strong>Comments:</strong> {app['REASON(Evaluators Comments)']}</div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Review - applicants with zero score */}
              {currentGroup.applicants.filter(a => getNumericScore(a) === 0 &&  String(a['PASS/FAIL'] || '').toLowerCase() !== 'fail').length > 0 && (
                <div className="mb-8 overflow-hidden border border-yellow-200 rounded-lg shadow-sm bg-yellow-50">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900"><div className="w-2 h-2 bg-yellow-500 rounded-full" />Pending Review</h3>
                  </div>
                  <div className="p-4 divide-y divide-yellow-100">
                    {pending.map((app, idx) => (
                      <div key={app['Application ID'] + '_pending_' + idx} className="flex items-center justify-between p-3">
                        <div>
                          <div className="font-medium text-yellow-900">{app['Application ID']}</div>
                          <div className="text-sm text-yellow-700">{app['REASON(Evaluators Comments)'] || ''}</div>
                        </div>
                        <div className="text-sm font-semibold text-yellow-800">0.0</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Ranked Candidates (non-top two, scored >0) */}
              {otherRanked.length > 0 && (
                <div className="mb-6 overflow-hidden bg-white border border-yellow-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900"><div className="w-2 h-2 bg-yellow-500 rounded-full" />Other Ranked Candidates</h3>
                  </div>
                  <div className="p-4 divide-y divide-yellow-100">
                    {otherRanked.map((app, idx) => {
                      const globalRank = currentGroup ? currentGroup.applicants.findIndex(a => String(a['Application ID']) === String(app['Application ID'])) + 1 : idx + 3;
                      const score = getNumericScore(app);
                      return (
                        <div key={app['Application ID'] + '_other_' + idx} className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium text-yellow-900">#{globalRank} {app['Application ID']}</div>
                            <div className="text-sm text-yellow-700">{app['REASON(Evaluators Comments)'] || ''}</div>
                          </div>
                          <div className="text-sm font-semibold text-yellow-800">{(Number(score) || 0).toFixed(1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm chart-card">
                <h3 className="mb-4">Failed / Ineligible Applicants</h3>
                <div className="space-y-3">
                  {currentGroup.applicants.filter(a => String(a['PASS/FAIL'] || '').toLowerCase() === 'fail').map((app) => (
                    <div key={app['Application ID']} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <strong className="text-red-900">{app['Application ID']}</strong>
                          <span className="ml-2 text-sm text-red-700">(Reason: {app['REASON(Evaluators Comments)']})</span>
                        </div>
                        <div className="text-sm font-semibold text-red-800">N/A</div>
                      </div>
                      <div className="text-sm text-gray-700">
                        <div><strong>County:</strong> {app['E2. County Mapping']}</div>
                        <div><strong>Composite (sum - penalty):</strong> {app['Sum of weighted scores - Penalty(if any)']}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 welcome-message">
              <Target size={48} />
              <h2 className="mt-4 text-2xl font-semibold">Select a County</h2>
              <p className="mt-2">Choose a county from the list on the left to view final-scored top applicants and failed applicants.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default HumanCountiesAnalysis;
