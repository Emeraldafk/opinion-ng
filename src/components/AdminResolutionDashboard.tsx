import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Scale,
  Award,
  Filter,
  Search,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  OpinionMarket,
  isPredictionMarket,
  isTradingClosed,
  formatExactDateTime,
  formatTimeAgo,
  getResolutionTimeRemaining,
  MarketOutcome,
  MarketStatus,
} from '../lib/bondingCurve';
import { shortenAddress, ROBINHOOD_EXPLORER_URL } from '../config/robinhoodChain';

interface AdminResolutionDashboardProps {
  markets: OpinionMarket[];
  walletAddress: string | null;
  contractAddress: string;
  onProposeOutcome: (
    marketId: number,
    outcome: 'YES' | 'NO' | 'VOID',
    evidenceUrl: string
  ) => Promise<void>;
  onDisputeOutcome: (marketId: number, counterEvidenceUrl: string) => Promise<void>;
  onResolveMarket: (
    marketId: number,
    outcome: 'YES' | 'NO' | 'VOID',
    evidenceUrl: string
  ) => Promise<void>;
  onEmergencyCancel: (marketId: number, reason: string) => Promise<void>;
  onSelectMarket: (market: OpinionMarket) => void;
  onRefreshMarkets?: () => Promise<void>;
}

