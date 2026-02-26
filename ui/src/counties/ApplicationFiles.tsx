import { ArrowLeft, Download, ExternalLink, Eye, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { motion } from 'framer-motion';
import { buildStaticDataUrl, s3BaseUrl } from '../utils';

interface ApplicationFile {
  filename: string;
  absolute_path: string;
  s3_url: string;
}

interface ApplicationFilesData {
  [applicationId: string]: {
    files: ApplicationFile[];
  };
}

function ApplicationFiles() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<ApplicationFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { application_id } = useParams<{ application_id: string }>();
    const cohort = new URLSearchParams(window.location.search).get('cohort');



  useEffect(() => {
    loadApplicationFiles();
  }, [application_id]);

  const loadApplicationFiles = async () => {
    try {
      setLoading(true);
      const url = buildStaticDataUrl('data_file_inventory.json', cohort);
      const response = await fetch(url);
      const data: ApplicationFilesData = await response.json();

      console.log(data,"data")

      let new_id = application_id?.split('_')[1];

      if (new_id === "undefined") {
        console.log("new id is undefined")
      } else{
          console.log(new_id,"new id")

          if (application_id && data[new_id]) {
            console.log(data[new_id],"what is this");
            setFiles(data[new_id].files);
          } else {
            setError(`No files found for application ${application_id}`);
          }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading application files:', err);
      setError('Failed to load application files');
      setLoading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📄';
    }
  };

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'PDF Document';
      case 'jpg':
      case 'jpeg':
        return 'JPEG Image';
      case 'png':
        return 'PNG Image';
      case 'gif':
        return 'GIF Image';
      case 'doc':
        return 'Word Document';
      case 'docx':
        return 'Word Document';
      case 'xls':
        return 'Excel Spreadsheet';
      case 'xlsx':
        return 'Excel Spreadsheet';
      default:
        return 'Document';
    }
  };

  const formatFileSize = (url: string) => {
    // Since we don't have file size info, we'll show a placeholder
    return 'Size unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-4 loading-spinner"></div>
          <p className="text-lg text-gray-600">Loading application files...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex items-center justify-center w-full min-h-screen bg-gray-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error Loading Files</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/counties')}
            className="px-4 py-2 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            Back to Counties
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <motion.header
        className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4 mx-auto max-w-7xl">
          <button
            onClick={() => navigate('/counties')}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Back to Counties
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application {application_id} Files</h1>
            <p className="text-gray-600">Uploaded documents and supporting files</p>
          </div>
        </div>
      </motion.header>

      <motion.div
        className="p-8 mx-auto max-w-7xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {files.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">No Files Found</h3>
            <p className="text-gray-600">This application doesn't have any uploaded files.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                {files.length} File{files.length !== 1 ? 's' : ''} Uploaded
              </h2>
              <p className="text-gray-600">Click on any file to view or download it.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file, index) => (
                <motion.div
                  key={file.filename}
                  className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getFileIcon(file.filename)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 font-semibold text-gray-900 truncate" title={file.filename}>
                        {file.filename}
                      </h3>
                      <p className="mb-3 text-sm text-gray-600">{getFileType(file.filename)}</p>
                      <p className="mb-4 text-xs text-gray-500">{formatFileSize(file.s3_url)}</p>

                      <div className="flex gap-2">
                        <a
                          href={file.s3_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 text-sm text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
                        >
                          <Eye size={14} />
                          View
                        </a>
                        <a
                          href={file.s3_url}
                          download
                          className="flex items-center gap-1 px-3 py-2 text-sm text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600"
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default ApplicationFiles;