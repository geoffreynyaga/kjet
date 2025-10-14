import { useEffect, useState } from 'react';
import { CountyGroup, HumanApplicant, ApplicantCategories } from '../types/index.ts';
import { getNumericScore, getPassFailStatus, processCountyName } from '../utils/index.ts';

export function useHumanData() {
  const [groups, setGroups] = useState<CountyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHumanData = async () => {
    try {
      setLoading(true);
      const resp = await fetch('/kjet-human-final.json');
      const data: HumanApplicant[] = await resp.json();

      // Group by county (E2. County Mapping)
      const map = new Map<string, HumanApplicant[]>();
      data.forEach((row) => {
        const countyRaw = row['E2. County Mapping'] || row['E2. County Mapping'];
        const county = processCountyName(countyRaw);
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
      setLoading(false);
    } catch (e: any) {
      console.log(e, "error loading json");
      setError(String(e));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHumanData();
  }, []);

  return { groups, loading, error };
}

export function useCountySelection(groups: CountyGroup[]) {
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (groups.length > 0) {
      const known = groups.filter(g => g.county !== 'UNKNOWN');
      const unknown = groups.find(g => g.county === 'UNKNOWN');
      setSelectedCounty(known.length ? known[0].county : (unknown ? unknown.county : null));
      setExpandedRanks(new Set([1, 2]));
    }
  }, [groups]);

  const toggleExpand = (rank: number) => {
    const s = new Set(expandedRanks);
    if (s.has(rank)) s.delete(rank); else s.add(rank);
    setExpandedRanks(s);
  };

  return {
    selectedCounty,
    setSelectedCounty,
    expandedRanks,
    setExpandedRanks,
    toggleExpand
  };
}

export function useApplicantCategories(currentGroup: CountyGroup | null): ApplicantCategories {
  return currentGroup ? (() => {
    // All applicants with positive scores (above zero)
    const positiveScored = currentGroup.applicants.filter(a => getNumericScore(a) > 0);

    // Top two candidates (first two from the already sorted list)
    const topTwo = positiveScored.slice(0, 2);

    // Other ranked candidates (exclude top two)
    const otherRanked = positiveScored.slice(2);

    // Failed candidates (zero score or DQ status)
    const failed = currentGroup.applicants.filter(a =>
      getNumericScore(a) === 0
    );

    return {
      topTwo,
      pending: [], // No longer needed
      failed,
      otherRanked
    };
  })() : { topTwo: [], pending: [], failed: [], otherRanked: [] };
}