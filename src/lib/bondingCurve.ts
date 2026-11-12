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
  | 'AI'
  | 'Crypto'
  | 'Culture'
  | 'DeFi'
  | 'Other'
  | 'Politics'
  | 'Sports'
  | 'Robinhood'
  | 'AI & Tech'
  | 'Markets';

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

export const INITIAL_OPINION_MARKETS: OpinionMarket[] = [
  {
    id: 1,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Robinhood Chain flip Base in daily retail opinion & socialFi transactions this cycle?',
    category: 'Robinhood',
    imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@vladtenev',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    totalTrades: 12,
    creatorFeesEarned: 0.00072,
    yesCurve: makeCurveStateFromReserve(0.0049, 0.042, 0.52),
    noCurve: makeCurveStateFromReserve(0.0046, 0.038, 0.48),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 51.6, yesPriceEth: 0.0000010049, noPriceEth: 0.0000010046, volumeSnapshotEth: 0.08 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 2,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Are autonomous AI trading agents better capital allocators than human CT influencers?',
    category: 'AI',
    imageUri: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@sama',
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    totalTrades: 9,
    creatorFeesEarned: 0.00054,
    yesCurve: makeCurveStateFromReserve(0.0062, 0.054, 0.62),
    noCurve: makeCurveStateFromReserve(0.0038, 0.031, 0.38),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 20, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 62.0, yesPriceEth: 0.0000010062, noPriceEth: 0.0000010038, volumeSnapshotEth: 0.085 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 3,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Bitcoin cross $150,000 before the end of the current post-halving macroeconomic cycle?',
    category: 'Crypto',
    imageUri: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@saylor',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    totalTrades: 15,
    creatorFeesEarned: 0.00098,
    yesCurve: makeCurveStateFromReserve(0.0078, 0.071, 0.68),
    noCurve: makeCurveStateFromReserve(0.0036, 0.027, 0.32),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 18, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 68.4, yesPriceEth: 0.0000010078, noPriceEth: 0.0000010036, volumeSnapshotEth: 0.098 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 4,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Robinhood Chain mainnet TVL surpass $500,000,000 USD before November 2026?',
    category: 'Robinhood',
    imageUri: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@robinhoodapp',
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
    totalTrades: 8,
    creatorFeesEarned: 0.00048,
    yesCurve: makeCurveStateFromReserve(0.0041, 0.038, 0.54),
    noCurve: makeCurveStateFromReserve(0.0035, 0.032, 0.46),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 16, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 53.9, yesPriceEth: 0.0000010041, noPriceEth: 0.0000010035, volumeSnapshotEth: 0.07 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 14 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 15 * 86400,
      yesCondition: 'Robinhood Chain TVL on DefiLlama reaches or exceeds $500,000,000 USD prior to closing timestamp.',
      noCondition: 'Robinhood Chain TVL remains below $500,000,000 USD at closing timestamp.',
      evidenceSource: 'https://defillama.com/chain/Robinhood',
    },
  },
  {
    id: 5,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Ethereum L1 finalize the Pectra upgrade before December 31, 2026?',
    category: 'Crypto',
    imageUri: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@vitalikbuterin',
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    totalTrades: 7,
    creatorFeesEarned: 0.00044,
    yesCurve: makeCurveStateFromReserve(0.0051, 0.044, 0.58),
    noCurve: makeCurveStateFromReserve(0.0037, 0.031, 0.42),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 14, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 57.9, yesPriceEth: 0.0000010051, noPriceEth: 0.0000010037, volumeSnapshotEth: 0.075 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 30 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 31 * 86400,
      yesCondition: 'Ethereum consensus clients successfully activate Pectra on mainnet beacon chain.',
      noCondition: 'Pectra mainnet activation has not occurred by closing deadline.',
      evidenceSource: 'https://ethereum.org and Etherscan',
    },
  },
  {
    id: 6,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will an AI agent hold an autonomous multi-million dollar on-chain treasury audited by a top firm?',
    category: 'AI',
    imageUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@emostaque',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    totalTrades: 6,
    creatorFeesEarned: 0.00036,
    yesCurve: makeCurveStateFromReserve(0.0042, 0.036, 0.52),
    noCurve: makeCurveStateFromReserve(0.0039, 0.033, 0.48),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 12, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 51.8, yesPriceEth: 0.0000010042, noPriceEth: 0.0000010039, volumeSnapshotEth: 0.069 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 45 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 46 * 86400,
      yesCondition: 'A publicly verified smart contract owned strictly by an autonomous agent key holds >= $2M USD with published audit.',
      noCondition: 'No verifiable agent treasury meets all criteria before resolution date.',
      evidenceSource: 'https://etherscan.io and official audit report',
    },
  },
  {
    id: 7,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Manchester United score 3 or more goals in their next Premier League match?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@nullhood_xyz',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    totalTrades: 11,
    creatorFeesEarned: 0.00068,
    yesCurve: makeCurveStateFromReserve(0.0035, 0.034, 0.44),
    noCurve: makeCurveStateFromReserve(0.0052, 0.046, 0.56),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 24, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 40.2, yesPriceEth: 0.0000010035, noPriceEth: 0.0000010052, volumeSnapshotEth: 0.08 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 3 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 4 * 86400,
      disputeDeadline: Math.floor(Date.now() / 1000) + 5 * 86400,
      yesCondition: 'Manchester United scores 3 or more official goals in full-time regulation play.',
      noCondition: 'Manchester United scores fewer than 3 goals.',
      evidenceSource: 'https://www.premierleague.com/match-results',
    },
  },
  {
    id: 8,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Robinhood launch native 24/7 tokenized US equities trading directly on Robinhood Chain in 2026?',
    category: 'Robinhood',
    imageUri: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@vladtenev',
    createdAt: Date.now() - 1000 * 60 * 60 * 10,
    totalTrades: 14,
    creatorFeesEarned: 0.00088,
    yesCurve: makeCurveStateFromReserve(0.0084, 0.076, 0.72),
    noCurve: makeCurveStateFromReserve(0.0033, 0.026, 0.28),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 10, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 71.8, yesPriceEth: 0.0000010084, noPriceEth: 0.0000010033, volumeSnapshotEth: 0.102 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 9,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Solana DEX daily volume sustainably exceed Ethereum mainnet volume throughout Q3 2026?',
    category: 'Crypto',
    imageUri: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@aeyakovenko',
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    totalTrades: 10,
    creatorFeesEarned: 0.00062,
    yesCurve: makeCurveStateFromReserve(0.0055, 0.048, 0.56),
    noCurve: makeCurveStateFromReserve(0.0043, 0.038, 0.44),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 8, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 56.1, yesPriceEth: 0.0000010055, noPriceEth: 0.0000010043, volumeSnapshotEth: 0.086 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 10,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Base and Robinhood Chain settle cross-chain native intent messaging by Q4 2026?',
    category: 'Crypto',
    imageUri: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@brian_armstrong',
    createdAt: Date.now() - 1000 * 60 * 60 * 7,
    totalTrades: 6,
    creatorFeesEarned: 0.00038,
    yesCurve: makeCurveStateFromReserve(0.0044, 0.038, 0.54),
    noCurve: makeCurveStateFromReserve(0.0037, 0.032, 0.46),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 7, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 54.3, yesPriceEth: 0.0000010044, noPriceEth: 0.0000010037, volumeSnapshotEth: 0.07 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 11,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will an autonomous reasoning AI agent successfully discover and patch an undisclosed zero-day in EVM core in 2026?',
    category: 'AI',
    imageUri: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@darioamodei',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    totalTrades: 8,
    creatorFeesEarned: 0.00052,
    yesCurve: makeCurveStateFromReserve(0.0058, 0.051, 0.59),
    noCurve: makeCurveStateFromReserve(0.0040, 0.035, 0.41),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 6, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 59.2, yesPriceEth: 0.0000010058, noPriceEth: 0.0000010040, volumeSnapshotEth: 0.086 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 12,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will perpetual opinion markets with dual bonding curves surpass traditional CLOB prediction volume by Q4 2026?',
    category: 'DeFi',
    imageUri: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@hasufl',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    totalTrades: 16,
    creatorFeesEarned: 0.00112,
    yesCurve: makeCurveStateFromReserve(0.0092, 0.082, 0.69),
    noCurve: makeCurveStateFromReserve(0.0041, 0.037, 0.31),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 69.2, yesPriceEth: 0.0000010092, noPriceEth: 0.0000010041, volumeSnapshotEth: 0.119 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 13,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will total on-chain tokenized US Treasuries and Real-World Assets (RWA) surpass $25 Billion in 2026?',
    category: 'DeFi',
    imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@brian_armstrong',
    createdAt: Date.now() - 1000 * 60 * 60 * 15,
    totalTrades: 12,
    creatorFeesEarned: 0.00084,
    yesCurve: makeCurveStateFromReserve(0.0076, 0.068, 0.65),
    noCurve: makeCurveStateFromReserve(0.0041, 0.036, 0.35),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 15, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 65.0, yesPriceEth: 0.0000010076, noPriceEth: 0.0000010041, volumeSnapshotEth: 0.104 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 14,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Uniswap v4 dynamic hook-based pools capture over 50% of decentralized exchange volume by Q4 2026?',
    category: 'DeFi',
    imageUri: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@haydenzadams',
    createdAt: Date.now() - 1000 * 60 * 60 * 11,
    totalTrades: 9,
    creatorFeesEarned: 0.00058,
    yesCurve: makeCurveStateFromReserve(0.0059, 0.052, 0.58),
    noCurve: makeCurveStateFromReserve(0.0043, 0.038, 0.42),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 11, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 57.8, yesPriceEth: 0.0000010059, noPriceEth: 0.0000010043, volumeSnapshotEth: 0.09 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 15,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Grand Theft Auto VI generate more than $1.2 Billion in worldwide gross retail sales within 48 hours?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@ign',
    createdAt: Date.now() - 1000 * 60 * 60 * 22,
    totalTrades: 18,
    creatorFeesEarned: 0.00135,
    yesCurve: makeCurveStateFromReserve(0.0112, 0.098, 0.76),
    noCurve: makeCurveStateFromReserve(0.0035, 0.031, 0.24),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 22, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 76.2, yesPriceEth: 0.0000010112, noPriceEth: 0.0000010035, volumeSnapshotEth: 0.129 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 16,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Tired Genesis 5,555 digital collectibles maintain a floor price above 0.5 ETH on Robinhood Chain?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@TheTiredFun',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    totalTrades: 14,
    creatorFeesEarned: 0.00096,
    yesCurve: makeCurveStateFromReserve(0.0088, 0.078, 0.70),
    noCurve: makeCurveStateFromReserve(0.0038, 0.034, 0.30),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 18, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 69.8, yesPriceEth: 0.0000010088, noPriceEth: 0.0000010038, volumeSnapshotEth: 0.112 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 17,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will an AI-generated musician or pop track reach Billboard Top 10 Streaming charts in 2026?',
    category: 'Culture',
    imageUri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@billboard',
    createdAt: Date.now() - 1000 * 60 * 60 * 13,
    totalTrades: 8,
    creatorFeesEarned: 0.00051,
    yesCurve: makeCurveStateFromReserve(0.0049, 0.043, 0.53),
    noCurve: makeCurveStateFromReserve(0.0043, 0.038, 0.47),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 13, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 53.3, yesPriceEth: 0.0000010049, noPriceEth: 0.0000010043, volumeSnapshotEth: 0.081 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 18,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will the US SEC approve in-kind redemptions and staking rewards for US-listed Ethereum spot ETFs in 2026?',
    category: 'Politics',
    imageUri: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@tier10k',
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    totalTrades: 13,
    creatorFeesEarned: 0.00085,
    yesCurve: makeCurveStateFromReserve(0.0074, 0.065, 0.64),
    noCurve: makeCurveStateFromReserve(0.0042, 0.037, 0.36),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 20, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 63.8, yesPriceEth: 0.0000010074, noPriceEth: 0.0000010042, volumeSnapshotEth: 0.102 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 19,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will the US Federal Reserve announce a total of more than 50 bps in benchmark interest rate cuts by December 2026?',
    category: 'Politics',
    imageUri: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@federalreserve',
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
    totalTrades: 10,
    creatorFeesEarned: 0.00062,
    yesCurve: makeCurveStateFromReserve(0.0056, 0.049, 0.55),
    noCurve: makeCurveStateFromReserve(0.0046, 0.040, 0.45),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 16, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 54.9, yesPriceEth: 0.0000010056, noPriceEth: 0.0000010046, volumeSnapshotEth: 0.089 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 20,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will a comprehensive federal digital asset market structure framework pass both houses of US Congress in 2026?',
    category: 'Politics',
    imageUri: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@coincenter',
    createdAt: Date.now() - 1000 * 60 * 60 * 11,
    totalTrades: 7,
    creatorFeesEarned: 0.00045,
    yesCurve: makeCurveStateFromReserve(0.0048, 0.042, 0.52),
    noCurve: makeCurveStateFromReserve(0.0044, 0.038, 0.48),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 11, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 52.2, yesPriceEth: 0.0000010048, noPriceEth: 0.0000010044, volumeSnapshotEth: 0.08 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 21,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will Real Madrid win their 16th UEFA Champions League title in the 2025/2026 season?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@championsleague',
    createdAt: Date.now() - 1000 * 60 * 60 * 21,
    totalTrades: 12,
    creatorFeesEarned: 0.00078,
    yesCurve: makeCurveStateFromReserve(0.0069, 0.061, 0.61),
    noCurve: makeCurveStateFromReserve(0.0044, 0.039, 0.39),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 21, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 61.1, yesPriceEth: 0.0000010069, noPriceEth: 0.0000010044, volumeSnapshotEth: 0.1 }
    ],
    holders: [],
    comments: [],
    marketType: 'RESOLVABLE_PREDICTION',
    status: 'ACTIVE',
    prediction: {
      closingTime: Math.floor(Date.now() / 1000) + 120 * 86400,
      resolutionDeadline: Math.floor(Date.now() / 1000) + 121 * 86400,
      yesCondition: 'Real Madrid is officially crowned UEFA Champions League tournament winners for the 2025/2026 competition.',
      noCondition: 'Any other club wins the final or Real Madrid is eliminated prior to victory.',
      evidenceSource: 'https://www.uefa.com/uefachampionsleague/',
    },
  },
  {
    id: 22,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will the 2026 FIFA World Cup in North America set an all-time tournament gross attendance record?',
    category: 'Sports',
    imageUri: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@fifaworldcup',
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    totalTrades: 9,
    creatorFeesEarned: 0.00056,
    yesCurve: makeCurveStateFromReserve(0.0063, 0.055, 0.64),
    noCurve: makeCurveStateFromReserve(0.0035, 0.031, 0.36),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 14, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 64.3, yesPriceEth: 0.0000010063, noPriceEth: 0.0000010035, volumeSnapshotEth: 0.086 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 23,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will SpaceX achieve a fully reusable Starship orbital commercial payload deployment without incident in 2026?',
    category: 'Other',
    imageUri: 'https://images.unsplash.com/photo-1517976487504-59a1a0841234?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@elonmusk',
    createdAt: Date.now() - 1000 * 60 * 60 * 23,
    totalTrades: 17,
    creatorFeesEarned: 0.00124,
    yesCurve: makeCurveStateFromReserve(0.0104, 0.092, 0.73),
    noCurve: makeCurveStateFromReserve(0.0038, 0.034, 0.27),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 23, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 73.2, yesPriceEth: 0.0000010104, noPriceEth: 0.0000010038, volumeSnapshotEth: 0.126 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
  {
    id: 24,
    creator: '0xa58dc16645b481D8AF2f095613944C2254311972',
    question: 'Will commercial humanoid robots (Figure 02 / Tesla Optimus) be deployed in over 500 manufacturing facilities before 2027?',
    category: 'Other',
    imageUri: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
    sourceHandle: '@adcock_brett',
    createdAt: Date.now() - 1000 * 60 * 60 * 17,
    totalTrades: 10,
    creatorFeesEarned: 0.00067,
    yesCurve: makeCurveStateFromReserve(0.0061, 0.054, 0.58),
    noCurve: makeCurveStateFromReserve(0.0044, 0.039, 0.42),
    history: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 17, label: 'Genesis', yesSentiment: 50, yesPriceEth: 0.000001, noPriceEth: 0.000001, volumeSnapshotEth: 0 },
      { timestamp: Date.now(), label: 'Now', yesSentiment: 58.1, yesPriceEth: 0.0000010061, noPriceEth: 0.0000010044, volumeSnapshotEth: 0.093 }
    ],
    holders: [],
    comments: [],
    marketType: 'PERPETUAL_OPINION',
    status: 'ACTIVE',
  },
];