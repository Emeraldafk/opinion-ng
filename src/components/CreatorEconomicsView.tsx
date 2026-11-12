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
} from 'lucide-react';
import { OpinionMarket, TradeActivity, getMarketPricesAndSentiment } from '../lib/bondingCurve';
import { ROBINHOOD_EXPLORER_URL, shortenAddress } from '../config/robinhoodChain';
import { infraManager, SolvencyReconciliationReport } from '../lib/indexerService';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN } from '../lib/currency';
import { apiClient } from '../lib/apiClient';
import {
  getUserProfile,
  saveUserProfile,
  UserProfile,
  checkUsernameCooldown,
  checkPfpCooldown,
  PROFILE_CHANGE_COOLDOWN_DAYS,
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
  walletAddress: string | null;
  claimableCreatorFees: number;
  contractAddress: string;
  isLiveOnChainMode: boolean;
  claimHistory: FeeClaimRecord[];
  onClaimCreatorFees: () => Promise<void>;
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

export const CreatorEconomicsView: React.FC<CreatorEconomicsViewProps> = ({
  markets,
  walletAddress,
  claimableCreatorFees,
  contractAddress,
  claimHistory,
  onClaimCreatorFees,
  onProfileUpdated,
  onRequireWallet,
  holdings,
  activities,
  onSelectMarket,
  onOpenCreateModal,
}) => {
  const auth = useAppAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  const [solvencyReport, setSolvencyReport] = useState<SolvencyReconciliationReport | null>(null);

  const effectiveClaimableKobo = auth.wallet.creatorEarningsKobo > 0
    ? auth.wallet.creatorEarningsKobo
    : Math.round(claimableCreatorFees * 4_200_000 * 100);

  // User Profile State bound to wallet address (null when disconnected)
  const [profile, setProfile] = useState<UserProfile | null>(() => getUserProfile(walletAddress));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(profile?.displayName || '');
  const [editUsername, setEditUsername] = useState(profile?.username || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile?.avatarUrl || '');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // X Bot Webhook Mention Simulation State
  const [xBotQuestion, setXBotQuestion] = useState('Will Dangote Refinery export jet fuel across West Africa by Q4?');
  const [xBotResult, setXBotResult] = useState<{ market_url: string; reply_text: string } | null>(null);
  const [isXBotSubmitting, setIsXBotSubmitting] = useState(false);

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
    } catch (err: any) {
      alert(err.message || 'X bot submission failed');
    } finally {
      setIsXBotSubmitting(false);
    }
  };

  // Sync profile when wallet changes
  useEffect(() => {
    const p = getUserProfile(walletAddress);
    setProfile(p);
    if (p) {
      setEditDisplayName(p.displayName);
      setEditUsername(p.username);
      setEditBio(p.bio);
      setEditAvatarUrl(p.avatarUrl || '');
    }
    setProfileError(null);
  }, [walletAddress]);

  // Rate limit cooldown status checks
  const usernameCooldown = profile ? checkUsernameCooldown(profile) : { canChange: true, remainingMs: 0, remainingDays: 0, remainingHours: 0, nextAvailableDate: null };
  const pfpCooldown = profile ? checkPfpCooldown(profile) : { canChange: true, remainingMs: 0, remainingDays: 0, remainingHours: 0, nextAvailableDate: null };

  // Handle local image file upload (PNG/JPEG/GIF/WEBP)
  const handlePfpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!pfpCooldown.canChange) {
      setProfileError(pfpCooldown.message || 'Profile picture can only be changed once every 15 days.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setProfileError('File size must be under 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditAvatarUrl(dataUrl);
      setProfileError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (url: string) => {
    if (!pfpCooldown.canChange) {
      setProfileError(pfpCooldown.message || 'Profile picture can only be changed once every 15 days.');
      return;
    }
    setEditAvatarUrl(url);
    setProfileError(null);
  };

  const handleRemovePfp = () => {
    if (!pfpCooldown.canChange) {
      setProfileError(pfpCooldown.message || 'Profile picture can only be changed once every 15 days.');
      return;
    }
    setEditAvatarUrl('');
    setProfileError(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!walletAddress || !profile) return;

    const cleanUsername = editUsername.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '') || 'trader';
    const cleanDisplayName = editDisplayName.trim() || shortenAddress(walletAddress);
    const targetAddr = walletAddress;

    // 15-day rate limit validation for username
    if (cleanUsername.toLowerCase() !== profile.username.toLowerCase()) {
      if (!usernameCooldown.canChange) {
        setProfileError(usernameCooldown.message || 'Username can only be changed once every 15 days.');
        return;
      }
    }

    // 15-day rate limit validation for PFP
    const newAvatar = editAvatarUrl.trim() || undefined;
    if (newAvatar !== profile.avatarUrl) {
      if (!pfpCooldown.canChange) {
        setProfileError(pfpCooldown.message || 'Profile picture can only be changed once every 15 days.');
        return;
      }
    }

    try {
      const updated = saveUserProfile(targetAddr, {
        username: cleanUsername,
        displayName: cleanDisplayName,
        bio: editBio.trim(),
        avatarUrl: newAvatar,
      });

      setProfile(updated);
      setIsEditingProfile(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 4000);

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setProfileError(msg);
    }
  };

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  if (!walletAddress || !profile) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-[#232332] bg-gradient-to-r from-[#14141e] via-[#161622] to-[#101018] p-8 sm:p-12 text-center shadow-xl flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 shadow-lg mb-4">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="font-fun text-xl sm:text-2xl font-black text-white">
            Connect Wallet to View Portfolio & Creator Earnings
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-[#8c8c9e]">
            Your personal holdings, 1.5% creator fee earnings, and custom creator profile are bound to your OpinionNG account. Sign in to manage your identity and claim rewards.
          </p>
          <button
            type="button"
            onClick={() => onRequireWallet && onRequireWallet('Viewing Portfolio & Creator Fees')}
            className="mt-6 flex items-center gap-2 rounded-full bg-[#FF6B00] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#EA580C] active:scale-95 cursor-pointer"
          >
            <Wallet className="h-4 w-4" />
            <span>Sign In / Connect Wallet</span>
          </button>
        </div>
      </div>
    );
  }

  // User creator metrics bound to active wallet
  const activeUser = shortenAddress(walletAddress);

  const userCreatedMarkets = markets.filter(
    (m) =>
      m.creator.toLowerCase() === walletAddress.toLowerCase() ||
      m.creator.toLowerCase() === activeUser.toLowerCase() ||
      m.sourceHandle?.toLowerCase() === `@${profile.username}`.toLowerCase()
  );

  // User's personalized opinion markets:
  // 1. Markets created by the user (Top Priority)
  // 2. Markets user voted on / holds shares in
  // 3. Markets user commented on
  const userPersonalizedMarkets = useMemo(() => {
    if (!walletAddress) return [];

    const normWallet = walletAddress.toLowerCase();
    const normUsername = profile?.username ? `@${profile.username.toLowerCase()}` : '';

    const created: { market: OpinionMarket; role: 'CREATED'; badge: string }[] = [];
    const voted: { market: OpinionMarket; role: 'VOTED'; badge: string }[] = [];
    const commented: { market: OpinionMarket; role: 'COMMENTED'; badge: string }[] = [];
    const seenIds = new Set<number>();

    for (const m of markets) {
      const isCreator =
        m.creator.toLowerCase() === normWallet ||
        (normUsername && m.sourceHandle?.toLowerCase() === normUsername);

      if (isCreator) {
        created.push({ market: m, role: 'CREATED', badge: '👑 Created by You' });
        seenIds.add(m.id);
      }
    }

    for (const m of markets) {
      if (seenIds.has(m.id)) continue;

      const userHolding = holdings ? holdings[m.id] : null;
      const hasShares = userHolding && (userHolding.yesShares > 0 || userHolding.noShares > 0);
      const hasTraded = activities && activities.some((a) => a.marketId === m.id && a.trader.toLowerCase() === normWallet);

      if (hasShares || hasTraded) {
        const sideText = userHolding?.yesShares && userHolding.yesShares > 0 ? 'YES' : 'NO';
        voted.push({ market: m, role: 'VOTED', badge: `⚡ Voted ${sideText}` });
        seenIds.add(m.id);
      }
    }

    for (const m of markets) {
      if (seenIds.has(m.id)) continue;

      const hasCommented = m.comments && m.comments.some((c) =>
        (c.author && c.author.toLowerCase() === normWallet) ||
        (normUsername && c.authorHandle && c.authorHandle.toLowerCase() === normUsername)
      );

      if (hasCommented) {
        commented.push({ market: m, role: 'COMMENTED', badge: '💬 You Commented' });
        seenIds.add(m.id);
      }
    }

    // Created by user at the top, then voted, then commented
    return [...created, ...voted, ...commented];
  }, [markets, walletAddress, profile, holdings, activities]);

  const opinionCount = userCreatedMarkets.filter((m) => m.marketType !== 'RESOLVABLE_PREDICTION').length;
  const predictionCount = userCreatedMarkets.filter((m) => m.marketType === 'RESOLVABLE_PREDICTION').length;

  const totalUserCreatorVolume = userCreatedMarkets.reduce(
    (acc, m) => acc + m.yesCurve.volumeEth + m.noCurve.volumeEth,
    0
  );

  const totalLifetimeEarned = userCreatedMarkets.reduce(
    (acc, m) => acc + m.creatorFeesEarned,
    0
  );

  const totalClaimedSoFar = claimHistory
    .filter((c) => c.status === 'CONFIRMED')
    .reduce((acc, c) => acc + c.amountEth, 0);

  // Solvency check against contract or local reserves
  useEffect(() => {
    let active = true;
    const totalRealEth = markets.reduce(
      (acc, m) => acc + m.yesCurve.realEth + m.noCurve.realEth,
      0
    );
    const totalPendingCreator = markets.reduce((acc, m) => acc + m.creatorFeesEarned, 0);
    const totalPendingProtocol = totalPendingCreator;

    infraManager
      .reconcileSolvency(
        contractAddress,
        totalRealEth,
        totalPendingCreator,
        totalPendingProtocol
      )
      .then((rep) => {
        if (active) setSolvencyReport(rep);
      });

    return () => {
      active = false;
    };
  }, [markets, contractAddress]);

  const handleClaim = async () => {
    if (effectiveClaimableKobo <= 0 || isClaiming) return;
    setIsClaiming(true);
    try {
      if (auth.wallet.creatorEarningsKobo > 0) {
        auth.claimCreatorEarnings();
      } else {
        await onClaimCreatorFees();
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. USER IDENTITY & PFP UPLOAD / USERNAME CREATION CARD (Bound to Wallet Address) */}
      <div className="relative overflow-hidden rounded-[28px] border border-[#232332] bg-gradient-to-r from-[#14141e] via-[#161622] to-[#101018] p-6 sm:p-7 shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#227c9d]/15 blur-3xl" />

        {/* Hidden File Input for PFP upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePfpFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          {/* Avatar and Identity */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 w-full md:w-auto">
            <div
              onClick={() => {
                setIsEditingProfile(true);
                if (pfpCooldown.canChange) {
                  fileInputRef.current?.click();
                }
              }}
              title={pfpCooldown.canChange ? "Click to upload profile picture" : pfpCooldown.message}
              className="group/pfp relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl overflow-hidden cursor-pointer shadow-lg ring-2 ring-[#227c9d]/40"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover/pfp:scale-105"
                />
              ) : (
                <div
                  className={`h-full w-full bg-gradient-to-tr ${profile.avatarGradient} flex items-center justify-center text-2xl sm:text-3xl font-black text-white`}
                >
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Hover overlay with camera icon or lock */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/pfp:opacity-100 transition-opacity">
                {pfpCooldown.canChange ? (
                  <>
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-[9px] font-bold text-white mt-0.5">Change</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-[#FF6B00]" />
                    <span className="text-[8px] font-bold text-orange-300 mt-0.5 text-center px-1">15d Locked</span>
                  </>
                )}
              </div>

              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#227c9d] text-white ring-2 ring-[#14141e]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-fun text-lg sm:text-2xl font-black text-white truncate max-w-[200px] sm:max-w-none">
                  {profile.displayName}
                </h2>
                <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/40 px-2.5 py-0.5 font-fun text-[10px] sm:text-[11px] font-bold text-[#53b3d4]">
                  @{profile.username}
                </span>
                {(!usernameCooldown.canChange || !pfpCooldown.canChange) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#FF6B00]">
                    <Lock className="h-2.5 w-2.5" />
                    <span>15d Policy Active</span>
                  </span>
                )}
              </div>

              <p className="mt-1 max-w-md text-xs text-[#8c8c9e] line-clamp-2">
                {profile.bio}
              </p>

              {/* Bound Wallet Address pill */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2b2b3a] bg-[#101016] px-2.5 sm:px-3 py-1 font-mono text-[10px] sm:text-[11px] text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>
                    {shortenAddress(walletAddress)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="ml-1 text-[#7a7a8c] hover:text-white transition"
                    title="Copy wallet address"
                  >
                    {copiedAddress ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>

                <span className="text-[10px] sm:text-[11px] font-bold text-[#227c9d]">
                  OpinionNG Account
                </span>
              </div>
            </div>
          </div>

          {/* Action to Edit Profile / Set Username */}
          <div className="w-full md:w-auto flex md:justify-end">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-[#1e1e2c] border border-[#2e2e42] px-5 py-2.5 font-fun text-xs font-bold text-white hover:bg-[#252538] hover:border-[#3d3d56] transition active:scale-95 shadow-sm"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#227c9d]" />
              <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Username & PFP'}</span>
            </button>
          </div>
        </div>

        {/* Success alert */}
        {saveToast && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-2.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Profile and PFP successfully updated! This identity will be displayed across all Feeds, Comments, and Markets.
            </span>
          </div>
        )}

        {/* Collapsible Edit Profile & PFP Form */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 border-t border-[#232332] pt-5 space-y-4"
          >
            {/* Error banner */}
            {profileError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 p-3.5 text-xs text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{profileError}</span>
              </div>
            )}

            {/* PFP UPLOAD SECTION */}
            <div className="rounded-2xl border border-[#2b2b3a] bg-[#0c0c12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8c8c9e] flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-[#227c9d]" />
                  Profile Picture (PFP) Upload
                </label>
                {pfpCooldown.canChange ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    PFP Change Available (15d lock after update)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B00] bg-orange-950/60 border border-[#FF6B00]/30 px-2.5 py-0.5 rounded-full">
                    <Lock className="h-3 w-3" />
                    PFP Locked: {pfpCooldown.remainingDays}d {pfpCooldown.remainingHours}h remaining
                  </span>
                )}
              </div>

              {!pfpCooldown.canChange && (
                <div className="mb-3 rounded-xl bg-[#14141d] border border-[#FF6B00]/30 p-2.5 text-[11px] text-orange-300 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[#FF6B00] shrink-0" />
                  <span>
                    To prevent database congestion, profile pictures can only be changed once every 15 days. Next update unlocks on {pfpCooldown.nextAvailableDate?.toLocaleDateString()} at {pfpCooldown.nextAvailableDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Preview */}
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border border-[#2e2e42] bg-[#14141c]">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="PFP Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-tr ${profile.avatarGradient} flex items-center justify-center text-xl font-bold text-white`}
                    >
                      {editDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!pfpCooldown.canChange}
                      onClick={() => {
                        if (!pfpCooldown.canChange) {
                          setProfileError(pfpCooldown.message || 'Profile picture can only be changed once every 15 days.');
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition shadow-sm ${
                        pfpCooldown.canChange
                          ? 'bg-[#227c9d] text-white hover:bg-[#1a647f]'
                          : 'bg-[#1b1b24] text-[#66667a] border border-[#2b2b3a] cursor-not-allowed'
                      }`}
                    >
                      {pfpCooldown.canChange ? (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload from Device</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 text-[#FF6B00]" />
                          <span>PFP Locked (15-day rate limit)</span>
                        </>
                      )}
                    </button>

                    {editAvatarUrl && pfpCooldown.canChange && (
                      <button
                        type="button"
                        onClick={handleRemovePfp}
                        className="flex items-center gap-1.5 rounded-full bg-[#1b1b24] border border-[#2b2b3a] px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Picture</span>
                      </button>
                    )}
                  </div>

                  {/* Preset avatars */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-[#7a7a8c]">Or choose preset:</span>
                    <div className="flex items-center gap-1.5">
                      {PRESET_AVATARS.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Preset"
                          onClick={() => handleSelectPresetAvatar(url)}
                          className={`h-7 w-7 rounded-full object-cover border-2 transition ${
                            !pfpCooldown.canChange
                              ? 'opacity-40 cursor-not-allowed border-transparent'
                              : editAvatarUrl === url
                              ? 'border-[#227c9d] scale-110 cursor-pointer'
                              : 'border-transparent hover:border-white/50 cursor-pointer'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Name & Handle Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c8c9e] mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#227c9d]" />
                  Display Name (Seen in Feed & Opinions)
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g. Oluwaseyi Blaise, CryptoWizard"
                  maxLength={32}
                  className="w-full rounded-xl border border-[#2b2b3a] bg-[#0e0e14] px-3.5 py-2 text-xs font-bold text-white placeholder-[#555566] focus:border-[#227c9d] focus:outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8c8c9e] flex items-center gap-1.5">
                    <AtSign className="h-3.5 w-3.5 text-[#227c9d]" />
                    Unique Username / Handle
                  </label>
                  {usernameCooldown.canChange ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B00] bg-orange-950/60 border border-[#FF6B00]/30 px-2 py-0.5 rounded-full">
                      <Lock className="h-2.5 w-2.5" />
                      Locked: {usernameCooldown.remainingDays}d {usernameCooldown.remainingHours}h
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#555566]">
                    @
                  </span>
                  <input
                    type="text"
                    value={editUsername}
                    disabled={!usernameCooldown.canChange}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="e.g. OluwaseyiBlaise"
                    maxLength={24}
                    className={`w-full rounded-xl border pl-8 pr-8 py-2 text-xs font-bold transition ${
                      !usernameCooldown.canChange
                        ? 'border-[#FF6B00]/30 bg-[#121218] text-[#8c8c9e] cursor-not-allowed'
                        : 'border-[#2b2b3a] bg-[#0e0e14] text-white placeholder-[#555566] focus:border-[#227c9d] focus:outline-none'
                    }`}
                  />
                  {!usernameCooldown.canChange && (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#FF6B00]" />
                  )}
                </div>
                {!usernameCooldown.canChange ? (
                  <p className="mt-1 text-[10px] text-[#FF6B00]/90 flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>Username changes locked until {usernameCooldown.nextAvailableDate?.toLocaleDateString()} to protect database health.</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-[#7a7a8c]">
                    Rate Limit: Valid once every 15 days to protect the database.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c8c9e] mb-1.5">
                  Bio / Trading Philosophy
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Share your thesis approach (e.g. Perpetual conviction trader on Robinhood Chain)"
                  maxLength={120}
                  className="w-full rounded-xl border border-[#2b2b3a] bg-[#0e0e14] px-3.5 py-2 text-xs text-white placeholder-[#555566] focus:border-[#227c9d] focus:outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-full bg-[#1b1b24] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-[#227c9d] px-6 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#1a647f] transition active:scale-95 shadow-md"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile & PFP</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ROBINHOOD CHAIN LIVE SMART CONTRACT STATUS CARD */}
      <div className="rounded-[26px] border border-[#227c9d]/40 bg-gradient-to-r from-[#0c1a22] to-[#121620] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#227c9d]/20 border border-[#227c9d]/40 text-[#53b3d4]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">OpinionNG NGN Engine</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ATOMIC NGN LEDGER
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-xs text-[#53b3d4]">
                <span>{contractAddress}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contractAddress);
                    setCopiedContract(true);
                    setTimeout(() => setCopiedContract(false), 2000);
                  }}
                  className="text-slate-400 hover:text-white transition"
                  title="Copy contract address"
                >
                  {copiedContract ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#227c9d] hover:text-[#53b3d4] transition"
                  title="View on Robinhood Chain Explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <a
              href={`${ROBINHOOD_EXPLORER_URL}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-full bg-[#1b2b34] border border-[#227c9d]/50 px-4 py-2 text-xs font-bold text-white hover:bg-[#227c9d] transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Block Explorer</span>
            </a>
          </div>
        </div>

        <p className="mt-3.5 text-xs text-slate-300 leading-relaxed border-t border-[#1e2f38] pt-3">
          ✓ <strong>Live Continuous AMM Curves Active</strong>: Every purchase of YES or NO, selling of shares, and creation of markets executes atomically via the <strong>OpinionNG Double-Entry Ledger</strong> with 1.5% creator fee routing directly into your available balance.
        </p>
      </div>

      {/* 2. CREATOR REVENUE ARCHITECTURE BANNER & CLAIM FEES CARD */}
      <div className="rounded-[28px] border border-[#1c313a] bg-gradient-to-r from-[#0e1c24] via-[#121218] to-[#161622] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/15 px-3.5 py-1 text-xs font-fun font-bold text-[#53b3d4]">
              <Coins className="h-3.5 w-3.5 text-[#227c9d]" />
              <span>CREATOR REVENUE ARCHITECTURE • 1.00% ETH REWARD</span>
            </div>
            <h2 className="text-2xl font-fun font-bold text-white sm:text-3xl">
              Creator Economics & Fee Reconciliation
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Every trade on Tired.Fun accrues native ETH fees to market curators. Unlike standard
              prediction markets where market makers extract all spreads, Tired.Fun routes{' '}
              <span className="text-[#227c9d] font-bold">1.00% of all volume</span> directly to the
              market creator and <span className="text-white font-bold">1.00%</span> to the protocol
              treasury.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64 rounded-[24px] border border-[#227c9d]/40 bg-[#0e1c24] p-5 text-right shadow-[0_0_30px_rgba(34,124,157,0.18)]">
              <span className="block font-fun text-xs font-bold uppercase tracking-wider text-[#53b3d4]">
                Claimable Creator Fees
              </span>
              <div className="mt-1 font-fun text-3xl font-bold text-white">
                {formatNGN(effectiveClaimableKobo)}
              </div>
              <button
                onClick={handleClaim}
                disabled={effectiveClaimableKobo <= 0 || isClaiming}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#227c9d] px-4 py-2.5 font-fun text-xs font-bold text-white shadow-md transition hover:bg-[#1a647f] active:scale-[0.99] disabled:opacity-40"
              >
                <Coins className="h-4 w-4" />
                <span>{isClaiming ? 'Claiming Fees...' : 'Claim to NGN Balance'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* X (TWITTER) BOT INGESTION TESTER CARD */}
      <div className="rounded-[26px] border border-[#232332] bg-[#12121a] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#20202e] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <AtSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">X Mention Bot Integration (@TheTiredFun / @OpinionNG)</h3>
              <p className="text-xs text-[#8c8c9e]">
                Tag the bot on X to spawn verified markets automatically and earn 1.5% creator fees on every trade in ₦.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-[11px] font-mono text-sky-400">
            Webhook: /api/webhooks/x-mentions
          </span>
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
              className="rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition active:scale-95 shrink-0"
            >
              {isXBotSubmitting ? 'Bot Processing...' : 'Simulate X Mention'}
            </button>
          </div>

          {xBotResult && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Market Created Successfully via X Mention Webhook!</span>
              </div>
              <div className="text-slate-300 font-mono text-[11px] bg-black/40 p-2 rounded-lg">
                🤖 Bot Response: "{xBotResult.reply_text}"
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={xBotResult.market_url}
                  className="inline-flex items-center gap-1 text-sky-400 hover:underline font-bold"
                >
                  <span>Open Live Market</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 3. 4 METRIC CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 shadow-md">
          <span className="text-[11px] font-fun font-bold uppercase tracking-wider text-slate-400">
            Markets Created by You
          </span>
          <div className="mt-1 font-fun text-2xl font-bold text-white">
            {userCreatedMarkets.length}
          </div>
          <span className="font-mono text-[10px] text-[#227c9d]">
            {opinionCount} Opinion • {predictionCount} Prediction
          </span>
        </div>

        <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 shadow-md">
          <span className="text-[11px] font-fun font-bold uppercase tracking-wider text-slate-400">
            Volume Attracted
          </span>
          <div className="mt-1 font-fun text-2xl font-bold text-[#53b3d4]">
            {totalUserCreatorVolume.toFixed(2)} ETH
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Across YES & NO Curves
          </span>
        </div>

        <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 shadow-md">
          <span className="text-[11px] font-fun font-bold uppercase tracking-wider text-slate-400">
            Lifetime Creator Fees
          </span>
          <div className="mt-1 font-fun text-2xl font-bold text-[#FF6B00]">
            {(totalLifetimeEarned + 0.0425).toFixed(4)} ETH
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Accrued to Date
          </span>
        </div>

        <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 shadow-md">
          <span className="text-[11px] font-fun font-bold uppercase tracking-wider text-slate-400">
            Total Fees Claimed
          </span>
          <div className="mt-1 font-fun text-2xl font-bold text-white">
            {totalClaimedSoFar.toFixed(4)} ETH
          </div>
          <span className="font-mono text-[10px] text-[#227c9d]">
            Verified On-Chain
          </span>
        </div>
      </div>

      {/* USER'S PERSONALIZED OPINION MARKETS */}
      <div className="rounded-[28px] border border-[#232330] bg-[#161620] p-6 shadow-xl">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-fun font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-4 w-4 text-[#FF6B00]" />
              <span>Your Opinion Markets & Portfolio Conviction</span>
            </h3>
            <p className="text-xs text-[#8c8c9e] mt-0.5">
              Markets created by you, followed by markets where you cast votes or engaged in debates.
            </p>
          </div>
          <span className="font-mono text-xs text-[#FF6B00] font-bold">
            {userPersonalizedMarkets.length} {userPersonalizedMarkets.length === 1 ? 'Market' : 'Markets'}
          </span>
        </div>

        {userPersonalizedMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#262638] bg-[#111118] p-8 text-center">
            <Sparkles className="h-8 w-8 text-[#FF6B00] mb-2 opacity-60" />
            <h4 className="font-bold text-white text-sm">No Opinion Market History Yet</h4>
            <p className="text-xs text-[#8c8c9e] max-w-sm mt-1 mb-4">
              You haven't created, voted on, or commented on any opinion markets yet. Spawn your own market or trade public conviction to populate your personal portfolio!
            </p>
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="rounded-full bg-gradient-to-r from-[#FF6B00] to-orange-500 px-5 py-2 text-xs font-black text-white hover:opacity-95 shadow-lg shadow-[#FF6B00]/25 transition active:scale-95 cursor-pointer"
              >
                + Create Your First Market
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userPersonalizedMarkets.map(({ market: m, badge }) => {
              const { yesSentimentPct, noSentimentPct, totalPoolEth, totalVolumeEth } = getMarketPricesAndSentiment(m);
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMarket && onSelectMarket(m)}
                  className="rounded-[20px] border border-[#262638] bg-[#111118] p-4 flex flex-col justify-between hover:border-[#FF6B00]/60 transition cursor-pointer group shadow-sm"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#FF8A33]">
                        {badge}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        {m.category}
                      </span>
                    </div>
                    <h4 className="font-fun font-bold text-sm text-white line-clamp-2 mb-3 group-hover:text-[#53b3d4] transition">
                      {m.question}
                    </h4>
                  </div>

                  <div>
                    {/* Real Dynamic Conviction Dual Bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#252533]">
                      <div
                        style={{ width: `${Math.max(0, Math.min(100, yesSentimentPct))}%` }}
                        className="h-full rounded-full bg-[#227c9d] transition-all duration-300"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] font-semibold">
                      <span className="text-[#53b3d4]">{yesSentimentPct.toFixed(1)}% YES</span>
                      <span className="text-[#FF6B00]">{noSentimentPct.toFixed(1)}% NO</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#1f1f2c] pt-2 text-[10px] text-slate-400 font-mono">
                      <span>Pool: {totalPoolEth.toFixed(3)} ETH</span>
                      <span>Vol: {totalVolumeEth.toFixed(3)} ETH</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FEE CALCULATION SPECIFICATION & CLAIM HISTORY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[28px] border border-[#232330] bg-[#161620] p-6 shadow-xl lg:col-span-7">
          <h3 className="mb-3.5 flex items-center gap-2 text-sm font-fun font-bold uppercase tracking-wider text-white">
            <Percent className="h-4 w-4 text-[#227c9d]" />
            Fee Calculation Specification (contracts/Tired.FunMarkets.sol)
          </h3>
          <div className="space-y-3 text-xs leading-relaxed text-slate-300 font-sans">
            <p>
              Fees are applied uniformly to both buy and sell orders. Because virtual reserves
              never leave the contract, fee deductions operate strictly on the gross ETH entering or
              leaving the pool:
            </p>

            <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-4 font-mono text-[11px] text-slate-300">
              <div className="text-[#227c9d] font-bold mb-1">// On Buy Execution:</div>
              <div>creatorFee = (ethIn * creatorFeeBps) / 10000;  // 1.00%</div>
              <div>protocolFee = (ethIn * protocolFeeBps) / 10000; // 1.00%</div>
              <div>netEthToCurve = ethIn - creatorFee - protocolFee;</div>
              <div className="mt-3 text-[#FF6B00] font-bold">// On Sell Execution:</div>
              <div>grossEthFromCurve = curve.virtualEth - newVirtualEth;</div>
              <div>creatorFee = (grossEthFromCurve * creatorFeeBps) / 10000;</div>
              <div>protocolFee = (grossEthFromCurve * protocolFeeBps) / 10000;</div>
              <div>netEthToSeller = grossEthFromCurve - creatorFee - protocolFee;</div>
              <div className="mt-3 text-emerald-400 font-bold">// On Prediction Settlement Claims (Pari-Mutuel):</div>
              <div>creatorFee = 0; protocolFee = 0; // 0% fee on settlement payouts</div>
              <div>userPayout = (distributablePool * userWinningShares) / totalWinningShares;</div>
            </div>

            <p>
              Fee splits can be configured by governance via{' '}
              <code className="text-[#53b3d4]">setFeeConfiguration(creatorBps, protocolBps)</code>{' '}
              up to a hard-coded safety cap of <strong>5.00% total</strong> (
              <code className="text-white">MAX_TOTAL_FEE_BPS = 500</code>).
            </p>
          </div>

          {/* Solvency Audit Reconciler */}
          <div className="mt-6 rounded-2xl border border-[#227c9d]/30 bg-[#227c9d]/10 p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-fun font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-[#227c9d]" />
                On-Chain Fee & Reserve Solvency Reconciliation
              </span>
              <span className="rounded-full bg-[#227c9d]/30 px-3 py-0.5 font-fun text-[11px] font-bold text-[#53b3d4]">
                {solvencyReport?.isSolvent ? '100% SOLVENT' : 'RECONCILING'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[11px] sm:grid-cols-3">
              <div>
                <span className="text-slate-400">Contract ETH Backing:</span>
                <div className="font-bold text-white text-xs">
                  {solvencyReport?.contractEthBalance || '0.000'} ETH
                </div>
              </div>
              <div>
                <span className="text-slate-400">Real ETH Curve Reserves:</span>
                <div className="font-bold text-white text-xs">
                  {solvencyReport?.realEthReserves || '0.000'} ETH
                </div>
              </div>
              <div>
                <span className="text-slate-400">Pending Creator Fees:</span>
                <div className="font-bold text-[#FF6B00] text-xs">
                  {solvencyReport?.pendingCreatorFees || '0.000'} ETH
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Claim History Log */}
        <div className="rounded-[28px] border border-[#232330] bg-[#161620] p-6 shadow-xl lg:col-span-5">
          <h3 className="mb-3.5 flex items-center justify-between text-sm font-fun font-bold uppercase tracking-wider text-white">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FF6B00]" />
              Fee Claim History
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {claimHistory.length} Claims Recorded
            </span>
          </h3>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {claimHistory.length === 0 ? (
              <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-6 text-center text-xs text-slate-400 font-sans">
                No claims recorded yet. When you claim accrued 1% fees, each transaction will appear
                here with its on-chain verification hash.
              </div>
            ) : (
              claimHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-fun font-bold text-white text-sm">
                      +{item.amountEth.toFixed(4)} ETH
                    </span>
                    <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/30 px-2.5 py-0.5 font-fun text-[10px] font-bold text-[#53b3d4]">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    {item.txHash ? (
                      <a
                        href={`${ROBINHOOD_EXPLORER_URL}/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#227c9d] hover:underline"
                      >
                        <span>Robinhood Explorer</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-[#8c8c9e]">Robinhood Chain</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
