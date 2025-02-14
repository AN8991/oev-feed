import { useState } from 'react';
import { ExportService, ExportFormat } from '@/services/export';
import { UserPosition } from '@/types/protocols';
import { TransactionHistory } from '@/services/history';

interface ExportButtonProps {
  positions: UserPosition[];
  transactions: TransactionHistory[];
}

export default function ExportButton({ positions, transactions }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const exportService = new ExportService();

  const handleExport = async (format: ExportFormat) => {
    const now = new Date();
    const filename = `defi-positions-${now.toISOString().split('T')[0]}.${format}`;

    try {
      const blob = await exportService.exportData(positions, transactions, {
        format,
        includeTransactions: true,
      });
      
      exportService.downloadFile(blob, filename);
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
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            <button
              onClick={() => handleExport('csv')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              Export as JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
