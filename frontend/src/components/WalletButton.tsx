import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import contractsConfig from '../contracts/contracts.json';

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || (contractsConfig as any).chainId || 31337);

export const WalletButton: React.FC = () => {
  const { account, chainId, isConnected, isConnecting, connectWallet, changeWallet, switchNetwork, error } = useWeb3();

  const isWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  if (isWrongNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        title={`Click to switch to the configured network (${EXPECTED_CHAIN_ID})`}
      >
        <AlertCircle className="w-4 h-4" />
        <span>Switch Network ({chainId} → {EXPECTED_CHAIN_ID})</span>
      </button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <button
          type="button"
          onClick={changeWallet}
          disabled={isConnecting}
          className="px-2.5 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-50"
          title="To use another account, select it in MetaMask, then reconnect here."
        >
          {isConnecting ? 'Connecting…' : 'Change wallet'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="flex items-center gap-2 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
      >
        <Wallet className="w-4 h-4" />
        <span>{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
      </button>
      {error && (
        <p className="text-[10px] text-rose-600 mt-1 max-w-[160px] truncate" title={error}>
          {error}
        </p>
      )}
    </div>
  );
};
