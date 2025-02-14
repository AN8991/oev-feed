import { TransactionHistory } from '@/services/history';

interface TransactionHistoryProps {
  transactions: TransactionHistory[];
  loading: boolean;
}

export function TransactionHistoryDisplay({ transactions, loading }: TransactionHistoryProps) {
  if (loading) {
    return <div className="text-center py-4">Loading transaction history...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return <div className="text-center py-4 text-gray-500">No transactions found</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Transaction History</h3>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asset</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    tx.type === 'BORROW' || tx.type === 'WITHDRAW'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {tx.asset}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {tx.amount}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
