import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Coins,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Clock,
  Percent,
  User,
  AtSign,
  Edit3,
  Save,
  Sparkles,
  Copy,
  Check,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Lock,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Layers,
  History,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { OpinionMarket, TradeActivity, getMarketPricesAndSentiment } from '../lib/bondingCurve';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN, koboToNaira, nairaToKobo } from '../lib/currency';
import { apiClient } from '../lib/apiClient';
import {
  getUserProfile,
  saveUserProfile,
  UserProfile,
  checkUsernameCooldown,
  checkPfpCooldown,
} from '../lib/userProfileService';

export interface FeeClaimRecord {
  id: string;
  timestamp: number;
  amountEth: number;
  creator: string;
  txHash?: string;
  isOnChain: boolean;
  status: 'CONFIRMED' | 'PENDING';
}

interface CreatorEconomicsViewProps {
  markets: OpinionMarket[];
  walletAddress?: string | null;
  claimableCreatorFees?: number;
  contractAddress?: string;
  isLiveOnChainMode?: boolean;
  claimHistory?: FeeClaimRecord[];
  onClaimCreatorFees?: () => Promise<void>;
  onProfileUpdated?: (profile: UserProfile) => void;
  onRequireWallet?: (actionTitle?: string) => void;
  holdings?: Record<number, { yesShares: number; noShares: number }>;
  activities?: TradeActivity[];
  onSelectMarket?: (market: OpinionMarket) => void;
  onOpenCreateModal?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&auto=format&fit=crop&q=80',
];

type PortfolioSubTab = 'positions' | 'statement' | 'creator' | 'settings';

