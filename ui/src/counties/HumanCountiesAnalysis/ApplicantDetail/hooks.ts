import { useEffect, useState } from 'react';

import { HumanApplicant } from '../types/index.ts';
import { getNumericScore } from '../utils/index.ts';
import { buildStaticDataUrls, fetchJsonWithFallback } from '../../../utils';

export interface ApplicationFile {
  filename: string;
  absolute_path: string;
  s3_url: string;
}

interface ApplicationFilesData {
  [applicationId: string]: {
    files: ApplicationFile[];
  };
}

export const useApplicantData = (applicationId: string | undefined) => {
  const [applicant, setApplicant] = useState<HumanApplicant | null>(null);
  const [countyApplicants, setCountyApplicants] = useState<HumanApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplicantData = async () => {
      if (!applicationId) {
        setError('No application ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const cohort = new URLSearchParams(window.location.search).get('cohort');
        const applicantsUrls = buildStaticDataUrls('kjet-human-final.json', cohort);

        const data = await fetchJsonWithFallback<HumanApplicant[]>(applicantsUrls);
        const foundApplicant = data.find(a => String(a['Application ID']) === applicationId);

        if (foundApplicant) {
          setApplicant(foundApplicant);

          // Find all applicants from the same county and sort them (same as parent components)
          const countyName = foundApplicant['E2. County Mapping'];
          const sameCountyApplicants = data
            .filter(a => a['E2. County Mapping'] === countyName)
            .sort((a, b) => getNumericScore(b) - getNumericScore(a)); // Sort by score descending
          setCountyApplicants(sameCountyApplicants);
        } else {
          setError(`Applicant with ID ${applicationId} not found`);
        }
      } catch (err) {
        console.error('Error loading applicant data:', err);
        setError('Failed to load applicant data');
      } finally {
        setLoading(false);
      }
    };

    loadApplicantData();
  }, [applicationId]);

  return { applicant, countyApplicants, loading, error };
};

export const useApplicationFiles = (applicationId: string | undefined) => {
  const [files, setFiles] = useState<ApplicationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplicationFiles = async () => {
      if (!applicationId) {
        setFiles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const cohort = new URLSearchParams(window.location.search).get('cohort') || 'latest';
        try {
          const documentsResponse = await fetch(
            `/api/pipeline/applications/${encodeURIComponent(applicationId)}/documents/?cohort=${encodeURIComponent(cohort)}`,
            { credentials: 'same-origin' }
          );

          if (
            documentsResponse.ok &&
            documentsResponse.headers.get('content-type')?.includes('application/json')
          ) {
            const documentsData = await documentsResponse.json() as { files: ApplicationFile[] };
            if (documentsData.files?.length > 0) {
              setFiles(documentsData.files);
              return;
            }
          }
        } catch (documentsError) {
          console.warn('Live application documents are unavailable; using the static inventory.', documentsError);
        }

        const inventoryUrls = buildStaticDataUrls('data_file_inventory.json', cohort);

        const data = await fetchJsonWithFallback<ApplicationFilesData>(inventoryUrls);
        const applicationKey = applicationId.replace(/^Applicant_/i, '');
        const inventoryEntry = data[applicationId] || data[applicationKey];

        if (inventoryEntry) {
          setFiles(inventoryEntry.files);
        } else {
          console.warn(`No files found for application ${applicationId}`);
          setFiles([]);
        }
      } catch (err) {
        console.error('Error loading application files:', err);
        setError('Failed to load application files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadApplicationFiles();
  }, [applicationId]);

  return { files, loading, error };
};
