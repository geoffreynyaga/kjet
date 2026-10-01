async function fetchApplicationFiles(
  applicationId,
  cohort,
  fetchImpl = fetch,
  staticUrlBuilder,
) {
  const effectiveCohort = cohort || 'latest';
  const encodedApplicationId = encodeURIComponent(applicationId);
  const encodedCohort = encodeURIComponent(effectiveCohort);
  const apiUrl = `/api/pipeline/applications/${encodedApplicationId}/documents/?cohort=${encodedCohort}`;

  try {
    const response = await fetchImpl(apiUrl, { credentials: 'same-origin' });
    const contentType = response.headers?.get('content-type') || '';

    if (response.ok && contentType.includes('application/json')) {
      const payload = await response.json();
      if (Array.isArray(payload.files)) {
        return payload.files;
      }
    }
  } catch (_error) {
    // The static inventory below remains available for legacy deployments.
  }

  const inventoryUrl = staticUrlBuilder('data_file_inventory.json', effectiveCohort);
  const inventoryResponse = await fetchImpl(inventoryUrl, {
    credentials: 'same-origin',
  });
  if (!inventoryResponse.ok) {
    throw new Error(`Document inventory request failed with HTTP ${inventoryResponse.status}`);
  }

  const inventory = await inventoryResponse.json();
  const applicationKey = applicationId.replace(/^Applicant_/i, '');
  const entry = inventory[applicationId] || inventory[applicationKey];
  return Array.isArray(entry?.files) ? entry.files : [];
}

module.exports = { fetchApplicationFiles };
