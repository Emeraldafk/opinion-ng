import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  createWalletClient,
  custom,
} from 'viem';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_EXPLORER_URL,
  ROBINHOOD_FAUCET_URL,
  robinhoodTestnet,
  switchOrAddRobinhoodChain,
} from '../config/robinhoodChain';
import {
  NULLHOOD_MARKETS_ABI,
  NULLHOOD_MARKETS_BYTECODE,
} from '../contracts/NullhoodMarketsArtifact';
import { infraManager, RpcTelemetry } from '../lib/indexerService';

interface ContractConfigModalProps {
  isOpen: boolean;
  contractAddress: string;
  isLiveOnChainMode: boolean;
  walletAddress: string | null;
  onSaveContractAddress: (addr: string) => void;
  onDeploySuccess?: (addr: string, txHash: string) => void;
  onClose: () => void;
}

export const ContractConfigModal: React.FC<ContractConfigModalProps> = ({
  isOpen,
  contractAddress,
  isLiveOnChainMode,
  walletAddress,
  onSaveContractAddress,
  onDeploySuccess,
  onClose,
}) => {
  const [inputAddr, setInputAddr] = useState(contractAddress);
  const [copied, setCopied] = useState(false);
  const [telemetry, setTelemetry] = useState<RpcTelemetry | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      infraManager.probeRpcHealth().then(setTelemetry);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveContractAddress(inputAddr.trim());
    onClose();
  };

  const copyCommand = () => {
    navigator.clipboard.writeText('PRIVATE_KEY=0xYOUR_KEY npm run deploy:robinhood');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInAppDeploy = async () => {
    if (!window.ethereum || !walletAddress) {
      setDeployError('Please connect an EVM wallet (MetaMask / Rabby) to deploy on Robinhood Chain.');
      return;
    }
    setIsDeploying(true);
    setDeployError(null);
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.deployContract({
        abi: NULLHOOD_MARKETS_ABI,
        bytecode: NULLHOOD_MARKETS_BYTECODE,
        args: [],
      });

      const receipt = await infraManager.publicClient.waitForTransactionReceipt({ hash });
      if (receipt.contractAddress) {
        setInputAddr(receipt.contractAddress);
        onSaveContractAddress(receipt.contractAddress);
        if (onDeploySuccess) onDeploySuccess(receipt.contractAddress, hash);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeployError(msg);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-[#232330] bg-[#121218] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#232330] bg-[#161620] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#227c9d]/20 border border-[#227c9d]/30 text-[#53b3d4]">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-fun font-bold text-white">
                Robinhood Chain Testnet & Contract Manager
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Chain ID {ROBINHOOD_CHAIN_ID} (0xb626) • Arbitrum Orbit L2
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#2e2e40] bg-[#1a1a26] text-white hover:bg-[#252538] hover:border-white/40 active:scale-95 transition shadow-sm shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </button>
        </div>

        <div className="space-y-4 p-6 text-xs max-h-[82vh] overflow-y-auto font-sans">
          {/* Active Mode Notice Banner */}
          <div
            className={`rounded-2xl border p-4 ${
              isLiveOnChainMode
                ? 'border-[#227c9d]/40 bg-[#227c9d]/15 text-[#53b3d4]'
                : 'border-[#FF6B00]/40 bg-[#FF6B00]/15 text-orange-300'
            }`}
          >
            <div className="flex items-center gap-2 font-fun font-bold text-sm">
              {isLiveOnChainMode ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#227c9d]" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF6B00]" />
              )}
              <span>
                {isLiveOnChainMode
                  ? 'Active Mode: LIVE ON-CHAIN CONTRACT (Chain ID 46630)'
                  : 'Active Mode: SANDBOX SIMULATION (Zero Gas / Instant Local Mirror)'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {isLiveOnChainMode
                ? 'Trades and market spawns submit real transactions to Robinhood Chain Testnet. All events link directly to the official block explorer.'
                : 'Transactions execute instantaneously in local simulated mode with exact bonding curve math. Simulated trades will never be marked as on-chain transactions.'}
            </p>
          </div>

          {/* Real-time RPC Telemetry Box */}
          <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 space-y-2.5 font-mono shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-[#232330] text-slate-400">
              <span className="flex items-center gap-1.5 font-fun font-bold text-white text-xs">
                <Activity className="h-3.5 w-3.5 text-[#227c9d]" />
                Live RPC Telemetry
              </span>
              <span className="text-[#227c9d] font-bold text-xs">
                {telemetry?.connectionStatus || 'PROBING...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RPC Endpoint:</span>
              <span className="text-slate-300">{ROBINHOOD_RPC_URL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latest Block Height:</span>
              <span className="text-white font-bold">
                {telemetry?.latestBlockNumber ? `#${telemetry.latestBlockNumber}` : 'Syncing...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">L2 Gas Price:</span>
              <span className="text-[#53b3d4]">{telemetry?.gasPriceGwei || '0.0100'} Gwei</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RPC Latency:</span>
              <span className="text-slate-300">
                {telemetry?.rpcLatencyMs ? `${telemetry.rpcLatencyMs} ms` : 'Testing...'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#232330]">
              <span className="text-slate-400">Block Explorer:</span>
              <a
                href={ROBINHOOD_EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#227c9d] hover:underline"
              >
                <span>explorer.testnet.chain.robinhood.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Testnet ETH Faucet:</span>
              <a
                href={ROBINHOOD_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#FF6B00] hover:underline"
              >
                <span>faucet.testnet.chain.robinhood.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Contract Address Configuration */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-fun font-bold uppercase tracking-wider text-slate-300">
                  `Tired.FunMarkets.sol` Contract Address
                </label>
                {inputAddr && (
                  <button
                    type="button"
                    onClick={() => setInputAddr('')}
                    className="font-fun text-xs text-orange-300 hover:underline"
                  >
                    Switch to Sandbox Mode
                  </button>
                )}
              </div>
              <input
                type="text"
                value={inputAddr}
                onChange={(e) => setInputAddr(e.target.value)}
                placeholder="0x... (Leave blank for Sandbox Simulation Mode)"
                className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-4 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-[#227c9d] focus:outline-none"
              />
            </div>

            {/* 1-Click In-App Contract Deployment */}
            <div className="rounded-[22px] border border-[#227c9d]/30 bg-[#227c9d]/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-fun font-bold text-white flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-4 w-4 text-[#227c9d]" />
                  1-Click Deploy to Robinhood Chain (46630)
                </span>
                <span className="font-mono text-[10px] text-slate-400">Via Connected Wallet</span>
              </div>
              <p className="mb-3 text-xs text-slate-300">
                Deploys audited `Tired.FunMarkets.sol` bytecode directly to Robinhood Chain Testnet
                using your connected wallet. Requires testnet ETH from the faucet.
              </p>
              <button
                type="button"
                onClick={handleInAppDeploy}
                disabled={isDeploying}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#227c9d] py-3 font-fun font-bold text-white shadow-[0_0_20px_rgba(34,124,157,0.35)] hover:bg-[#1a647f] active:scale-[0.99] disabled:opacity-50 transition"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Broadcasting & Waiting for Confirmation...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    <span>Deploy Contract to Chain 46630</span>
                  </>
                )}
              </button>
              {deployError && (
                <div className="mt-2 text-xs text-rose-400">{deployError}</div>
              )}
            </div>

            {/* CLI Deployment Option */}
            <div className="rounded-2xl border border-[#232330] bg-[#0b0c10] p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 font-fun">
                  <Terminal className="h-3.5 w-3.5 text-[#227c9d]" />
                  Or Deploy via Terminal CLI:
                </span>
                <button
                  type="button"
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1 text-[#227c9d] hover:underline font-mono text-[11px]"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="block rounded-xl bg-[#161620] p-2.5 font-mono text-[11px] text-[#53b3d4]">
                PRIVATE_KEY=0xYOUR_KEY npm run deploy:robinhood
              </code>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#232330] px-5 py-2 font-fun font-bold text-slate-300 hover:text-white hover:bg-[#1e1e28] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full bg-[#227c9d] px-6 py-2 font-fun font-bold text-white shadow-md hover:bg-[#1a647f] transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
