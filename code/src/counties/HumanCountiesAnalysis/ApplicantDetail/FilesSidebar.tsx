import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye } from 'lucide-react';
import { ApplicationFile } from './hooks';
import { getFileIcon, getFileType } from './utils.ts';

interface FilesSidebarProps {
  files: ApplicationFile[];
  loading: boolean;
}

export const FilesSidebar: React.FC<FilesSidebarProps> = ({ files, loading }) => (
  <div className="flex-shrink-0 w-full">
    <motion.div
      className="sticky p-6 border shadow-xl top-8 bg-gradient-to-b from-white to-gray-50/50 rounded-2xl border-gray-200/60"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h2 className="mb-6 text-xl font-bold text-gray-800">
        Documents ({files.length})
      </h2>

      {loading ? (
        <div className="py-4 text-center">
          <div className="w-8 h-8 mx-auto border-2 border-blue-200 rounded-full border-t-blue-600 animate-spin" />
          <p className="mt-2 text-sm text-gray-500">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="py-6 text-center">
          <FileText size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">No files available</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-96">
          {files.map((file, index) => (
            <motion.div
              key={file.filename}
              className="p-3 transition-colors duration-200 border border-gray-200 rounded-lg bg-gray-50 hover:border-blue-400 group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.02 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="flex-shrink-0 text-lg">{getFileIcon(file.filename)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium leading-tight text-gray-700 truncate" title={file.filename}>
                    {file.filename}
                  </h3>
                  <p className="text-xs text-gray-500">{getFileType(file.filename)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <a
                  href={file.s3_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-1 text-blue-600 transition-colors bg-blue-100 rounded hover:bg-blue-200"
                  title="View file"
                >
                  <Eye size={10} />
                </a>
                <a
                  href={file.s3_url}
                  download={file.filename}
                  className="flex items-center justify-center p-1 text-green-600 transition-colors bg-green-100 rounded hover:bg-green-200"
                  title="Download file"
                >
                  <Download size={10} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  </div>
);