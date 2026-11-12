import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  Loader2,
  Flame,
  TrendingUp,
  Coins,
  Zap,
} from 'lucide-react';
import { useAppAuth } from '../hooks/useAppAuth';
import { PRESET_ACCOUNTS } from '../context/AuthContext';
import { formatNGN } from '../lib/currency';

type AuthMode = 'signin' | 'signup';
type AuthTab = 'email' | 'phone' | 'x';

export const AuthLandingPage: React.FC = () => {
  const { loginWithEmail, loginWithPhone, loginWithX, signUp, switchUserAccount, loginDemoUser } = useAppAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [tab, setTab] = useState<AuthTab>('email');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Sign up fields
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpContact, setSignUpContact] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpXHandle, setSignUpXHandle] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setOtp('8942'); // simulated instant OTP code
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === 'email') {
        if (!email.trim()) throw new Error('Email address is required');
        await loginWithEmail(email, otp);
      } else if (tab === 'phone') {
        if (!phone.trim()) throw new Error('Phone number is required');
        await loginWithPhone(phone, otp);
      } else if (tab === 'x') {
        if (!xHandle.trim()) throw new Error('X / Twitter username is required');
        await loginWithX(xHandle);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signUpFullName.trim()) {
      setError('Full legal name is required for KYC Level 1');
      return;
    }
    if (!signUpContact.trim()) {
      setError('Email or phone number is required');
      return;
    }
    if (signUpPin.length < 4) {
      setError('Please enter a 4-digit transaction security PIN');
      return;
    }

    setIsLoading(true);
    try {
      await signUp({
        fullName: signUpFullName,
        emailOrPhone: signUpContact,
        password: signUpPin,
        xHandle: signUpXHandle.trim() || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-[#f1f1f4] flex flex-col justify-between selection:bg-[#227c9d] selection:text-white relative overflow-hidden">
      {/* Background Ambience Glows */}
      <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#227c9d]/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-[#FF6B00]/10 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#53b3d4]/10 blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-[#1c1c28] bg-[#0c0c12]/80 backdrop-blur-xl px-4 sm:px-8 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#227c9d] to-[#53b3d4] shadow-lg shadow-[#227c9d]/25 ring-2 ring-[#53b3d4]/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-fun text-lg sm:text-xl font-black tracking-tight text-white">
                  Opinion<span className="text-[#53b3d4]">NG</span>
                </span>
                <span className="rounded-full bg-[#227c9d]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#53b3d4] border border-[#227c9d]/30">
                  ₦ NGN Live
                </span>
              </div>
              <p className="text-[11px] text-[#8c8c9e] hidden sm:block">
                Nigeria's Premier Opinion & Prediction Exchange
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8c8c9e]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Wema & Providus Virtual NUBANs Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Brand Message & Pillars */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/10 px-3.5 py-1.5 text-xs font-fun font-bold text-[#53b3d4]">
            <Flame className="h-4 w-4 text-[#FF6B00]" />
            <span>Pure Web2 Naira Ledger • No Wallets or Crypto Needed</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black font-fun tracking-tight text-white leading-tight">
              Trade Real Conviction on Nigerian Culture, Politics & Economy
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
              Take a stance on burning national topics. Buy <span className="text-[#53b3d4] font-bold">YES</span> or <span className="text-[#FF6B00] font-bold">NO</span> shares priced dynamically from <strong className="text-white">₦1 to ₦100</strong>. When your prediction is right, win <strong>₦100 per share</strong> paid straight to your bank account.
            </p>
          </div>

          {/* Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2">
            <div className="rounded-2xl border border-[#232332] bg-[#14141c]/90 p-4 transition hover:border-[#227c9d]/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#227c9d]/20 text-[#53b3d4] mb-3">
                <Coins className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">100% Localized in Naira (₦)</h4>
              <p className="text-xs text-[#8c8c9e] leading-relaxed">
                No Ethereum, seed phrases, or gas fees. Trade in exact Naira and integer Kobo precision.
              </p>
            </div>

            <div className="rounded-2xl border border-[#232332] bg-[#14141c]/90 p-4 transition hover:border-[#227c9d]/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-3">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Instant Bank Virtual Accounts</h4>
              <p className="text-xs text-[#8c8c9e] leading-relaxed">
                Personal Wema Bank NUBAN assigned to your account. Fund 24/7 via instant bank transfer.
              </p>
            </div>

            <div className="rounded-2xl border border-[#232332] bg-[#14141c]/90 p-4 transition hover:border-[#227c9d]/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] mb-3">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Creator Economics (1.5%)</h4>
              <p className="text-xs text-[#8c8c9e] leading-relaxed">
                Spawn viral markets from X or create in-app. Earn 1.5% royalties on every trade executed.
              </p>
            </div>

            <div className="rounded-2xl border border-[#232332] bg-[#14141c]/90 p-4 transition hover:border-[#227c9d]/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 mb-3">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Instant NIP Withdrawals</h4>
              <p className="text-xs text-[#8c8c9e] leading-relaxed">
                Direct payouts to GTBank, Access, Zenith, Kuda, Moniepoint, or OPay in under 60 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login / Sign Up Card */}
        <div className="lg:col-span-5">
          <div className="rounded-[28px] border border-[#232332] bg-[#14141c]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 relative">
            {/* Top Switcher: Sign In vs Create Account */}
            <div className="flex rounded-2xl bg-[#0c0c11] p-1 border border-[#232330] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  mode === 'signin'
                    ? 'bg-[#227c9d] text-white shadow-md'
                    : 'text-[#8c8c9e] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-[#227c9d] text-white shadow-md'
                    : 'text-[#8c8c9e] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* MODE 1: SIGN IN */}
            {mode === 'signin' && (
              <div>
                {/* Method Tabs */}
                <div className="flex border-b border-[#232330] mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('email');
                      setOtpSent(false);
                      setError(null);
                    }}
                    className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      tab === 'email'
                        ? 'border-[#227c9d] text-white'
                        : 'border-transparent text-[#8c8c9e] hover:text-white'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('phone');
                      setOtpSent(false);
                      setError(null);
                    }}
                    className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      tab === 'phone'
                        ? 'border-[#227c9d] text-white'
                        : 'border-transparent text-[#8c8c9e] hover:text-white'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Phone (+234)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('x');
                      setError(null);
                    }}
                    className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 ${
                      tab === 'x'
                        ? 'border-[#227c9d] text-white'
                        : 'border-transparent text-[#8c8c9e] hover:text-white'
                    }`}
                  >
                    <span className="font-black text-xs">𝕏</span>
                    <span>Twitter</span>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  {tab === 'email' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c9e]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g., trader@opinion.ng"
                          className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-3 pl-10 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {tab === 'phone' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nigerian Mobile Number
                      </label>
                      <div className="relative flex">
                        <div className="flex items-center gap-1 rounded-l-2xl border border-r-0 border-[#232330] bg-[#1a1a24] px-3 text-xs font-bold text-white">
                          <span>🇳🇬</span>
                          <span>+234</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="801 234 5678"
                          className="w-full rounded-r-2xl border border-[#232330] bg-[#0c0c11] py-3 px-3.5 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {tab === 'x' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Twitter / X Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8c8c9e]">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          value={xHandle}
                          onChange={(e) => setXHandle(e.target.value.replace(/^@/, ''))}
                          placeholder="username"
                          className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-3 pl-8 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#8c8c9e]">
                        Enables instant market creation and automatic 1.5% royalties from @TheTiredFun bot tags.
                      </p>
                    </div>
                  )}

                  {/* OTP Field (if email or phone) */}
                  {(tab === 'email' || tab === 'phone') && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Verification Code (OTP)
                        </label>
                        {!otpSent ? (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="text-[11px] font-bold text-[#53b3d4] hover:underline cursor-pointer"
                          >
                            Send OTP Code
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Code Auto-Filled
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c9e]" />
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="4-digit OTP"
                          className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-3 pl-10 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-[#227c9d] py-3 text-xs font-extrabold text-white transition hover:bg-[#1a647f] shadow-lg shadow-[#227c9d]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to OpinionNG</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick 1-Click Demo Verified Profiles */}
                <div className="mt-6 pt-5 border-t border-[#232330]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8c8c9e] mb-2.5">
                    Or 1-Click Instant Demo Login:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          switchUserAccount(acc.id);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-[#232330] bg-[#0c0c11] p-2 hover:border-[#227c9d] hover:bg-[#181824] transition text-left cursor-pointer group"
                      >
                        <img
                          src={acc.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-[#227c9d]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-[#53b3d4]">
                            {acc.displayName}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Verified Tier 1
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: CREATE ACCOUNT (SIGN UP) */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Legal Full Name (Matches BVN/NIN)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c9e]" />
                    <input
                      type="text"
                      required
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      placeholder="e.g. Babatunde Adeyemi"
                      className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c9e]" />
                    <input
                      type="text"
                      required
                      value={signUpContact}
                      onChange={(e) => setSignUpContact(e.target.value)}
                      placeholder="adeyemi@gmail.com or 08012345678"
                      className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Twitter / X Handle (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8c8c9e]">
                      @
                    </span>
                    <input
                      type="text"
                      value={signUpXHandle}
                      onChange={(e) => setSignUpXHandle(e.target.value.replace(/^@/, ''))}
                      placeholder="username"
                      className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-2.5 pl-8 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    4-Digit Security PIN (For Withdrawals)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c9e]" />
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={signUpPin}
                      onChange={(e) => setSignUpPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>
                    New accounts automatically receive a <strong>Wema Bank NUBAN</strong> and a <strong>₦5,000 welcome mock credit</strong> to start predicting immediately!
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-[#227c9d] py-3 text-xs font-extrabold text-white transition hover:bg-[#1a647f] shadow-lg shadow-[#227c9d]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Account & Virtual NUBAN...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Open App</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a24] py-4 px-4 sm:px-8 text-center text-xs text-[#7a7a8c] font-mono">
        <p>© 2026 OpinionNG. Built strictly for the Nigerian Market in Naira (₦) • Zero Crypto / Zero Wallet Required.</p>
      </footer>
    </div>
  );
};
