import { useMemo } from 'react';
import { ComparisonData, Statistics } from '../types';

export const useStatistics = (data: ComparisonData[]): Statistics => {
  return useMemo(() => {
    const totalApplicants = data.length;

    // First results analysis ("ONLY PASS")
    const firstRoundPassed = data.filter(item => typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0).length;
    const firstRoundZero = data.filter(item => typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] === 0).length;
    const firstRoundDisqualified = data.filter(item => item["ONLY PASS"] === "DQ").length;

    // Final results analysis ("ALL SCORED")
    const finalRoundScored = data.filter(item => typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0).length;
    const finalRoundZero = data.filter(item => typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] === 0).length;
    const finalRoundDisqualified = data.filter(item => item["ALL SCORED"] === "DQ").length;

    // Score improvements: final score > first score (when both are positive numbers)
    const scoreImproved = data.filter(item =>
      typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 &&
      typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0 &&
      item["ALL SCORED"] > item["ONLY PASS"]
    ).length;

    // Zero to scored: had 0 score in first, positive in final
    const zeroToScored = data.filter(item =>
      typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] === 0 &&
      typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0
    ).length;

    // Total improvements (including zero to scored)
    const totalImproved = scoreImproved + zeroToScored;

    // Score declined: final score < first score (when both are positive numbers)
    const declined = data.filter(item =>
      typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 &&
      typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0 &&
      item["ALL SCORED"] < item["ONLY PASS"]
    ).length;

    // County ranking changes (excluding "Unknown" county)
    const promotedToTop2 = data.filter(item =>
      item["County"] !== "Unknown" &&
      item["FIRST COUNTY RANK"] > 2 && item["FINAL COUNTY RANK"] <= 2
    ).length;

    const kickedFromTop2 = data.filter(item =>
      item["County"] !== "Unknown" &&
      item["FIRST COUNTY RANK"] <= 2 && item["FINAL COUNTY RANK"] > 2
    ).length;

    // Final qualified (top 2 in county)
    const finalQualified = data.filter(item => item["FINAL COUNTY RANK"] <= 2).length;

    // No change: positive first results but zero final results
    const noChange = data.filter(item =>
      typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 &&
      typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] === 0
    ).length;

    // Average scores (only include numerical scores, exclude "DQ")
    const averageFirstRound = data.reduce((sum, item) => {
      if (typeof item["ONLY PASS"] === 'number') {
        return sum + item["ONLY PASS"];
      }
      return sum;
    }, 0) / data.filter(item => typeof item["ONLY PASS"] === 'number').length;

    const averageSecondRound = data.reduce((sum, item) => {
      if (typeof item["ALL SCORED"] === 'number') {
        return sum + item["ALL SCORED"];
      }
      return sum;
    }, 0) / data.filter(item => typeof item["ALL SCORED"] === 'number').length;

    return {
      totalApplicants,
      firstRoundPassed,
      firstRoundZero,
      firstRoundDisqualified,
      finalRoundScored,
      finalRoundZero,
      finalRoundDisqualified,
      scoreImproved,
      zeroToScored,
      totalImproved,
      declined,
      promotedToTop2,
      kickedFromTop2,
      finalQualified,
      noChange,
      firstRoundFailedTotal: totalApplicants - firstRoundPassed,
      averageFirstRound: isNaN(averageFirstRound) ? 0 : averageFirstRound,
      averageSecondRound: isNaN(averageSecondRound) ? 0 : averageSecondRound,
    };
  }, [data]);
};