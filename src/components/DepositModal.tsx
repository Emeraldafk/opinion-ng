import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN, nairaToKobo } from '../lib/currency';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { user, wallet, depositKobo } = useAppAuth();
  const [tab, setTab] = useState<'transfer' | 'card'>('transfer');
  const [customNaira, setCustomNaira] = useState('5000');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const virtualAccount = user?.virtualAccount || {
    accountNumber: '9920194821',
    bankName: 'Wema Bank (OpinionNG)',
    accountName: `OPINION-NG / ${user?.displayName || 'TRADER'}`,
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(virtualAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatedCardDeposit = async (amountNaira: number) => {
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const kobo = nairaToKobo(amountNaira);
      await depositKobo(kobo, `dep_paystack_${Date.now()}`);
      setSuccessMessage(`Successfully funded ${formatNGN(kobo)} to your OpinionNG wallet!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-md rounded-[28px] border border-[#232332] bg-[#12121a] shadow-2xl my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-[#21212e] bg-gradient-to-r from-[#171526] via-[#12121a] to-[#151728] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Deposit Naira (NGN)</h3>
                <p className="text-xs text-zinc-400">Current Balance: <strong className="text-emerald-400">{formatNGN(wallet.availableKobo)}</strong></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1b26] text-zinc-400 hover:text-white hover:bg-[#252536] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#181824] rounded-2xl border border-[#232334]">
            <button
              type="button"
              onClick={() => { setTab('transfer'); setSuccessMessage(null); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'transfer'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Bank Transfer (Instant)
            </button>
            <button
              type="button"
              onClick={() => { setTab('card'); setSuccessMessage(null); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'card'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card / Paystack
            </button>
          </div>
        </div>

        <div className="p-6 pt-4">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {tab === 'transfer' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#171724] border border-[#28283a] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Bank Name</span>
                  <span className="font-semibold text-white">{virtualAccount.bankName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Account Name</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">{virtualAccount.accountName}</span>
                </div>
                <div className="pt-2 border-t border-[#232334] flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Dedicated Virtual Account</span>
                    <span className="text-lg font-mono font-bold text-emerald-400 tracking-wider">
                      {virtualAccount.accountNumber}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAccount}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-2.5 text-xs text-blue-300">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Transfers from any Nigerian banking app (GTBank, Access, Kuda, OPay, etc.) credit your OpinionNG wallet in seconds.
                </span>
              </div>

              {/* Instant Simulated Transfer for Testing */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider block mb-2">
                  Test Deposit (One-Click Simulation)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 5000, 10000, 50000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleSimulatedCardDeposit(amt)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-[#1b1b28] hover:bg-[#252538] border border-[#2b2b3d] text-xs font-semibold text-zinc-300 hover:text-white transition"
                    >
                      +₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Amount in Naira (₦)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-zinc-400 font-semibold">₦</span>
                  <input
                    type="number"
                    value={customNaira}
                    onChange={(e) => setCustomNaira(e.target.value)}
                    placeholder="5,000"
                    min="100"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-base font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {['1000', '2500', '5000', '20000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCustomNaira(val)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                      customNaira === val
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                        : 'bg-[#181824] border-[#252536] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    ₦{Number(val).toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSimulatedCardDeposit(Number(customNaira) || 1000)}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                {isProcessing ? 'Processing via Paystack...' : `Pay ₦${(Number(customNaira) || 0).toLocaleString()} with Paystack`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

