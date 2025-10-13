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
}