import { UserPositionSummary } from '@/types/protocols';
import { TransactionHistory } from '@/services/history';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

interface ExportOptions {
  format: ExportFormat;
  includeTransactions?: boolean;
}

export class ExportService {
  /**
   * Export data to the specified format
   */
  async exportData(
    positions: UserPositionSummary[] | null,
    transactions: TransactionHistory[] | null,
    options: ExportOptions
  ): Promise<Blob> {
    const { format, includeTransactions = false } = options;
    
    // Prepare data for export
    const exportData: any = {
      positions: positions || [],
    };
    
    if (includeTransactions && transactions) {
      exportData.transactions = transactions;
    }
    
    // Export based on format
    switch (format) {
      case ExportFormat.JSON:
        return this.exportToJson(exportData);
      case ExportFormat.CSV:
        return this.exportToCsv(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * Export data to JSON format
   */
  private exportToJson(data: any): Blob {
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }
  
  /**
   * Export data to CSV format
   */
  private exportToCsv(data: any): Blob {
    // Handle positions
    let csvContent = '';
    
    if (data.positions && data.positions.length > 0) {
      // Get headers from first position
      const position = data.positions[0];
      const headers = Object.keys(position).filter(key => 
        typeof position[key] !== 'object' || position[key] === null
      );
      
      // Add headers
      csvContent += headers.join(',') + '\n';
      
      // Add rows
      data.positions.forEach((pos: any) => {
        const row = headers.map(header => {
          const value = pos[header];
          // Handle different value types
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/,/g, ';'); // Replace commas to avoid CSV issues
        });
        csvContent += row.join(',') + '\n';
      });
    }
    
    // Add transactions if included
    if (data.transactions && data.transactions.length > 0) {
      csvContent += '\n\nTransactions\n';
      
      // Get headers from first transaction
      const transaction = data.transactions[0];
      const headers = Object.keys(transaction);
      
      // Add headers
      csvContent += headers.join(',') + '\n';
      
      // Add rows
      data.transactions.forEach((tx: any) => {
        const row = headers.map(header => {
          const value = tx[header];
          if (value === null || value === undefined) return '';
          return String(value).replace(/,/g, ';');
        });
        csvContent += row.join(',') + '\n';
      });
    }
    
    return new Blob([csvContent], { type: 'text/csv' });
  }
  
  /**
   * Trigger file download in the browser
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
