import React, { useState } from 'react';
import {
  X,
  Wallet,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '../config/robinhoodChain';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet: () => Promise<void>;
  onConnectSimulatedWallet?: () => void;
  pendingActionTitle?: string;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onConnectWallet,
  onConnectSimulatedWallet,
  pendingActionTitle = 'Voting & Trading Opinions',
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasInjected = typeof window !== 'undefined' && Boolean((window as any).ethereum);
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleConnect = async (walletName: string) => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      // On mobile without an injected EVM browser, deep link directly into the wallet application
      if (isMobile && !hasInjected) {
        if (walletName === 'MetaMask') {
          const targetUrl = window.location.host + window.location.pathname;
          window.location.href = `https://metamask.app.link/dapp/${targetUrl}`;
          return;
        }
        if (walletName === 'Coinbase Wallet') {
          window.location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`;
          return;
        }
        if (walletName === 'Trust Wallet') {
          window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
          return;
        }
      }

      await onConnectWallet();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to connect ${walletName}`;
      setErrorMessage(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[28px] border border-[#232332] bg-[#12121a] shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative border-b border-[#21212e] bg-gradient-to-r from-[#151622] via-[#12121a] to-[#171924] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#227c9d] text-white shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-fun text-lg font-black text-white">Connect Wallet</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#8c8c9e]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Robinhood Chain Testnet (46630)</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#2e2e40] bg-[#1a1a26] text-white transition hover:bg-[#252538] hover:border-white/40 active:scale-95 shadow-sm shrink-0 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Prompt reason callout banner */}
          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-2 text-xs text-[#FF8A33]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#FF6B00]" />
            <span>
              Connect your wallet to proceed with <strong>{pendingActionTitle}</strong> on Robinhood Chain.
            </span>
          </div>
        </div>

        {/* Modal Body: Wallet Selection List */}
        <div className="p-6 space-y-3">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-bold">Connection Issue</p>
                <p className="text-[11px] text-rose-300/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Option 1: MetaMask */}
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => handleConnect('MetaMask')}
            className="group flex w-full items-center justify-between rounded-2xl border border-[#232332] bg-[#161622] p-3.5 transition-all hover:border-[#FF6B00] hover:bg-[#1b1c2b] active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2761b]/15 text-[#e2761b] font-bold text-lg">
                🦊
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 font-fun text-sm font-bold text-white group-hover:text-[#FF8A33]">
                  <span>MetaMask</span>
                  {hasInjected && (
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                      Detected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7a7a8c]">Standard browser extension & mobile</p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-[#7a7a8c] transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>

          {/* Option 2: Rabby Wallet */}
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => handleConnect('Rabby Wallet')}
            className="group flex w-full items-center justify-between rounded-2xl border border-[#232332] bg-[#161622] p-3.5 transition-all hover:border-[#FF6B00] hover:bg-[#1b1c2b] active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 font-bold text-lg">
                🐰
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 font-fun text-sm font-bold text-white group-hover:text-[#FF8A33]">
                  <span>Rabby Wallet</span>
                  <span className="rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 px-2 py-0.5 font-mono text-[9px] font-bold text-[#FF8A33]">
                    Popular
                  </span>
                </div>
                <p className="text-[11px] text-[#7a7a8c]">Optimized multi-chain security</p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-[#7a7a8c] transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>

          {/* Option 3: Coinbase Wallet */}
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => handleConnect('Coinbase Wallet')}
            className="group flex w-full items-center justify-between rounded-2xl border border-[#232332] bg-[#161622] p-3.5 transition-all hover:border-[#FF6B00] hover:bg-[#1b1c2b] active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 font-bold text-lg">
                🔵
              </div>
              <div className="text-left">
                <div className="font-fun text-sm font-bold text-white group-hover:text-[#FF8A33]">
                  Coinbase Wallet
                </div>
                <p className="text-[11px] text-[#7a7a8c]">Smart wallet or mobile scan</p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-[#7a7a8c] transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>

          {/* Option 4: Browser Injected / Other */}
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => handleConnect('Browser Wallet')}
            className="group flex w-full items-center justify-between rounded-2xl border border-[#232332] bg-[#161622] p-3.5 transition-all hover:border-[#FF6B00] hover:bg-[#1b1c2b] active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-lg">
                ⚡
              </div>
              <div className="text-left">
                <div className="font-fun text-sm font-bold text-white group-hover:text-[#FF8A33]">
                  Injected EVM Provider
                </div>
                <p className="text-[11px] text-[#7a7a8c]">Brave, OKX, Rainbow, or any web3 wallet</p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-[#7a7a8c] transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>

          {/* Option 5: Instant Testnet Demo Session (Ideal for Mobile / Quick testing) */}
          {onConnectSimulatedWallet && (
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => {
                onConnectSimulatedWallet();
                onClose();
              }}
              className="group flex w-full items-center justify-between rounded-2xl border border-[#227c9d]/40 bg-[#14232c]/50 p-3.5 transition-all hover:border-[#227c9d] hover:bg-[#182b36] active:scale-[0.99] disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#227c9d]/20 text-[#53b3d4] font-bold text-lg">
                  🏹
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 font-fun text-sm font-bold text-white group-hover:text-[#53b3d4]">
                    <span>Robinhood Testnet Demo Session</span>
                    <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/40 px-2 py-0.5 font-mono text-[9px] font-bold text-[#53b3d4]">
                      Instant
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7a7a8c]">Explore all features with 1.500 test ETH</p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-[#53b3d4] transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* Footer Notes */}
        <div className="border-t border-[#21212e] bg-[#0c0c11] px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#8c8c9e]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Robinhood Chain Testnet • Chain ID: {ROBINHOOD_CHAIN_ID}</span>
          </div>
          <div className="mt-1">
            <a
              href={ROBINHOOD_EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#227c9d] hover:underline"
            >
              <span>View Testnet Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

