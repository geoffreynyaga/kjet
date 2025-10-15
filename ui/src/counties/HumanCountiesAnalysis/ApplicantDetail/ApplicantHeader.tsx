import React, { useEffect, useState } from 'react';
import { formatScore, getNumericScore } from '../utils/index.ts';

import { ArrowLeft } from 'lucide-react';
import { HumanApplicant } from '../types/index.ts';
import { motion } from 'framer-motion';
import { s3BaseUrl } from '../../../utils';

// Simple county ranking calculation (same as parent components)
const getCountyRank = (applicant: HumanApplicant, allCountyApplicants: HumanApplicant[]): number => {
  return allCountyApplicants.findIndex(a => String(a['Application ID']) === String(applicant['Application ID'])) + 1;
};

// Function to fetch applicant name from gemini data
const fetchApplicantName = async (applicationId: string, county: string): Promise<string | null> => {
  try {
    // Normalize county name to match file naming convention
    const normalizedCounty = county.toLowerCase().replace(/'/g, '');
    // console.log(normalizedCounty,"normalized county")
    const response = await fetch(`${s3BaseUrl}/static/data/gemini/${normalizedCounty}.json`);

    if (!response.ok) {
      console.warn(`Failed to fetch data for county: ${county}`);
      return null;
    }

    const data = await response.json();

    // Strip application ID by "_" and use the second part
    const applicationIdPart = String(applicationId).split('_')[1];
    console.log(`Looking for application ID part: ${applicationIdPart} in county: ${county}`);
    console.log(`Available applications:`, data.applications?.map((app: any) => app.application_id) || []);

    const application = data.applications?.find((app: any) => {
      const appIdPart = String(app.application_id).split('_')[1];
      return appIdPart === applicationIdPart;
    });

    console.log(`Found application:`, application);
    return application?.applicant_name || null;
  } catch (error) {
    console.error('Error fetching applicant name:', error);
    return null;
  }
};

interface HeaderProps {
  applicant: HumanApplicant;
  countyApplicants: HumanApplicant[];
  onBack: () => void;
}

export const ApplicantHeader: React.FC<HeaderProps> = ({ applicant, countyApplicants, onBack }) => {
  const score = getNumericScore(applicant);
  const countyRank = getCountyRank(applicant, countyApplicants);
  const [applicantName, setApplicantName] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(true);

  // Fetch applicant name from gemini data
  useEffect(() => {
    const loadApplicantName = async () => {
      setNameLoading(true);
      const name = await fetchApplicantName(
        applicant['Application ID'],
        applicant['E2. County Mapping']
      );

    //   console.log(name,"name")
      setApplicantName(name);
      setNameLoading(false);
    };

    loadApplicantName();
  }, [applicant['Application ID'], applicant['E2. County Mapping']]);

//   console.log(countyRank,"countyRank")

  return (
    <motion.header
      className="px-8 py-6 border-b shadow-lg bg-gradient-to-r from-white/95 via-blue-50/80 to-indigo-50/70 backdrop-blur-sm border-gray-200/60"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 transition-colors duration-200 hover:text-blue-600"
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={20} />
              Back to Results
            </motion.button>
            <div className="w-px h-8 bg-gray-300" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {applicant['Application ID']}
                {applicantName && (
                  <motion.span
                    className="ml-3 font-medium text-gray-700"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    : {applicantName}
                  </motion.span>
                )}
                {nameLoading && (
                  <span className="ml-3 text-sm italic text-gray-500">
                    Loading name...
                  </span>
                )}
              </h1>
              <p className="text-gray-600">
                {applicant['E2. County Mapping']} County
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Final Score</div>
              <div className="text-2xl font-bold text-blue-600">{formatScore(score)}</div>
            </div>
            <div className='px-4 py-3 text-center rounded-lg'>
              <div className="mb-1 text-xs font-medium text-gray-700">County Rank</div>
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold text-white ${
                countyRank === 1 || countyRank === 2
                  ? 'bg-green-600'
                  : 'bg-yellow-600'
              }`}>
                {countyRank}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};