import { ethers, BrowserProvider, Contract } from 'ethers';
import contractsConfig from '../contracts/contracts.json';

export const EXPECTED_CHAIN_ID = 31337; // Hardhat Local Node

export const blockchainService = {
  isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).ethereum);
  },

  async requestAccounts(): Promise<string[]> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error("MetaMask is not installed.");
    }
    const provider = new BrowserProvider((window as any).ethereum);
    return await provider.send("eth_requestAccounts", []);
  },

  async getNetworkDetails(): Promise<{ chainId: number; name: string }> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error("MetaMask is not installed.");
    }
    const provider = new BrowserProvider((window as any).ethereum);
    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
    };
  },

  async switchOrAddNetwork(): Promise<void> {
    if (!this.isMetaMaskAvailable()) return;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
              chainName: 'Hardhat Localhost 8545',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  },

  getContract(
    contractName: 'ElectionManager' | 'VoterEligibility' | 'LightVote' | 'ElectionResults',
    signerOrProvider: ethers.Signer | ethers.Provider
  ): Contract | null {
    const config = (contractsConfig as any)[contractName];
    if (!config || !config.address) {
      console.warn(`Contract configuration not found for: ${contractName}`);
      return null;
    }
    return new Contract(config.address, config.abi, signerOrProvider);
  },

  generateNullifier(voterIdentifier: string, electionId: string | number): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'uint256'],
        [`LIGHTVOTE_NULLIFIER:${voterIdentifier.toLowerCase().trim()}`, BigInt(electionId)]
      )
    );
  },
};
