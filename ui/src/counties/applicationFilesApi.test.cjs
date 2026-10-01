const test = require('node:test');
const assert = require('node:assert/strict');

const { fetchApplicationFiles } = require('./applicationFilesApi.js');


test('uses the authenticated document API before the static inventory', async () => {
  const files = [
    {
      filename: 'application.pdf',
      absolute_path: '',
      s3_url: '/api/pipeline/applications/Applicant_123/documents/application.pdf/',
    },
  ];
  const requests = [];
  const fetchMock = async (url, options) => {
    requests.push([url, options]);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ files }),
    };
  };

  const result = await fetchApplicationFiles(
    'Applicant_123',
    'latest',
    fetchMock,
    () => '/static/data/latest/data_file_inventory.json',
  );

  assert.deepEqual(result, files);
  assert.deepEqual(requests, [
    [
      '/api/pipeline/applications/Applicant_123/documents/?cohort=latest',
      { credentials: 'same-origin' },
    ],
  ]);
});

test('falls back to the static inventory when the document API is unavailable', async () => {
  const files = [{ filename: 'legacy.pdf', absolute_path: '', s3_url: '/legacy.pdf' }];
  const requests = [];
  const fetchMock = async (url, options) => {
    requests.push([url, options]);
    if (requests.length === 1) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
      };
    }
    return { ok: true, json: async () => ({ 123: { files } }) };
  };

  const result = await fetchApplicationFiles(
    'Applicant_123',
    'latest',
    fetchMock,
    () => '/static/data/latest/data_file_inventory.json',
  );

  assert.deepEqual(result, files);
  assert.equal(requests[1][0], '/static/data/latest/data_file_inventory.json');
});

test('accepts an empty API result without requesting the static inventory', async () => {
  const requests = [];
  const fetchMock = async (url) => {
    requests.push(url);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ files: [] }),
    };
  };

  const result = await fetchApplicationFiles(
    'Applicant_123',
    'latest',
    fetchMock,
    () => '/static/data/latest/data_file_inventory.json',
  );

  assert.deepEqual(result, []);
  assert.deepEqual(requests, [
    '/api/pipeline/applications/Applicant_123/documents/?cohort=latest',
  ]);
});
