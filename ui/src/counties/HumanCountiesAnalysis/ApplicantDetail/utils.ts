export const getFileIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();

  const iconMap: Record<string, string> = {
    pdf: '📄',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
  };

  return iconMap[extension || ''] || '📄';
};

export const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();

  const typeMap: Record<string, string> = {
    pdf: 'PDF',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    png: 'PNG',
    gif: 'GIF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
  };

  return typeMap[extension || ''] || 'File';
};