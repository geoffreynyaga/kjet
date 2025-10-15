import { useState } from 'react';
import { CountyStats } from '../types/index.ts';

export const useCountySelection = (countyStats: CountyStats[]) => {
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  const selectedCountyData = selectedCounty ?
    countyStats.find(county => county.county === selectedCounty) : null;

  return {
    selectedCounty,
    setSelectedCounty,
    selectedCountyData
  };
};