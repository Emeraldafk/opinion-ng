// Live Database, Storage & On-Chain Synchronization Service for Tired.Fun
// Provides live persistence for markets, trades, snapshots, and comments,
// with direct on-chain contract synchronization on Robinhood Chain (Chain ID 46630)

import { formatEther } from 'viem';
import {
  OpinionMarket,
  TradeActivity,
  MarketCategory,
  MarketComment,
  INITIAL_VIRTUAL_ETH,
  INITIAL_VIRTUAL_SHARES,
} from './bondingCurve';
import { NULLHOOD_MARKETS_ABI } from '../contracts/NullhoodMarketsArtifact';
import { infraManager } from './indexerService';
import { FeeClaimRecord } from '../components/CreatorEconomicsView';

const STORAGE_KEYS = {
  MARKETS: 'nullhood_db_markets_v5',
  ACTIVITIES: 'nullhood_db_activities_v3',
  COMMENTS: 'nullhood_db_comments_v3',
  LIKES: 'nullhood_db_likes_v4',
  LEGACY_LIKES: 'nullhood_db_likes_v3',
  REPOSTS: 'nullhood_db_reposts_v3',
  CLAIMS: 'nullhood_db_claims_v3',
  HOLDINGS: 'nullhood_db_holdings_v3',
  PREFERENCES: 'nullhood_db_preferences_v3',
};

export interface MarketLikeEntry {
  baseCount: number;
  likedUsers: string[]; // List of user addresses/handles (lowercased)
}

const DEFAULT_LIKES_MAP: Record<number, MarketLikeEntry> = {
  1: { baseCount: 88, likedUsers: [] },
  2: { baseCount: 45, likedUsers: [] },
  3: { baseCount: 62, likedUsers: [] },
  4: { baseCount: 19, likedUsers: [] },
  5: { baseCount: 134, likedUsers: [] },
  6: { baseCount: 27, likedUsers: [] },
  7: { baseCount: 71, likedUsers: [] },
};

