import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Download, ExternalLink, Eye } from 'lucide-react';

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

    console.log(application_id,"params")



  useEffect(() => {
    loadApplicationFiles();
  }, [application_id]);

  const loadApplicationFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/data_file_inventory.json');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading application files...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Files</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/counties')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Counties
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header
        className="bg-white shadow-sm border-b border-gray-200 px-8 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/counties')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
        className="max-w-7xl mx-auto p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Files Found</h3>
            <p className="text-gray-600">This application doesn't have any uploaded files.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {files.length} File{files.length !== 1 ? 's' : ''} Uploaded
              </h2>
              <p className="text-gray-600">Click on any file to view or download it.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file, index) => (
                <motion.div
                  key={file.filename}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getFileIcon(file.filename)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate" title={file.filename}>
                        {file.filename}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{getFileType(file.filename)}</p>
                      <p className="text-xs text-gray-500 mb-4">{formatFileSize(file.s3_url)}</p>

                      <div className="flex gap-2">
                        <a
                          href={file.s3_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </a>
                        <a
                          href={file.s3_url}
                          download
                          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
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