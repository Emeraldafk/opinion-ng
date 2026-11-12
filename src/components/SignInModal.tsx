import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAppAuth } from '../hooks/useAppAuth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingActionTitle?: string;
}

type AuthTab = 'email' | 'phone' | 'x';

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  pendingActionTitle = 'Trade & Predict Opinions',
}) => {
  const { loginWithEmail, loginWithPhone, loginWithX, loginDemoUser } = useAppAuth();
  const [tab, setTab] = useState<AuthTab>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tab === 'email' && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (tab === 'phone' && phone.trim().length < 10) {
      setError('Please enter a valid Nigerian phone number');
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'email') {
        await loginWithEmail(email, otp);
      } else if (tab === 'phone') {
        await loginWithPhone(phone, otp);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleXLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const handle = xHandle.trim() || 'opinion_ng';
      await loginWithX(handle);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'X authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-md rounded-[28px] border border-[#232332] bg-[#12121a] shadow-2xl my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative border-b border-[#21212e] bg-gradient-to-r from-[#171526] via-[#12121a] to-[#151728] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-300 shadow-md">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Sign In to OpinionNG</h3>
                <p className="text-xs text-zinc-400">Nigeria's NGN Opinion & Prediction Market</p>
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

        {/* Action Prompt */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 flex items-center gap-2.5 text-xs text-purple-300">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Sign in required for <strong>{pendingActionTitle}</strong> with your NGN balance.</span>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#181824] rounded-2xl border border-[#232334]">
            <button
              type="button"
              onClick={() => { setTab('email'); setOtpSent(false); setError(null); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'email'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => { setTab('phone'); setOtpSent(false); setError(null); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'phone'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setTab('x'); setOtpSent(false); setError(null); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'x'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="font-bold">𝕏</span>
              Twitter
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
              {error}
            </div>
          )}

          {tab === 'email' && (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. tunde@gmail.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-sm focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  Send One-Time Code
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Enter 6-Digit Code</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-purple-400 hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-center tracking-widest text-lg font-mono focus:outline-none focus:border-purple-500 placeholder-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Code sent to {email} (use 123456 for demo)</p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
            )
          )}

          {tab === 'phone' && (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nigerian Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-3 rounded-xl bg-[#181824] border border-[#272738] text-zinc-400 text-sm font-mono flex items-center">
                      🇳🇬 +234
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="801 234 5678"
                      required
                      className="flex-1 px-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-sm focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  Send SMS Code (Termii)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Enter SMS Code</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-purple-400 hover:underline"
                    >
                      Change number
                    </button>
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-center tracking-widest text-lg font-mono focus:outline-none focus:border-purple-500 placeholder-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">SMS sent to +234 {phone} (use 123456 for demo)</p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
            )
          )}

          {tab === 'x' && (
            <form onSubmit={handleXLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Twitter / X Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-zinc-500 text-sm">@</span>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    required
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#181824] border border-[#272738] text-white text-sm focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Links your X account to automatically credit 1.5% creator fees for your viral market topics.
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-700 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <span className="font-bold text-base">𝕏</span>
                {isLoading ? 'Connecting...' : 'Authorize with 𝕏'}
              </button>
            </form>
          )}

          {/* Quick Demo Login Option */}
          <div className="mt-5 pt-4 border-t border-[#1e1e2d] text-center">
            <button
              type="button"
              onClick={loginDemoUser}
              className="w-full py-2.5 rounded-xl bg-[#1a1a28] hover:bg-[#232338] border border-[#2c2c42] text-xs font-medium text-zinc-300 hover:text-white transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Quick Demo Access (Preloaded with ₦10,000 NGN)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
