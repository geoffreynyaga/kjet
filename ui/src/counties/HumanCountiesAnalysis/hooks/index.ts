import { ApplicantCategories, CountyGroup, HumanApplicant } from '../types/index.ts';
import { getNumericScore, getPassFailStatus, processCountyName } from '../utils/index.ts';
import { useEffect, useState } from 'react';

import { buildStaticDataUrls, fetchJsonWithFallback } from '../../../utils';

export function useHumanData() {
  const [groups, setGroups] = useState<CountyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHumanData = async () => {
    try {
      setLoading(true);
      const cohort = new URLSearchParams(window.location.search).get('cohort');
      const dataUrls = buildStaticDataUrls('kjet-human-final.json', cohort);

      const data = await fetchJsonWithFallback<HumanApplicant[]>(dataUrls);

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

  // Function to get county from URL hash
  const getCountyFromHash = (): string | null => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return null;

    // Decode URL-encoded characters (like %20 for spaces)
    const decodedHash = decodeURIComponent(hash);
    return decodedHash.toUpperCase();
  };

  // Function to set county in URL hash
  const setCountyInHash = (county: string | null) => {
    if (county) {
      // Encode the county name to handle spaces and special characters
      const encodedCounty = encodeURIComponent(county.toLowerCase());
      window.location.hash = encodedCounty;
    } else {
      window.location.hash = '';
    }
  };

  // Function to update selected county and URL hash
  const updateSelectedCounty = (county: string | null) => {
    setSelectedCounty(county);
    setCountyInHash(county);
  };

  // Initialize county selection on component mount
  useEffect(() => {
    if (groups.length > 0) {
      const hashCounty = getCountyFromHash();

      // Check if hash county exists in the groups
      const validHashCounty = hashCounty && groups.find(g =>
        g.county.toUpperCase() === hashCounty.toUpperCase()
      );

      if (validHashCounty) {
        // Use county from hash if valid
        setSelectedCounty(validHashCounty.county);
        setExpandedRanks(new Set([1, 2]));
      } else {
        // Default to first known county
        const known = groups.filter(g => g.county !== 'UNKNOWN');
        const unknown = groups.find(g => g.county === 'UNKNOWN');
        const defaultCounty = known.length ? known[0].county : (unknown ? unknown.county : null);
        updateSelectedCounty(defaultCounty);
        setExpandedRanks(new Set([1, 2]));
      }
    }
  }, [groups]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hashCounty = getCountyFromHash();
      if (hashCounty && groups.length > 0) {
        const validHashCounty = groups.find(g =>
          g.county.toUpperCase() === hashCounty.toUpperCase()
        );
        if (validHashCounty && validHashCounty.county !== selectedCounty) {
          setSelectedCounty(validHashCounty.county);
          setExpandedRanks(new Set([1, 2]));
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [groups, selectedCounty]);

  const toggleExpand = (rank: number) => {
    const s = new Set(expandedRanks);
    if (s.has(rank)) s.delete(rank); else s.add(rank);
    setExpandedRanks(s);
  };

  return {
    selectedCounty,
    setSelectedCounty: updateSelectedCounty,
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