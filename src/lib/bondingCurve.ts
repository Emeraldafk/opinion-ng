// Exact client-side mirror of contracts/Tired.FunMarkets.sol (v2 Audited) independent YES/NO bonding curve math
// plus seed markets, holder distributions, and historical sentiment/price series on Robinhood Chain.

export const INITIAL_VIRTUAL_ETH = 0.5; // 0.5 ETH virtual reserve per side (non-withdrawable)
export const INITIAL_VIRTUAL_SHARES = 500_000; // 500,000 virtual shares per side
export const CURVE_K = INITIAL_VIRTUAL_ETH * INITIAL_VIRTUAL_SHARES; // 250,000
export const MIN_TRADE_ETH = 0.0001; // Anti-dust minimum trade threshold
export const DEFAULT_CREATOR_FEE_RATE = 0.01; // 1.0% to Market Creator
export const DEFAULT_PROTOCOL_FEE_RATE = 0.01; // 1.0% to Tired.Fun Protocol
export const CREATOR_FEE_RATE = DEFAULT_CREATOR_FEE_RATE;
export const PROTOCOL_FEE_RATE = DEFAULT_PROTOCOL_FEE_RATE;
export const TOTAL_FEE_RATE = CREATOR_FEE_RATE + PROTOCOL_FEE_RATE; // 2.0% total

export type MarketCategory =
  | 'All'
  | 'Trending'
  | 'Economy'
  | 'Politics'
  | 'Culture'
  | 'Sports'
  | 'Tech'
  | 'Markets'
  | 'Other'
  | 'Crypto'
  | 'AI'
  | 'DeFi'
  | 'Robinhood';

export interface SideCurveState {
  virtualEth: number;
  virtualShares: number;
  realEth: number;
  totalShares: number;
  volumeEth: number;
  buyVolumeEth?: number;
  sellVolumeEth?: number;
  tradeCount?: number;
}

export type PulseEventType =
  | 'WHALE_TRADE'
  | 'STANDARD_TRADE'
  | 'SENTIMENT_SURGE'
  | 'NEW_MARKET'
  | 'DISCUSSION'
  | 'FEE_CLAIM';

export interface TradeActivity {
  id: string;
  marketId: number;
  marketQuestion: string;
  category?: Exclude<MarketCategory, 'All'>;
  trader: string;
  isYes: boolean;
  isBuy: boolean;
  ethAmount: number;
  sharesAmount: number;
  yesSentimentAfter: number;
  sentimentDeltaPct?: number;
  eventType?: PulseEventType;
  timestamp: number;
  isOnChain?: boolean;
  txHash?: string;
}

export interface SentimentHistoryPoint {
  timestamp: number;
  label: string;
  yesSentiment: number; // 0 - 100
  yesPriceEth: number;
  noPriceEth: number;
  volumeSnapshotEth?: number;
}

export interface MarketHolderEntry {
  address: string;
  side: 'YES' | 'NO';
  shares: number;
  shareOfSidePct: number;
  avgEntryEth: number;
}

export interface MarketComment {
  id: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  side: 'YES' | 'NO';
  sharesHeld: number;
  text: string;
  createdAt?: number;
  timestamp: string;
  likes?: number;
  hasLiked?: boolean;
}

export type MarketType = 'PERPETUAL_OPINION' | 'RESOLVABLE_PREDICTION';
export type MarketStatus = 'ACTIVE' | 'CLOSED' | 'PROPOSED' | 'DISPUTED' | 'RESOLVED' | 'VOID';
export type MarketOutcome = 'UNRESOLVED' | 'YES' | 'NO' | 'VOID';

export interface PredictionDetails {
  closingTime: number; // Unix timestamp in seconds (UTC)
  resolutionDeadline: number; // Unix timestamp in seconds
  disputeDeadline?: number;
  yesCondition: string;
  noCondition: string;
  evidenceSource: string;
  proposedEvidence?: string;
  disputeEvidence?: string;
  proposer?: string;
  disputer?: string;
  proposedAt?: number;
  disputedAt?: number;
  resolvedAt?: number;
  proposedOutcome?: MarketOutcome;
  finalOutcome?: MarketOutcome;
  distributablePoolEth?: number;
  winningTotalShares?: number;
  totalClaimedSettlementEth?: number;
}

