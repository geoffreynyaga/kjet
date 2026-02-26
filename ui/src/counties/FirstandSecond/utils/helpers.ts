import { ComparisonData } from '../types';

// Function to get county-based row background color
export const getCountyRowColor = (county: string): string => {
  // Create a simple hash of the county name to get consistent colors
  let hash = 0;
  for (let i = 0; i < county.length; i++) {
    hash = county.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to select from predefined color classes
  const availableColors = [
    'bg-blue-50',
    'bg-green-50',
    'bg-yellow-50',
    'bg-purple-50',
    'bg-pink-50',
    'bg-indigo-50',
    'bg-orange-50',
    'bg-teal-50',
  ];

  const colorIndex = Math.abs(hash) % availableColors.length;
  return availableColors[colorIndex];
};

// Sort icon generator
export const getSortIcon = (field: keyof ComparisonData, sortField: keyof ComparisonData, sortDirection: 'asc' | 'desc'): string => {
  if (sortField !== field) return '↕️';
  return sortDirection === 'asc' ? '↑' : '↓';
};

// Filter data based on status
export const filterDataByStatus = (data: ComparisonData[], filterStatus: string): ComparisonData[] => {
  switch (filterStatus) {
    case 'first-round-pass':
      return data.filter(item => typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0);
    case 'low-to-high':
      return data.filter(item =>
        typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 &&
        typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0 &&
        item["ALL SCORED"] > item["ONLY PASS"]
      );
    case 'high-to-low':
      return data.filter(item =>
        typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] > 0 &&
        typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0 &&
        item["ALL SCORED"] < item["ONLY PASS"]
      );
    case 'zero-to-ranked':
      return data.filter(item =>
        typeof item["ONLY PASS"] === 'number' && item["ONLY PASS"] === 0 &&
        typeof item["ALL SCORED"] === 'number' && item["ALL SCORED"] > 0
      );
    case 'promoted-to-top2':
      return data.filter(item =>
        item["County"] !== "Unknown" &&
        item["FIRST COUNTY RANK"] > 2 && item["FINAL COUNTY RANK"] <= 2
      );
    case 'demoted-from-top2':
      return data.filter(item =>
        item["County"] !== "Unknown" &&
        item["FIRST COUNTY RANK"] <= 2 && item["FINAL COUNTY RANK"] > 2
      );
    default:
      return data;
  }
};

// Sort data
export const sortData = (data: ComparisonData[], sortField: keyof ComparisonData, sortDirection: 'asc' | 'desc'): ComparisonData[] => {
  return [...data].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle numeric sorting
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle string sorting
    aValue = String(aValue).toLowerCase();
    bValue = String(bValue).toLowerCase();

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};