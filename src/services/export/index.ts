import { UserPosition } from '@/types/protocols';
import { TransactionHistory } from '@/services/history';

export type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  includeTransactions?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  format?: ExportFormat;
}

export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private positionsToCSV(positions: UserPosition[]): string {
    const headers = ['Protocol', 'Collateral', 'Debt', 'Health Factor', 'Timestamp'];
    const rows = positions.map(pos => [
      pos.protocol,
      pos.collateral,
      pos.debt,
      pos.healthFactor,
      new Date(pos.timestamp).toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  private transactionsToCSV(transactions: TransactionHistory[]): string {
    const headers = ['Timestamp', 'Protocol', 'Network', 'Type', 'Amount', 'Asset', 'Transaction Hash'];
    const rows = transactions.map(tx => [
      new Date(tx.timestamp).toISOString(),
      tx.protocol,
      tx.network,
      tx.type,
      tx.amount,
      tx.asset,
      tx.txHash,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  async exportData(
    positions: UserPosition[],
    transactions: TransactionHistory[],
    options: ExportOptions = {}
  ): Promise<Blob> {
    const {
      includeTransactions = true,
      dateRange,
      format = 'csv',
    } = options;

    // Filter data by date range if specified
    let filteredPositions = positions;
    let filteredTransactions = transactions;

    if (dateRange) {
      filteredPositions = positions.filter(
        pos => pos.timestamp >= dateRange.start.getTime() && pos.timestamp <= dateRange.end.getTime()
      );

      filteredTransactions = transactions.filter(
        tx => tx.timestamp >= dateRange.start.getTime() && tx.timestamp <= dateRange.end.getTime()
      );
    }

    if (format === 'csv') {
      let csvContent = this.positionsToCSV(filteredPositions);
      
      if (includeTransactions) {
        csvContent += '\n\nTransaction History\n';
        csvContent += this.transactionsToCSV(filteredTransactions);
      }

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } else {
      const jsonData = {
        positions: filteredPositions,
        ...(includeTransactions && { transactions: filteredTransactions }),
        exportDate: new Date().toISOString(),
      };

      return new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
    }
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