export class TiredFunDatabaseService {
  /**
   * Save markets to persistent local database
   */
  public saveMarkets(markets: OpinionMarket[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(markets));
    } catch (e) {
      console.warn('Failed to save markets to database:', e);
    }
  }

  /**
   * Load markets from persistent local database, merging all stored comments
   */
  public loadMarkets(fallback: OpinionMarket[]): OpinionMarket[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MARKETS);
      const commentsMap = this.loadAllComments();

      let loadedMarkets: OpinionMarket[] = fallback;
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge newly added fallback markets that aren't yet in saved database
          const existingIds = new Set(parsed.map((m: any) => m.id));
          const missingFallback = fallback.filter((f) => !existingIds.has(f.id));
          loadedMarkets = [...parsed, ...missingFallback];
        }
      }

      // Preserve actual curve reserves, trades count, and load user comments
      return loadedMarkets.map((m) => {
        const savedComments = commentsMap[m.id];
        return {
          ...m,
          comments: savedComments && savedComments.length > 0 ? savedComments : (m.comments || []),
        };
      });
    } catch (e) {
      console.warn('Failed to load markets from database:', e);
    }
    return fallback;
  }

  /**
   * Load all comments across all markets
   */
  public loadAllComments(): Record<number, MarketComment[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load comments:', e);
    }
    return {};
  }

  /**
   * Load comments for a specific market
   */
  public loadComments(marketId: number): MarketComment[] {
    const all = this.loadAllComments();
    return all[marketId] || [];
  }

  /**
   * Add a comment to a market and persist immediately
   */
  public addComment(marketId: number, comment: MarketComment): MarketComment[] {
    const all = this.loadAllComments();
    const existing = all[marketId] || [];
    const updated = [comment, ...existing];
    all[marketId] = updated;

    try {
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save comment:', e);
    }

    return updated;
  }

  /**
   * Apply a remote comment received from cloud sync (e.g. phone to PC)
   */
  public applyRemoteComment(marketId: number, comment: MarketComment): void {
    const all = this.loadAllComments();
    const existing = all[marketId] || [];
    if (!existing.some((c) => c.id === comment.id)) {
      all[marketId] = [comment, ...existing];
      try {
        localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
      } catch (e) {
        console.warn('Failed to save remote comment:', e);
      }
    }
  }

  /**
   * Like or unlike a specific comment
   */
  public toggleCommentLike(marketId: number, commentId: string): MarketComment[] {
    const all = this.loadAllComments();
    const existing = all[marketId] || [];
    const updated = existing.map((c) => {
      if (c.id === commentId) {
        const currentlyLiked = Boolean(c.hasLiked);
        const currentLikes = c.likes || 0;
        return {
          ...c,
          hasLiked: !currentlyLiked,
          likes: currentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        };
      }
      return c;
    });

    all[marketId] = updated;
    try {
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save comment like:', e);
    }
    return updated;
  }

  /**
   * Internal helper to load raw persistent multi-user likes store
   */
  private loadRawLikesStore(): Record<number, MarketLikeEntry> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LIKES);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_LIKES_MAP, ...parsed };
        }
      }

      // Check legacy migration
      const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_LIKES);
      if (legacy) {
        const legacyParsed = JSON.parse(legacy);
        if (legacyParsed && typeof legacyParsed === 'object') {
          const migrated: Record<number, MarketLikeEntry> = { ...DEFAULT_LIKES_MAP };
          for (const [idStr, val] of Object.entries(legacyParsed)) {
            const mId = Number(idStr);
            const count = typeof val === 'object' && val !== null ? (val as any).count || 0 : Number(val) || 0;
            migrated[mId] = {
              baseCount: Math.max(migrated[mId]?.baseCount || 0, count),
              likedUsers: [],
            };
          }
          this.saveRawLikesStore(migrated);
          return migrated;
        }
      }
    } catch (e) {
      console.warn('Failed to load raw likes store:', e);
    }
    return { ...DEFAULT_LIKES_MAP };
  }

  /**
   * Internal helper to save raw persistent multi-user likes store
   */
  private saveRawLikesStore(store: Record<number, MarketLikeEntry>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(store));
    } catch (e) {
      console.warn('Failed to save raw likes store:', e);
    }
  }

  /**
   * Get raw persistent like entry for a market
   */
  public getRawLikeEntry(marketId: number): MarketLikeEntry {
    const rawStore = this.loadRawLikesStore();
    return rawStore[marketId] || { baseCount: DEFAULT_LIKES_MAP[marketId]?.baseCount || 10, likedUsers: [] };
  }

  /**
   * Apply remote likes received from cloud sync (e.g. phone to PC)
   */
  public applyRemoteLike(marketId: number, remoteEntry: MarketLikeEntry): void {
    const rawStore = this.loadRawLikesStore();
    const current = rawStore[marketId] || {
      baseCount: DEFAULT_LIKES_MAP[marketId]?.baseCount || 10,
      likedUsers: [],
    };

    const userSet = new Set([...current.likedUsers, ...remoteEntry.likedUsers]);
    const merged: MarketLikeEntry = {
      baseCount: Math.max(current.baseCount, remoteEntry.baseCount),
      likedUsers: Array.from(userSet),
    };

    rawStore[marketId] = merged;
    this.saveRawLikesStore(rawStore);
  }

  /**
   * Load perpetual likes map tailored to the current user (if logged in)
   * Base likes + total distinct user likes, with personalized liked boolean
   */
  public loadLikes(userAddress?: string | null): Record<number, { count: number; liked: boolean }> {
    const rawStore = this.loadRawLikesStore();
    const normalizedUser = userAddress ? userAddress.toLowerCase() : null;
    const result: Record<number, { count: number; liked: boolean }> = {};

    for (const [idStr, entry] of Object.entries(rawStore)) {
      const mId = Number(idStr);
      const likedUsers = Array.isArray(entry.likedUsers) ? entry.likedUsers : [];
      const base = typeof entry.baseCount === 'number' ? entry.baseCount : 10;
      const count = base + likedUsers.length;
      const liked = Boolean(normalizedUser && likedUsers.includes(normalizedUser));
      result[mId] = { count, liked };
    }

    return result;
  }

  /**
   * Toggle like for an opinion for a specific logged in user.
   * If user has already liked, unlikes and decrements.
   * If user has not liked, records their unique user address and increments.
   */
  public toggleMarketLike(
    marketId: number,
    userAddress: string
  ): Record<number, { count: number; liked: boolean }> {
    if (!userAddress) {
      return this.loadLikes();
    }

    const rawStore = this.loadRawLikesStore();
    const entry: MarketLikeEntry = rawStore[marketId] || {
      baseCount: DEFAULT_LIKES_MAP[marketId]?.baseCount || 10,
      likedUsers: [],
    };

    const normalizedUser = userAddress.toLowerCase();
    const currentUsers = Array.isArray(entry.likedUsers) ? [...entry.likedUsers] : [];
    const existingIndex = currentUsers.indexOf(normalizedUser);

    if (existingIndex >= 0) {
      // User is un-liking
      currentUsers.splice(existingIndex, 1);
    } else {
      // User is liking (perpetual distinct user like)
      currentUsers.push(normalizedUser);
    }

    rawStore[marketId] = {
      baseCount: typeof entry.baseCount === 'number' ? entry.baseCount : 10,
      likedUsers: currentUsers,
    };

    this.saveRawLikesStore(rawStore);
    return this.loadLikes(userAddress);
  }

  /**
   * Save activities/trades to database
   */
  
  /**
   * Load reposts map from database
   */
  public loadReposts(): Record<number, { count: number; reposted: boolean }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPOSTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load reposts:', e);
    }
    return {};
  }

  /**
   * Save reposts map
   */
  public saveReposts(reposts: Record<number, { count: number; reposted: boolean }>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.REPOSTS, JSON.stringify(reposts));
    } catch (e) {
      console.warn('Failed to save reposts:', e);
    }
  }

  /**
   * Toggle repost for an opinion
   */
  public toggleRepost(marketId: number): Record<number, { count: number; reposted: boolean }> {
    const all = this.loadReposts();
    const current = all[marketId] || { count: 0, reposted: false };
    const updated = {
      ...all,
      [marketId]: {
        count: current.reposted ? Math.max(0, current.count - 1) : current.count + 1,
        reposted: !current.reposted,
      },
    };
    this.saveReposts(updated);
    return updated;
  }

  
  /**
   * Load following map
   */
  public loadFollowing(): Record<string, boolean> {
    try {
      const data = localStorage.getItem('nullhood_db_following_v3');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load following:', e);
    }
    return {};
  }

  /**
   * Save following map
   */
  public saveFollowing(following: Record<string, boolean>): void {
    try {
      localStorage.setItem('nullhood_db_following_v3', JSON.stringify(following));
    } catch (e) {
      console.warn('Failed to save following:', e);
    }
  }

  /**
   * Toggle follow
   */
  public toggleFollow(userId: string): Record<string, boolean> {
    const all = this.loadFollowing();
    const current = Boolean(all[userId]);
    const updated = {
      ...all,
      [userId]: !current,
    };
    this.saveFollowing(updated);
    return updated;
  }

  public saveActivities(activities: TradeActivity[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities.slice(0, 200)));
    } catch (e) {
      console.warn('Failed to save activities:', e);
    }
  }

  /**
   * Load activities/trades from database
   */
  public loadActivities(fallback: TradeActivity[]): TradeActivity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove old mock activities that had hardcoded fake IDs or hashes
          const realActs = parsed.filter(
            (a: any) =>
              !['a1', 'a2', 'a3', 'a4'].includes(a.id) &&
              !a.txHash?.startsWith('0xa498f8b01c34a') &&
              !a.txHash?.startsWith('0x8849b01a83dfa') &&
              !a.txHash?.startsWith('0x39f018a47b192')
          );
          if (realActs.length > 0) return realActs;
        }
      }
    } catch (e) {
      console.warn('Failed to load activities:', e);
    }
    return fallback;
  }

  /**
   * Save fee claim records
   */
  public saveClaimHistory(claims: FeeClaimRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
    } catch (e) {
      console.warn('Failed to save claims:', e);
    }
  }

  /**
   * Load fee claim records
   */
  public loadClaimHistory(fallback: FeeClaimRecord[]): FeeClaimRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLAIMS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load claims:', e);
    }
    return fallback;
  }

  /**
   * Save user holdings map
   */
  public saveHoldings(holdings: Record<number, { yesShares: number; noShares: number }>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
    } catch (e) {
      console.warn('Failed to save holdings:', e);
    }
  }

  /**
   * Load user holdings map
   */
  public loadHoldings(fallback: Record<number, { yesShares: number; noShares: number }>): Record<number, { yesShares: number; noShares: number }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HOLDINGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load holdings:', e);
    }
    return fallback;
  }

  /**
   * Load real on-chain markets from Robinhood Chain Testnet contract
   */
  public async syncOnChainMarkets(contractAddress: string): Promise<OpinionMarket[] | null> {
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      return null;
    }

    try {
      const client = infraManager.publicClient;
      const count = (await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'marketCount',
      })) as bigint;

      const total = Number(count);
      if (total === 0) return [];

      const fetchedMarkets: OpinionMarket[] = [];

      for (let id = 1; id <= total; id++) {
        try {
          const summary = (await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: NULLHOOD_MARKETS_ABI,
            functionName: 'getMarket',
            args: [BigInt(id)],
          })) as {
            id: bigint;
            creator: string;
            question: string;
            category: string;
            imageUri: string;
            sourceHandle: string;
            createdAt: bigint;
            totalTrades: bigint;
            creatorFeesEarned: bigint;
            yesRealEth: bigint;
            noRealEth: bigint;
            yesTotalShares: bigint;
            noTotalShares: bigint;
            yesVolumeEth: bigint;
            noVolumeEth: bigint;
            yesPriceWei: bigint;
            noPriceWei: bigint;
            yesSentimentBps: bigint;
            marketType: number;
            status: number;
            closingTime: bigint;
            resolutionDeadline: bigint;
            finalOutcome: number;
            distributablePool: bigint;
            winningTotalShares: bigint;
            evidenceSource: string;
          };

          const yesRealEthNum = parseFloat(formatEther(summary.yesRealEth));
          const noRealEthNum = parseFloat(formatEther(summary.noRealEth));
          const yesVolEthNum = parseFloat(formatEther(summary.yesVolumeEth));
          const noVolEthNum = parseFloat(formatEther(summary.noVolumeEth));
          const creatorFeesNum = parseFloat(formatEther(summary.creatorFeesEarned));
          const rawTrades = Number(summary.totalTrades);

          // An opinion has real votes/trades if it has trades beyond genesis deployment
          const isMarketVotedOn =
            rawTrades > 1 ||
            (rawTrades === 1 && creatorFeesNum > 0) ||
            Number(summary.id) === 1;

          const finalTrades = isMarketVotedOn ? rawTrades : 0;
          const finalYesEth = isMarketVotedOn ? yesRealEthNum : 0;
          const finalNoEth = isMarketVotedOn ? noRealEthNum : 0;
          const finalYesVol = isMarketVotedOn ? yesVolEthNum : 0;
          const finalNoVol = isMarketVotedOn ? noVolEthNum : 0;
          const finalCreatorFees = isMarketVotedOn ? creatorFeesNum : 0;
          const finalSentimentPct = isMarketVotedOn ? Number(summary.yesSentimentBps) / 100 : 50.0;

          const MARKET_TYPE_MAP: ('PERPETUAL_OPINION' | 'RESOLVABLE_PREDICTION')[] = [
            'PERPETUAL_OPINION',
            'RESOLVABLE_PREDICTION',
          ];
          const MARKET_STATUS_MAP: ('ACTIVE' | 'CLOSED' | 'PROPOSED' | 'DISPUTED' | 'RESOLVED' | 'VOID')[] = [
            'ACTIVE',
            'CLOSED',
            'PROPOSED',
            'DISPUTED',
            'RESOLVED',
            'VOID',
          ];
          const OUTCOME_MAP: ('UNRESOLVED' | 'YES' | 'NO' | 'VOID')[] = [
            'UNRESOLVED',
            'YES',
            'NO',
            'VOID',
          ];

          const decodedMarketType = MARKET_TYPE_MAP[summary.marketType] || 'PERPETUAL_OPINION';
          const decodedStatus = MARKET_STATUS_MAP[summary.status] || 'ACTIVE';

          let predictionObj = undefined;
          if (decodedMarketType === 'RESOLVABLE_PREDICTION') {
            try {
              const pDetails = (await client.readContract({
                address: contractAddress as `0x${string}`,
                abi: NULLHOOD_MARKETS_ABI,
                functionName: 'getMarketPredictionDetails',
                args: [BigInt(id)],
              })) as {
                closingTime: bigint;
                resolutionDeadline: bigint;
                disputeDeadline: bigint;
                yesCondition: string;
                noCondition: string;
                evidenceSource: string;
                proposedEvidence: string;
                disputeEvidence: string;
                proposer: string;
                disputer: string;
                proposedAt: bigint;
                disputedAt: bigint;
                resolvedAt: bigint;
                proposedOutcome: number;
                finalOutcome: number;
                distributablePool: bigint;
                winningTotalShares: bigint;
                totalClaimedSettlement: bigint;
              };

              predictionObj = {
                closingTime: Number(pDetails.closingTime),
                resolutionDeadline: Number(pDetails.resolutionDeadline),
                disputeDeadline: Number(pDetails.disputeDeadline),
                yesCondition: pDetails.yesCondition,
                noCondition: pDetails.noCondition,
                evidenceSource: pDetails.evidenceSource,
                proposedEvidence: pDetails.proposedEvidence,
                disputeEvidence: pDetails.disputeEvidence,
                proposer: pDetails.proposer,
                disputer: pDetails.disputer,
                proposedAt: Number(pDetails.proposedAt),
                disputedAt: Number(pDetails.disputedAt),
                resolvedAt: Number(pDetails.resolvedAt),
                proposedOutcome: OUTCOME_MAP[pDetails.proposedOutcome] || 'UNRESOLVED',
                finalOutcome: OUTCOME_MAP[pDetails.finalOutcome] || 'UNRESOLVED',
                distributablePoolEth: parseFloat(formatEther(pDetails.distributablePool)),
                winningTotalShares: parseFloat(formatEther(pDetails.winningTotalShares)),
                totalClaimedSettlementEth: parseFloat(formatEther(pDetails.totalClaimedSettlement)),
              };
            } catch (pErr) {
              predictionObj = {
                closingTime: Number(summary.closingTime),
                resolutionDeadline: Number(summary.resolutionDeadline),
                yesCondition: '',
                noCondition: '',
                evidenceSource: summary.evidenceSource || '',
                finalOutcome: OUTCOME_MAP[summary.finalOutcome] || 'UNRESOLVED',
                distributablePoolEth: parseFloat(formatEther(summary.distributablePool)),
                winningTotalShares: parseFloat(formatEther(summary.winningTotalShares)),
              };
            }
          }

          const marketItem: OpinionMarket = {
            id: Number(summary.id),
            creator: summary.creator,
            question: summary.question,
            category: (summary.category as Exclude<MarketCategory, 'All'>) || 'Trending',
            imageUri: summary.imageUri || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
            sourceHandle: summary.sourceHandle || '@creator',
            createdAt: Number(summary.createdAt) * 1000,
            totalTrades: finalTrades,
            creatorFeesEarned: finalCreatorFees,
            marketType: decodedMarketType,
            status: decodedStatus,
            prediction: predictionObj,
            yesCurve: {
              virtualEth: INITIAL_VIRTUAL_ETH + finalYesEth,
              virtualShares: INITIAL_VIRTUAL_SHARES - (isMarketVotedOn ? parseFloat(formatEther(summary.yesTotalShares)) : 0),
              realEth: finalYesEth,
              totalShares: isMarketVotedOn ? parseFloat(formatEther(summary.yesTotalShares)) : 0,
              volumeEth: finalYesVol,
              buyVolumeEth: finalYesVol * 0.7,
              sellVolumeEth: finalYesVol * 0.3,
            },
            noCurve: {
              virtualEth: INITIAL_VIRTUAL_ETH + finalNoEth,
              virtualShares: INITIAL_VIRTUAL_SHARES - (isMarketVotedOn ? parseFloat(formatEther(summary.noTotalShares)) : 0),
              realEth: finalNoEth,
              totalShares: isMarketVotedOn ? parseFloat(formatEther(summary.noTotalShares)) : 0,
              volumeEth: finalNoVol,
              buyVolumeEth: finalNoVol * 0.6,
              sellVolumeEth: finalNoVol * 0.4,
            },
            history: [
              {
                timestamp: Number(summary.createdAt) * 1000,
                label: 'Genesis',
                yesSentiment: 50,
                yesPriceEth: 0.000001,
                noPriceEth: 0.000001,
                volumeSnapshotEth: 0,
              },
              {
                timestamp: Date.now(),
                label: 'Now',
                yesSentiment: finalSentimentPct,
                yesPriceEth: parseFloat(formatEther(summary.yesPriceWei)),
                noPriceEth: parseFloat(formatEther(summary.noPriceWei)),
                volumeSnapshotEth: finalYesVol + finalNoVol,
              },
            ],
            holders: [
              {
                address: summary.creator,
                side: 'YES',
                shares: isMarketVotedOn ? Math.max(10000, parseFloat(formatEther(summary.yesTotalShares)) * 0.25) : 0,
                shareOfSidePct: isMarketVotedOn ? 25 : 0,
                avgEntryEth: 0.000005,
              },
            ],
            comments: this.loadComments(Number(summary.id)),
          };

          fetchedMarkets.push(marketItem);
        } catch (innerErr) {
          console.warn(`Failed to read market #${id} from contract:`, innerErr);
        }
      }

      this.saveMarkets(fetchedMarkets);
      return fetchedMarkets;
    } catch (err) {
      console.warn('Error reading on-chain markets:', err);
      return null;
    }
  }
}

export const dbService = new TiredFunDatabaseService();
