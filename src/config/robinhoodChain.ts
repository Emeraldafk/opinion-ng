import { defineChain } from 'viem';

export const ROBINHOOD_CHAIN_ID = 46630;
export const ROBINHOOD_CHAIN_HEX = '0xb626';
export const ROBINHOOD_RPC_URL = 'https://rpc.testnet.chain.robinhood.com';
export const ROBINHOOD_EXPLORER_URL = 'https://explorer.testnet.chain.robinhood.com';
export const ROBINHOOD_FAUCET_URL = 'https://faucet.testnet.chain.robinhood.com';
export const DEFAULT_TIRED_FUN_CONTRACT_ADDRESS = '0xa21b125556895273960730d9dea52c2082b2ccd2';
export const DEFAULT_NULLHOOD_CONTRACT_ADDRESS = DEFAULT_TIRED_FUN_CONTRACT_ADDRESS;

export const robinhoodTestnet = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Robinhood Testnet ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [ROBINHOOD_RPC_URL],
    },
    public: {
      http: [ROBINHOOD_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Explorer',
      url: ROBINHOOD_EXPLORER_URL,
    },
  },
  testnet: true,
});

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export async function switchOrAddRobinhoodChain(): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('No EVM wallet detected. Install MetaMask, Rabby, or Coinbase Wallet.');
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROBINHOOD_CHAIN_HEX }],
    });
    return true;
  } catch (err: unknown) {
    const switchError = err as { code?: number };
    // 4902 = Chain not added to wallet yet
    if (switchError?.code === 4902 || switchError?.code === -32603) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: ROBINHOOD_CHAIN_HEX,
            chainName: 'Robinhood Chain Testnet',
            nativeCurrency: {
              name: 'Robinhood Testnet ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [ROBINHOOD_RPC_URL],
            blockExplorerUrls: [ROBINHOOD_EXPLORER_URL],
          },
        ],
      });
      return true;
    }
    throw err;
  }
}

export function shortenAddress(addr?: string): string {
  if (!addr) return '';
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

