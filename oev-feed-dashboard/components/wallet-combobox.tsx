'use client';

import * as React from 'react';
import { Check, Wallet, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useWalletAddresses } from '@/hooks/use-wallets';

interface WalletComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function WalletCombobox({ value, onValueChange }: WalletComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { data: wallets, isLoading } = useWalletAddresses();
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter wallets based on search query
  const filteredWallets = React.useMemo(() => {
    if (!wallets) return [];
    if (!searchQuery) return wallets;
    
    const query = searchQuery.toLowerCase();
    return wallets.filter((wallet) =>
      wallet.address.toLowerCase().includes(query)
    );
  }, [wallets, searchQuery]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (address: string) => {
    onValueChange(address);
    setSearchQuery(address);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search or enter wallet address (0x...)"
          value={searchQuery || value}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-10 pr-10"
        />
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && (
        <Card className="absolute z-50 mt-2 w-full max-h-[300px] overflow-y-auto shadow-lg">
          {isLoading ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              Loading wallets...
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No wallets found
            </div>
          ) : (
            <div className="p-1">
              {filteredWallets.map((wallet) => (
                <button
                  key={wallet.address}
                  onClick={() => handleSelect(wallet.address)}
                  className={cn(
                    'w-full flex items-start gap-2 p-3 rounded-md text-left transition-colors',
                    'hover:bg-slate-100',
                    value === wallet.address && 'bg-slate-100'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      value === wallet.address ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-mono text-sm truncate">{wallet.address}</span>
                    <span className="text-xs text-muted-foreground">
                      {wallet.positionCount} position{wallet.positionCount !== 1 ? 's' : ''} • 
                      Last updated: {new Date(wallet.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
