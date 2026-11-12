import fs from 'node:fs';
import path from 'node:path';
import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Robinhood Testnet ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  testnet: true,
});

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.log('Usage: PRIVATE_KEY=0x... npm run deploy:robinhood');
    console.log('Note: You can also deploy directly with 1-click inside the Nullhood web app using your connected browser wallet!');
    process.exit(0);
  }

  const artifactPath = path.join(process.cwd(), 'src', 'contracts', 'NullhoodMarketsArtifact.ts');
  if (!fs.existsSync(artifactPath)) {
    console.error('Artifact not found. Run `npm run compile:contract` first.');
    process.exit(1);
  }

  const content = fs.readFileSync(artifactPath, 'utf8');
  const abiMatch = content.match(/export const NULLHOOD_MARKETS_ABI = ([\s\S]*?) as const;/);
  const bytecodeMatch = content.match(/export const NULLHOOD_MARKETS_BYTECODE: `0x\$\{string\}` = "(0x[0-9a-fA-F]+)";/);

  const abi = JSON.parse(abiMatch[1]);
  const bytecode = bytecodeMatch[1];

  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
  const publicClient = createPublicClient({
    chain: robinhoodTestnet,
    transport: http('https://rpc.testnet.chain.robinhood.com'),
  });
  const walletClient = createWalletClient({
    account,
    chain: robinhoodTestnet,
    transport: http('https://rpc.testnet.chain.robinhood.com'),
  });

  console.log(`Deploying NullhoodMarkets to Robinhood Chain Testnet (Chain ID 46630) from ${account.address}...`);
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });

  console.log(`Transaction broadcasted: https://explorer.testnet.chain.robinhood.com/tx/${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✔ NullhoodMarkets deployed at: ${receipt.contractAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

