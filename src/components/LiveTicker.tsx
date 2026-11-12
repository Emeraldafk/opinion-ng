import React from 'react';
import { Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { TradeActivity } from '../lib/bondingCurve';

interface LiveTickerProps {
  activities: TradeActivity[];
  onSelectMarket: (marketId: number) => void;
}

export const LiveTicker: React.FC<LiveTickerProps> = ({ activities, onSelectMarket }) => {
  const items = activities.length > 0 ? [...activities, ...activities] : [];

  return (
    <div className="relative overflow-hidden w-full max-w-[100vw] border-b border-[#1f1f2a] bg-[#0c0c11] py-2">
      <div className="flex items-center w-full min-w-0">
        <div className="z-10 flex shrink-0 items-center gap-1.5 border-r border-[#20202c] bg-[#0c0c11] px-3 sm:px-4 py-0.5 text-xs font-bold text-[#53b3d4]">
          <Sparkles className="h-3.5 w-3.5 text-[#227c9d]" />
          <span className="hidden sm:inline">POV Tape</span>
        </div>

        <div className="overflow-hidden min-w-0 flex-1 w-full">
          <div className="animate-marquee flex items-center gap-6 px-4">
            {items.map((act, idx) => (
              <button
                key={`${act.id}-${idx}`}
                onClick={() => onSelectMarket(act.marketId)}
                className="flex shrink-0 items-center gap-2 rounded-full border border-[#22222f] bg-[#14141c] px-3 py-1 text-xs transition hover:border-[#333346] hover:bg-[#1a1a24]"
              >
                <span className="font-semibold text-slate-300">{act.trader}</span>
                <span className="text-[11px] text-[#7a7a8c]">
                  {act.isBuy ? 'bought' : 'sold'}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    act.isYes
                      ? 'bg-[#227c9d]/20 text-[#53b3d4]'
                      : 'bg-[#FF6B00]/20 text-orange-300'
                  }`}
                >
                  {act.isBuy ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {act.ethAmount.toFixed(3)} ETH {act.isYes ? 'YES' : 'NO'}
                </span>
                <span className="max-w-[210px] truncate text-xs font-semibold text-white">
                  “{act.marketQuestion}”
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
