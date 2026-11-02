import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import contractsConfig from '../contracts/contracts.json';

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  changeWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  getContract: (contractName: 'ElectionManager' | 'VoterEligibility' | 'LightVote' | 'ElectionResults', withSigner?: boolean) => Contract | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const RPC_URL = import.meta.env.VITE_RPC_URL || import.meta.env.VITE_HARDHAT_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || (contractsConfig as any).chainId || 11155111);
const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || ((contractsConfig as any).network === 'sepolia' ? 'Sepolia' : 'LightVote EVM');

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const updateAccountAndNetwork = async (prov: BrowserProvider) => {
    try {
      const net = await prov.getNetwork();
      setChainId(Number(net.chainId));

      const sign = await prov.getSigner();
      setSigner(sign);
      const addr = await sign.getAddress();
      setAccount(addr);
      setError(null);
    } catch (e: any) {
      console.warn("Could not get signer or account:", e);
      setAccount(null);
      setSigner(null);
    }
  };

  const connectWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install MetaMask to interact with the voting contracts.");
      return;
    }

    setIsConnecting(true);
    try {
      const prov = new BrowserProvider(window.ethereum);
      setProvider(prov);

      const accounts = await prov.send("eth_requestAccounts", []);
      if (accounts && accounts.length > 0) {
        await updateAccountAndNetwork(prov);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 4001) {
        setError("Connection request rejected by user.");
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const changeWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to interact with the voting contracts.');
      return;
    }

    setIsConnecting(true);
    try {
      // Requesting the eth_accounts permission makes MetaMask show its account
      // selection dialog, including while the site is already connected.
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      const prov = new BrowserProvider(window.ethereum);
      setProvider(prov);
      const accounts = await prov.send('eth_requestAccounts', []);
      if (accounts?.length) await updateAccountAndNetwork(prov);
    } catch (err: any) {
      if (err?.code === 4001) {
        setError('Wallet account selection was cancelled.');
      } else if (err?.code === -32601 || err?.code === 4200) {
        setError('This wallet does not support account selection here. Change the active account in the wallet extension.');
      } else {
        setError(err?.shortMessage || err?.message || 'Could not change wallet account.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setError(null);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                chainName: CHAIN_NAME,
                rpcUrls: [RPC_URL],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const prov = new BrowserProvider(window.ethereum);
      setProvider(prov);

      // Check already connected accounts
      prov.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          updateAccountAndNetwork(prov);
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          prov.getSigner().then(setSigner);
        }
      };

      const handleChainChanged = (newChainId: string) => {
        setChainId(parseInt(newChainId, 16));
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const getContract = (contractName: 'ElectionManager' | 'VoterEligibility' | 'LightVote' | 'ElectionResults', withSigner = false): Contract | null => {
    const config = (contractsConfig as any)[contractName];
    const addressKey = `VITE_${contractName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_ADDRESS`;
    const address = (import.meta.env as any)[addressKey] || config?.address;
    if (!config || !address || !config.abi) {
      console.error(`Contract configuration for ${contractName} not found.`);
      return null;
    }

    if (withSigner) {
      if (!signer || chainId !== EXPECTED_CHAIN_ID) return null;
      return new Contract(address, config.abi, signer);
    }
    const runner = provider && chainId === EXPECTED_CHAIN_ID
      ? provider
      : new ethers.JsonRpcProvider(RPC_URL);
    return new Contract(address, config.abi, runner);
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        isConnected: !!account,
        isConnecting,
        error,
        connectWallet,
        changeWallet,
        disconnectWallet,
        switchNetwork,
        provider,
        signer,
        getContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Augment window object for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}
