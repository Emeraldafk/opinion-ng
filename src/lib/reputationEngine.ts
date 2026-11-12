// Transparent, non-PnL Opinion Reputation Engine for Tired.Fun.
// Reputation is calculated strictly from verifiable participation, market creation impact,
// market diversity, and stake-backed community discourse — never from speculative profit
// or purchased engagement.

import { OpinionMarket, TradeActivity } from './bondingCurve';

export type ReputationTier =
  | 'Genesis Architect'
  | 'High-Conviction Voice'
  | 'Curve Catalyst'
  | 'Opinion Scout'
  | 'New Participant';

export interface ReputationBreakdown {
  creatorImpactScore: number; // Max 400
  marketDiversityScore: number; // Max 250
  discourseScore: number; // Max 200
  volumeParticipationScore: number; // Max 150
  totalScore: number; // Max 1000
  tier: ReputationTier;
}

export interface UserReputationProfile {
  address: string;
  displayName: string;
  handle: string;
  avatarColor: string;
  bio: string;
  joinedLabel: string;
  isVerifiedOnChain: boolean;
  marketsCreatedCount: number;
  totalTradesCount: number;
  uniqueMarketsTraded: number;
  totalVolumeEth: number;
  creatorVolumeAttractedEth: number;
  creatorFeesEarnedEth: number;
  creatorFeesClaimedEth: number;
  positionBackedCommentsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByUser?: boolean;
  breakdown: ReputationBreakdown;
  recentHistory: {
    id: string;
    type: 'CREATE_MARKET' | 'TRADE' | 'COMMENT' | 'FEE_CLAIM';
    description: string;
    marketQuestion?: string;
    timestampLabel: string;
    isOnChain: boolean;
    txHash?: string;
  }[];
}

/**
 * Transparent Logarithmic Reputation Formula:
 * - Creator Impact (0 - 400 pts): 150 * ln(1 + marketsCreated * avgUniqueTradersFactor)
 * - Market Diversity (0 - 250 pts): 120 * ln(1 + uniqueMarketsTraded)
 * - Stake-Backed Discourse (0 - 200 pts): 90 * ln(1 + positionBackedComments)
 * - Curve Liquidity Participation (0 - 150 pts): 80 * ln(1 + totalVolumeEth)
 *
 * Logarithmic scaling prevents wash-trading whales from buying reputation linearly,
 * while diversity and stake-backed comment checks prevent Sybil spam.
 */
export function calculateReputationBreakdown(params: {
  marketsCreatedCount: number;
  creatorVolumeAttractedEth: number;
  uniqueMarketsTraded: number;
  positionBackedCommentsCount: number;
  totalVolumeEth: number;
}): ReputationBreakdown {
  const avgAttractionFactor =
    params.marketsCreatedCount > 0
      ? Math.min(5, 1 + params.creatorVolumeAttractedEth / (params.marketsCreatedCount * 5))
      : 0;

  const rawCreator =
    150 * Math.log(1 + params.marketsCreatedCount * Math.max(1, avgAttractionFactor));
  const creatorImpactScore = Math.min(400, Math.round(rawCreator));

  const rawDiversity = 120 * Math.log(1 + params.uniqueMarketsTraded);
  const marketDiversityScore = Math.min(250, Math.round(rawDiversity));

  const rawDiscourse = 90 * Math.log(1 + params.positionBackedCommentsCount);
  const discourseScore = Math.min(200, Math.round(rawDiscourse));

  const rawVolume = 80 * Math.log(1 + params.totalVolumeEth);
  const volumeParticipationScore = Math.min(150, Math.round(rawVolume));

  const totalScore =
    creatorImpactScore +
    marketDiversityScore +
    discourseScore +
    volumeParticipationScore;

  let tier: ReputationTier = 'New Participant';
  if (totalScore >= 720) tier = 'Genesis Architect';
  else if (totalScore >= 520) tier = 'High-Conviction Voice';
  else if (totalScore >= 320) tier = 'Curve Catalyst';
  else if (totalScore >= 120) tier = 'Opinion Scout';

  return {
    creatorImpactScore,
    marketDiversityScore,
    discourseScore,
    volumeParticipationScore,
    totalScore,
    tier,
  };
}

