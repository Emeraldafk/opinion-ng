import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Repeat2,
  Heart,
  Share,
  Play,
  Send,
  TrendingUp,
  Search,
  CheckCircle2,
  Flame,
  Zap,
  BarChart2,
  Bookmark,
  ArrowUp,
} from 'lucide-react';
import {
  OpinionMarket,
  MarketComment,
  getMarketPricesAndSentiment,
  formatTimeAgo,
  formatExactDateTime,
  formatUsd,
} from '../lib/bondingCurve';
import { UserProfile } from '../lib/userProfileService';
import { dbService } from '../lib/databaseService';
import { realtimeSync } from '../lib/realtimeSyncService';
import { calculateXScore } from '../lib/feedAlgorithm';
import { shortenAddress } from '../config/robinhoodChain';

interface OpinionFeedViewProps {
  markets: OpinionMarket[];
  walletAddress: string | null;
  userProfile: UserProfile | null;
  onSelectMarket: (market: OpinionMarket, defaultSide?: 'YES' | 'NO') => void;
  onQuickTrade: (marketId: number, isYes: boolean, ethAmount: number) => void;
  onAddComment: (marketId: number, side: 'YES' | 'NO', text: string) => void;
  onToggleCommentLike?: (marketId: number, commentId: string) => void;
  onSpawnOpinion?: (question: string, category: string, isYes: boolean) => void;
  onRequireWallet?: (actionTitle?: string) => void;
}



