import { UserPosition } from '@/types/protocols';
import { formatUnits } from 'ethers';

interface PositionDisplayProps {
  positions: UserPosition[];
  loading: boolean;
}

export function PositionDisplay({ positions, loading }: PositionDisplayProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No positions found for the selected protocol and time range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Protocol Positions</h2>
      <div className="space-y-4">
        {positions.map((position, index) => (
          <div key={`${position.protocol}-${position.symbol}-${index}`} className="border-b pb-4">
            <h3 className="text-lg font-medium mb-2">{position.symbol}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Supply</p>
                <p className="font-medium">{formatUnits(BigInt(position.totalSupply), 18)} {position.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Borrow</p>
                <p className="font-medium">{formatUnits(BigInt(position.totalBorrow), 18)} {position.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Liquidity</p>
                <p className="font-medium">{formatUnits(BigInt(position.availableLiquidity), 18)} {position.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Price (ETH)</p>
                <p className="font-medium">{position.priceInEth ? formatUnits(BigInt(position.priceInEth), 18) : 'N/A'} ETH</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last Updated: {new Date(position.timestamp * 1000).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
