import { ChevronDown, ChevronRight, Home } from 'lucide-react';
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
      const resp = await fetch('/kjet-human-final.json');
      const data: HumanApplicant[] = await resp.json();

      // Group by county (E2. County Mapping)
      const map = new Map<string, HumanApplicant[]>();
      data.forEach((row) => {
        const countyRaw = row['E2. County Mapping'] || row['E2. County Mapping'];
        // console.log(countyRaw,"countyRaw")
        let county = (typeof countyRaw === 'string' ? countyRaw.trim() : String(countyRaw || 'Unknown')).toUpperCase();
        if (countyRaw === 'NIL' || countyRaw === '') {
          console.log(countyRaw,"countyRaw is nil")
           county = "UNKNOWN";
        }
        if (!map.has(county)) map.set(county, []);
        map.get(county)!.push(row);
      });

      const groups: CountyGroup[] = [];
      map.forEach((apps, county) => {
        // sort applicants by Sum of weighted scores (desc)
        const sorted = apps.slice().sort((a, b) => getNumericScore(b) - getNumericScore(a));
        groups.push({ county, applicants: sorted });
      });

  // sort groups alphabetically, but keep UNKNOWN separate
  groups.sort((a, b) => a.county.localeCompare(b.county));

  // separate out UNKNOWN group if present
  const known = groups.filter(g => g.county !== 'UNKNOWN');
  const unknown = groups.find(g => g.county === 'UNKNOWN');
  const ordered = unknown ? [...known, unknown] : known;

  setGroups(ordered);
  // prefer first known county as selected; if none, pick UNKNOWN
  setSelectedCounty(known.length ? known[0].county : (unknown ? unknown.county : null));
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

  // Utility function for pass/fail status
  const getPassFailStatus = (app: any) => String(app['PASS/FAIL'] || '').toLowerCase();

  const currentGroup = groups.find((g) => g.county === selectedCounty) || null;

  // Optimized filtering logic - single pass through applicants
  const { topTwo, pending, failed, otherRanked } = currentGroup ? (() => {
    const scored = currentGroup.applicants.filter(a => getNumericScore(a) > 0 && getPassFailStatus(a) !== 'fail');
    const topTwo = scored.slice(0, 2);
    const topTwoIds = new Set(topTwo.map(a => String(a['Application ID'])));

    return {
      topTwo,
      pending: currentGroup.applicants.filter(a => getNumericScore(a) === 0 && getPassFailStatus(a) !== 'fail'),
      failed: currentGroup.applicants.filter(a => getPassFailStatus(a) === 'fail'),
      otherRanked: scored.filter(a => !topTwoIds.has(String(a['Application ID'])))
    };
  })() : { topTwo: [], pending: [], failed: [], otherRanked: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="mb-2 text-4xl font-bold text-gray-900">Final Evaluations Dashboard</h1>
              <p className="text-xl text-gray-600">Final-scored applicant results grouped by county</p>
            </div>
            <div className="flex-shrink-0">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-100 transition-all duration-150 bg-red-500 border border-gray-300 rounded-lg shadow-sm hover:bg-red-300 hover:border-gray-400"
              >
                <Home size={16} />
                Home
              </a>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex mx-auto max-w-7xl">
        <motion.div className="sticky top-0 h-screen overflow-y-auto bg-white shadow-lg w-80" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Counties ({groups.filter(g => g.county !== 'UNKNOWN').length})</h3>
          </div>
          <div className="p-2 space-y-2">
            {groups.map((g, i) => {
              const isUnknown = g.county === 'UNKNOWN';
              const selected = selectedCounty === g.county;
              return (
                <div
                  key={g.county}
                  onClick={() => { setSelectedCounty(g.county); setExpandedRanks(new Set([1, 2])); }}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${selected ? 'bg-blue-100 border-2 border-blue-500 shadow-md' : isUnknown ? 'bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-300'}`}
                >
                  {/* applicant count badge (top-right) */}
                  <div className="absolute top-2 right-3">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full ${isUnknown ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'}`}>{g.applicants.length}</span>
                  </div>



                  <div className="flex-1 min-w-0">
                    <div className={`truncate ${isUnknown ? 'font-semibold text-red-900' : 'font-medium text-gray-900'} font-sans tracking-tight`}>{g.county}</div>
                    <div className="flex items-center mt-1 space-x-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1"><span className="text-gray-500">Pass</span><span className="font-semibold text-green-600">{g.applicants.filter(a => getPassFailStatus(a) === 'pass').length}</span></div>
                      <div className="flex items-center gap-1"><span className="text-gray-500">Fail</span><span className="font-semibold text-red-600">{g.applicants.filter(a => getPassFailStatus(a) === 'fail').length}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                      <motion.div key={`${app['Application ID']}-top-${idx}`} className="transition-all duration-200" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 0.3 }}>
                        <div className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-gray-50 group" onClick={() => toggleExpand(globalRank)}>
                          <div className="flex items-center flex-1 gap-4">
                            <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-br from-red-500 to-red-600">#{globalRank}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{app['Application ID']}</h4>
                            </div>
                            <div className="text-right">
                              <div className="inline-block px-3 py-1 mb-1 text-sm font-bold text-white bg-green-500 rounded-lg shadow-sm">{(Number(score) || 0).toFixed(1)}</div>
                            </div>
                          </div>
                          <div className="ml-4 text-gray-400 transition-colors group-hover:text-gray-600">{expandedRanks.has(globalRank) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</div>
                        </div>

                        {expandedRanks.has(globalRank) && (
                          <motion.div className="px-4 pb-4 bg-gray-50" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                            <div className="mt-2 space-y-4">

                              {/* Penalty badge if present */}
                              {app['DQ1: Fraudulent documents or misrepresentation → Immediate disqualification.'] && (
                                <div className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 border border-red-200 rounded-full">
                                  ⚠️ Penalty: {app['DQ1: Fraudulent documents or misrepresentation → Immediate disqualification.']}
                                </div>
                              )}

                              {/* Detailed Scoring Breakdown */}
                              <div className="pt-2 order-gray-200 b">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {/* Registration & Track Record */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.1,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
                                      borderColor: "rgb(59, 130, 246)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Registration & Track Record</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-blue-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.1 Registration & Track Record '] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                      >
                                        {app['Logic']}
                                      </motion.p>
                                    )}
                                  </motion.div>

                                  {/* Financial Position */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.15,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)",
                                      borderColor: "rgb(34, 197, 94)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Financial Position</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-green-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.35, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.2 Financial Position '] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic.1'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.45 }}
                                      >
                                        {app['Logic.1']}
                                      </motion.p>
                                    )}
                                  </motion.div>

                                  {/* Market Demand & Competitiveness */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.2,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(147, 51, 234, 0.15)",
                                      borderColor: "rgb(147, 51, 234)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Market Demand & Competitiveness</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-purple-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.4, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.3 Market Demand & Competitiveness'] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic.2'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                      >
                                        {app['Logic.2']}
                                      </motion.p>
                                    )}
                                  </motion.div>

                                  {/* Business Proposal / Growth Viability */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.25,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(251, 146, 60, 0.15)",
                                      borderColor: "rgb(251, 146, 60)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Business Proposal / Growth Viability</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-orange-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.45, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.4 Business Proposal / Growth Viability'] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic.3'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.55 }}
                                      >
                                        {app['Logic.3']}
                                      </motion.p>
                                    )}
                                  </motion.div>

                                  {/* Value Chain Alignment & Role */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.3,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
                                      borderColor: "rgb(99, 102, 241)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Value Chain Alignment & Role</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-indigo-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.5 Value Chain Alignment & Role'] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic.4'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                      >
                                        {app['Logic.4']}
                                      </motion.p>
                                    )}
                                  </motion.div>

                                  {/* Inclusivity & Sustainability */}
                                  <motion.div
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{
                                      duration: 0.4,
                                      delay: 0.35,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(20, 184, 166, 0.15)",
                                      borderColor: "rgb(20, 184, 166)"
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Inclusivity & Sustainability</span>
                                      <div className="flex items-center gap-1">
                                        <motion.span
                                          className="text-sm font-bold text-teal-600"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.55, type: "spring", stiffness: 500 }}
                                        >
                                          {app['A3.6 Inclusivity & Sustainability '] || 0}
                                        </motion.span>
                                        <span className="text-xs text-gray-400">/5</span>
                                      </div>
                                    </div>
                                    {app['Logic.5'] && (
                                      <motion.p
                                        className="text-xs leading-relaxed text-gray-700"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.65 }}
                                      >
                                        {app['Logic.5']}
                                      </motion.p>
                                    )}
                                  </motion.div>
                                </div>

                                {/* Overall Summary */}
                                <div className="pt-2 mt-2 border-t border-gray-200">

                                  {app['REASON(Evaluators Comments)'] && (
                                    <div className="mt-1">
                                      <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Overall Evaluator Comments</div>
                                      <div className="text-sm leading-relaxed text-gray-800">
                                        {app['REASON(Evaluators Comments)']}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Review - applicants with zero score */}
              {pending.length > 0 && (
                <div className="mb-8 overflow-hidden border border-yellow-200 rounded-lg shadow-sm bg-yellow-50">
                  <div className="px-4 py-3 border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-900"><div className="w-2 h-2 bg-yellow-500 rounded-full" />Pending Review</h3>
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
                        <div key={`${app['Application ID']}-other-${idx}`} className="flex items-center justify-between p-3">
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
                  {failed.map((app) => (
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
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-gray-400 bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
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