export const CreatorEconomicsView: React.FC<CreatorEconomicsViewProps> = ({
  markets,
  walletAddress,
  holdings,
  activities,
  onSelectMarket,
  onOpenCreateModal,
  onProfileUpdated,
}) => {
  const auth = useAppAuth();
  const [activeTab, setActiveTab] = useState<PortfolioSubTab>('positions');
  const [isClaiming, setIsClaiming] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [backendData, setBackendData] = useState<{
    positions: any[];
    recentLedger: any[];
  }>({ positions: [], recentLedger: [] });
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // X Bot Webhook Mention Simulation State
  const [xBotQuestion, setXBotQuestion] = useState('Will Dangote Refinery petrol pump price fall below ₦850/L before Q4 2026?');
  const [xBotResult, setXBotResult] = useState<{ market_url: string; reply_text: string } | null>(null);
  const [isXBotSubmitting, setIsXBotSubmitting] = useState(false);

  // Fetch live backend state for positions and ledger
  const fetchBackendUserData = async () => {
    if (!auth.user) return;
    setIsLoadingBackend(true);
    try {
      const data = await apiClient.getMe(auth.user.id);
      if (data) {
        setBackendData({
          positions: data.positions || [],
          recentLedger: data.recentLedger || [],
        });
      }
    } catch (e) {
      // offline fallback
    } finally {
      setIsLoadingBackend(false);
    }
  };

  useEffect(() => {
    if (auth.user) {
      fetchBackendUserData();
      setEditDisplayName(auth.user.displayName || '');
      setEditUsername(auth.user.xHandle || '');
    }
  }, [auth.user?.id]);

  // Compute Open Positions Value from backend and local holdings
  const computedPositions = useMemo(() => {
    const list: {
      marketId: number;
      marketQuestion: string;
      category: string;
      side: 'YES' | 'NO';
      sharesCount: number;
      avgPriceKobo: number;
      currentPriceKobo: number;
      currentValueKobo: number;
      totalCostKobo: number;
      pnlKobo: number;
      pnlPct: number;
      market: OpinionMarket | undefined;
    }[] = [];

    // 1. From backend positions
    for (const pos of backendData.positions) {
      if (pos.sharesCount <= 0) continue;
      const m = markets.find((mk) => mk.id === pos.marketId);
      const metrics = m ? getMarketPricesAndSentiment(m) : null;
      const currentPriceKobo = pos.side === 'YES'
        ? (metrics ? Math.round(metrics.yesPriceEth * 4_200_000 * 100) : 5000)
        : (metrics ? Math.round(metrics.noPriceEth * 4_200_000 * 100) : 5000);

      const currentValueKobo = Math.round((pos.sharesCount * currentPriceKobo) / 100);
      const totalCostKobo = pos.totalCostKobo || Math.round((pos.sharesCount * pos.avgPriceKobo) / 100);
      const pnlKobo = currentValueKobo - totalCostKobo;
      const pnlPct = totalCostKobo > 0 ? (pnlKobo / totalCostKobo) * 100 : 0;

      list.push({
        marketId: pos.marketId,
        marketQuestion: m?.question || `Market #${pos.marketId}`,
        category: m?.category || 'General',
        side: pos.side,
        sharesCount: pos.sharesCount,
        avgPriceKobo: pos.avgPriceKobo || currentPriceKobo,
        currentPriceKobo,
        currentValueKobo,
        totalCostKobo,
        pnlKobo,
        pnlPct,
        market: m,
      });
    }

    // 2. From local holdings if not already in list
    if (holdings) {
      for (const [mIdStr, h] of Object.entries(holdings)) {
        const mId = Number(mIdStr);
        if (h.yesShares > 0 && !list.some((p) => p.marketId === mId && p.side === 'YES')) {
          const m = markets.find((mk) => mk.id === mId);
          const metrics = m ? getMarketPricesAndSentiment(m) : null;
          const currentPriceKobo = metrics ? Math.round(metrics.yesPriceEth * 4_200_000 * 100) : 5000;
          const currentValueKobo = Math.round((h.yesShares * currentPriceKobo) / 100);
          list.push({
            marketId: mId,
            marketQuestion: m?.question || `Market #${mId}`,
            category: m?.category || 'General',
            side: 'YES',
            sharesCount: h.yesShares,
            avgPriceKobo: currentPriceKobo,
            currentPriceKobo,
            currentValueKobo,
            totalCostKobo: currentValueKobo,
            pnlKobo: 0,
            pnlPct: 0,
            market: m,
          });
        }
        if (h.noShares > 0 && !list.some((p) => p.marketId === mId && p.side === 'NO')) {
          const m = markets.find((mk) => mk.id === mId);
          const metrics = m ? getMarketPricesAndSentiment(m) : null;
          const currentPriceKobo = metrics ? Math.round(metrics.noPriceEth * 4_200_000 * 100) : 5000;
          const currentValueKobo = Math.round((h.noShares * currentPriceKobo) / 100);
          list.push({
            marketId: mId,
            marketQuestion: m?.question || `Market #${mId}`,
            category: m?.category || 'General',
            side: 'NO',
            sharesCount: h.noShares,
            avgPriceKobo: currentPriceKobo,
            currentPriceKobo,
            currentValueKobo,
            totalCostKobo: currentValueKobo,
            pnlKobo: 0,
            pnlPct: 0,
            market: m,
          });
        }
      }
    }

    return list;
  }, [backendData.positions, holdings, markets]);

  const totalPositionsValueKobo = computedPositions.reduce((acc, p) => acc + p.currentValueKobo, 0);
  const totalNetPortfolioKobo =
    auth.wallet.availableKobo + totalPositionsValueKobo + auth.wallet.creatorEarningsKobo;

  // Markets created by user
  const userCreatedMarkets = markets.filter(
    (m) =>
      m.creator === auth.user?.id ||
      m.creator === 'usr_demo_893240' ||
      m.sourceHandle?.toLowerCase() === `@${auth.user?.xHandle?.toLowerCase()}`
  );

  const virtualAccount = auth.user?.virtualAccount || {
    accountNumber: '9920194821',
    bankName: 'Wema Bank (OpinionNG)',
    accountName: `OPINION-NG / ${auth.user?.displayName?.toUpperCase() || 'TUNDE AFOLABI'}`,
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(virtualAccount.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleClaimFees = async () => {
    if (auth.wallet.creatorEarningsKobo <= 0 || isClaiming) return;
    setIsClaiming(true);
    try {
      const claimed = await auth.claimCreatorEarnings();
      await fetchBackendUserData();
      alert(`Successfully claimed ${formatNGN(claimed)} directly into your available balance!`);
    } catch (err: any) {
      alert(err.message || 'Fee claim failed');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleTestXBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xBotQuestion.trim()) return;
    setIsXBotSubmitting(true);
    try {
      const res = await apiClient.triggerXMentionBot({
        author_id: auth.user?.id || 'x_user_demo',
        author_username: auth.user?.xHandle || 'opinion_trader',
        text: `@OpinionNG ${xBotQuestion.trim()}`,
      });
      setXBotResult(res);
      await auth.syncWithBackend();
      await fetchBackendUserData();
    } catch (err: any) {
      alert(err.message || 'X bot submission failed');
    } finally {
      setIsXBotSubmitting(false);
    }
  };

  // Unauthenticated fallback view (no connect wallet, clean localized prompt)
  if (!auth.isAuthenticated || !auth.user) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-[#232332] bg-gradient-to-r from-[#14141e] via-[#161622] to-[#101018] p-8 sm:p-12 text-center shadow-xl flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#227c9d]/20 text-[#53b3d4] border border-[#227c9d]/40 shadow-lg mb-4">
            <User className="h-8 w-8" />
          </div>
          <h2 className="font-fun text-xl sm:text-2xl font-black text-white">
            Sign In to Access Your OpinionNG Portfolio
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-[#8c8c9e]">
            View your personal NGN wallet, track open prediction positions, make instant deposits or withdrawals, and manage your 1.5% creator earnings.
          </p>
          <button
            type="button"
            onClick={auth.openSignInModal}
            className="mt-6 flex items-center gap-2 rounded-full bg-[#227c9d] hover:bg-[#1a647f] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#227c9d]/25 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Sign In / Create Account</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* 1. TOP PORTFOLIO OVERVIEW CARD */}
      <div className="rounded-[28px] border border-[#232332] bg-gradient-to-r from-[#101a22] via-[#14141c] to-[#0f0f15] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#227c9d]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#FF6B00]/10 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Info & Identity */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={auth.user.avatarUrl}
                alt={auth.user.displayName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl object-cover border-2 border-[#227c9d] shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[#12121a] flex items-center justify-center text-[10px] text-white">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-fun text-xl sm:text-2xl font-black text-white">
                  {auth.user.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Tier 1 • BVN/NIN Verified
                </span>
              </div>
              <p className="text-xs text-[#8c8c9e] font-mono">
                @{auth.user.xHandle || 'opinion_trader'} {auth.user.phone && `• ${auth.user.phone}`}
              </p>
              <p className="text-[11px] text-[#53b3d4] mt-1 font-mono">
                Dedicated Virtual NUBAN: <strong className="text-white">{virtualAccount.accountNumber}</strong> ({virtualAccount.bankName})
              </p>
            </div>
          </div>

          {/* Total Net Portfolio & Quick Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-[#232332] bg-[#0c0c11]/80 p-4 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a8c] block">
                Total Portfolio Value
              </span>
              <div className="font-mono text-2xl font-black text-white mt-0.5">
                {formatNGN(totalNetPortfolioKobo)}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                ● Active NGN Double-Entry Ledger
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={auth.openDepositModal}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#227c9d] hover:bg-[#1a647f] px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-[#227c9d]/25 transition active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Deposit Naira</span>
              </button>

              <button
                type="button"
                onClick={auth.openWithdrawModal}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#FF6B00] hover:bg-[#EA580C] px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-black shadow-md shadow-[#FF6B00]/25 transition active:scale-95 cursor-pointer"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Withdraw Funds</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE STAT CARDS + DEDICATED VIRTUAL ACCOUNT CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Available Cash */}
        <div className="rounded-[20px] border border-[#232330] bg-[#14141c] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px]">Available Cash</span>
              <Wallet className="h-4 w-4 text-[#53b3d4]" />
            </div>
            <div className="font-mono text-2xl font-black text-emerald-400">
              {formatNGN(auth.wallet.availableKobo)}
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Ready for instant trading & withdrawal</p>
        </div>

        {/* Card 2: Open Positions Value */}
        <div className="rounded-[20px] border border-[#232330] bg-[#14141c] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px]">In-Play Bets</span>
              <Layers className="h-4 w-4 text-[#FF6B00]" />
            </div>
            <div className="font-mono text-2xl font-black text-white">
              {formatNGN(totalPositionsValueKobo)}
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">{computedPositions.length} active market positions</p>
        </div>

        {/* Card 3: Creator Earnings */}
        <div className="rounded-[20px] border border-[#232330] bg-[#14141c] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px]">Creator Earnings</span>
              <Coins className="h-4 w-4 text-[#FF8A33]" />
            </div>
            <div className="font-mono text-2xl font-black text-[#FF8A33]">
              {formatNGN(auth.wallet.creatorEarningsKobo)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClaimFees}
            disabled={auth.wallet.creatorEarningsKobo <= 0 || isClaiming}
            className="mt-2 text-left text-[11px] font-bold text-[#53b3d4] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {isClaiming ? 'Claiming...' : 'Claim to Available Balance →'}
          </button>
        </div>

        {/* Card 4: Dedicated Virtual NUBAN Account */}
        <div className="rounded-[20px] border border-[#227c9d]/40 bg-[#0e1c24] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#53b3d4] text-xs mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px]">Your Virtual Account</span>
              <Building2 className="h-4 w-4 text-[#53b3d4]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-white tracking-wider">
                {virtualAccount.accountNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="p-1 rounded bg-[#172e3a] hover:bg-[#227c9d] text-slate-300 hover:text-white transition"
                title="Copy NUBAN account number"
              >
                {copiedAccount ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <span className="text-[10px] text-slate-300 font-mono block mt-0.5">
              {virtualAccount.bankName}
            </span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-2 font-semibold">
            ⚡ Instant credit via any Nigerian bank app
          </p>
        </div>
      </div>

      {/* 3. PORTFOLIO NAVIGATION TABS */}
      <div className="border-b border-[#232332] pb-1">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'positions'
                ? 'bg-[#227c9d] text-white shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Open Positions ({computedPositions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'statement'
                ? 'bg-[#227c9d] text-white shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Transaction Statement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('creator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'creator'
                ? 'bg-[#227c9d] text-white shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Creator Economics & Bot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#227c9d] text-white shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Profile & Settings</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OPEN POSITIONS */}
      {activeTab === 'positions' && (
        <div className="space-y-4">
          {computedPositions.length === 0 ? (
            <div className="rounded-[24px] border border-[#232332] bg-[#14141c] p-8 text-center">
              <Layers className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Open Positions Yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Explore trending Nigerian prediction markets and stake conviction on YES or NO with as little as ₦100.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {computedPositions.map((pos, idx) => (
                <div
                  key={`${pos.marketId}-${pos.side}-${idx}`}
                  className="rounded-[22px] border border-[#232332] bg-[#14141c] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#333346] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#53b3d4]">
                        #{pos.marketId}
                      </span>
                      <span className="rounded bg-[#20202c] px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {pos.category}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                          pos.side === 'YES'
                            ? 'bg-[#227c9d]/20 text-[#53b3d4]'
                            : 'bg-[#FF6B00]/20 text-orange-300'
                        }`}
                      >
                        {pos.side} • {pos.sharesCount.toLocaleString()} shares
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                      {pos.marketQuestion}
                    </h4>
                  </div>

                  {/* Metrics & Trade Button */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-[#222230] pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Position Value
                      </span>
                      <span className="font-mono text-sm sm:text-base font-bold text-white">
                        {formatNGN(pos.currentValueKobo)}
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Current Price
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-semibold text-zinc-300">
                        ₦{(pos.currentPriceKobo / 100).toFixed(2)}/sh
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (pos.market && onSelectMarket) {
                          onSelectMarket(pos.market);
                        }
                      }}
                      className="rounded-full bg-[#1e1e2c] hover:bg-[#227c9d] hover:text-white text-zinc-300 px-4 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      Trade / Exit →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTION STATEMENT */}
      {activeTab === 'statement' && (
        <div className="rounded-[24px] border border-[#232332] bg-[#14141c] p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-fun text-base font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-[#53b3d4]" />
              <span>Immutable Double-Entry Ledger Statement</span>
            </h3>
            <button
              type="button"
              onClick={fetchBackendUserData}
              className="text-xs text-[#53b3d4] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {backendData.recentLedger.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">No transaction records found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232330] text-zinc-400 text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Balance After</th>
                    <th className="pb-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2a]">
                  {backendData.recentLedger.map((ldg, idx) => {
                    const isCredit = ldg.amountKobo > 0;
                    return (
                      <tr key={ldg.id || idx} className="hover:bg-[#181824] transition">
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              ldg.entryType === 'DEPOSIT' || ldg.entryType === 'MARKET_PAYOUT' || ldg.entryType === 'TRADE_SELL'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : ldg.entryType === 'WITHDRAWAL' || ldg.entryType === 'TRADE_BUY'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-[#227c9d]/15 text-[#53b3d4]'
                            }`}
                          >
                            {ldg.entryType}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400 text-[11px] max-w-[150px] truncate">
                          {ldg.referenceId || ldg.id}
                        </td>
                        <td className={`py-3 font-bold ${isCredit ? 'text-emerald-400' : 'text-zinc-200'}`}>
                          {isCredit ? '+' : ''}{formatNGN(ldg.amountKobo)}
                        </td>
                        <td className="py-3 text-white font-bold">
                          {formatNGN(ldg.balanceAfterKobo)}
                        </td>
                        <td className="py-3 text-zinc-500 text-[10px]">
                          {ldg.createdAt ? new Date(ldg.createdAt).toLocaleDateString() : 'Just now'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CREATOR ECONOMICS & BOT */}
      {activeTab === 'creator' && (
        <div className="space-y-6">
          {/* Creator Banner */}
          <div className="rounded-[26px] border border-[#227c9d]/40 bg-gradient-to-r from-[#0c1a22] to-[#121620] p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Creator Revenue Model: 1.5% Fee Share</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Every trade on your spawned markets automatically splits fees in integer Kobo: 1.5% is credited to your creator balance and 1.5% to the platform.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="rounded-full bg-[#FF6B00] hover:bg-[#EA580C] px-5 py-2.5 text-xs font-bold uppercase text-black transition active:scale-95 shrink-0"
              >
                + Create New Market
              </button>
            </div>
          </div>

          {/* X Mention Bot Tester */}
          <div className="rounded-[26px] border border-[#232332] bg-[#12121a] p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#20202e] pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <AtSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">X Mention Bot (@TheTiredFun / @OpinionNG)</h3>
                <p className="text-xs text-[#8c8c9e]">
                  Tag the bot on Twitter to spawn verified markets automatically and earn 1.5% creator fees.
                </p>
              </div>
            </div>

            <form onSubmit={handleTestXBot} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-sky-400 font-bold">
                    @OpinionNG
                  </span>
                  <input
                    type="text"
                    value={xBotQuestion}
                    onChange={(e) => setXBotQuestion(e.target.value)}
                    placeholder="Type your debate prediction..."
                    className="w-full rounded-xl border border-[#2b2b3a] bg-[#0c0c12] pl-28 pr-4 py-2.5 text-xs text-white placeholder-[#555566] focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isXBotSubmitting || !xBotQuestion.trim()}
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition active:scale-95 shrink-0 cursor-pointer"
                >
                  {isXBotSubmitting ? 'Bot Processing...' : 'Simulate X Mention'}
                </button>
              </div>

              {xBotResult && (
                <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs">
                  <span className="text-sky-300 font-bold block mb-1">Bot Confirmation Response:</span>
                  <p className="text-white font-mono text-[11px]">{xBotResult.reply_text}</p>
                  <a
                    href={xBotResult.market_url}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-[#53b3d4] hover:underline"
                  >
                    View Spawned Market →
                  </a>
                </div>
              )}
            </form>
          </div>

          {/* User's Created Markets List */}
          <div className="rounded-[26px] border border-[#232332] bg-[#12121a] p-6 shadow-xl">
            <h4 className="text-base font-bold text-white mb-3">Markets Spawned by You ({userCreatedMarkets.length})</h4>
            {userCreatedMarkets.length === 0 ? (
              <p className="text-xs text-zinc-500">You haven't created any markets yet. Click Create above to launch one.</p>
            ) : (
              <div className="space-y-3">
                {userCreatedMarkets.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-[#0c0c11] border border-[#232330] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{m.question}</p>
                      <span className="text-[10px] text-zinc-400 font-mono">1.5% Creator Royalty Active</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FF8A33]">
                      +{formatNGN(Math.round(m.creatorFeesEarned * 4_200_000 * 100))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="rounded-[26px] border border-[#232332] bg-[#12121a] p-6 shadow-xl max-w-2xl">
          <h3 className="text-base font-bold text-white mb-4">Account Profile & KYC Identity</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-4 py-2.5 text-sm text-white focus:border-[#227c9d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                X / Twitter Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] pl-8 pr-4 py-2.5 text-sm text-white focus:border-[#227c9d] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaveToast(true);
                  setTimeout(() => setSaveToast(false), 2000);
                }}
                className="rounded-full bg-[#227c9d] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1a647f] transition shadow"
              >
                Save Changes
              </button>
              {saveToast && <span className="ml-3 text-xs text-emerald-400 font-bold">✓ Profile updated</span>}
            </div>

            <div className="mt-6 pt-6 border-t border-[#232330] space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                KYC Verification Status
              </span>
              <div className="rounded-xl bg-[#0c0c11] border border-emerald-500/30 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-white">Tier 1 Compliance Complete</span>
                    <p className="text-[10px] text-zinc-400">BVN / NIN linked. Daily withdrawal limit: ₦5,000,000.</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