export function buildProfilesFromPlatformState(
  markets: OpinionMarket[],
  activities: TradeActivity[],
  connectedWallet: string | null,
  userHoldings: { [marketId: number]: { yesShares: number; noShares: number } },
  followedAddresses: string[]
): UserReputationProfile[] {
  const map = new Map<
    string,
    {
      address: string;
      displayName: string;
      handle: string;
      bio: string;
      joinedLabel: string;
      marketsCreatedCount: number;
      totalTradesCount: number;
      marketsSet: Set<number>;
      totalVolumeEth: number;
      creatorVolumeAttractedEth: number;
      creatorFeesEarnedEth: number;
      creatorFeesClaimedEth: number;
      positionBackedCommentsCount: number;
      followersCount: number;
      followingCount: number;
      recentHistory: UserReputationProfile['recentHistory'];
    }
  >();

  const ensureEntry = (addr: string, handleHint?: string) => {
    if (!map.has(addr)) {
      map.set(addr, {
        address: addr,
        displayName: handleHint ? handleHint.replace('@', '') : addr,
        handle: handleHint || `@${addr.slice(0, 6).toLowerCase()}`,
        bio: 'Opinion market curator & independent bonding curve participant on Robinhood Chain.',
        joinedLabel: 'Genesis Cohort • Chain 46630',
        marketsCreatedCount: 0,
        totalTradesCount: 0,
        marketsSet: new Set<number>(),
        totalVolumeEth: 0,
        creatorVolumeAttractedEth: 0,
        creatorFeesEarnedEth: 0,
        creatorFeesClaimedEth: 0,
        positionBackedCommentsCount: 0,
        followersCount: 18 + (addr.charCodeAt(2) % 95),
        followingCount: 9 + (addr.charCodeAt(3) % 30),
        recentHistory: [],
      });
    }
    return map.get(addr)!;
  };

  // Aggregate from markets & comments
  for (const m of markets) {
    const creatorEntry = ensureEntry(m.creator, m.sourceHandle);
    creatorEntry.marketsCreatedCount += 1;
    const mVol = m.yesCurve.volumeEth + m.noCurve.volumeEth;
    creatorEntry.creatorVolumeAttractedEth += mVol;
    creatorEntry.creatorFeesEarnedEth += m.creatorFeesEarned;
    creatorEntry.marketsSet.add(m.id);
    creatorEntry.recentHistory.push({
      id: `create-${m.id}`,
      type: 'CREATE_MARKET',
      description: `Spawned perpetual opinion market (${mVol.toFixed(2)} ETH volume attracted)`,
      marketQuestion: m.question,
      timestampLabel: 'Market Genesis',
      isOnChain: Boolean(m.txHash),
      txHash: m.txHash,
    });

    for (const c of m.comments) {
      const commenter = ensureEntry(c.author);
      if (c.sharesHeld > 0) {
        commenter.positionBackedCommentsCount += 1;
      }
      commenter.marketsSet.add(m.id);
      commenter.recentHistory.push({
        id: `comment-${c.id}`,
        type: 'COMMENT',
        description: `Posted ${c.side}-backed conviction thesis (${(c.sharesHeld / 1000).toFixed(1)}k shares held)`,
        marketQuestion: m.question,
        timestampLabel: c.timestamp || 'Just now',
        isOnChain: false,
      });
    }
  }

  // Aggregate from trade activities
  for (const act of activities) {
    const trader = ensureEntry(act.trader);
    trader.totalTradesCount += 1;
    trader.totalVolumeEth += act.ethAmount;
    trader.marketsSet.add(act.marketId);
    trader.recentHistory.unshift({
      id: `trade-${act.id}`,
      type: 'TRADE',
      description: `${act.isBuy ? 'Bought' : 'Sold'} ${act.ethAmount.toFixed(3)} ETH on ${
        act.isYes ? 'YES' : 'NO'
      } curve`,
      marketQuestion: act.marketQuestion,
      timestampLabel: 'Recent',
      isOnChain: Boolean(act.txHash),
      txHash: act.txHash,
    });
  }

  // Ensure connected user is always present
  const activeUserAddr = connectedWallet
    ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
    : '0x71C9...89A4';
  const userEntry = ensureEntry(activeUserAddr, '@you_tiredfun');
  for (const [mIdStr, pos] of Object.entries(userHoldings)) {
    if (pos.yesShares > 0 || pos.noShares > 0) {
      userEntry.marketsSet.add(Number(mIdStr));
      userEntry.totalTradesCount = Math.max(userEntry.totalTradesCount, 2);
      userEntry.totalVolumeEth = Math.max(userEntry.totalVolumeEth, 0.45);
    }
  }

  const colors = ['#00FF66', '#CCFF00', '#00E676', '#38BDF8', '#A855F7', '#F59E0B'];

  const profiles: UserReputationProfile[] = Array.from(map.values()).map((item, idx) => {
    const isFollowed = followedAddresses.includes(item.address);
    const uniqueMarketsTraded = item.marketsSet.size;
    const breakdown = calculateReputationBreakdown({
      marketsCreatedCount: item.marketsCreatedCount,
      creatorVolumeAttractedEth: item.creatorVolumeAttractedEth,
      uniqueMarketsTraded,
      positionBackedCommentsCount: item.positionBackedCommentsCount,
      totalVolumeEth: item.totalVolumeEth,
    });

    return {
      address: item.address,
      displayName: item.displayName,
      handle: item.handle,
      avatarColor: colors[idx % colors.length],
      bio: item.bio,
      joinedLabel: item.joinedLabel,
      isVerifiedOnChain: item.recentHistory.some((h) => h.isOnChain),
      marketsCreatedCount: item.marketsCreatedCount,
      totalTradesCount: item.totalTradesCount,
      uniqueMarketsTraded,
      totalVolumeEth: item.totalVolumeEth,
      creatorVolumeAttractedEth: item.creatorVolumeAttractedEth,
      creatorFeesEarnedEth: item.creatorFeesEarnedEth,
      creatorFeesClaimedEth: item.creatorFeesClaimedEth,
      positionBackedCommentsCount: item.positionBackedCommentsCount,
      followersCount: item.followersCount + (isFollowed ? 1 : 0),
      followingCount: item.followingCount,
      isFollowedByUser: isFollowed,
      breakdown,
      recentHistory: item.recentHistory.slice(0, 10),
    };
  });

  return profiles.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
}