function getAvatarGradient(name: string): string {
  const gradients = [
    'from-[#FF6B00] to-orange-500',
    'from-teal-400 to-emerald-600',
    'from-sky-400 to-blue-600',
    'from-rose-400 to-pink-600',
    'from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export const OpinionFeedView: React.FC<OpinionFeedViewProps> = ({
  markets,
  walletAddress,
  userProfile,
  onSelectMarket,
  onQuickTrade,
  onAddComment,
  onToggleCommentLike,
  onSpawnOpinion,
  onRequireWallet,
}) => {
  const [feedTab, setFeedTab] = useState<'for-you' | 'following'>('for-you');
  const [newOpinionText, setNewOpinionText] = useState('');
  const [newOpinionCategory, setNewOpinionCategory] = useState('Crypto');
  const [newOpinionSide, setNewOpinionSide] = useState<'YES' | 'NO'>('YES');

  // Load persistent likes from Database
  const [likesMap, setLikesMap] = useState<Record<number, { count: number; liked: boolean }>>(() =>
    dbService.loadLikes(walletAddress)
  );

  const [repostsMap, setRepostsMap] = useState<Record<number, { count: number; reposted: boolean }>>(() =>
    dbService.loadReposts()
  );

  const [expandedCommentsMap, setExpandedCommentsMap] = useState<Record<number, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<number, string>>({});
  const [voteFeedbackMap, setVoteFeedbackMap] = useState<Record<number, string | null>>({});

  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>(() =>
    dbService.loadFollowing()
  );

  const [bookmarkMap, setBookmarkMap] = useState<Record<number, boolean>>({});

  const [searchFilter, setSearchFilter] = useState('');
  const [copiedShareId, setCopiedShareId] = useState<number | null>(null);

  const [sessionSeed, setSessionSeed] = useState(() => Date.now());

  // Sync likes and reposts from real database when user connects or switches wallet,
  // and listen for real-time cross-device likes (phone <-> PC)
  useEffect(() => {
    setLikesMap(dbService.loadLikes(walletAddress));
    setRepostsMap(dbService.loadReposts());

    const unsubLike = realtimeSync.onLike(() => {
      setLikesMap(dbService.loadLikes(walletAddress));
    });

    return () => {
      unsubLike();
    };
  }, [walletAddress]);

  const toggleLike = (marketId: number) => {
    // Unauthenticated users are redirected to login / connect wallet
    if (!walletAddress) {
      if (onRequireWallet) {
        onRequireWallet('Liking an Opinion Post');
      }
      return;
    }
    // Persist perpetual like to database for this user
    const updated = dbService.toggleMarketLike(marketId, walletAddress);
    setLikesMap(updated);

    // Broadcast like globally with retain so other devices (e.g. PC or other users) see it instantly
    const rawEntry = dbService.getRawLikeEntry(marketId);
    realtimeSync.broadcastLike(marketId, rawEntry);
  };

  const handleCommentLike = (marketId: number, commentId: string) => {
    if (!walletAddress) {
      if (onRequireWallet) {
        onRequireWallet('Liking a Comment');
      }
      return;
    }
    if (onToggleCommentLike) {
      onToggleCommentLike(marketId, commentId);
    }
  };

  const toggleRepost = (marketId: number) => {
    const updated = dbService.toggleRepost(marketId);
    setRepostsMap(updated);
  };

  const toggleComments = (marketId: number) => {
    setExpandedCommentsMap((prev) => ({
      ...prev,
      [marketId]: !prev[marketId],
    }));
  };

  const handleSendComment = (marketId: number) => {
    if (!walletAddress) {
      if (onRequireWallet) {
        onRequireWallet('Commenting on Opinion');
      }
      return;
    }
    const text = commentInputMap[marketId]?.trim();
    if (!text) return;
    onAddComment(marketId, 'YES', text);
    setCommentInputMap((prev) => ({ ...prev, [marketId]: '' }));
    setExpandedCommentsMap((prev) => ({ ...prev, [marketId]: true }));
  };

  const handleVote = async (marketId: number, isYes: boolean) => {
    if (!walletAddress) {
      setVoteFeedbackMap((prev) => ({
        ...prev,
        [marketId]: '⚠️ Connect wallet to vote on-chain',
      }));
      if (onRequireWallet) {
        onRequireWallet(`Voting ${isYes ? 'YES' : 'NO'} on Opinion`);
      }
      setTimeout(() => {
        setVoteFeedbackMap((prev) => ({ ...prev, [marketId]: null }));
      }, 3500);
      return;
    }

    try {
      setVoteFeedbackMap((prev) => ({
        ...prev,
        [marketId]: `Confirming ${isYes ? 'YES' : 'NO'} in wallet...`,
      }));
      await onQuickTrade(marketId, isYes, 0.001);
      setVoteFeedbackMap((prev) => ({
        ...prev,
        [marketId]: `✓ Voted ${isYes ? 'YES' : 'NO'} (Confirmed on Robinhood Chain)`,
      }));
      setTimeout(() => {
        setVoteFeedbackMap((prev) => ({ ...prev, [marketId]: null }));
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Trade cancelled';
      setVoteFeedbackMap((prev) => ({
        ...prev,
        [marketId]: `❌ ${msg.slice(0, 36)}`,
      }));
      setTimeout(() => {
        setVoteFeedbackMap((prev) => ({ ...prev, [marketId]: null }));
      }, 4000);
    }
  };

  const handleShare = (marketId: number) => {
    navigator.clipboard.writeText(`${window.location.origin}/?market=${marketId}`);
    setCopiedShareId(marketId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  const handlePostOpinion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      if (onRequireWallet) {
        onRequireWallet('Spawning an Opinion');
      }
      return;
    }
    if (!newOpinionText.trim()) return;

    if (onSpawnOpinion) {
      onSpawnOpinion(newOpinionText.trim(), newOpinionCategory, newOpinionSide === 'YES');
    }
    setNewOpinionText('');
  };


  // Derive real unique curators dynamically from active markets and user profile
  const uniqueCurators = useMemo(() => {
    const map = new Map<string, { id: string; name: string; handle: string; category: string }>();

    if (userProfile && userProfile.username) {
      map.set(userProfile.username.toLowerCase(), {
        id: userProfile.username,
        name: userProfile.displayName,
        handle: `@${userProfile.username}`,
        category: 'Market Creator (You)',
      });
    }

    for (const m of markets) {
      const handle = m.sourceHandle ? m.sourceHandle.replace('@', '') : shortenAddress(m.creator);
      const key = handle.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: handle,
          name: handle.startsWith('0x') ? shortenAddress(handle) : handle,
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          category: `${m.category} Curator`,
        });
      }
    }

    return Array.from(map.values()).slice(0, 5);
  }, [markets, userProfile]);

  const handleToggleFollow = (userId: string) => {
    const updated = dbService.toggleFollow(userId);
    setFollowingMap(updated);
  };

  // Filtered stream (Supports 'For you' vs 'Following') with X-style algorithmic recommendation
  const opinionStream = useMemo(() => {
    const list = markets.filter((m) => {
      if (feedTab === 'following') {
        const creatorKey = (m.sourceHandle ? m.sourceHandle.replace('@', '') : m.creator).toLowerCase();
        const isFollowed = followingMap[creatorKey] || followingMap[m.creator.toLowerCase()];
        const isSelf = userProfile && (
          (userProfile.username && creatorKey === userProfile.username.toLowerCase()) ||
          (walletAddress && m.creator.toLowerCase() === walletAddress.toLowerCase())
        );
        if (!isFollowed && !isSelf) return false;
      }

      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        m.question.toLowerCase().includes(q) ||
        m.creator.toLowerCase().includes(q) ||
        (m.sourceHandle && m.sourceHandle.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q)
      );
    });

    // In 'For you', rank using X algorithm (interactive, debates, randomized discovery)
    if (feedTab === 'for-you') {
      return [...list].sort((a, b) => {
        const scoreA = calculateXScore(a, likesMap[a.id]?.count || 0, sessionSeed);
        const scoreB = calculateXScore(b, likesMap[b.id]?.count || 0, sessionSeed);
        return scoreB - scoreA;
      });
    }

    return list;
  }, [markets, feedTab, followingMap, searchFilter, userProfile, walletAddress, likesMap, sessionSeed]);

  return (
    <div className="mx-auto max-w-7xl relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* CENTER COLUMN: X-STYLE OPINION FEED */}
        <div className="lg:col-span-8 space-y-4">
          {/* Compact Feed Switcher (Compact & non-sticky to never obscure conviction posts) */}
          <div className="flex items-center justify-between border-b border-[#21212e] pb-2 sm:pb-3 px-1">
            <div className="flex items-center gap-1 rounded-2xl bg-[#14141c] p-1 border border-[#232332]">
              <button
                type="button"
                onClick={() => setFeedTab('for-you')}
                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                  feedTab === 'for-you'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
                }`}
              >
                For you
              </button>
              <button
                type="button"
                onClick={() => setFeedTab('following')}
                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                  feedTab === 'following'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
                }`}
              >
                Following
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#7a7a8c] hidden sm:inline">
                {opinionStream.length} {opinionStream.length === 1 ? 'Conviction Post' : 'Conviction Posts'}
              </span>
            </div>
          </div>

          {/* COMPOSE OPINION BOX (X Style) */}
          {!walletAddress || !userProfile ? (
            <div className="rounded-[22px] sm:rounded-[24px] border border-[#232332] bg-[#14141c] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">Join the Public Conviction Feed</div>
                  <div className="text-xs text-[#8c8c9e]">Connect your wallet to challenge consensus, publish opinions, and earn creator royalties.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRequireWallet?.('Publish your conviction')}
                className="w-full sm:w-auto shrink-0 rounded-full bg-gradient-to-r from-[#FF6B00] to-orange-500 px-5 py-2.5 text-xs font-black text-white hover:opacity-95 transition shadow-lg shadow-orange-500/20 active:scale-95"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="rounded-[22px] sm:rounded-[24px] border border-[#232332] bg-[#14141c] p-3.5 sm:p-5 shadow-lg">
              <div className="flex gap-3.5">
                {/* User Avatar (With uploaded PFP if available) */}
                <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-md ring-2 ring-[#227c9d]/30">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center font-fun text-sm font-black text-white`}
                    >
                      {userProfile.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-xs text-white">{userProfile.displayName}</span>
                    <span className="text-[11px] font-mono text-[#8c8c9e]">@{userProfile.username}</span>
                  </div>

                  <textarea
                    rows={2}
                    value={newOpinionText}
                    onChange={(e) => setNewOpinionText(e.target.value)}
                    placeholder="What's your conviction? Challenge public consensus on Robinhood Chain..."
                    className="w-full resize-none bg-transparent text-sm text-white placeholder-[#7a7a8c] focus:outline-none"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#232330] pt-3">
                    <div className="flex items-center gap-2">
                      {/* Side Conviction Toggle */}
                      <div className="flex rounded-full bg-[#0c0c11] p-0.5 border border-[#262638]">
                        <button
                          type="button"
                          onClick={() => setNewOpinionSide('YES')}
                          className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                            newOpinionSide === 'YES'
                              ? 'bg-[#227c9d] text-white'
                              : 'text-[#8c8c9e] hover:text-white'
                          }`}
                        >
                          Thesis: YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewOpinionSide('NO')}
                          className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                            newOpinionSide === 'NO'
                              ? 'bg-[#FF6B00] text-[#111116]'
                              : 'text-[#8c8c9e] hover:text-white'
                          }`}
                        >
                          Thesis: NO
                        </button>
                      </div>

                      {/* Category pill */}
                      <select
                        value={newOpinionCategory}
                        onChange={(e) => setNewOpinionCategory(e.target.value)}
                        className="rounded-full border border-[#262638] bg-[#0c0c11] px-3 py-1 text-[11px] font-bold text-[#8c8c9e] focus:outline-none focus:text-white"
                      >
                        <option value="Crypto">◎ Crypto</option>
                        <option value="AI">✦ AI</option>
                        <option value="Culture">⚡ Culture</option>
                        <option value="DeFi">❖ DeFi</option>
                        <option value="Politics">🏛 Politics</option>
                        <option value="Sports">⚽ Sports</option>
                        <option value="Robinhood">🏹 Robinhood</option>
                      </select>
                    </div>

                    <button
                      onClick={handlePostOpinion}
                      disabled={!newOpinionText.trim()}
                      className="flex items-center gap-1.5 rounded-full bg-[#227c9d] px-5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1a647f] transition active:scale-95 disabled:opacity-40 shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Post Opinion</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OPINION POSTS STREAM (Exact X style + maintained opinion box architecture) */}
          <div className="space-y-4">
            {opinionStream.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#262638] bg-[#12121a] py-16 px-6 text-center">
                <Flame className="h-8 w-8 text-[#227c9d] mb-2" />
                <h4 className="font-fun text-lg font-bold text-white">
                  {feedTab === 'following'
                    ? 'No opinions from followed creators yet'
                    : 'No matching opinions found'}
                </h4>
                <p className="mt-1 max-w-sm text-xs text-[#8c8c9e]">
                  {feedTab === 'following'
                    ? 'Follow curators from "Who to follow" on the right or post your own opinion above to populate your personal feed.'
                    : 'Try a different search query or spawn a new opinion to start public conviction.'}
                </p>
                {feedTab === 'following' && (
                  <button
                    onClick={() => setFeedTab('for-you')}
                    className="mt-4 rounded-full bg-[#227c9d] px-5 py-2 text-xs font-bold text-white hover:bg-[#1a647f] transition shadow"
                  >
                    Switch to For You
                  </button>
                )}
              </div>
            ) : (
              opinionStream.map((market) => {
              const {
                yesSentimentPct,
                noSentimentPct,
                totalPoolEth,
                totalVolumeEth,
              } = getMarketPricesAndSentiment(market);

              const poolUsdVal = totalPoolEth * 2800;
              const volumeUsdVal = totalVolumeEth * 2800;

              const creatorDisplay = market.sourceHandle
                ? market.sourceHandle.replace('@', '')
                : market.creator;

              const isUserMarket = Boolean(
                walletAddress &&
                userProfile &&
                (
                  (market.creator && market.creator.toLowerCase() === walletAddress.toLowerCase()) ||
                  (userProfile.username && creatorDisplay.toLowerCase() === userProfile.username.toLowerCase()) ||
                  (userProfile.displayName && creatorDisplay.toLowerCase() === userProfile.displayName.toLowerCase())
                )
              );

              const authorDisplayName = isUserMarket && userProfile ? userProfile.displayName : (creatorDisplay.startsWith('0x') ? shortenAddress(creatorDisplay) : creatorDisplay);
              const authorHandle = isUserMarket && userProfile ? `@${userProfile.username}` : (creatorDisplay.startsWith('@') ? creatorDisplay : `@${creatorDisplay.startsWith('0x') ? shortenAddress(creatorDisplay) : creatorDisplay}`);
              const authorAvatar = isUserMarket && userProfile ? userProfile.avatarUrl : market.creatorAvatar;

              const likes = likesMap[market.id] || { count: 0, liked: false };
              const reposts = repostsMap[market.id] || { count: 0, reposted: false };
              const isExpanded = expandedCommentsMap[market.id] || false;
              const commentText = commentInputMap[market.id] || '';
              const voteFeedback = voteFeedbackMap[market.id];

              return (
                <article
                  key={market.id}
                  className="rounded-[22px] sm:rounded-[26px] border border-[#232332] bg-[#14141c] p-4 sm:p-6 transition-all duration-200 hover:border-[#333348] shadow-md"
                >
                  {/* Author Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10">
                        {authorAvatar ? (
                          <img
                            src={authorAvatar}
                            alt={authorDisplayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={`h-full w-full bg-gradient-to-tr ${getAvatarGradient(
                              authorDisplayName
                            )} flex items-center justify-center text-sm font-black text-white`}
                          >
                            {authorDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => onSelectMarket(market)}
                            className="font-bold text-sm text-white hover:underline cursor-pointer"
                          >
                            {authorDisplayName}
                          </span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#227c9d] fill-[#227c9d]/20" />
                          <span className="text-xs text-[#7a7a8c]">{authorHandle}</span>
                          <span className="text-xs text-[#7a7a8c]">·</span>
                          <span className="text-xs text-[#7a7a8c]">
                            {formatTimeAgo(market.createdAt)}
                          </span>
                        </div>
                        <span className="inline-block text-[11px] font-bold text-[#53b3d4]">
                          #{market.category}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectMarket(market)}
                      className="rounded-full bg-[#1e1e2b] px-3.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition"
                    >
                      View Curve
                    </button>
                  </div>

                  {/* Opinion Statement / Question Text */}
                  <h3
                    onClick={() => onSelectMarket(market)}
                    className="text-base sm:text-lg font-bold leading-snug text-white cursor-pointer hover:text-[#53b3d4] transition"
                  >
                    {market.question}
                  </h3>

                  {/* Media Section: 16:9 Video/Image Thumbnail Player */}
                  {market.imageUri && (
                    <div
                      onClick={() => onSelectMarket(market)}
                      className="group/media relative mt-3.5 h-64 sm:h-72 w-full overflow-hidden rounded-[20px] bg-[#0c0c11] cursor-pointer"
                    >
                      <img
                        src={market.imageUri}
                        alt={market.question}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      {/* Translucent Play Overlay Button */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-2xl transition-transform duration-300 group-hover/media:scale-110">
                          <Play className="h-6 w-6 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Video duration pill */}
                      <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
                        {market.sourceHandle || authorHandle}
                      </div>
                    </div>
                  )}

                  {/* OPINION BOX ARCHITECTURE (Maintained Exactly as Requested) */}
                  <div className="mt-4 rounded-[20px] border border-[#232332] bg-[#101017] p-4">
                    {/* Pool vs Volume Row */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div>
                        <span className="block text-[11px] font-medium text-[#7a7a8c]">Pool</span>
                        <span className="font-mono text-sm font-bold text-white">
                          {formatUsd(poolUsdVal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[11px] font-medium text-[#7a7a8c]">Volume</span>
                        <span className="font-mono text-sm font-bold text-white">
                          {formatUsd(volumeUsdVal)}
                        </span>
                      </div>
                    </div>

                    {/* Instant Voting Buttons (YES / NO) */}
                    <div className="grid grid-cols-2 gap-3 mb-2.5">
                      <button
                        type="button"
                        onClick={() => handleVote(market.id, true)}
                        className="flex items-center justify-center gap-1.5 rounded-[14px] bg-[#227c9d] py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#1a647f] active:scale-[0.98]"
                      >
                        <span>Vote YES</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVote(market.id, false)}
                        className="flex items-center justify-center gap-1.5 rounded-[14px] bg-[#FF6B00] py-2.5 text-sm font-extrabold text-[#111116] shadow-sm transition hover:bg-[#EA580C] active:scale-[0.98]"
                      >
                        <span>Vote NO</span>
                      </button>
                    </div>

                    {/* Vote feedback toast */}
                    {voteFeedback && (
                      <div className="mb-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 text-center text-xs font-bold text-emerald-300 animate-fadeIn">
                        {voteFeedback}
                      </div>
                    )}

                    {/* Dual Progress Bar with Percentages */}
                    <div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#252533]">
                        <div
                          style={{ width: `${Math.max(0, Math.min(100, yesSentimentPct))}%` }}
                          className="h-full rounded-full bg-[#227c9d] transition-all duration-300"
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between font-mono text-[11px] font-semibold text-[#8c8c9e]">
                        <span className="text-[#53b3d4]">{yesSentimentPct.toFixed(1)}% YES</span>
                        <span className="text-[#FF6B00]">{noSentimentPct.toFixed(1)}% NO</span>
                      </div>
                    </div>
                  </div>

                  {/* SOCIAL ACTIONS BAR (Exact match for X: Reply, Repost, Like, Views/Analytics, Bookmark, Share) */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-[#232332] pt-3 text-[11px] sm:text-xs text-[#8c8c9e]">
                    {/* Comment / Reply button */}
                    <button
                      onClick={() => toggleComments(market.id)}
                      className="group flex items-center gap-1 sm:gap-1.5 hover:text-[#53b3d4] transition shrink-0"
                      title="Replies"
                    >
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full group-hover:bg-[#227c9d]/15">
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="font-semibold">{market.comments.length}</span>
                    </button>

                    {/* Repost button */}
                    <button
                      onClick={() => toggleRepost(market.id)}
                      className={`group flex items-center gap-1 sm:gap-1.5 transition shrink-0 ${
                        reposts.reposted ? 'text-emerald-400' : 'hover:text-emerald-400'
                      }`}
                      title="Repost"
                    >
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full group-hover:bg-emerald-500/15">
                        <Repeat2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="font-semibold">{reposts.count}</span>
                    </button>

                    {/* Like button (Persistent in DB) */}
                    <button
                      onClick={() => toggleLike(market.id)}
                      className={`group flex items-center gap-1 sm:gap-1.5 transition shrink-0 ${
                        likes.liked ? 'text-rose-500' : 'hover:text-rose-400'
                      }`}
                      title="Like"
                    >
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full group-hover:bg-rose-500/15">
                        <Heart
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${
                            likes.liked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                          }`}
                        />
                      </div>
                      <span className="font-semibold">{likes.count}</span>
                    </button>

                    {/* Views / Analytics (Like X) */}
                    <div
                      onClick={() => onSelectMarket(market)}
                      className="group flex items-center gap-1 sm:gap-1.5 hover:text-[#53b3d4] transition cursor-pointer shrink-0"
                      title="Conviction Analytics & Trades"
                    >
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full group-hover:bg-[#227c9d]/15">
                        <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="font-semibold">
                        {market.totalTrades}
                      </span>
                    </div>

                    {/* Bookmark & Share buttons */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {/* Bookmark button */}
                      <button
                        onClick={() =>
                          setBookmarkMap((prev) => ({
                            ...prev,
                            [market.id]: !prev[market.id],
                          }))
                        }
                        className={`group flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition ${
                          bookmarkMap[market.id]
                            ? 'text-[#53b3d4]'
                            : 'hover:text-[#53b3d4] hover:bg-[#227c9d]/15'
                        }`}
                        title="Bookmark"
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                            bookmarkMap[market.id] ? 'fill-[#53b3d4]' : ''
                          }`}
                        />
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(market.id)}
                        className="group flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full hover:text-[#53b3d4] hover:bg-[#227c9d]/15 transition relative"
                        title="Share"
                      >
                        <Share className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {copiedShareId === market.id && (
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-[#227c9d] px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            Copied!
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* INLINE EXPANDED COMMENTS DRAWER (X Style, Persisted in DB) */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-[#232332] pt-4 space-y-3">
                      {/* Write a comment */}
                      {!walletAddress || !userProfile ? (
                        <div className="flex items-center justify-between rounded-xl border border-[#262638] bg-[#0d0d13] p-3 text-xs">
                          <span className="text-[#8c8c9e]">Connect wallet to reply to this conviction post.</span>
                          <button
                            type="button"
                            onClick={() => onRequireWallet?.('Reply to conviction post')}
                            className="rounded-full bg-[#227c9d] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1a647f] transition shadow"
                          >
                            Connect Wallet
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden">
                            {userProfile.avatarUrl ? (
                              <img
                                src={userProfile.avatarUrl}
                                alt={userProfile.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className={`h-full w-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center text-xs font-black text-white`}
                              >
                                {userProfile.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) =>
                              setCommentInputMap((prev) => ({
                                ...prev,
                                [market.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendComment(market.id);
                            }}
                            placeholder={`Post your reply as ${userProfile.displayName}...`}
                            className="flex-1 rounded-full border border-[#262638] bg-[#0d0d13] px-4 py-2 text-xs text-white placeholder-[#7a7a8c] focus:border-[#227c9d] focus:outline-none"
                          />
                          <button
                            onClick={() => handleSendComment(market.id)}
                            disabled={!commentText.trim()}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#227c9d] text-white hover:bg-[#1a647f] disabled:opacity-30 transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Comment list (Persisted in DB with like buttons) */}
                      <div className="space-y-2 pt-2 max-h-72 overflow-y-auto pr-1">
                        {market.comments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[#7a7a8c]">
                            <MessageCircle className="h-6 w-6 text-[#227c9d]/40 mb-1" />
                            <span className="font-bold text-white">No comments on this opinion yet</span>
                            <span className="text-[11px] text-[#7a7a8c] mt-0.5">Write a comment above to share your conviction.</span>
                          </div>
                        ) : (
                          market.comments.map((c) => (
                            <div
                              key={c.id}
                              className="rounded-xl border border-[#20202e] bg-[#0f0f16] p-3 text-xs"
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Author Avatar */}
                                <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 mt-0.5">
                                  {c.authorAvatar ? (
                                    <img
                                      src={c.authorAvatar}
                                      alt={c.author}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className={`h-full w-full bg-gradient-to-tr ${getAvatarGradient(
                                        c.author
                                      )} flex items-center justify-center text-[10px] font-bold text-white`}
                                    >
                                      {c.author.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-white">{c.author}</span>
                                      {c.authorHandle && (
                                        <span className="text-[10px] text-[#7a7a8c]">
                                          {c.authorHandle}
                                        </span>
                                      )}
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                          c.side === 'YES'
                                            ? 'bg-[#227c9d]/20 text-[#53b3d4]'
                                            : 'bg-[#FF6B00]/20 text-[#FF6B00]'
                                        }`}
                                      >
                                        {c.side} HOLDER
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-[#7a7a8c]" title={formatExactDateTime(c.createdAt || c.timestamp)}>{formatTimeAgo(c.createdAt || c.timestamp)}</span>
                                  </div>

                                  <p className="text-[#cfcfe0] leading-relaxed">{c.text}</p>

                                  {/* Comment interaction: Like */}
                                  <div className="mt-2 flex items-center gap-4 text-[11px] text-[#7a7a8c]">
                                    <button
                                      onClick={() => handleCommentLike(market.id, c.id)}
                                      className={`flex items-center gap-1 hover:text-rose-400 transition ${
                                        c.hasLiked ? 'text-rose-500' : ''
                                      }`}
                                    >
                                      <Heart
                                        className={`h-3 w-3 ${
                                          c.hasLiked ? 'fill-rose-500 text-rose-500' : ''
                                        }`}
                                      />
                                      <span>{c.likes || 0}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            }))}
          </div>
        </div>

        {/* RIGHT SIDEBAR: "WHAT'S HAPPENING" & "WHO TO FOLLOW" (Matches X screenshot) */}
        <div className="lg:col-span-4 space-y-5 sticky top-16">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a7a8c]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search opinions & topics..."
              className="w-full rounded-full border border-[#232332] bg-[#14141c] pl-9 pr-4 py-2 text-xs text-white placeholder-[#7a7a8c] focus:border-[#227c9d] focus:outline-none transition"
            />
          </div>

          {/* WHAT'S HAPPENING BOX (Dynamic from Live Opinions) */}
          <div className="rounded-[24px] border border-[#232332] bg-[#14141c] p-5 shadow-lg">
            <h3 className="font-fun text-lg font-black text-white mb-4 flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FF6B00]" />
              <span>What's happening</span>
            </h3>

            <div className="space-y-4 text-xs">
              {markets.slice(0, 4).map((m) => {
                const metrics = getMarketPricesAndSentiment(m);
                const votesLabel = m.totalTrades === 1 ? '1 vote' : `${m.totalTrades} votes`;
                const convictionLabel = m.totalTrades > 0 ? `${metrics.yesSentimentPct.toFixed(1)}% Yes` : '50.0% Neutral';
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMarket(m)}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#7a7a8c]">
                      <span>{m.category} · Trending</span>
                      <span>···</span>
                    </div>
                    <div className="font-bold text-white group-hover:text-[#53b3d4] transition text-sm line-clamp-1">
                      {m.question}
                    </div>
                    <div className="text-[11px] text-[#7a7a8c]">
                      {votesLabel} · {convictionLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WHO TO FOLLOW BOX (Dynamic from Real Creators) */}
          <div className="rounded-[24px] border border-[#232332] bg-[#14141c] p-5 shadow-lg">
            <h3 className="font-fun text-lg font-black text-white mb-4">
              Who to follow
            </h3>

            <div className="space-y-3.5">
              {uniqueCurators.map((user) => {
                const isFollowing = followingMap[user.id.toLowerCase()] || false;
                return (
                  <div key={user.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                          user.name
                        )} flex items-center justify-center text-xs font-black text-white`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1 font-bold text-xs text-white truncate">
                          <span>{user.name}</span>
                          <CheckCircle2 className="h-3 w-3 text-[#227c9d] fill-[#227c9d]/20 shrink-0" />
                        </div>
                        <div className="text-[11px] text-[#7a7a8c] truncate">{user.handle}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollow(user.id.toLowerCase())}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                        isFollowing
                          ? 'border border-[#353548] bg-transparent text-white hover:border-rose-500 hover:text-rose-400'
                          : 'bg-white text-black hover:bg-slate-200'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
