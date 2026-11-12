// X-Style Recommendation & Randomization Algorithm for Tired.Fun
// Scores markets by real conviction volume, debates/comments, and engagement velocity,
// with controlled stochastic jitter to ensure dynamic discovery on every refresh.

import { OpinionMarket, getMarketPricesAndSentiment } from './bondingCurve';

export interface ScoredMarket {
  market: OpinionMarket;
  score: number;
  commentsCount: number;
  likesCount: number;
  isTrendingHero: boolean;
}

/**
 * Computes an algorithmic engagement score matching X (Twitter) For You timeline logic:
 * - High weight for debate depth (comments)
 * - Capital conviction on Robinhood Chain (volume & real ETH locked)
 * - Controversy factor (dual-curve 50/50 balance)
 * - Exponential decay for older markets (48h half-life)
 * - Pseudo-random perturbation (±15%) seeded per refresh session
 */
export function calculateXScore(
  market: OpinionMarket,
  likesCount: number,
  sessionSeed: number
): number {
  const commentsCount = market.comments ? market.comments.length : 0;
  const volumeEth = (market.yesCurve?.volumeEth || 0) + (market.noCurve?.volumeEth || 0);
  const tradesCount = market.totalTrades || 0;

  // Controversy multiplier: higher when YES vs NO is close to 50/50
  const { yesSentimentPct } = getMarketPricesAndSentiment(market);
  const controversy = Math.max(0, 1 - Math.abs(yesSentimentPct - 50) / 50);

  // Recency decay (48h half-life)
  const ageHours = Math.max(0.1, (Date.now() - (market.createdAt || Date.now())) / (1000 * 3600));
  const recencyWeight = Math.max(0.2, Math.exp(-ageHours / 48));

  // Raw engagement calculation
  const rawScore =
    commentsCount * 30 +        // In-depth debates have top weight
    likesCount * 6 +            // Social approval
    tradesCount * 18 +          // Trading frequency
    volumeEth * 250 +           // Real ETH capital locked
    controversy * 50;           // High-stake controversial debates

  // Deterministic pseudo-random jitter seeded per session
  // Ensures fresh, randomized discovery like X timeline
  const pseudoRand = Math.abs(Math.sin(sessionSeed * 37 + market.id * 17));
  const jitter = 0.85 + pseudoRand * 0.30;

  return (rawScore * recencyWeight + 15) * jitter;
}

/**
 * Sorts and randomizes markets according to the X recommendation algorithm
 */
export function rankMarketsXStyle(
  markets: OpinionMarket[],
  likesMap: Record<number, { count: number; liked: boolean }>,
  sessionSeed: number
): OpinionMarket[] {
  const scored = markets.map((m) => {
    const likes = likesMap[m.id]?.count || 0;
    const score = calculateXScore(m, likes, sessionSeed);
    return { market: m, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.market);
}

/**
 * Identifies the top trending hero market based on 24h interaction intensity
 */
export function getTopTrendingMarket(
  markets: OpinionMarket[],
  likesMap: Record<number, { count: number; liked: boolean }>
): OpinionMarket | null {
  if (markets.length === 0) return null;

  let bestMarket = markets[0];
  let highestIntensity = -1;

  for (const m of markets) {
    const likes = likesMap[m.id]?.count || 0;
    const comments = m.comments ? m.comments.length : 0;
    const volume = (m.yesCurve?.volumeEth || 0) + (m.noCurve?.volumeEth || 0);
    const trades = m.totalTrades || 0;

    const intensity = comments * 20 + likes * 5 + volume * 150 + trades * 10;
    if (intensity > highestIntensity) {
      highestIntensity = intensity;
      bestMarket = m;
    }
  }

  return bestMarket;
}

