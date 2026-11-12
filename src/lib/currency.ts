/**
 * OpinionNG Currency & Financial Arithmetic Utility
 * 
 * All monetary amounts are stored and calculated internally as INTEGERS IN KOBO
 * to eliminate floating-point calculation and rounding discrepancies:
 * 1 NGN = 100 Kobo
 * 
 * Share Pricing Scale:
 * ₦1.00 to ₦100.00 (100 Kobo to 10,000 Kobo)
 * Representing 1% to 100% implied outcome probability.
 * 1 Winning Share settles at exactly ₦100.00 (10,000 Kobo).
 */

export const KOBO_PER_NAIRA = 100;
export const MAX_SHARE_PAYOUT_KOBO = 100 * KOBO_PER_NAIRA; // 10,000 Kobo = ₦100.00
export const MIN_SHARE_PRICE_KOBO = 1 * KOBO_PER_NAIRA; // 100 Kobo = ₦1.00
export const MAX_SHARE_PRICE_KOBO = 99 * KOBO_PER_NAIRA; // 9,900 Kobo = ₦99.00
export const DEFAULT_DEMO_BALANCE_KOBO = 10_000 * KOBO_PER_NAIRA; // ₦10,000 = 1,000,000 Kobo

export interface NGNFormatOptions {
  showKobo?: boolean;
  compact?: boolean;
  prefix?: string;
}

/**
 * Converts Naira decimal input to integer Kobo.
 */
export function nairaToKobo(naira: number): number {
  if (isNaN(naira) || !naira) return 0;
  return Math.round(naira * KOBO_PER_NAIRA);
}

/**
 * Converts integer Kobo to Naira decimal representation.
 */
export function koboToNaira(kobo: number): number {
  if (!kobo || isNaN(kobo)) return 0;
  return kobo / KOBO_PER_NAIRA;
}

/**
 * Standard Nigerian Naira formatting with the currency sign ₦.
 * Examples:
 * - 500000 kobo -> ₦5,000
 * - 4550 kobo -> ₦45.50
 * - 250000000 kobo -> ₦2.5M (compact mode)
 */
export function formatNGN(kobo: number, options: NGNFormatOptions = {}): string {
  const { showKobo = false, compact = false, prefix = '₦' } = options;

  if (kobo === undefined || kobo === null || isNaN(kobo)) {
    return `${prefix}0`;
  }

  const naira = koboToNaira(kobo);

  if (compact) {
    if (Math.abs(naira) >= 1_000_000_000) {
      return `${prefix}${(naira / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(naira) >= 1_000_000) {
      return `${prefix}${(naira / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(naira) >= 1_000) {
      return `${prefix}${(naira / 1_000).toFixed(1)}k`;
    }
  }

  const hasDecimal = kobo % KOBO_PER_NAIRA !== 0 || showKobo;
  const formattedNumber = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(naira);

  return `${prefix}${formattedNumber}`;
}

/**
 * Format share price representing probability (1 Kobo = 0.01% -> 10,000 Kobo = 100%)
 */
export function formatSharePrice(priceKobo: number): string {
  const boundedPrice = Math.max(MIN_SHARE_PRICE_KOBO, Math.min(MAX_SHARE_PRICE_KOBO, priceKobo));
  const naira = koboToNaira(boundedPrice);
  return `₦${naira.toFixed(2)}`;
}

/**
 * Calculate implied probabilities from dual curve state
 */
export function calculateProbability(
  yesPoolKobo: number,
  noPoolKobo: number
): { yesPct: number; noPct: number; yesPriceKobo: number; noPriceKobo: number } {
  const total = yesPoolKobo + noPoolKobo;
  if (total <= 0) {
    return {
      yesPct: 50.0,
      noPct: 50.0,
      yesPriceKobo: 50 * KOBO_PER_NAIRA,
      noPriceKobo: 50 * KOBO_PER_NAIRA,
    };
  }

  const yesPct = Number(((yesPoolKobo / total) * 100).toFixed(1));
  const noPct = Number((100 - yesPct).toFixed(1));

  // 1 winning share pays ₦100 (10,000 Kobo)
  const yesPriceKobo = Math.round((yesPct / 100) * MAX_SHARE_PAYOUT_KOBO);
  const noPriceKobo = Math.round((noPct / 100) * MAX_SHARE_PAYOUT_KOBO);

  return { yesPct, noPct, yesPriceKobo, noPriceKobo };
}