export const AdminResolutionDashboard: React.FC<AdminResolutionDashboardProps> = ({
  markets,
  walletAddress,
  contractAddress,
  onProposeOutcome,
  onDisputeOutcome,
  onResolveMarket,
  onEmergencyCancel,
  onSelectMarket,
  onRefreshMarkets,
}) => {
  const [filterTab, setFilterTab] = useState<
    'all' | 'needs-proposal' | 'dispute-window' | 'disputed' | 'finalized'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Proposal modal state
  const [activeActionMarket, setActiveActionMarket] = useState<OpinionMarket | null>(null);
  const [actionType, setActionType] = useState<
    'PROPOSE' | 'DISPUTE' | 'RESOLVE' | 'CANCEL' | null
  >(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO' | 'VOID'>('YES');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter only prediction markets
  const predictionMarkets = markets.filter(isPredictionMarket);

  const filteredMarkets = predictionMarkets.filter((m) => {
    const isClosed = isTradingClosed(m);
    const st = m.status || 'ACTIVE';

    if (filterTab === 'needs-proposal') {
      return (st === 'CLOSED' || (st === 'ACTIVE' && isClosed));
    }
    if (filterTab === 'dispute-window') {
      return st === 'PROPOSED';
    }
    if (filterTab === 'disputed') {
      return st === 'DISPUTED';
    }
    if (filterTab === 'finalized') {
      return st === 'RESOLVED' || st === 'VOID';
    }
    return true;
  }).filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.question.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenAction = (
    market: OpinionMarket,
    type: 'PROPOSE' | 'DISPUTE' | 'RESOLVE' | 'CANCEL'
  ) => {
    setActiveActionMarket(market);
    setActionType(type);
    setSelectedOutcome('YES');
    setEvidenceUrl(market.prediction?.evidenceSource || '');
    setActionReason('');
    setActionError(null);
  };

  const handleCloseAction = () => {
    setActiveActionMarket(null);
    setActionType(null);
    setIsSubmitting(false);
    setActionError(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionMarket || !actionType) return;
    setActionError(null);

    // Creator anti-manipulation boundary enforcement
    if (
      walletAddress &&
      activeActionMarket.creator.toLowerCase() === walletAddress.toLowerCase() &&
      (actionType === 'PROPOSE' || actionType === 'RESOLVE')
    ) {
      setActionError(
        'Anti-Manipulation Rule: Smart contract reverts if creator resolves own market. Please switch to an authorized resolver wallet.'
      );
      return;
    }

    if (!evidenceUrl.trim() && actionType !== 'CANCEL') {
      setActionError('Please provide a verifiable evidence source URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === 'PROPOSE') {
        await onProposeOutcome(activeActionMarket.id, selectedOutcome, evidenceUrl.trim());
      } else if (actionType === 'DISPUTE') {
        await onDisputeOutcome(activeActionMarket.id, evidenceUrl.trim());
      } else if (actionType === 'RESOLVE') {
        await onResolveMarket(activeActionMarket.id, selectedOutcome, evidenceUrl.trim());
      } else if (actionType === 'CANCEL') {
        await onEmergencyCancel(
          activeActionMarket.id,
          actionReason.trim() || 'Emergency cancellation / unresolvable criteria'
        );
      }
      handleCloseAction();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setActionError(msg.slice(0, 150));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerRefresh = async () => {
    if (!onRefreshMarkets || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshMarkets();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Metrics
  const totalPredictions = predictionMarkets.length;
  const awaitingProposalCount = predictionMarkets.filter(
    (m) => (m.status === 'CLOSED' || (m.status === 'ACTIVE' && isTradingClosed(m)))
  ).length;
  const inDisputeWindowCount = predictionMarkets.filter((m) => m.status === 'PROPOSED').length;
  const disputedCount = predictionMarkets.filter((m) => m.status === 'DISPUTED').length;
  const finalizedCount = predictionMarkets.filter((m) => m.status === 'RESOLVED' || m.status === 'VOID').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-[#FF6B00]/30 bg-gradient-to-br from-[#1c1410] via-[#161214] to-[#0c0c11] p-4 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-3 py-1 font-mono text-[11px] sm:text-xs font-bold text-[#FF8A33]">
                <Scale className="h-3.5 w-3.5 text-[#FF6B00]" />
                <span>Phase 4 • Prediction Adjudication</span>
              </span>
              <span className="rounded-full bg-[#20202c] px-3 py-1 font-mono text-[11px] sm:text-xs text-slate-300">
                Robinhood Chain • 46630
              </span>
            </div>
            <h1 className="font-fun text-xl sm:text-3xl font-black text-white">
              Prediction Resolution & Governance Engine
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Decentralized and oracle-compatible adjudication pipeline: <strong>ACTIVE</strong> → <strong>CLOSED</strong> → <strong>PROPOSED</strong> → <strong>DISPUTED</strong> → <strong>RESOLVED / VOID</strong>.
              All settlements backed by mathematically solvent Pari-Mutuel pools.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {onRefreshMarkets && (
              <button
                onClick={handleTriggerRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#232330] bg-[#161620] px-4 py-2.5 font-fun text-xs font-bold text-white transition hover:bg-[#20202c] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 text-[#FF6B00] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync Contract</span>
              </button>
            )}
            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/30 p-3 text-xs text-orange-200 flex items-start gap-2 max-w-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#FF6B00] mt-0.5" />
              <span>
                <strong>Anti-Manipulation Guard:</strong> Smart contract strictly blocks market creators from proposing or finalizing their own outcomes.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#232330] bg-[#14141c] p-3.5 sm:p-4">
          <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-[#8c8c9e]">All Predictions</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-white">{totalPredictions}</span>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-4">
          <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-amber-300">Awaiting Proposal</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-amber-300">{awaitingProposalCount}</span>
        </div>
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-3.5 sm:p-4">
          <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-purple-300">Dispute Window</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-purple-300">{inDisputeWindowCount}</span>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 sm:p-4">
          <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-rose-300">Disputed</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-rose-300">{disputedCount}</span>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4">
          <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-emerald-300">Settled & Claimable</span>
          <span className="font-mono text-xl sm:text-2xl font-black text-emerald-300">{finalizedCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#232330] pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-[#FF6B00] text-black shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            All ({totalPredictions})
          </button>
          <button
            onClick={() => setFilterTab('needs-proposal')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'needs-proposal'
                ? 'bg-[#FF6B00] text-black shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            Needs Proposal ({awaitingProposalCount})
          </button>
          <button
            onClick={() => setFilterTab('dispute-window')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'dispute-window'
                ? 'bg-[#FF6B00] text-black shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            Dispute Window ({inDisputeWindowCount})
          </button>
          <button
            onClick={() => setFilterTab('disputed')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'disputed'
                ? 'bg-[#FF6B00] text-black shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            Disputed ({disputedCount})
          </button>
          <button
            onClick={() => setFilterTab('finalized')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'finalized'
                ? 'bg-[#FF6B00] text-black shadow-sm'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
            }`}
          >
            Finalized ({finalizedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a7a8c]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prediction questions..."
            className="w-full sm:w-64 rounded-full border border-[#232330] bg-[#14141c] pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#7a7a8c] focus:border-[#FF6B00] focus:outline-none"
          />
        </div>
      </div>

      {/* Prediction Markets Table */}
      <div className="overflow-hidden rounded-[24px] border border-[#232330] bg-[#14141c]">
        {filteredMarkets.length === 0 ? (
          <div className="p-12 text-center text-[#8c8c9e]">
            <Scale className="mx-auto h-8 w-8 text-[#FF6B00] mb-2 opacity-50" />
            <p className="font-fun text-base font-bold text-white">No Prediction Markets in this Category</p>
            <p className="text-xs text-[#8c8c9e] mt-1">
              Select another status filter or spawn a new prediction market above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="border-b border-[#232330] bg-[#0c0c11] text-[#8c8c9e]">
                <tr>
                  <th className="px-5 py-3.5 font-bold uppercase">Market & Question</th>
                  <th className="px-4 py-3.5 font-bold uppercase">Status</th>
                  <th className="px-4 py-3.5 font-bold uppercase">Pari-Mutuel Pool</th>
                  <th className="px-4 py-3.5 font-bold uppercase">Closing Time (UTC)</th>
                  <th className="px-4 py-3.5 font-bold uppercase">Evidence Source</th>
                  <th className="px-5 py-3.5 font-bold uppercase text-right">Adjudication Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232330]/60">
                {filteredMarkets.map((m) => {
                  const isClosed = isTradingClosed(m);
                  const st = m.status || 'ACTIVE';
                  const isCreator = Boolean(
                    walletAddress && m.creator.toLowerCase() === walletAddress.toLowerCase()
                  );
                  const poolEth = (m.yesCurve.realEth || 0) + (m.noCurve.realEth || 0);

                  return (
                    <tr key={m.id} className="hover:bg-[#1a1a24] transition">
                      <td className="px-5 py-4 max-w-sm">
                        <div
                          onClick={() => onSelectMarket(m)}
                          className="cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] font-bold text-[#FF8A33]">
                              #{m.id}
                            </span>
                            <span className="rounded bg-[#20202c] px-1.5 py-0.2 text-[10px] font-bold text-slate-300">
                              {m.category}
                            </span>
                            {isCreator && (
                              <span className="rounded bg-orange-500/20 px-1.5 py-0.2 text-[9px] font-bold text-orange-300">
                                You Created
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-white text-sm group-hover:text-[#FF8A33] transition line-clamp-2">
                            {m.question}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {st === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Resolved {m.prediction?.finalOutcome}</span>
                          </span>
                        ) : st === 'VOID' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-500/40 bg-gray-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-gray-300">
                            <ShieldAlert className="h-3 w-3 text-amber-400" />
                            <span>Voided (Refundable)</span>
                          </span>
                        ) : st === 'DISPUTED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-rose-300 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Disputed</span>
                          </span>
                        ) : st === 'PROPOSED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-purple-300">
                            <Clock className="h-3 w-3" />
                            <span>Proposed: {m.prediction?.proposedOutcome}</span>
                          </span>
                        ) : isClosed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300">
                            <Clock className="h-3 w-3" />
                            <span>Closed (Awaiting Proposal)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
                            <span>Trading Active</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap font-mono text-xs">
                        <span className="font-bold text-white">{poolEth.toFixed(4)} ETH</span>
                        <span className="block text-[10px] text-[#8c8c9e]">
                          {m.totalTrades} trades
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                        {m.prediction?.closingTime
                          ? formatExactDateTime(m.prediction.closingTime * 1000)
                          : 'N/A'}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap font-mono text-xs">
                        {m.prediction?.evidenceSource ? (
                          <a
                            href={m.prediction.evidenceSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#53b3d4] hover:underline"
                          >
                            <span>Open Source</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[#8c8c9e]">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If Awaiting Proposal */}
                          {(st === 'CLOSED' || (st === 'ACTIVE' && isClosed)) && (
                            <button
                              onClick={() => handleOpenAction(m, 'PROPOSE')}
                              disabled={isCreator}
                              title={isCreator ? 'Creator cannot resolve own market' : 'Propose Outcome'}
                              className={`rounded-xl px-3 py-1.5 font-fun text-xs font-bold transition shadow-sm ${
                                isCreator
                                  ? 'border border-[#232330] bg-[#0c0c11] text-[#7a7a8c] cursor-not-allowed'
                                  : 'bg-[#FF6B00] text-black hover:bg-[#EA580C]'
                              }`}
                            >
                              {isCreator ? 'Creator Locked' : 'Propose Result'}
                            </button>
                          )}

                          {/* If Proposed: Dispute Window is Active */}
                          {st === 'PROPOSED' && (
                            <>
                              <button
                                onClick={() => handleOpenAction(m, 'DISPUTE')}
                                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-fun text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                Dispute
                              </button>
                              <button
                                onClick={() => handleOpenAction(m, 'RESOLVE')}
                                disabled={isCreator}
                                className={`rounded-xl px-3 py-1.5 font-fun text-xs font-bold transition ${
                                  isCreator
                                    ? 'border border-[#232330] bg-[#0c0c11] text-[#7a7a8c] cursor-not-allowed'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                Finalize
                              </button>
                            </>
                          )}

                          {/* If Disputed */}
                          {st === 'DISPUTED' && (
                            <button
                              onClick={() => handleOpenAction(m, 'RESOLVE')}
                              disabled={isCreator}
                              className={`rounded-xl px-3 py-1.5 font-fun text-xs font-bold transition ${
                                isCreator
                                  ? 'border border-[#232330] bg-[#0c0c11] text-[#7a7a8c] cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              Adjudicate
                            </button>
                          )}

                          {/* Finalized or Active */}
                          {(st === 'RESOLVED' || st === 'VOID') && (
                            <button
                              onClick={() => onSelectMarket(m)}
                              className="rounded-xl border border-[#232330] bg-[#161620] px-3 py-1.5 font-fun text-xs font-bold text-[#53b3d4] hover:bg-[#20202c]"
                            >
                              View Claims
                            </button>
                          )}

                          {/* Emergency Cancel Option */}
                          {st !== 'RESOLVED' && st !== 'VOID' && (
                            <button
                              onClick={() => handleOpenAction(m, 'CANCEL')}
                              title="Emergency Void Market with 100% Refunds"
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-2 py-1.5 font-mono text-[10px] text-red-300 hover:bg-red-500/20"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal (Propose, Dispute, Resolve, Cancel) */}
      {actionType && activeActionMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[22px] sm:rounded-[28px] border border-[#232330] bg-[#121218] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232330] bg-[#161620] px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
                <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-[#FF6B00] shrink-0" />
                <h3 className="font-fun text-sm sm:text-base font-black text-white truncate">
                  {actionType === 'PROPOSE' && 'Propose Prediction Outcome'}
                  {actionType === 'DISPUTE' && 'Dispute Proposed Outcome'}
                  {actionType === 'RESOLVE' && 'Finalize Prediction Resolution'}
                  {actionType === 'CANCEL' && 'Emergency Cancel Market (VOID)'}
                </h3>
              </div>
              <button
                onClick={handleCloseAction}
                className="rounded-full border border-[#232330] bg-[#1a1a24] p-1.5 text-[#8c8c9e] hover:text-white shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="rounded-xl border border-[#232330] bg-[#0c0c11] p-3 text-xs">
                <span className="block text-[10px] uppercase font-bold text-[#8c8c9e] mb-1">
                  Market #{activeActionMarket.id}
                </span>
                <p className="font-bold text-white text-sm">{activeActionMarket.question}</p>
              </div>

              {/* Outcome Selector (For Propose and Resolve) */}
              {(actionType === 'PROPOSE' || actionType === 'RESOLVE') && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Select Verified Outcome
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('YES')}
                      className={`rounded-xl border py-2.5 font-fun text-xs font-black transition ${
                        selectedOutcome === 'YES'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm'
                          : 'border-[#232330] bg-[#0c0c11] text-[#8c8c9e]'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('NO')}
                      className={`rounded-xl border py-2.5 font-fun text-xs font-black transition ${
                        selectedOutcome === 'NO'
                          ? 'border-[#FF6B00] bg-[#FF6B00]/20 text-[#FF8A33] shadow-sm'
                          : 'border-[#232330] bg-[#0c0c11] text-[#8c8c9e]'
                      }`}
                    >
                      NO
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('VOID')}
                      className={`rounded-xl border py-2.5 font-fun text-xs font-black transition ${
                        selectedOutcome === 'VOID'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                          : 'border-[#232330] bg-[#0c0c11] text-[#8c8c9e]'
                      }`}
                    >
                      VOID
                    </button>
                  </div>
                </div>
              )}

              {/* Evidence URL Input */}
              {actionType !== 'CANCEL' && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    {actionType === 'DISPUTE' ? 'Counter-Evidence Source URL' : 'Verifiable Evidence URL'}
                  </label>
                  <input
                    type="url"
                    required
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://official-source-link.com"
                    className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3.5 py-2.5 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#8c8c9e]">
                    Must be publicly auditable proof complying with the market criteria.
                  </p>
                </div>
              )}

              {/* Reason Input (For Cancel) */}
              {actionType === 'CANCEL' && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Cancellation / Voiding Reason
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g. Market criteria ambiguous / event cancelled by organizer"
                    className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3.5 py-2.5 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-amber-300">
                    Voiding enables 100% proportional refunds of locked ETH reserves to all shareholders.
                  </p>
                </div>
              )}

              {/* Error Notice */}
              {actionError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{actionError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-full py-3 font-fun text-sm font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50 ${
                  actionType === 'CANCEL'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-[#FF6B00] hover:bg-[#EA580C] text-black shadow-md shadow-[#FF6B00]/25'
                }`}
              >
                {isSubmitting ? 'Confirming on Robinhood Chain...' : 'Confirm Action'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

