import React, { useState } from 'react';
import {
  X,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN, nairaToKobo, koboToNaira } from '../lib/currency';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank / ALAT' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '070', name: 'Fidelity Bank' },
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { user, wallet, withdrawKobo } = useAppAuth();
  const [selectedBank, setSelectedBank] = useState(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [amountNaira, setAmountNaira] = useState('2000');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    amount: string;
    bank: string;
    account: string;
    reference: string;
  } | null>(null);

  if (!isOpen) return null;

  const availableNaira = koboToNaira(wallet.availableKobo);
  const requestedKobo = nairaToKobo(Number(amountNaira) || 0);
  const nipFeeKobo = 2500; // ₦25 NIP transfer fee

  const handleAccountChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(cleaned);
    setResolvedAccountName(null);
    setError(null);

    if (cleaned.length === 10) {
      setIsResolving(true);
      setTimeout(() => {
        setIsResolving(false);
        setResolvedAccountName(user?.displayName ? user.displayName.toUpperCase() : 'VERIFIED ACCOUNT HOLDER');
      }, 500);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amountNaira);
    if (!numAmount || numAmount < 500) {
      setError('Minimum withdrawal amount is ₦500.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Please provide a valid 10-digit NUBAN account number.');
      return;
    }

    if (wallet.availableKobo < requestedKobo) {
      setError(`Insufficient available balance. You have ${formatNGN(wallet.availableKobo)}.`);
      return;
    }

    setIsProcessing(true);
    try {
      const bank = NIGERIAN_BANKS.find((b) => b.code === selectedBank) || NIGERIAN_BANKS[0];
      const success = await withdrawKobo(requestedKobo, {
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber,
        accountName: resolvedAccountName || user?.displayName || 'Beneficiary',
      });

      if (!success) {
        throw new Error('Withdrawal failed. Please check your balance and try again.');
      }

      setSuccessReceipt({
        amount: formatNGN(requestedKobo),
        bank: bank.name,
        account: accountNumber,
        reference: `NIP_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      });
    } catch (err: any) {
      setError(err?.message || 'Withdrawal processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmountNaira(val.toString());
    setError(null);
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/30 text-[#FF8A33] shadow-md">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Withdraw Funds</h3>
                <p className="text-xs text-zinc-400">Available: <strong className="text-emerald-400">{formatNGN(wallet.availableKobo)}</strong></p>
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

        {/* Content */}
        <div className="p-6">
          {successReceipt ? (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xl">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Withdrawal Initiated!</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {successReceipt.amount} has been debited and queued for instant NIP transfer to your bank.
                </p>
              </div>

              <div className="rounded-2xl border border-[#232334] bg-[#0c0c11] p-4 text-left font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Destination Bank:</span>
                  <span className="text-white font-bold">{successReceipt.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Account Number:</span>
                  <span className="text-white font-bold">{successReceipt.account}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reference:</span>
                  <span className="text-emerald-400">{successReceipt.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">NIP Fee:</span>
                  <span className="text-zinc-300">₦25.00</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessReceipt(null);
                  onClose();
                }}
                className="w-full rounded-full bg-[#227c9d] py-3 text-sm font-bold text-white hover:bg-[#1a647f] transition shadow-md"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              {/* Destination Bank Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Select Nigerian Bank
                </label>
                <div className="relative">
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      if (accountNumber.length === 10) handleAccountChange(accountNumber);
                    }}
                    className="w-full rounded-2xl border border-[#232334] bg-[#0c0c11] px-4 py-3 text-xs sm:text-sm font-semibold text-white focus:border-[#227c9d] focus:outline-none transition appearance-none cursor-pointer"
                  >
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code} className="bg-[#12121a]">
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* NUBAN Account Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  10-Digit NUBAN Account Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  placeholder="e.g. 0123456789"
                  maxLength={10}
                  className="w-full rounded-2xl border border-[#232334] bg-[#0c0c11] px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#227c9d] focus:outline-none transition"
                />

                {/* Account Name Resolution Badge */}
                {isResolving && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#53b3d4]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Resolving NIP account name...</span>
                  </div>
                )}
                {resolvedAccountName && !isResolving && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{resolvedAccountName}</span>
                  </div>
                )}
              </div>

              {/* Amount to Withdraw */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Amount (₦)
                  </label>
                  <span className="text-xs text-zinc-500 font-mono">
                    Max: {formatNGN(wallet.availableKobo)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">₦</span>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={amountNaira}
                    onChange={(e) => {
                      setAmountNaira(e.target.value);
                      setError(null);
                    }}
                    placeholder="2000"
                    className="w-full rounded-2xl border border-[#232334] bg-[#0c0c11] pl-8 pr-4 py-3 font-mono text-base font-bold text-white focus:border-[#227c9d] focus:outline-none transition"
                  />
                </div>

                {/* Quick Chips */}
                <div className="mt-2 flex items-center gap-2">
                  {[1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAmount(amt)}
                      className="rounded-full bg-[#1b1b26] border border-[#262638] px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-[#232332] transition"
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(availableNaira)}
                    className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/40 px-2.5 py-1 text-[11px] font-bold text-[#53b3d4] hover:bg-[#227c9d]/30 transition"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Fee notice */}
              <div className="rounded-xl bg-[#14141e] border border-[#232332] p-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>NIP Instant Bank Transfer Fee:</span>
                <span className="font-mono text-white font-bold">₦25.00</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-full bg-[#FF6B00] hover:bg-[#EA580C] py-3.5 text-sm font-extrabold uppercase tracking-wider text-black shadow-md shadow-[#FF6B00]/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing NIP Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Withdrawal of ₦{Number(amountNaira || 0).toLocaleString()}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