export interface OpinionMarket {
  id: number;
  creator: string;
  creatorAvatar?: string;
  question: string;
  category: Exclude<MarketCategory, 'All'>;
  imageUri: string;
  sourceHandle: string;
  createdAt: number;
  totalTrades: number;
  creatorFeesEarned: number;
  yesCurve: SideCurveState;
  noCurve: SideCurveState;
  history: SentimentHistoryPoint[];
  holders?: MarketHolderEntry[];
  txHash?: string;
  isOnChain?: boolean;
  comments: MarketComment[];
  marketType?: MarketType;
  status?: MarketStatus;
  prediction?: PredictionDetails;
}

export interface TradeQuote {
  sharesDelta: number;
  netEthDelta: number;
  grossEthDelta: number;
  creatorFeeEth: number;
  protocolFeeEth: number;
  totalFeeEth: number;
  currentPriceEth: number;
  newPriceEth: number;
  priceImpactPct: number;
  newSentimentPct: number;
  minReceivedShares: number;
  minReceivedEth: number;
  belowMinimumTrade: boolean;
}


export function formatUsd(amount: number): string {
  if (!amount || isNaN(amount) || amount < 0.01) {
    return '$0.00';
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}k`;
  }
  return `$${amount.toFixed(2)}`;
}

export function formatTimeAgo(timestamp?: number | string): string {
  if (!timestamp) return 'Just now';
  let ts: number;
  if (typeof timestamp === 'string') {
    const parsedNum = Number(timestamp);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      ts = parsedNum;
    } else {
      const parsedDate = Date.parse(timestamp);
      if (!isNaN(parsedDate) && parsedDate > 0) {
        ts = parsedDate;
      } else {
        return timestamp;
      }
    }
  } else {
    ts = timestamp;
  }

  // Handle Unix seconds (Solidity block.timestamp is in seconds)
  if (ts < 10_000_000_000) {
    ts = ts * 1000;
  }

  const diff = Math.max(0, Date.now() - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function formatExactDateTime(timestamp?: number | string): string {
  if (!timestamp) return '';
  let ts = typeof timestamp === 'string' ? Number(timestamp) || Date.parse(timestamp) : timestamp;
  if (!ts || isNaN(ts)) return '';
  if (ts < 10_000_000_000) ts = ts * 1000;
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function isPredictionMarket(market: OpinionMarket): boolean {
  return market.marketType === 'RESOLVABLE_PREDICTION' || Boolean(market.prediction?.closingTime);
}

export function isTradingClosed(market: OpinionMarket): boolean {
  if (!isPredictionMarket(market)) return false;
  if (market.status && market.status !== 'ACTIVE') return true;
  if (!market.prediction?.closingTime) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= market.prediction.closingTime;
}

export function getResolutionTimeRemaining(targetTimestampSec: number): {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = targetTimestampSec - nowSec;
  if (diffSec <= 0) {
    return { isExpired: true, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: 'Closed' };
  }
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  let formatted = '';
  if (days > 0) formatted = `${days}d ${hours}h left`;
  else if (hours > 0) formatted = `${hours}h ${minutes}m left`;
  else formatted = `${minutes}m ${seconds}s left`;
  return { isExpired: false, days, hours, minutes, seconds, formatted };
}

export function calculateSettlementQuote(
  market: OpinionMarket,
  userYesShares: number,
  userNoShares: number,
  alreadyClaimed = false
): {
  isEligible: boolean;
  claimableEth: number;
  winningOutcome: MarketOutcome;
  poolEth: number;
  winningShares: number;
  reason: string;
} {
  const outcome = market.prediction?.finalOutcome || 'UNRESOLVED';
  const poolEth = (market.yesCurve.realEth || 0) + (market.noCurve.realEth || 0);

  if (alreadyClaimed) {
    return {
      isEligible: false,
      claimableEth: 0,
      winningOutcome: outcome,
      poolEth,
      winningShares: 0,
      reason: 'Reward already claimed',
    };
  }

  if (market.status === 'RESOLVED') {
    if (outcome === 'YES') {
      const winShares = market.prediction?.winningTotalShares || market.yesCurve.totalShares || 0;
      if (userYesShares > 0 && winShares > 0) {
        const claimableEth = (poolEth * userYesShares) / winShares;
        return {
          isEligible: claimableEth > 0,
          claimableEth,
          winningOutcome: outcome,
          poolEth,
          winningShares: winShares,
          reason: 'Winning YES Shares Entitlement',
        };
      }
    } else if (outcome === 'NO') {
      const winShares = market.prediction?.winningTotalShares || market.noCurve.totalShares || 0;
      if (userNoShares > 0 && winShares > 0) {
        const claimableEth = (poolEth * userNoShares) / winShares;
        return {
          isEligible: claimableEth > 0,
          claimableEth,
          winningOutcome: outcome,
          poolEth,
          winningShares: winShares,
          reason: 'Winning NO Shares Entitlement',
        };
      }
    }
  } else if (market.status === 'VOID') {
    const yesRefund = market.yesCurve.totalShares > 0 ? (market.yesCurve.realEth * userYesShares) / market.yesCurve.totalShares : 0;
    const noRefund = market.noCurve.totalShares > 0 ? (market.noCurve.realEth * userNoShares) / market.noCurve.totalShares : 0;
    const totalRefund = yesRefund + noRefund;
    return {
      isEligible: totalRefund > 0,
      claimableEth: totalRefund,
      winningOutcome: 'VOID',
      poolEth,
      winningShares: 0,
      reason: 'Proportional VOID Market Refund',
    };
  }

  return {
    isEligible: false,
    claimableEth: 0,
    winningOutcome: outcome,
    poolEth,
    winningShares: 0,
    reason: market.status === 'ACTIVE' ? 'Trading still active' : 'Awaiting resolution',
  };
}

export function getSpotPriceEth(curve: SideCurveState): number {
  return curve.virtualEth / curve.virtualShares;
}

export function getMarketPricesAndSentiment(market: OpinionMarket) {
  const yesPriceEth = getSpotPriceEth(market.yesCurve);
  const noPriceEth = getSpotPriceEth(market.noCurve);
  const sum = yesPriceEth + noPriceEth;

  const rawPoolEth = market.yesCurve.realEth + market.noCurve.realEth;
  const rawVolumeEth = market.yesCurve.volumeEth + market.noCurve.volumeEth;

  // Determine if this opinion has real external trades / votes
  const hasBeenVotedOn =
    (market.totalTrades > 1) ||
    (market.totalTrades === 1 && (market.creatorFeesEarned || 0) > 0) ||
    (market.id === 1) ||
    (rawVolumeEth > 0.002);

  const totalPoolEth = hasBeenVotedOn ? rawPoolEth : 0;
  const totalVolumeEth = hasBeenVotedOn ? rawVolumeEth : 0;

  // Conviction percentage: exact calculation for voted opinions; pristine 50.0% / 50.0% for unvoted
  let yesSentimentPct = 50.0;
  let noSentimentPct = 50.0;

  if (hasBeenVotedOn && sum > 0) {
    yesSentimentPct = (yesPriceEth / sum) * 100;
    noSentimentPct = 100 - yesSentimentPct;
  }

  // Multiplier vs genesis price (0.000001 ETH)
  const genesisPrice = INITIAL_VIRTUAL_ETH / INITIAL_VIRTUAL_SHARES;
  const yesMultiplier = hasBeenVotedOn ? yesPriceEth / genesisPrice : 1.0;
  const noMultiplier = hasBeenVotedOn ? noPriceEth / genesisPrice : 1.0;

  // 24h sentiment & price changes derived from history
  const firstPt = market.history[0];
  const prevPt = market.history[Math.max(0, market.history.length - 2)] || firstPt;
  const sentimentChange24h = (hasBeenVotedOn && firstPt) ? yesSentimentPct - firstPt.yesSentiment : 0;
  const sentimentChangeRecent = (hasBeenVotedOn && prevPt) ? yesSentimentPct - prevPt.yesSentiment : 0;

  // Controversiality score (0 to 100): highest when sentiment is near 50/50 AND both sides have high volume
  const balanceFactor = 1 - Math.abs(50 - yesSentimentPct) / 50; // 1.0 at 50/50, 0.0 at 100/0
  const volumeFactor = Math.min(1, Math.log10(1 + totalVolumeEth) / 2);
  const controversyScore = hasBeenVotedOn ? Math.round(balanceFactor * (0.5 + 0.5 * volumeFactor) * 100) : 0;

  return {
    yesPriceEth,
    noPriceEth,
    yesSentimentPct,
    noSentimentPct,
    totalPoolEth,
    totalVolumeEth,
    yesMultiplier,
    noMultiplier,
    sentimentChange24h,
    sentimentChangeRecent,
    controversyScore,
  };
}

export function quoteBuyOrder(
  market: OpinionMarket,
  isYes: boolean,
  ethIn: number,
  slippagePct = 1.0,
  creatorFeeRate = DEFAULT_CREATOR_FEE_RATE,
  protocolFeeRate = DEFAULT_PROTOCOL_FEE_RATE
): TradeQuote {
  const targetCurve = isYes ? market.yesCurve : market.noCurve;
  const otherCurve = isYes ? market.noCurve : market.yesCurve;
  const currentPriceEth = getSpotPriceEth(targetCurve);

  if (!ethIn || ethIn <= 0) {
    const metrics = getMarketPricesAndSentiment(market);
    return {
      sharesDelta: 0,
      netEthDelta: 0,
      grossEthDelta: 0,
      creatorFeeEth: 0,
      protocolFeeEth: 0,
      totalFeeEth: 0,
      currentPriceEth,
      newPriceEth: currentPriceEth,
      priceImpactPct: 0,
      newSentimentPct: metrics.yesSentimentPct,
      minReceivedShares: 0,
      minReceivedEth: 0,
      belowMinimumTrade: false,
    };
  }

  const creatorFeeEth = ethIn * creatorFeeRate;
  const protocolFeeEth = ethIn * protocolFeeRate;
  const totalFeeEth = creatorFeeEth + protocolFeeEth;
  const netEth = ethIn - totalFeeEth;

  const newRealEth = targetCurve.realEth + netEth;
  const newVirtualEth = INITIAL_VIRTUAL_ETH + newRealEth;
  const newVirtualShares = CURVE_K / newVirtualEth;
  const sharesOut = Math.max(0, targetCurve.virtualShares - newVirtualShares);
  const newPriceEth = newVirtualEth / newVirtualShares;
  const priceImpactPct = ((newPriceEth - currentPriceEth) / currentPriceEth) * 100;

  const otherPriceEth = getSpotPriceEth(otherCurve);
  const newYesPrice = isYes ? newPriceEth : otherPriceEth;
  const newNoPrice = isYes ? otherPriceEth : newPriceEth;
  const newSentimentPct = (newYesPrice / (newYesPrice + newNoPrice)) * 100;

  const minReceivedShares = sharesOut * Math.max(0, 1 - slippagePct / 100);

  return {
    sharesDelta: sharesOut,
    netEthDelta: netEth,
    grossEthDelta: ethIn,
    creatorFeeEth,
    protocolFeeEth,
    totalFeeEth,
    currentPriceEth,
    newPriceEth,
    priceImpactPct,
    newSentimentPct,
    minReceivedShares,
    minReceivedEth: 0,
    belowMinimumTrade: ethIn > 0 && ethIn < MIN_TRADE_ETH,
  };
}

export function quoteSellOrder(
  market: OpinionMarket,
  isYes: boolean,
  sharesIn: number,
  slippagePct = 1.0,
  creatorFeeRate = DEFAULT_CREATOR_FEE_RATE,
  protocolFeeRate = DEFAULT_PROTOCOL_FEE_RATE
): TradeQuote {
  const targetCurve = isYes ? market.yesCurve : market.noCurve;
  const otherCurve = isYes ? market.noCurve : market.yesCurve;
  const currentPriceEth = getSpotPriceEth(targetCurve);

  if (!sharesIn || sharesIn <= 0) {
    const metrics = getMarketPricesAndSentiment(market);
    return {
      sharesDelta: 0,
      netEthDelta: 0,
      grossEthDelta: 0,
      creatorFeeEth: 0,
      protocolFeeEth: 0,
      totalFeeEth: 0,
      currentPriceEth,
      newPriceEth: currentPriceEth,
      priceImpactPct: 0,
      newSentimentPct: metrics.yesSentimentPct,
      minReceivedShares: 0,
      minReceivedEth: 0,
      belowMinimumTrade: false,
    };
  }

  const newVirtualShares = Math.min(
    INITIAL_VIRTUAL_SHARES,
    targetCurve.virtualShares + sharesIn
  );
  const newVirtualEth = Math.max(INITIAL_VIRTUAL_ETH, CURVE_K / newVirtualShares);
  // Strict virtual reserve isolation: never exceed targetCurve.realEth
  const grossEthOut = Math.min(
    targetCurve.realEth,
    Math.max(0, targetCurve.virtualEth - newVirtualEth)
  );

  const creatorFeeEth = grossEthOut * creatorFeeRate;
  const protocolFeeEth = grossEthOut * protocolFeeRate;
  const totalFeeEth = creatorFeeEth + protocolFeeEth;
  const netEthOut = Math.max(0, grossEthOut - totalFeeEth);

  const updatedVirtualEth = INITIAL_VIRTUAL_ETH + (targetCurve.realEth - grossEthOut);
  const newPriceEth = updatedVirtualEth / newVirtualShares;
  const priceImpactPct = ((newPriceEth - currentPriceEth) / currentPriceEth) * 100;

  const otherPriceEth = getSpotPriceEth(otherCurve);
  const newYesPrice = isYes ? newPriceEth : otherPriceEth;
  const newNoPrice = isYes ? otherPriceEth : newPriceEth;
  const newSentimentPct = (newYesPrice / (newYesPrice + newNoPrice)) * 100;

  const minReceivedEth = netEthOut * Math.max(0, 1 - slippagePct / 100);

  return {
    sharesDelta: sharesIn,
    netEthDelta: netEthOut,
    grossEthDelta: grossEthOut,
    creatorFeeEth,
    protocolFeeEth,
    totalFeeEth,
    currentPriceEth,
    newPriceEth,
    priceImpactPct,
    newSentimentPct,
    minReceivedShares: 0,
    minReceivedEth,
    belowMinimumTrade: false,
  };
}

export function makeCurveStateFromReserve(
  realEth: number,
  volumeEth: number,
  buyRatio = 0.68
): SideCurveState {
  const virtualEth = INITIAL_VIRTUAL_ETH + realEth;
  const virtualShares = CURVE_K / virtualEth;
  const totalShares = INITIAL_VIRTUAL_SHARES - virtualShares;
  return {
    virtualEth,
    virtualShares,
    realEth,
    totalShares,
    volumeEth,
    buyVolumeEth: Number((volumeEth * buyRatio).toFixed(3)),
    sellVolumeEth: Number((volumeEth * (1 - buyRatio)).toFixed(3)),
    tradeCount: volumeEth > 0 ? Math.max(1, Math.round(volumeEth * 7)) : 0,
  };
}

/**
 * Transforms an atomic database market record directly into an OpinionMarket
 * for full frontend compatibility with live probability math and historical chart plotting.
 */
export function adaptBackendMarketToOpinionMarket(m: any): OpinionMarket {
  const yesPool = Number(m.yesPoolKobo || 100_000);
  const noPool = Number(m.noPoolKobo || 100_000);
  const totalPool = yesPool + noPool;
  const yesRatio = totalPool > 0 ? yesPool / totalPool : 0.5;
  const noRatio = 1 - yesRatio;
  const totalVolKobo = Number(m.totalVolumeKobo || 0);

  // Convert Naira Kobo to virtual curve units for sentiment & chart plotting
  const realEthYes = (yesPool / 100) / 4_200_000;
  const realEthNo = (noPool / 100) / 4_200_000;
  const volumeEth = (totalVolKobo / 100) / 4_200_000;

  return {
    id: Number(m.id),
    creator: m.creatorId || m.sourceHandle || 'usr_creator',
    creatorAvatar: m.creatorAvatar,
    question: m.question,
    category: (m.category as any) || 'Culture',
    imageUri: m.imageUri || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
    sourceHandle: m.sourceHandle || '@OpinionNG',
    createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    totalTrades: Math.max(1, Math.round(totalVolKobo / 50_000)),
    creatorFeesEarned: ((totalVolKobo * (m.creatorFeeBps || 150)) / 10_000) / 100,
    yesCurve: {
      virtualEth: INITIAL_VIRTUAL_ETH + realEthYes,
      virtualShares: CURVE_K / (INITIAL_VIRTUAL_ETH + realEthYes),
      realEth: realEthYes,
      totalShares: Math.round(yesPool / 100),
      volumeEth: volumeEth * yesRatio,
      buyVolumeEth: volumeEth * yesRatio,
      sellVolumeEth: 0,
      tradeCount: Math.max(1, Math.round(totalVolKobo / 100_000)),
    },
    noCurve: {
      virtualEth: INITIAL_VIRTUAL_ETH + realEthNo,
      virtualShares: CURVE_K / (INITIAL_VIRTUAL_ETH + realEthNo),
      realEth: realEthNo,
      totalShares: Math.round(noPool / 100),
      volumeEth: volumeEth * noRatio,
      buyVolumeEth: volumeEth * noRatio,
      sellVolumeEth: 0,
      tradeCount: Math.max(1, Math.round(totalVolKobo / 100_000)),
    },
    history: [
      {
        timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now() - 86400 * 1000,
        label: 'Genesis',
        yesSentiment: 50,
        yesPriceEth: 0.000001,
        noPriceEth: 0.000001,
        volumeSnapshotEth: 0,
      },
      {
        timestamp: Date.now(),
        label: 'Now',
        yesSentiment: Math.round(yesRatio * 100),
        yesPriceEth: 0.000001 + realEthYes,
        noPriceEth: 0.000001 + realEthNo,
        volumeSnapshotEth: volumeEth,
      },
    ],
    holders: [],
    comments: m.comments || [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: m.status || 'ACTIVE',
    prediction: {
      closingTime: m.closingTime ? Math.floor(new Date(m.closingTime).getTime() / 1000) : Math.floor(Date.now() / 1000) + 30 * 86400,
      resolutionDeadline: m.resolutionDeadline ? Math.floor(new Date(m.resolutionDeadline).getTime() / 1000) : Math.floor(Date.now() / 1000) + 31 * 86400,
      yesCondition: m.yesCondition || 'Event condition verified.',
      noCondition: m.noCondition || 'Event condition not met.',
      evidenceSource: m.evidenceSource || 'Official Public Record',
      proposedOutcome: m.proposedOutcome || 'UNRESOLVED',
      finalOutcome: m.finalOutcome || 'UNRESOLVED',
    },
  };
}

export const INITIAL_OPINION_MARKETS: OpinionMarket[] = [
  {
    id: 1,
    creator: 'usr_creator_burna',
    question: 'Will Dangote Refinery petrol pump price drop below ₦850/L across Lagos before Q4 2026?',
    category: 'Economy',
    imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@DangoteGroup',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    totalTrades: 38,
    creatorFeesEarned: 0.0035,
    yesCurve: makeCurveStateFromReserve(0.0068, 0.058, 0.64),
    noCurve: makeCurveStateFromReserve(0.0038, 0.032, 0.36),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 64.2, yesPriceEth: 0.0000010068, noPriceEth: 0.0000010038, volumeSnapshotEth: 0.18 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 45 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 46 * 86400,
      yesCondition: 'Retail pump prices for PMS from Dangote Refinery at registered major filling stations in Lagos fall below ₦850/L.',
      noCondition: 'Retail PMS prices remain at or above ₦850/L at closing deadline.',
      evidenceSource: 'https://majoroilmarketers.com and official NMDPRA weekly price sheets',
    },
  },
  {
    id: 2,
    creator: 'usr_creator_burna',
    question: 'Will Burna Boy, Wizkid or Davido headline the 2026 FIFA World Cup Closing Ceremony?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@burnaboy',
    createdAt: Date.now() - 1000 * 60 * 60 * 22,
    totalTrades: 42,
    creatorFeesEarned: 0.0042,
    yesCurve: makeCurveStateFromReserve(0.0084, 0.076, 0.72),
    noCurve: makeCurveStateFromReserve(0.0033, 0.028, 0.28),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 22, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 71.8, yesPriceEth: 0.0000010084, noPriceEth: 0.0000010033, volumeSnapshotEth: 0.22 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 90 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 91 * 86400,
      yesCondition: 'Burna Boy, Wizkid, or Davido is officially billed and performs as headline act at 2026 World Cup final / closing ceremony.',
      noCondition: 'None of the three headline the official closing ceremony.',
      evidenceSource: 'https://www.fifa.com/worldcup',
    },
  },
  {
    id: 3,
    creator: 'usr_demo_893240',
    question: 'Will the Super Eagles reach the Quarter-Finals or better at the 2026 FIFA World Cup?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@NGSuperEagles',
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    totalTrades: 29,
    creatorFeesEarned: 0.0028,
    yesCurve: makeCurveStateFromReserve(0.0055, 0.048, 0.55),
    noCurve: makeCurveStateFromReserve(0.0045, 0.039, 0.45),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 20, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 54.8, yesPriceEth: 0.0000010055, noPriceEth: 0.0000010045, volumeSnapshotEth: 0.15 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 120 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 121 * 86400,
      yesCondition: 'Nigeria senior national team qualifies for round of 8 (Quarter-Finals) or better in 2026 World Cup tournament.',
      noCondition: 'Nigeria is eliminated in group stage, round of 32/16, or fails to participate.',
      evidenceSource: 'https://www.fifa.com',
    },
  },
  {
    id: 4,
    creator: 'usr_demo_893240',
    question: 'Will official NAFEM USD/NGN exchange rate strengthen below ₦1,400/$ in 2026?',
    category: 'Economy',
    imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@cenbank',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    totalTrades: 34,
    creatorFeesEarned: 0.0031,
    yesCurve: makeCurveStateFromReserve(0.0048, 0.042, 0.51),
    noCurve: makeCurveStateFromReserve(0.0046, 0.040, 0.49),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 18, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 51.2, yesPriceEth: 0.0000010048, noPriceEth: 0.0000010046, volumeSnapshotEth: 0.16 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 60 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 61 * 86400,
      yesCondition: 'Official NAFEM closing weighted-average FX rate prints below ₦1,400.00/USD on any official CBN trading day before year end.',
      noCondition: 'NAFEM rate remains above ₦1,400.00/USD throughout the observation window.',
      evidenceSource: 'https://fmdqgroup.com and CBN official market summary',
    },
  },
  {
    id: 5,
    creator: 'usr_creator_burna',
    question: 'Will INEC mandate 100% digital voter accreditation and real-time portal upload for the 2027 General Elections?',
    category: 'Politics',
    imageUri: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@inecnigeria',
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
    totalTrades: 22,
    creatorFeesEarned: 0.0019,
    yesCurve: makeCurveStateFromReserve(0.0062, 0.054, 0.62),
    noCurve: makeCurveStateFromReserve(0.0038, 0.033, 0.38),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 16, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 61.9, yesPriceEth: 0.0000010062, noPriceEth: 0.0000010038, volumeSnapshotEth: 0.12 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 90 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 91 * 86400,
      yesCondition: 'INEC formally issues electoral guidelines making electronic accreditation and IReV polling unit transmission mandatory without manual bypass.',
      noCondition: 'INEC regulations retain discretionary manual accreditation fallbacks.',
      evidenceSource: 'https://inecnigeria.org/regulations',
    },
  },
  {
    id: 6,
    creator: 'usr_demo_893240',
    question: 'Will Moniepoint or OPay execute an IPO listing on the Nigerian Exchange (NGX) before 2027?',
    category: 'Tech',
    imageUri: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@MoniepointNG',
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    totalTrades: 27,
    creatorFeesEarned: 0.0024,
    yesCurve: makeCurveStateFromReserve(0.0058, 0.051, 0.58),
    noCurve: makeCurveStateFromReserve(0.0042, 0.037, 0.42),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 14, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 57.8, yesPriceEth: 0.0000010058, noPriceEth: 0.0000010042, volumeSnapshotEth: 0.14 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 80 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 81 * 86400,
      yesCondition: 'Moniepoint or OPay shares commence official public trading on the Nigerian Exchange main or premium board.',
      noCondition: 'Neither firm executes an NGX public listing before closing date.',
      evidenceSource: 'https://ngxgroup.com/listings',
    },
  },
  {
    id: 7,
    creator: 'usr_creator_burna',
    question: 'Will Victor Osimhen win the 2026 CAF African Footballer of the Year award?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@victorosimhen9',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    totalTrades: 31,
    creatorFeesEarned: 0.0029,
    yesCurve: makeCurveStateFromReserve(0.0072, 0.064, 0.67),
    noCurve: makeCurveStateFromReserve(0.0036, 0.031, 0.33),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 12, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 66.8, yesPriceEth: 0.0000010072, noPriceEth: 0.0000010036, volumeSnapshotEth: 0.17 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 70 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 71 * 86400,
      yesCondition: 'Confederation of African Football (CAF) officially confers Men Player of the Year 2026 on Victor Osimhen.',
      noCondition: 'Any other nominee wins the award.',
      evidenceSource: 'https://www.cafonline.com',
    },
  },
  {
    id: 8,
    creator: 'usr_demo_893240',
    question: 'Will Big Brother Naija Season 10 set an all-time voting record exceeding 1.5 Billion votes?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@BBNaija',
    createdAt: Date.now() - 1000 * 60 * 60 * 10,
    totalTrades: 25,
    creatorFeesEarned: 0.0022,
    yesCurve: makeCurveStateFromReserve(0.0065, 0.058, 0.63),
    noCurve: makeCurveStateFromReserve(0.0039, 0.034, 0.37),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 10, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 62.7, yesPriceEth: 0.0000010065, noPriceEth: 0.0000010039, volumeSnapshotEth: 0.13 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 50 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 51 * 86400,
      yesCondition: 'MultiChoice and Deloitte audit figures verify total cast votes for BBNaija Season 10 exceed 1,500,000,000.',
      noCondition: 'Total verified votes remain under 1.5 Billion.',
      evidenceSource: 'https://www.dstv.com/africamagic/en-ng/show/big-brother-naija',
    },
  },
  {
    id: 9,
    creator: 'usr_demo_893240',
    question: 'Will the Central Bank of Nigeria (CBN) cut the Monetary Policy Rate (MPR) below 25% in 2026?',
    category: 'Economy',
    imageUri: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@cenbank',
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    totalTrades: 21,
    creatorFeesEarned: 0.0018,
    yesCurve: makeCurveStateFromReserve(0.0044, 0.039, 0.47),
    noCurve: makeCurveStateFromReserve(0.0050, 0.044, 0.53),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 8, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 46.8, yesPriceEth: 0.0000010044, noPriceEth: 0.0000010050, volumeSnapshotEth: 0.11 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 40 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 41 * 86400,
      yesCondition: 'CBN Monetary Policy Committee communique announces an official MPR reduction below 25.00%.',
      noCondition: 'MPR remains at 25.00% or higher at all 2026 MPC sessions.',
      evidenceSource: 'https://www.cbn.gov.ng/MonetaryPolicy/mpc.asp',
    },
  },
  {
    id: 10,
    creator: 'usr_creator_burna',
    question: 'Will Lagos Rail Mass Transit Red Line surpass 500,000 daily passenger trips before end of 2026?',
    category: 'Economy',
    imageUri: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@followlasg',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    totalTrades: 19,
    creatorFeesEarned: 0.0016,
    yesCurve: makeCurveStateFromReserve(0.0052, 0.046, 0.54),
    noCurve: makeCurveStateFromReserve(0.0044, 0.039, 0.46),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 6, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 54.2, yesPriceEth: 0.0000010052, noPriceEth: 0.0000010044, volumeSnapshotEth: 0.10 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 11,
    creator: 'usr_creator_burna',
    question: 'Will a Nollywood theatrical release gross over ₦2 Billion at the West African box office in 2026?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@FilmhouseCinema',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    totalTrades: 26,
    creatorFeesEarned: 0.0023,
    yesCurve: makeCurveStateFromReserve(0.0076, 0.068, 0.69),
    noCurve: makeCurveStateFromReserve(0.0034, 0.030, 0.31),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 5, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 69.1, yesPriceEth: 0.0000010076, noPriceEth: 0.0000010034, volumeSnapshotEth: 0.14 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 12,
    creator: 'usr_demo_893240',
    question: 'Will Starlink Nigeria active high-speed satellite broadband subscriptions exceed 250,000 before 2027?',
    category: 'Tech',
    imageUri: 'https://images.unsplash.com/photo-1517976487507-5b3a4a0346a0?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@SpaceXStarlink',
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    totalTrades: 18,
    creatorFeesEarned: 0.0015,
    yesCurve: makeCurveStateFromReserve(0.0064, 0.057, 0.62),
    noCurve: makeCurveStateFromReserve(0.0039, 0.035, 0.38),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 4, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 62.1, yesPriceEth: 0.0000010064, noPriceEth: 0.0000010039, volumeSnapshotEth: 0.095 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 13,
    creator: 'usr_creator_burna',
    question: 'Will Nigeria officially secure UNESCO Intangible Cultural Heritage status for Jollof Rice before 2027?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@UNESCO',
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    totalTrades: 23,
    creatorFeesEarned: 0.0020,
    yesCurve: makeCurveStateFromReserve(0.0059, 0.052, 0.59),
    noCurve: makeCurveStateFromReserve(0.0041, 0.036, 0.41),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 3, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 59.0, yesPriceEth: 0.0000010059, noPriceEth: 0.0000010041, volumeSnapshotEth: 0.12 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 14,
    creator: 'usr_demo_893240',
    question: 'Will Anthony Joshua fight an officially sanctioned heavyweight championship bout in Nigeria before end of 2027?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@anthonyjoshua',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    totalTrades: 30,
    creatorFeesEarned: 0.0026,
    yesCurve: makeCurveStateFromReserve(0.0056, 0.050, 0.56),
    noCurve: makeCurveStateFromReserve(0.0044, 0.039, 0.44),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 2, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 56.0, yesPriceEth: 0.0000010056, noPriceEth: 0.0000010044, volumeSnapshotEth: 0.14 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 110 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 111 * 86400,
      yesCondition: 'An officially sanctioned professional heavyweight bout featuring Anthony Joshua is staged in an arena or stadium in Nigeria.',
      noCondition: 'No official professional bout takes place within Nigeria before the deadline.',
      evidenceSource: 'https://boxrec.com',
    },
  },
];