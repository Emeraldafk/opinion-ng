import React from 'react';
import { Play, Flame, Target, Clock, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  OpinionMarket,
  getMarketPricesAndSentiment,
  formatTimeAgo,
  formatExactDateTime,
  isPredictionMarket,
  isTradingClosed,
  getResolutionTimeRemaining,
} from '../lib/bondingCurve';
import { formatNGN } from '../lib/currency';

interface MarketCardProps {
  market: OpinionMarket;
  userYesShares?: number;
  userNoShares?: number;
  onSelect: (market: OpinionMarket, defaultSide?: 'YES' | 'NO') => void;
  onQuickTrade?: (marketId: number, isYes: boolean, ethAmount: number) => void;
  variant?: 'vertical' | 'horizontal' | 'highlight';
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-[#FF6B00] to-orange-500',
    'from-teal-400 to-emerald-600',
    'from-sky-400 to-blue-600',
    'from-rose-400 to-pink-600',
    'from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-700',
    'from-fuchsia-400 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onSelect,
  variant = 'vertical',
}) => {
  const {
    yesSentimentPct,
    noSentimentPct,
    totalPoolEth,
    totalVolumeEth,
  } = getMarketPricesAndSentiment(market);

  const isPrediction = isPredictionMarket(market);
  const tradingClosed = isTradingClosed(market);

  // Time remaining calculation for predictions
  const timeRemaining = market.prediction?.closingTime
    ? getResolutionTimeRemaining(market.prediction.closingTime)
    : null;

  // NGN Kobo calculations (1 ETH = ~₦4,200,000 / 420,000,000 Kobo)
  const poolKoboVal = Math.round(totalPoolEth * 4_200_000 * 100);
  const volumeKoboVal = Math.round(totalVolumeEth * 4_200_000 * 100);

  // Format creator handle/address
  const creatorDisplay = market.sourceHandle
    ? market.sourceHandle.replace('@', '')
    : market.creator;

  const timeAgo = formatTimeAgo(market.createdAt);

  // Status badge renderer for predictions
  const renderStatusBadge = () => {
    if (!isPrediction) {
      return (
        <span className="flex items-center gap-1 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#53b3d4]">
          <Flame className="h-3 w-3 text-[#227c9d]" />
          <span>Opinion</span>
        </span>
      );
    }

    const st = market.status || 'ACTIVE';

    if (st === 'RESOLVED') {
      const outcome = market.prediction?.finalOutcome || 'YES';
      return (
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
            outcome === 'YES'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-orange-500/30 bg-orange-500/10 text-orange-300'
          }`}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Resolved {outcome}</span>
        </span>
      );
    }

    if (st === 'VOID') {
      return (
        <span className="flex items-center gap-1 rounded-full border border-gray-500/30 bg-gray-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-300">
          <ShieldAlert className="h-3 w-3 text-amber-400" />
          <span>Void (Refunds Open)</span>
        </span>
      );
    }

    if (st === 'DISPUTED') {
      return (
        <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          <span>Disputed</span>
        </span>
      );
    }

    if (st === 'PROPOSED') {
      return (
        <span className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300">
          <Clock className="h-3 w-3" />
          <span>Proposed: {market.prediction?.proposedOutcome}</span>
        </span>
      );
    }

    if (tradingClosed) {
      return (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
          <Clock className="h-3 w-3" />
          <span>Closed (Awaiting Proposal)</span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#FF8A33]">
        <Target className="h-3 w-3 text-[#FF6B00]" />
        <span>{timeRemaining ? timeRemaining.formatted : 'Prediction'}</span>
      </span>
    );
  };

  // HIGHLIGHT VARIANT
  if (variant === 'highlight') {
    return (
      <div
        onClick={() => onSelect(market)}
        className="group relative flex cursor-pointer flex-col md:flex-row overflow-hidden rounded-[24px] border border-[#262838] bg-gradient-to-br from-[#161622] via-[#14141c] to-[#0f0f15] transition-all duration-200 hover:-translate-y-1 hover:border-[#38384f] hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] h-full"
      >
        {/* Left Media Section */}
        <div className="relative h-56 sm:h-64 md:h-auto md:w-[45%] shrink-0 overflow-hidden bg-[#0c0c11]">
          {market.imageUri ? (
            <img
              src={market.imageUri}
              alt={market.question}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1c1c27] text-4xl font-black text-[#227c9d]">
              POV
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/50" />

          {/* Top Left Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#FF6B00] backdrop-blur-md border border-[#FF6B00]/30 shadow-md">
              <span>🔥</span>
              <span>Trending</span>
            </div>
            {renderStatusBadge()}
          </div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl transition-transform duration-300 group-hover:scale-110">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
          </div>

          {market.sourceHandle && (
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md border border-white/10">
              {market.sourceHandle}
            </div>
          )}
        </div>

        {/* Right Content Section */}
        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#8c8c9e] mb-2.5">
              <div className="flex items-center gap-2 max-w-[60%] sm:max-w-[65%] truncate">
                <div
                  className={`h-6 w-6 shrink-0 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                    creatorDisplay
                  )} flex items-center justify-center text-[10px] font-black text-white shadow-inner`}
                >
                  {creatorDisplay.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-xs font-bold text-white">
                  {creatorDisplay}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#8c8c9e] shrink-0">
                <span className="rounded-full bg-[#20202c] px-2 py-0.5 text-slate-300 font-semibold text-[10px] sm:text-[11px]">
                  {market.category}
                </span>
                <span>•</span>
                <span title={formatExactDateTime(market.createdAt)}>{timeAgo}</span>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-black leading-snug text-white transition-colors group-hover:text-[#53b3d4] line-clamp-3">
              {market.question}
            </h3>
          </div>

          {/* Bottom Area */}
          <div className="mt-5">
            <div className="mb-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="block text-[11px] font-medium text-[#7a7a8c]">
                  {isPrediction ? 'Pari-Mutuel Pool' : 'Pool'}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-white">
                  {formatNGN(poolKoboVal, { compact: true })}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-medium text-[#7a7a8c]">Volume</span>
                <span className="font-mono text-sm sm:text-base font-bold text-white">
                  {formatNGN(volumeKoboVal, { compact: true })}
                </span>
              </div>
            </div>

            {/* Trading Buttons or Settlement Action */}
            {tradingClosed ? (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market);
                  }}
                  className="w-full rounded-[14px] border border-[#FF6B00]/40 bg-[#FF6B00]/15 py-3 text-xs sm:text-sm font-bold text-[#FF8A33] transition hover:bg-[#FF6B00]/25"
                >
                  {market.status === 'RESOLVED' || market.status === 'VOID'
                    ? '🎯 View Settlement Payouts & Claims'
                    : '🔒 Trading Closed • View Resolution'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market, 'YES');
                  }}
                  className="flex items-center justify-center rounded-[14px] bg-[#227c9d] py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#1a647f] active:scale-[0.98]"
                >
                  Yes
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market, 'NO');
                  }}
                  className="flex items-center justify-center rounded-[14px] bg-[#FF6B00] py-3 text-sm font-extrabold text-[#111116] shadow-sm transition hover:bg-[#EA580C] active:scale-[0.98]"
                >
                  No
                </button>
              </div>
            )}

            {/* Sentiment Bar */}
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
        </div>
      </div>
    );
  }

  // VERTICAL VARIANT
  if (variant === 'vertical') {
    return (
      <div
        onClick={() => onSelect(market)}
        className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[22px] border border-[#222230] bg-[#14141c] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#353548] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] h-full"
      >
        <div>
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-[#8c8c9e]">
            <div className="flex items-center gap-1.5 sm:gap-2 max-w-[58%] sm:max-w-[62%] truncate">
              <div
                className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                  creatorDisplay
                )} flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-inner`}
              >
                {creatorDisplay.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-xs font-bold text-white/95">
                {creatorDisplay}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-[#8c8c9e] shrink-0">
              <span>{market.category}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
          </div>

          {/* Type & Status Badge */}
          <div className="mt-2.5 flex items-center gap-1.5">
            {renderStatusBadge()}
          </div>

          {/* Question Title */}
          <h3 className="mt-2.5 line-clamp-2 min-h-[44px] text-[15px] sm:text-base font-bold leading-snug text-white transition-colors group-hover:text-[#53b3d4]">
            {market.question}
          </h3>
        </div>

        {/* Bottom Area */}
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <div>
              <span className="block text-[11px] font-medium text-[#7a7a8c]">
                {isPrediction ? 'Pari-Mutuel Pool' : 'Pool'}
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {formatNGN(poolKoboVal, { compact: true })}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] font-medium text-[#7a7a8c]">Volume</span>
              <span className="font-mono text-sm font-bold text-white">
                {formatNGN(volumeKoboVal, { compact: true })}
              </span>
            </div>
          </div>

          {tradingClosed ? (
            <div className="mb-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(market);
                }}
                className="w-full rounded-[14px] border border-[#FF6B00]/40 bg-[#FF6B00]/15 py-2.5 text-xs font-bold text-[#FF8A33] transition hover:bg-[#FF6B00]/25"
              >
                {market.status === 'RESOLVED' || market.status === 'VOID'
                  ? '🎯 View Settlement & Claims'
                  : '🔒 Trading Closed'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(market, 'YES');
                }}
                className="flex items-center justify-center rounded-[14px] bg-[#227c9d] py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#1a647f] active:scale-[0.98]"
              >
                Yes
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(market, 'NO');
                }}
                className="flex items-center justify-center rounded-[14px] bg-[#FF6B00] py-2.5 text-sm font-extrabold text-[#111116] shadow-sm transition hover:bg-[#EA580C] active:scale-[0.98]"
              >
                No
              </button>
            </div>
          )}

          <div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#252533]">
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
      </div>
    );
  }

  // HORIZONTAL / LIST VARIANT
  return (
    <div
      onClick={() => onSelect(market)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] border border-[#22222d] bg-[#15151c] transition-all duration-200 hover:-translate-y-1 hover:border-[#333344] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
    >
      <div className="flex flex-col sm:flex-row h-full">
        {/* Left Thumbnail */}
        <div className="relative h-48 sm:h-auto sm:w-44 shrink-0 overflow-hidden bg-[#0c0c11]">
          {market.imageUri ? (
            <img
              src={market.imageUri}
              alt={market.question}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1c1c27] text-3xl font-black text-[#227c9d]">
              POV
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
          </div>

          {market.sourceHandle && (
            <div className="absolute bottom-2.5 left-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
              {market.sourceHandle}
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-[#8c8c9e]">
              <div className="flex items-center gap-1.5 font-medium truncate max-w-[160px]">
                <div
                  className={`h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                    creatorDisplay
                  )} flex items-center justify-center text-[8px] font-bold text-white`}
                >
                  {creatorDisplay.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-white font-semibold">
                  {creatorDisplay}
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium text-[11px]">
                {renderStatusBadge()}
                <span className="rounded-full bg-[#20202c] px-2 py-0.5 text-slate-300 font-semibold">
                  {market.category}
                </span>
                <span>• {timeAgo}</span>
              </div>
            </div>

            <h3 className="line-clamp-2 text-[15px] sm:text-base font-bold leading-snug text-white transition-colors group-hover:text-[#53b3d4]">
              {market.question}
            </h3>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between text-xs">
              <div>
                <span className="block text-[11px] font-medium text-[#7a7a8c]">
                  {isPrediction ? 'Pari-Mutuel Pool' : 'Pool'}
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {formatNGN(poolKoboVal, { compact: true })}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-medium text-[#7a7a8c]">Volume</span>
                <span className="font-mono text-xs font-bold text-white">
                  {formatNGN(volumeKoboVal, { compact: true })}
                </span>
              </div>
            </div>

            {tradingClosed ? (
              <div className="mb-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market);
                  }}
                  className="w-full rounded-[14px] border border-[#FF6B00]/40 bg-[#FF6B00]/15 py-2.5 text-xs font-bold text-[#FF8A33] transition hover:bg-[#FF6B00]/25"
                >
                  {market.status === 'RESOLVED' || market.status === 'VOID'
                    ? '🎯 View Settlement Payouts'
                    : '🔒 Trading Closed'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market, 'YES');
                  }}
                  className="flex items-center justify-center rounded-[14px] bg-[#227c9d] py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#1a647f] active:scale-[0.98]"
                >
                  Yes
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(market, 'NO');
                  }}
                  className="flex items-center justify-center rounded-[14px] bg-[#FF6B00] py-2.5 text-sm font-extrabold text-[#111116] shadow-sm transition hover:bg-[#EA580C] active:scale-[0.98]"
                >
                  No
                </button>
              </div>
            )}

            <div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#252533]">
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
        </div>
      </div>
    </div>
  );
};
