import { useState } from 'react';
import { ExportService, ExportFormat } from '@/services/export';
import { UserPositionSummary } from '@/types/protocols';

interface ExportButtonProps {
  data: UserPositionSummary[];
  filename?: string;
}

export default function ExportButton({ data, filename = 'export-data.json' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const exportService = new ExportService();

  const handleExport = async (format: ExportFormat) => {
    const now = new Date();
    const fileBase = filename.split('.')[0];
    const outputFilename = `${fileBase}-${now.toISOString().split('T')[0]}.${format}`;

    try {
      const blob = await exportService.exportData(data, null, {
        format,
        includeTransactions: false,
      });
      
      exportService.downloadFile(blob, outputFilename);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show this error in your UI
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium flex items-center"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport(ExportFormat.JSON)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as JSON
            </button>
            <button
              onClick={() => handleExport(ExportFormat.CSV)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
