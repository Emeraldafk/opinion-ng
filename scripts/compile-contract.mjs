import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const rootDir = process.cwd();
const contractPath = path.join(rootDir, 'contracts', 'NullhoodMarkets.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'NullhoodMarkets.sol': {
      content: source,
    },
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatalErrors = output.errors.filter((err) => err.severity === 'error');
  for (const err of output.errors) {
    console.log(err.formattedMessage);
  }
  if (fatalErrors.length > 0) {
    process.exit(1);
  }
}

const compiled = output.contracts['NullhoodMarkets.sol']['NullhoodMarkets'];
const abi = compiled.abi;
const bytecode = `0x${compiled.evm.bytecode.object}`;

const outDir = path.join(rootDir, 'src', 'contracts');
fs.mkdirSync(outDir, { recursive: true });

const artifactTs = `// Auto-generated from contracts/NullhoodMarkets.sol by scripts/compile-contract.mjs
export const NULLHOOD_MARKETS_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const NULLHOOD_MARKETS_BYTECODE: \`0x\${string}\` = "${bytecode}";

export const TIRED_FUN_MARKETS_ABI = NULLHOOD_MARKETS_ABI;
export const TIRED_FUN_MARKETS_BYTECODE = NULLHOOD_MARKETS_BYTECODE;
`;

fs.writeFileSync(path.join(outDir, 'NullhoodMarketsArtifact.ts'), artifactTs, 'utf8');
console.log(
  `[Nullhood] Compiled NullhoodMarkets.sol successfully (${abi.length} ABI entries, ${(bytecode.length - 2) / 2} bytes)`
);

