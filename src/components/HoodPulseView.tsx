import React, { useState, useMemo } from 'react';
import {
  Activity,
  Flame,
  TrendingUp,
  Zap,
  AlertCircle,
  ExternalLink,
  Filter,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Clock,
  Scale,
} from 'lucide-react';
import {
  OpinionMarket,
  TradeActivity,
  MarketCategory,
  getMarketPricesAndSentiment,
} from '../lib/bondingCurve';
import { ROBINHOOD_EXPLORER_URL } from '../config/robinhoodChain';

interface HoodPulseViewProps {
  markets: OpinionMarket[];
  activities: TradeActivity[];
  isLiveOnChainMode: boolean;
  onSelectMarket: (market: OpinionMarket, side?: 'YES' | 'NO') => void;
}

type PulseTxFilter =
  | 'ALL'
  | 'WHALE'
  | 'BUYS'
  | 'SELLS'
  | 'SENTIMENT_SHIFT'
  | 'NEW_MARKET';

type TimeWindowFilter = '1H' | '6H' | '24H' | 'ALL';
type SourceFilter = 'ALL' | 'ONCHAIN_ONLY' | 'SANDBOX_ONLY';

export const HoodPulseView: React.FC<HoodPulseViewProps> = ({
  markets,
  activities,
  isLiveOnChainMode,
  onSelectMarket,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory>('All');
  const [marketFilter, setMarketFilter] = useState<number | 'ALL'>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<PulseTxFilter>('ALL');
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');

  const now = Date.now();

  // Filtered activity stream
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const m = markets.find((x) => x.id === act.marketId);
      const cat = act.category || m?.category || 'Trending';

      if (categoryFilter !== 'All' && cat !== categoryFilter) return false;
      if (marketFilter !== 'ALL' && act.marketId !== marketFilter) return false;

      if (txTypeFilter === 'WHALE' && act.ethAmount < 0.25) return false;
      if (txTypeFilter === 'BUYS' && !act.isBuy) return false;
      if (txTypeFilter === 'SELLS' && act.isBuy) return false;
      if (
        txTypeFilter === 'SENTIMENT_SHIFT' &&
        Math.abs(act.sentimentDeltaPct || 0) < 3 &&
        act.ethAmount < 0.3
      ) {
        return false;
      }
      if (txTypeFilter === 'NEW_MARKET' && act.eventType !== 'NEW_MARKET') return false;

      if (sourceFilter === 'ONCHAIN_ONLY' && !act.txHash) return false;
      if (sourceFilter === 'SANDBOX_ONLY' && act.txHash) return false;

      const ageMs = now - act.timestamp;
      if (timeWindow === '1H' && ageMs > 3600_000) return false;
      if (timeWindow === '6H' && ageMs > 6 * 3600_000) return false;
      if (timeWindow === '24H' && ageMs > 24 * 3600_000) return false;

      return true;
    });
  }, [
    activities,
    markets,
    categoryFilter,
    marketFilter,
    txTypeFilter,
    sourceFilter,
    timeWindow,
    now,
  ]);

  // Derived Intelligence Widgets
  const controversialMarkets = useMemo(() => {
    return [...markets]
      .map((m) => ({ market: m, metrics: getMarketPricesAndSentiment(m) }))
      .sort((a, b) => b.metrics.controversyScore - a.metrics.controversyScore)
      .slice(0, 3);
  }, [markets]);

  const suddenSentimentMovers = useMemo(() => {
    return [...markets]
      .map((m) => ({ market: m, metrics: getMarketPricesAndSentiment(m) }))
      .sort(
        (a, b) =>
          Math.abs(b.metrics.sentimentChange24h) - Math.abs(a.metrics.sentimentChange24h)
      )
      .slice(0, 3);
  }, [markets]);

  const topCreators = useMemo(() => {
    const map = new Map<
      string,
      { creator: string; handle: string; count: number; volumeEth: number; feesEth: number }
    >();
    for (const m of markets) {
      const prev = map.get(m.creator) || {
        creator: m.creator,
        handle: m.sourceHandle || '@creator',
        count: 0,
        volumeEth: 0,
        feesEth: 0,
      };
      prev.count += 1;
      prev.volumeEth += m.yesCurve.volumeEth + m.noCurve.volumeEth;
      prev.feesEth += m.creatorFeesEarned;
      map.set(m.creator, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.volumeEth - a.volumeEth);
  }, [markets]);

  const newDiscoveries = useMemo(() => {
    return [...markets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  }, [markets]);

  const categories: MarketCategory[] = [
    'All',
    'AI',
    'Crypto',
    'Culture',
    'DeFi',
    'Other',
    'Politics',
    'Sports',
    'Robinhood',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner - POV Pill & Box Styling */}
      <div className="relative overflow-hidden rounded-[28px] border border-[#1c313a] bg-gradient-to-r from-[#0e1c24] via-[#121218] to-[#161622] p-6 sm:p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/15 px-3.5 py-1 text-xs font-fun font-bold text-[#53b3d4]">
              <Activity className="h-3.5 w-3.5 text-[#227c9d]" />
              <span>TIRED PULSE • LIVE CONVICTION & ANOMALY RADAR</span>
            </div>
            <h2 className="text-2xl font-fun font-bold text-white sm:text-3xl">
              Real-Time Opinion Activity & Whale Feeds
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs text-slate-300">
              Every event displayed in Tired Pulse originates from either a verified Robinhood
              Chain Testnet transaction (<code className="font-mono text-[#53b3d4]">Chain ID 46630</code>) or an explicitly tagged Sandbox
              simulation—transparent and verifiable.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-fun font-bold ${
              isLiveOnChainMode
                ? 'border-[#227c9d]/40 bg-[#227c9d]/15 text-[#53b3d4]'
                : 'border-[#FF6B00]/40 bg-[#FF6B00]/15 text-orange-300'
            }`}
          >
            {isLiveOnChainMode ? (
              <>
                <ShieldCheck className="h-4 w-4 text-[#227c9d]" />
                <span>FEED: VERIFIED ON-CHAIN (46630)</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-[#FF6B00]" />
                <span>FEED: SANDBOX SIMULATION</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 Intelligence Summary Cards: Sudden Sentiment Shifts, Most Controversial, Emerging Discoveries */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Sudden Sentiment Surges */}
        <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-lg">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-fun font-bold uppercase tracking-wider text-[#227c9d]">
              <Zap className="h-4 w-4" />
              Sudden Sentiment Shifts
            </span>
            <span className="font-mono text-[10px] text-slate-400">24h Delta</span>
          </div>
          <div className="space-y-2.5">
            {suddenSentimentMovers.map(({ market, metrics }) => {
              const isPos = metrics.sentimentChange24h >= 0;
              return (
                <button
                  key={market.id}
                  onClick={() => onSelectMarket(market)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5 text-left transition hover:border-[#227c9d]/50 hover:bg-[#11222b]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-fun font-bold text-white">
                      {market.question}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      Now <span className="text-[#227c9d] font-bold">{metrics.yesSentimentPct.toFixed(1)}% YES</span> •{' '}
                      {metrics.totalVolumeEth.toFixed(1)} ETH Vol
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
                      isPos
                        ? 'bg-[#227c9d]/20 text-[#53b3d4] border border-[#227c9d]/30'
                        : 'bg-[#FF6B00]/20 text-[#FF8A33] border border-[#FF6B00]/30'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {metrics.sentimentChange24h.toFixed(1)}% YES
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Most Controversial Markets (50/50 Dual-Curve Heat) */}
        <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-lg">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-fun font-bold uppercase tracking-wider text-[#FF6B00]">
              <Scale className="h-4 w-4" />
              Most Controversial
            </span>
            <span className="font-mono text-[10px] text-slate-400">50/50 Heat</span>
          </div>
          <div className="space-y-2.5">
            {controversialMarkets.map(({ market, metrics }) => (
              <button
                key={market.id}
                onClick={() => onSelectMarket(market)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5 text-left transition hover:border-[#FF6B00]/50 hover:bg-[#1c1815]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-fun font-bold text-white">
                    {market.question}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                    YES {metrics.yesSentimentPct.toFixed(1)}% / NO{' '}
                    {metrics.noSentimentPct.toFixed(1)}% • Dual Liquidity
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30 px-2.5 py-1 font-mono text-xs font-bold text-[#FF8A33]">
                  {metrics.controversyScore}/100
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Most Active Creators */}
        <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-lg">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-fun font-bold uppercase tracking-wider text-[#53b3d4]">
              <Award className="h-4 w-4" />
              Most Active Creators
            </span>
            <span className="font-mono text-[10px] text-slate-400">By Attracted Volume</span>
          </div>
          <div className="space-y-2.5">
            {topCreators.slice(0, 3).map((c, idx) => (
              <div
                key={c.creator}
                className="flex items-center justify-between rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#227c9d]/20 border border-[#227c9d]/30 font-fun text-xs font-bold text-[#53b3d4]">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-fun text-xs font-bold text-white">
                      {c.creator}{' '}
                      <span className="text-[11px] font-normal text-slate-400">
                        ({c.handle})
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {c.count} market{c.count > 1 ? 's' : ''} • Earned{' '}
                      {c.feesEth.toFixed(3)} ETH
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#227c9d]">
                  {c.volumeEth.toFixed(1)} ETH
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar for Live Pulse Stream */}
      <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-4 sm:p-5 shadow-lg">
        <div className="mb-3.5 flex items-center gap-2 text-xs font-fun font-bold uppercase tracking-wider text-slate-300">
          <Filter className="h-4 w-4 text-[#227c9d]" />
          <span>Filter Tired Pulse Activity Stream</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Category Filter */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as MarketCategory)}
              className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-3.5 py-2 text-xs font-fun font-bold text-white focus:border-[#227c9d] focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Market Filter */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400">
              Specific Market
            </label>
            <select
              value={marketFilter}
              onChange={(e) =>
                setMarketFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-3.5 py-2 text-xs font-fun font-bold text-white focus:border-[#227c9d] focus:outline-none"
            >
              <option value="ALL">All Markets ({markets.length})</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} — {m.question.slice(0, 32)}...
                </option>
              ))}
            </select>
          </div>

          {/* Transaction / Event Type Filter */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400">
              Event Type
            </label>
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value as PulseTxFilter)}
              className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-3.5 py-2 text-xs font-fun font-bold text-white focus:border-[#227c9d] focus:outline-none"
            >
              <option value="ALL">All Verified Events</option>
              <option value="WHALE">Large Conviction Flows (&ge; 0.25 ETH)</option>
              <option value="BUYS">Curve Buys Only</option>
              <option value="SELLS">Curve Sells Only</option>
              <option value="SENTIMENT_SHIFT">High Sentiment Impact</option>
              <option value="NEW_MARKET">New Market Discoveries</option>
            </select>
          </div>

          {/* Time Window Filter */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400">
              Time Horizon
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as TimeWindowFilter)}
              className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-3.5 py-2 text-xs font-fun font-bold text-white focus:border-[#227c9d] focus:outline-none"
            >
              <option value="1H">Last 1 Hour</option>
              <option value="6H">Last 6 Hours</option>
              <option value="24H">Last 24 Hours</option>
              <option value="ALL">All Recorded History</option>
            </select>
          </div>

          {/* Verification Origin Filter */}
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400">
              Verification Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="w-full rounded-full border border-[#232330] bg-[#0b0c10] px-3.5 py-2 text-xs font-fun font-bold text-white focus:border-[#227c9d] focus:outline-none"
            >
              <option value="ALL">All (On-Chain + Sandbox)</option>
              <option value="ONCHAIN_ONLY">On-Chain Verified Tx Only</option>
              <option value="SANDBOX_ONLY">Sandbox Events Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Event Feed (8 cols) + New Discoveries & Trending Opinions (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-fun font-bold text-white">
              Verified Conviction & Order Flow Stream ({filteredActivities.length})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              Latest block & transaction order
            </span>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-8 text-center text-xs text-slate-400 font-sans">
              No events match the active filter combination. Try expanding the time window or
              clearing filters.
            </div>
          ) : (
            filteredActivities.map((act) => {
              const isWhale = act.ethAmount >= 0.25;
              const marketObj = markets.find((m) => m.id === act.marketId);
              return (
                <div
                  key={act.id}
                  onClick={() => marketObj && onSelectMarket(marketObj)}
                  className={`flex cursor-pointer flex-col justify-between gap-3 rounded-[20px] border p-4 transition sm:flex-row sm:items-center ${
                    isWhale
                      ? 'border-[#227c9d]/50 bg-gradient-to-r from-[#11232d] to-[#161620] shadow-[0_0_20px_rgba(34,124,157,0.15)]'
                      : 'border-[#232330] bg-[#161620] hover:border-[#227c9d]/40 hover:bg-[#11222b]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isWhale && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#227c9d]/20 border border-[#227c9d]/40 px-2.5 py-0.5 font-fun text-[11px] font-bold text-[#53b3d4]">
                          <Flame className="h-3 w-3 text-[#227c9d]" />
                          WHALE CONVICTION FLOW
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                          act.isYes
                            ? 'bg-[#227c9d]/20 text-[#53b3d4] border border-[#227c9d]/30'
                            : 'bg-[#FF6B00]/20 text-[#FF8A33] border border-[#FF6B00]/30'
                        }`}
                      >
                        {act.isBuy ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {act.isBuy ? 'BUY' : 'SELL'} {act.isYes ? 'YES' : 'NO'}
                      </span>

                      <span className="font-mono text-xs font-bold text-white">
                        {act.ethAmount.toFixed(4)} ETH
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        ({act.sharesAmount.toFixed(0)} shares)
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">
                        by {act.trader}
                      </span>
                    </div>

                    <div className="truncate text-sm font-fun font-bold text-white hover:text-[#227c9d] transition">
                      Market #{act.marketId}: “{act.marketQuestion}”
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
                      <span>Post-Trade Sentiment: <strong className="text-white">{act.yesSentimentAfter.toFixed(1)}% YES</strong></span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.max(1, Math.round((now - act.timestamp) / 1000))}s ago
                      </span>
                    </div>
                  </div>

                  {/* Verification Badge */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {act.txHash ? (
                      <a
                        href={`${ROBINHOOD_EXPLORER_URL}/tx/${act.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#227c9d]/40 bg-[#227c9d]/15 px-3 py-1 font-mono text-[10px] font-bold text-[#53b3d4] hover:bg-[#227c9d]/25 transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[#227c9d]" />
                        <span>ON-CHAIN TX</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/15 px-3 py-1 font-mono text-[10px] font-bold text-orange-300">
                        <span>SANDBOX EVENT</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Sidebar: New Market Discoveries & Emerging Trends */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-lg">
            <h3 className="mb-3.5 flex items-center gap-2 text-xs font-fun font-bold uppercase tracking-wider text-[#227c9d]">
              <Sparkles className="h-4 w-4" />
              New Market Discoveries
            </h3>
            <div className="space-y-3">
              {newDiscoveries.map((m) => {
                const metrics = getMarketPricesAndSentiment(m);
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMarket(m)}
                    className="cursor-pointer rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5 transition hover:border-[#227c9d]/40 hover:bg-[#11222b]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="rounded-full bg-[#227c9d]/20 px-2.5 py-0.5 text-[10px] font-fun font-bold text-[#53b3d4]">
                        {m.category}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        by {m.creator}
                      </span>
                    </div>
                    <div className="mb-2 text-xs font-fun font-bold text-white line-clamp-2">{m.question}</div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#227c9d] font-bold">
                        YES: {metrics.yesSentimentPct.toFixed(1)}%
                      </span>
                      <span className="text-slate-300">
                        Pool: {metrics.totalPoolEth.toFixed(2)} ETH
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-lg">
            <h3 className="mb-3.5 flex items-center gap-2 text-xs font-fun font-bold uppercase tracking-wider text-white">
              <TrendingUp className="h-4 w-4 text-[#FF6B00]" />
              Trending Opinions & Theses
            </h3>
            <div className="space-y-2.5">
              {markets
                .flatMap((m) =>
                  m.comments.map((c) => ({
                    ...c,
                    market: m,
                  }))
                )
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectMarket(item.market)}
                    className="cursor-pointer rounded-2xl border border-[#232330] bg-[#0f1015] p-3 text-xs transition hover:border-[#227c9d]/30 hover:bg-[#11222b]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-fun font-bold text-white">{item.author}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          item.side === 'YES'
                            ? 'bg-[#227c9d]/20 text-[#53b3d4]'
                            : 'bg-[#FF6B00]/20 text-[#FF8A33]'
                        }`}
                      >
                        {item.side} ({(item.sharesHeld / 1000).toFixed(1)}k)
                      </span>
                    </div>
                    <p className="line-clamp-2 text-slate-300">“{item.text}”</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
