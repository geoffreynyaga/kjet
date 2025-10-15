import { COUNTIES, TIER_COLUMN } from '../utils/index.ts';
import { CountyStats, NationalStats, StatisticsApplicant } from '../types/index.ts';
import { useEffect, useState } from 'react';
import { s3BaseUrl } from '../../../utils';

export const useStatisticsData = () => {
  const [data, setData] = useState<StatisticsApplicant[]>([]);
  const [nationalStats, setNationalStats] = useState<NationalStats | null>(null);
  const [countyStats, setCountyStats] = useState<CountyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatisticsData();
  }, []);

  const loadStatisticsData = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${s3BaseUrl}/static/data/kjet-human-final.json`);
      const data: StatisticsApplicant[] = await resp.json();

      // Load women-owned data from county JSON files
      const womenOwnedData = await loadWomenOwnedData();

      setData(data);

      // Calculate national statistics with women-owned data
      const nationalStats = calculateNationalStats(data, womenOwnedData);
      setNationalStats(nationalStats);

      // Calculate county statistics with women-owned data
      const countyStats = calculateCountyStats(data, womenOwnedData);
      setCountyStats(countyStats);

      setLoading(false);
    } catch (e: any) {
      console.error('Error loading statistics data:', e);
      setError(String(e));
      setLoading(false);
    }
  };

  const loadWomenOwnedData = async (): Promise<{ [key: string]: string }> => {
    const womenOwnedMap: { [key: string]: string } = {};

    try {
      const promises = COUNTIES.map(async (county) => {
        try {
          const response = await fetch(`${s3BaseUrl}/static/data/output-results/${county}_evaluation_results.json`);
          if (!response.ok) return;

          const countyData = await response.json();
          const applications = countyData.application_evaluations || {};

          Object.entries(applications).forEach(([appId, appData]: [string, any]) => {
            if (appData.woman_owned) {
              // Map from county format (e.g., "Busia_158") to applicant format (e.g., "Applicant_158")
              const applicantId = appId.replace(/^[^_]+_/, 'Applicant_');
              womenOwnedMap[applicantId] = appData.woman_owned;
              // Also store the original format in case it's needed
              womenOwnedMap[appId] = appData.woman_owned;
            }
          });
        } catch (error) {
          console.warn(`Failed to load data for county: ${county}`, error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error loading women-owned data:', error);
    }

    return womenOwnedMap;
  };

  const calculateNationalStats = (data: StatisticsApplicant[], womenOwnedData: { [key: string]: string } = {}): NationalStats => {
    const totalApplications = data.length;
    // Include all applicants with scores greater than zero
    const passedApps = data.filter(app => {
      const score = Number(app['Sum of weighted scores - Penalty(if any)']) || 0;
      return score > 0;
    });
    const totalPassed = passedApps.length;
    const totalFailed = totalApplications - totalPassed;
    const overallPassRate = totalApplications > 0 ? (totalPassed / totalApplications) * 100 : 0;

    // Average score calculation - using all applicants including zeros
    const scores = data.map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Business type distribution
    const businessTypes: { [key: string]: number } = {};
    data.forEach(app => {
      const type = app['E3. Priority Value Chain'] || 'Unknown';
      businessTypes[type] = (businessTypes[type] || 0) + 1;
    });

    const businessTypeDistribution = Object.entries(businessTypes)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalApplications) * 100
      }))
      .sort((a, b) => b.value - a.value);

    // County distribution
    const countyApps: { [key: string]: { total: number; passed: number } } = {};
    data.forEach(app => {
      const county = app['mapping'] || app['E2. County Mapping'] || 'Unknown';
      if (!countyApps[county]) {
        countyApps[county] = { total: 0, passed: 0 };
      }
      countyApps[county].total++;
      // Include all applicants with scores greater than zero
      const score = Number(app['Sum of weighted scores - Penalty(if any)']) || 0;
      if (score > 0) {
        countyApps[county].passed++;
      }
    });

    const countyDistribution = Object.entries(countyApps)
      .map(([county, stats]) => ({
        county,
        applications: stats.total,
        passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.applications - a.applications);

    // Score distribution - with separate categories for 0 and 1-49
    const scoreRanges = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '50-59', count: 0 },
      { range: '1-49', count: 0 },
      { range: '0', count: 0 }
    ];

    scores.forEach(score => {
      if (score >= 90) scoreRanges[0].count++;
      else if (score >= 80) scoreRanges[1].count++;
      else if (score >= 70) scoreRanges[2].count++;
      else if (score >= 60) scoreRanges[3].count++;
      else if (score >= 50) scoreRanges[4].count++;
      else if (score >= 1) scoreRanges[5].count++; // Scores from 1-49
      else scoreRanges[6].count++; // Zero scores only
    });

    // Women owned statistics using county JSON data
    const womenOwnedApps = data.filter(app => {
      const appId = app['Application ID'];
      if (appId && womenOwnedData[appId]) {
        return String(womenOwnedData[appId]).toLowerCase() === 'yes';
      }
      // Fallback to CSV fields if available
      return String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'yes' ||
             String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'true';
    });
    const womenOwnedStats = {
      owned: womenOwnedApps.length,
      notOwned: totalApplications - womenOwnedApps.length,
      percentage: totalApplications > 0 ? (womenOwnedApps.length / totalApplications) * 100 : 0
    };

    // Tier distribution - using the correct column name with Unicode characters
    const tier1 = data.filter(app => {
      const tierValue = String(app[TIER_COLUMN] || '').toLowerCase();
      return tierValue.includes('tier 1') || tierValue.includes('tier1');
    }).length;

    const tier2 = data.filter(app => {
      const tierValue = String(app[TIER_COLUMN] || '').toLowerCase();
      return tierValue.includes('tier 2') || tierValue.includes('tier2');
    }).length;

    const tierDistribution = {
      tier1,
      tier2,
      untiered: totalApplications - tier1 - tier2
    };

    // Top performing counties
    const topPerformingCounties = countyDistribution
      .filter(county => county.applications >= 5) // Minimum threshold
      .map(county => {
        const countyApps = data.filter(app =>
          (app['mapping'] || app['E2. County Mapping'] || 'Unknown') === county.county
        );
        const countyScores = countyApps.map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0);
        const avgScore = countyScores.length > 0 ?
          countyScores.reduce((a, b) => a + b, 0) / countyScores.length : 0;

        return {
          county: county.county,
          passRate: county.passRate,
          avgScore,
          applications: county.applications
        };
      })
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 10);

    return {
      totalApplications,
      totalPassed,
      totalFailed,
      overallPassRate,
      averageScore,
      businessTypeDistribution,
      countyDistribution,
      scoreDistribution: scoreRanges,
      womenOwnedStats,
      tierDistribution,
      topPerformingCounties
    };
  };

  const calculateCountyStats = (data: StatisticsApplicant[], womenOwnedData: { [key: string]: string } = {}): CountyStats[] => {
    const countyGroups: { [key: string]: StatisticsApplicant[] } = {};

    data.forEach(app => {
      const county = app['mapping'] || app['E2. County Mapping'] || 'Unknown';
      if (!countyGroups[county]) {
        countyGroups[county] = [];
      }
      countyGroups[county].push(app);
    });

    return Object.entries(countyGroups).map(([county, apps]) => {
      const totalApplications = apps.length;
      // Include all applicants with scores greater than zero
      const passedApps = apps.filter(app => {
        const score = Number(app['Sum of weighted scores - Penalty(if any)']) || 0;
        return score > 0;
      });
      const passedApplications = passedApps.length;
      const failedApplications = totalApplications - passedApplications;
      const passRate = totalApplications > 0 ? (passedApplications / totalApplications) * 100 : 0;

      const scores = apps.map(app => Number(app['Sum of weighted scores - Penalty(if any)']) || 0);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const topScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Business types in this county
      const businessTypes: { [key: string]: number } = {};
      apps.forEach(app => {
        const type = app['E3. Priority Value Chain'] || 'Unknown';
        businessTypes[type] = (businessTypes[type] || 0) + 1;
      });

      const womenOwnedCount = apps.filter(app => {
        const appId = app['Application ID'];
        if (appId && womenOwnedData[appId]) {
          return String(womenOwnedData[appId]).toLowerCase() === 'yes';
        }
        // Fallback to CSV fields if available
        return String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'yes' ||
               String(app['Women Owned'] || app['woman_owned'] || '').toLowerCase() === 'true';
      }).length;

      const tier1Count = apps.filter(app => {
        const tierValue = String(app[TIER_COLUMN] || '').toLowerCase();
        return tierValue.includes('tier 1') || tierValue.includes('tier1');
      }).length;

      const tier2Count = apps.filter(app => {
        const tierValue = String(app[TIER_COLUMN] || '').toLowerCase();
        return tierValue.includes('tier 2') || tierValue.includes('tier2');
      }).length;

      return {
        county,
        totalApplications,
        passedApplications,
        failedApplications,
        passRate,
        averageScore,
        businessTypes,
        womenOwnedCount,
        totalScores: scores,
        topScore,
        tier1Count,
        tier2Count
      };
    }).sort((a, b) => b.totalApplications - a.totalApplications);
  };

  return {
    data,
    nationalStats,
    countyStats,
    loading,
    error
  };
};