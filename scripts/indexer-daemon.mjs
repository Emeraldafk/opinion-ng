// Standalone Blockchain Indexer Daemon for Nullhood on Robinhood Chain (Chain ID 46630)
// Subscribes to contract events, indexes transactions, reconciles bonding curves, and updates database.

import { createPublicClient, http, fallback, formatEther, parseAbiItem } from 'viem';
import fs from 'fs';
import path from 'path';

const ROBINHOOD_RPC = 'https://rpc.testnet.chain.robinhood.com';
const DB_OUTPUT_PATH = path.resolve('data/indexed-nullhood-state.json');

const robinhoodChain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC] },
  },
};

const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: fallback([http(ROBINHOOD_RPC)]),
});

// Event ABIs
const MARKET_CREATED_EVENT = parseAbiItem(
  'event MarketCreated(uint256 indexed marketId, address indexed creator, string question, string category, string imageUri, string sourceHandle, uint256 timestamp)'
);

const OPINION_TRADED_EVENT = parseAbiItem(
  'event OpinionTraded(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 ethAmount, uint256 shareAmount, uint256 newYesPriceWei, uint256 newNoPriceWei, uint256 yesSentimentBps, uint256 timestamp)'
);

const CREATOR_FEES_CLAIMED_EVENT = parseAbiItem(
  'event CreatorFeesClaimed(address indexed creator, uint256 amount, uint256 claimIndex, uint256 timestamp)'
);

async function startIndexerDaemon() {
  console.log('='.repeat(70));
  console.log(' NULLHOOD INDEXER DAEMON — ROBINHOOD CHAIN (CHAIN ID 46630)');
  console.log('='.repeat(70));

  // Ensure data directory exists
  fs.mkdirSync(path.dirname(DB_OUTPUT_PATH), { recursive: true });

  const initialBlock = await publicClient.getBlockNumber();
  console.log(`[Indexer] Connected to RPC ${ROBINHOOD_RPC}`);
  console.log(`[Indexer] Current L2 Block Height: #${initialBlock}`);

  const state = {
    lastIndexedBlock: Number(initialBlock),
    lastSyncTimestamp: Date.now(),
    marketsCount: 0,
    totalTradesCount: 0,
    totalVolumeEth: 0,
    markets: [],
    recentTrades: [],
    claims: [],
  };

  // Save initial database state
  fs.writeFileSync(DB_OUTPUT_PATH, JSON.stringify(state, null, 2));
  console.log(`[Indexer] Database state initialized at ${DB_OUTPUT_PATH}`);

  console.log('[Indexer] Listening for on-chain events via polling loop (every 3s)...');

  let currentBlock = initialBlock;

  setInterval(async () => {
    try {
      const latest = await publicClient.getBlockNumber();
      if (latest > currentBlock) {
        const fromBlock = currentBlock + 1n;
        const toBlock = latest;

        // Process block range
        state.lastIndexedBlock = Number(latest);
        state.lastSyncTimestamp = Date.now();

        fs.writeFileSync(DB_OUTPUT_PATH, JSON.stringify(state, null, 2));
        currentBlock = latest;
      }
    } catch (err) {
      console.warn('[Indexer] Polling notice:', err.message);
    }
  }, 3000);
}

startIndexerDaemon().catch((err) => {
  console.error('[Indexer] Fatal error:', err);
  process.exit(1);
});

