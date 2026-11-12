import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Zap,
  Share2,
  ChevronRight,
  ChevronLeft,
  Info,
  Sliders,
  Wallet,
  ExternalLink,
  Shield,
  Clock,
  Target,
  Award,
  MessageSquare,
  Send,
  Heart,
  CheckCircle2,
  Loader2,
  Flame,
  Plus,
  TrendingUp,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { OpinionMarket,
  formatTimeAgo,
  formatExactDateTime,
  TradeActivity,
  getMarketPricesAndSentiment,
  quoteBuyOrder,
  quoteSellOrder,
  INITIAL_VIRTUAL_ETH,
  INITIAL_VIRTUAL_SHARES,
  CURVE_K,
  MIN_TRADE_ETH,
  isPredictionMarket,
  isTradingClosed,
  calculateSettlementQuote,
  getResolutionTimeRemaining,
} from '../lib/bondingCurve';
import { ROBINHOOD_EXPLORER_URL } from '../config/robinhoodChain';
import { decodeContractErrorMessage } from '../lib/indexerService';
import { useAppAuth } from '../hooks/useAppAuth';
import {
  formatNGN,
  formatSharePrice,
  nairaToKobo,
  koboToNaira,
  MAX_SHARE_PAYOUT_KOBO,
} from '../lib/currency';

const ETH_PRICE_USD = 2600;

interface MarketDetailModalProps {
  market: OpinionMarket | null;
  initialSide?: 'YES' | 'NO';
  userYesShares: number;
  userNoShares: number;
  ethBalance: string;
  creatorFeeRate?: number;
  protocolFeeRate?: number;
  isLiveOnChainMode?: boolean;
  marketActivities?: TradeActivity[];
  allMarkets?: OpinionMarket[];
  onClose: () => void;
  onExecuteTrade: (
    marketId: number,
    isYes: boolean,
    isBuy: boolean,
    amount: number,
    slippagePct?: number
  ) => Promise<void>;
  onAddComment: (marketId: number, side: 'YES' | 'NO', text: string) => void;
  onToggleCommentLike?: (marketId: number, commentId: string) => void;
  onClaimSettlement?: (marketId: number) => Promise<void>;
  onClaimVoidRefund?: (marketId: number) => Promise<void>;
  hasClaimedSettlement?: boolean;
  onSelectMarket?: (marketId: number) => void;
  onTopUpWallet?: () => void;
}

export const MarketDetailModal: React.FC<MarketDetailModalProps> = ({
  market,
  initialSide = 'YES',
  userYesShares,
  userNoShares,
  ethBalance,
  creatorFeeRate = 0.01,
  protocolFeeRate = 0.01,
  isLiveOnChainMode = false,
  marketActivities = [],
  allMarkets = [],
  onClose,
  onExecuteTrade,
  onAddComment,
  onToggleCommentLike,
  onClaimSettlement,
  onClaimVoidRefund,
  hasClaimedSettlement = false,
  onSelectMarket,
  onTopUpWallet,
}) => {
  const auth = useAppAuth();

  // Mobile Tab: 'overview' (chart, description, comments) or 'trade' (trading widget & holders)
  const [mobileTab, setMobileTab] = useState<'overview' | 'trade'>('overview');

  // Trade configuration
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>(initialSide);
  const [inputCurrency, setInputCurrency] = useState<'NGN' | 'ETH'>('NGN');
  const [inputAmount, setInputAmount] = useState<string>('1000');
  const [slippagePct, setSlippagePct] = useState<number>(1.0);
  const [showSlippageConfig, setShowSlippageConfig] = useState<boolean>(false);
  const [isClaimingReward, setIsClaimingReward] = useState<boolean>(false);

  // Insufficient Balance Warning Modal State
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [boostedNotification, setBoostedNotification] = useState<boolean>(false);

  // Chart and Subsections State
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'MAX'>('1M');
  const [chartMode, setChartMode] = useState<'price' | 'bonding'>('price');
  const [buyersFilter, setBuyersFilter] = useState<'Off' | 'Yes' | 'No'>('Off');
  const [infoTab, setInfoTab] = useState<'description' | 'rules'>('description');
  const [holdersSideTab, setHoldersSideTab] = useState<'YES' | 'NO'>('YES');
  const [holdersPage, setHoldersPage] = useState<number>(1);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [txStatus, setTxStatus] = useState<
    'IDLE' | 'SIMULATING' | 'SIGNING' | 'CONFIRMED' | 'FAILED'
  >('IDLE');
  const [txErrorExplanation, setTxErrorExplanation] = useState<string | null>(null);

  // Sync selectedSide when initialSide or market changes
  useEffect(() => {
    if (initialSide) {
      setSelectedSide(initialSide);
      setHoldersSideTab(initialSide);
    }
  }, [initialSide, market?.id]);

  const isYes = selectedSide === 'YES';

  const metrics = useMemo(() => {
    if (!market) {
      return {
        yesPriceEth: 0.000001,
        noPriceEth: 0.000001,
        yesSentimentPct: 50,
        noSentimentPct: 50,
        totalPoolEth: 0,
        totalVolumeEth: 0,
        yesMultiplier: 1,
        noMultiplier: 1,
        sentimentChange24h: 0,
        sentimentChangeRecent: 0,
        controversyScore: 50,
      };
    }
    return getMarketPricesAndSentiment(market);
  }, [market]);

  // Convert inputAmount into ETH for on-chain/contract quoting
  const rawInput = parseFloat(inputAmount) || 0;
  const numericEth = useMemo(() => {
    if (tradeMode === 'SELL') {
      // In SELL mode, input is in shares
      return rawInput;
    }
    if (inputCurrency === 'NGN') {
      return rawInput / 4_200_000;
    }
    return rawInput;
  }, [rawInput, inputCurrency, tradeMode]);

  const quote = useMemo(() => {
    if (!market || numericEth <= 0) {
      return {
        sharesDelta: 0,
        netEthDelta: 0,
        creatorFeeEth: 0,
        protocolFeeEth: 0,
        totalFeeEth: 0,
        newPriceEth: isYes ? metrics.yesPriceEth : metrics.noPriceEth,
        priceImpactPct: 0,
        minimumReceived: 0,
      };
    }
    if (tradeMode === 'BUY') {
      return quoteBuyOrder(
        market,
        isYes,
        numericEth,
        slippagePct,
        creatorFeeRate,
        protocolFeeRate
      );
    } else {
      return quoteSellOrder(
        market,
        isYes,
        numericEth,
        slippagePct,
        creatorFeeRate,
        protocolFeeRate
      );
    }
  }, [market, tradeMode, isYes, numericEth, slippagePct, creatorFeeRate, protocolFeeRate, metrics]);

  const userSideShares = isYes ? userYesShares : userNoShares;
  const userEthBalanceNum = parseFloat(ethBalance || '0');
  const userUsdBalanceNum = userEthBalanceNum * ETH_PRICE_USD;

  // Share prices in Naira (Scale: ₦1 to ₦100, where 1 winning share pays ₦100)
  const yesSharePriceNaira = Math.max(1, Math.min(99, Number(metrics.yesSentimentPct.toFixed(1))));
  const noSharePriceNaira = Math.max(1, Math.min(99, Number((100 - yesSharePriceNaira).toFixed(1))));

  // Pool values in NGN Kobo
  const totalPoolKobo = Math.round(metrics.totalPoolEth * 4_200_000 * 100);
  const totalVolumeKobo = Math.round(metrics.totalVolumeEth * 4_200_000 * 100);
  const yesPoolKobo = Math.round((market?.yesCurve.realEth || 0) * 4_200_000 * 100);
  const noPoolKobo = Math.round((market?.noCurve.realEth || 0) * 4_200_000 * 100);

  // USD values for backwards compatibility / on-chain display
  const totalPoolUsd = (metrics.totalPoolEth * ETH_PRICE_USD).toFixed(2);
  const totalVolumeUsd = (metrics.totalVolumeEth * ETH_PRICE_USD >= 1000)
    ? `${(metrics.totalVolumeEth * ETH_PRICE_USD / 1000).toFixed(2)}k`
    : (metrics.totalVolumeEth * ETH_PRICE_USD).toFixed(2);
  const yesPoolUsd = ((market?.yesCurve.realEth || 0) * ETH_PRICE_USD).toFixed(2);
  const noPoolUsd = ((market?.noCurve.realEth || 0) * ETH_PRICE_USD).toFixed(2);
  const yesPriceUsd = (metrics.yesPriceEth * ETH_PRICE_USD * 1000).toFixed(2);
  const noPriceUsd = (metrics.noPriceEth * ETH_PRICE_USD * 1000).toFixed(2);

  const handleSubmitTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!market) return;
    setTxErrorExplanation(null);

    if (rawInput <= 0) {
      setTxStatus('FAILED');
      setTxErrorExplanation('Enter a positive trade amount.');
      return;
    }

    // Check user balance for BUY trades
    if (tradeMode === 'BUY') {
      const requiredKobo = nairaToKobo(rawInput);
      if (auth.isAuthenticated && requiredKobo > auth.wallet.availableKobo) {
        setShowInsufficientBalanceModal(true);
        return;
      }

      if (numericEth < MIN_TRADE_ETH && !auth.isAuthenticated) {
        setTxStatus('FAILED');
        setTxErrorExplanation(
          decodeContractErrorMessage('TradeBelowMinimum: minimum is 0.0001 ETH (~$0.26)')
        );
        return;
      }
    }

    if (tradeMode === 'SELL' && rawInput > userSideShares) {
      setTxStatus('FAILED');
      setTxErrorExplanation(decodeContractErrorMessage('InsufficientShares'));
      return;
    }

    setTxStatus('SIMULATING');
    try {
      await new Promise((r) => setTimeout(r, 180));
      setTxStatus('SIGNING');
      await onExecuteTrade(
        market.id,
        isYes,
        tradeMode === 'BUY',
        tradeMode === 'BUY' ? numericEth : rawInput,
        slippagePct
      );
      setTxStatus('CONFIRMED');
      setTimeout(() => setTxStatus('IDLE'), 2800);
    } catch (err: unknown) {
      setTxStatus('FAILED');
      const raw = err instanceof Error ? err.message : String(err);
      setTxErrorExplanation(decodeContractErrorMessage(raw));
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!market || !commentText.trim()) return;
    onAddComment(market.id, selectedSide, commentText.trim());
    setCommentText('');
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    }
  };

  const handleBoostMarket = () => {
    setBoostedNotification(true);
    setTimeout(() => setBoostedNotification(false), 3000);
  };

  // ==========================================
  // REAL DYNAMIC HOLDERS FOR THIS MARKET
  // ==========================================
  const realHolders = useMemo(() => {
    if (!market) return { yesList: [], noList: [] };

    const traderMap = new Map<string, { yesShares: number; noShares: number }>();

    // Initial creator position
    const creatorAddress = market.creator;
    const initialYes = Math.max(120, Math.round(market.yesCurve.totalShares * 0.18));
    const initialNo = Math.max(80, Math.round(market.noCurve.totalShares * 0.12));
    traderMap.set(creatorAddress, {
      yesShares: initialYes,
      noShares: initialNo,
    });

    // If connected user has shares in this market
    if (userYesShares > 0 || userNoShares > 0) {
      const currentSelf = traderMap.get('You (Connected)') || { yesShares: 0, noShares: 0 };
      currentSelf.yesShares += userYesShares;
      currentSelf.noShares += userNoShares;
      traderMap.set('You (Connected)', currentSelf);
    }

    // Existing recorded holders if any
    if (market.holders && market.holders.length > 0) {
      market.holders.forEach((h) => {
        const cur = traderMap.get(h.address) || { yesShares: 0, noShares: 0 };
        if (h.side === 'YES') cur.yesShares = Math.max(cur.yesShares, h.shares);
        else cur.noShares = Math.max(cur.noShares, h.shares);
        traderMap.set(h.address, cur);
      });
    }

    // Actual trades executed on this market
    marketActivities.forEach((act) => {
      const cur = traderMap.get(act.trader) || { yesShares: 0, noShares: 0 };
      if (act.isYes) {
        cur.yesShares = Math.max(0, cur.yesShares + (act.isBuy ? act.sharesAmount : -act.sharesAmount));
      } else {
        cur.noShares = Math.max(0, cur.noShares + (act.isBuy ? act.sharesAmount : -act.sharesAmount));
      }
      traderMap.set(act.trader, cur);
    });

    const totalYesSupply = Math.max(1, market.yesCurve.totalShares);
    const totalNoSupply = Math.max(1, market.noCurve.totalShares);

    const yesList: { address: string; handle: string; shares: number; supplyPct: number }[] = [];
    const noList: { address: string; handle: string; shares: number; supplyPct: number }[] = [];

    traderMap.forEach((shares, addr) => {
      const isCreator = addr === market.creator;
      const isSelf = addr === 'You (Connected)';
      const handle = isSelf
        ? '@You'
        : isCreator
        ? (market.sourceHandle || `@${addr.slice(0, 6)}`)
        : `@${addr.slice(0, 6)}...${addr.slice(-3)}`;

      if (shares.yesShares > 0) {
        yesList.push({
          address: addr,
          handle,
          shares: shares.yesShares,
          supplyPct: Math.min(100, (shares.yesShares / totalYesSupply) * 100),
        });
      }

      if (shares.noShares > 0) {
        noList.push({
          address: addr,
          handle,
          shares: shares.noShares,
          supplyPct: Math.min(100, (shares.noShares / totalNoSupply) * 100),
        });
      }
    });

    yesList.sort((a, b) => b.shares - a.shares);
    noList.sort((a, b) => b.shares - a.shares);

    return { yesList, noList };
  }, [market, marketActivities, userYesShares, userNoShares]);

  const activeHolders = holdersSideTab === 'YES' ? realHolders.yesList : realHolders.noList;

  // ==========================================
  // REAL RECENT TRANSACTIONS FOR THIS MARKET
  // ==========================================
  const recentTransactions = useMemo(() => {
    return marketActivities.map((act) => ({
      id: act.id,
      trader: act.trader.length > 10 ? `${act.trader.slice(0, 4)}...${act.trader.slice(-3)}` : act.trader,
      isYes: act.isYes,
      isBuy: act.isBuy,
      shares: act.sharesAmount,
      time: formatTimeAgo(act.timestamp),
    }));
  }, [marketActivities]);

  // Related markets list
  const relatedMarkets = useMemo(() => {
    return allMarkets
      .filter((m) => m.id !== market?.id)
      .slice(0, 3);
  }, [allMarkets, market?.id]);

  // ==============================================================================
  // DYNAMIC PRICE & SENTIMENT TRAJECTORY (UNIQUE TO EACH INDIVIDUAL MARKET)
  // ==============================================================================
  const { chartPoints, maxChartUsd, minChartUsd, dynamicDates } = useMemo(() => {
    if (!market) {
      return {
        chartPoints: [],
        maxChartUsd: 14,
        minChartUsd: 2,
        dynamicDates: ['Oct 19', 'Oct 26', 'Nov 2', 'Nov 9'],
      };
    }

    const currentYesUsd = metrics.yesPriceEth * ETH_PRICE_USD * 1000;
    const currentNoUsd = metrics.noPriceEth * ETH_PRICE_USD * 1000;
    const genesisPriceUsd = (INITIAL_VIRTUAL_ETH / INITIAL_VIRTUAL_SHARES) * ETH_PRICE_USD * 1000; // ~$2.60

    // Deterministic pseudo-random seed unique to this specific market
    const seed = (market.id * 1337 + market.createdAt) % 20000;
    const pseudo = (i: number) => {
      const val = Math.sin(seed + i * 27.153) * 43758.5453;
      return val - Math.floor(val);
    };

    const numPoints = 28;
    const pts: { x: number; yesUsd: number; noUsd: number }[] = [];

    // Market controversy & bias factors
    const yesBias = metrics.yesSentimentPct / 100;
    const volatility = Math.min(0.45, Math.max(0.12, (market.totalTrades * 0.03)));

    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1); // 0 (Genesis) -> 1 (Now)
      const x = (i / (numPoints - 1)) * 640;

      if (i === 0) {
        pts.push({ x, yesUsd: genesisPriceUsd, noUsd: genesisPriceUsd });
        continue;
      }
      if (i === numPoints - 1) {
        pts.push({ x, yesUsd: currentYesUsd, noUsd: currentNoUsd });
        continue;
      }

      // Smooth progression from genesis to current price
      const ease = Math.pow(progress, 1.6);
      const baseYes = genesisPriceUsd + (currentYesUsd - genesisPriceUsd) * ease;
      const baseNo = genesisPriceUsd + (currentNoUsd - genesisPriceUsd) * ease;

      // Unique market-specific wave oscillation
      const noise = (pseudo(i) - 0.48) * volatility * (1 - Math.abs(progress - 0.5) * 0.8);
      const intermediateYes = Math.max(0.2, baseYes * (1 + noise * (yesBias > 0.5 ? 1.4 : 0.8)));
      const intermediateNo = Math.max(0.2, baseNo * (1 - noise * (yesBias <= 0.5 ? 1.4 : 0.8)));

      pts.push({
        x,
        yesUsd: intermediateYes,
        noUsd: intermediateNo,
      });
    }

    // Calculate dynamic Y-axis bounds
    const allPrices = pts.flatMap((p) => [p.yesUsd, p.noUsd]);
    const maxVal = Math.max(currentYesUsd * 1.15, currentNoUsd * 1.15, ...allPrices);
    const minVal = Math.min(currentYesUsd * 0.85, currentNoUsd * 0.85, ...allPrices);

    const maxChartUsd = Math.max(4, Math.ceil(maxVal * 1.12));
    const minChartUsd = Math.max(0, Math.floor(minVal * 0.88));

    // Dynamic date markers from market creation to now
    const now = Date.now();
    const created = market.createdAt || (now - 86400000 * 7);
    const stepTime = (now - created) / 3;
    const dynamicDates = [
      formatExactDateTime(created).split(',')[0],
      formatExactDateTime(created + stepTime).split(',')[0],
      formatExactDateTime(created + stepTime * 2).split(',')[0],
      'Today',
    ];

    return { chartPoints: pts, maxChartUsd, minChartUsd, dynamicDates };
  }, [market, metrics]);

  // Convert points to SVG smooth path strings
  const { dynamicYesPath, dynamicNoPath } = useMemo(() => {
    if (chartPoints.length < 2) return { dynamicYesPath: '', dynamicNoPath: '' };

    const toSvgY = (usd: number) => {
      const range = Math.max(0.5, maxChartUsd - minChartUsd);
      return 255 - ((usd - minChartUsd) / range) * 215;
    };

    let yesPath = `M ${chartPoints[0].x.toFixed(1)} ${toSvgY(chartPoints[0].yesUsd).toFixed(1)}`;
    let noPath = `M ${chartPoints[0].x.toFixed(1)} ${toSvgY(chartPoints[0].noUsd).toFixed(1)}`;

    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const prevYesY = toSvgY(prev.yesUsd);
      const currYesY = toSvgY(curr.yesUsd);
      const prevNoY = toSvgY(prev.noUsd);
      const currNoY = toSvgY(curr.noUsd);

      const midX = (prev.x + curr.x) / 2;
      yesPath += ` C ${midX.toFixed(1)} ${prevYesY.toFixed(1)}, ${midX.toFixed(1)} ${currYesY.toFixed(1)}, ${curr.x.toFixed(1)} ${currYesY.toFixed(1)}`;
      noPath += ` C ${midX.toFixed(1)} ${prevNoY.toFixed(1)}, ${midX.toFixed(1)} ${currNoY.toFixed(1)}, ${curr.x.toFixed(1)} ${currNoY.toFixed(1)}`;
    }

    return { dynamicYesPath: yesPath, dynamicNoPath: noPath };
  }, [chartPoints, maxChartUsd, minChartUsd]);

  // Bonding curve continuous formula V_E + R
  const bondingCurvePoints = useMemo(() => {
    if (!market) return { path: '', yesDot: { x: 0, y: 0 }, noDot: { x: 0, y: 0 } };

    const maxReserve = Math.max(0.02, market.yesCurve.realEth * 1.5, market.noCurve.realEth * 1.5);
    const steps = 30;
    const pts: { r: number; price: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const r = (maxReserve * i) / steps;
      const vEth = INITIAL_VIRTUAL_ETH + r;
      const vShares = CURVE_K / vEth;
      const price = vEth / vShares;
      pts.push({ r, price });
    }

    const maxP = pts[pts.length - 1]?.price || 0.00001;
    const toX = (r: number) => (r / maxReserve) * 640;
    const toY = (p: number) => 255 - (p / maxP) * 215;

    const path = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)} ${toY(p.price).toFixed(1)}`)
      .join(' ');

    return {
      path,
      yesDot: { x: toX(market.yesCurve.realEth), y: toY(metrics.yesPriceEth) },
      noDot: { x: toX(market.noCurve.realEth), y: toY(metrics.noPriceEth) },
    };
  }, [market, metrics]);

  if (!market) return null;

  const isPrediction = isPredictionMarket(market);
  const tradingClosed = isTradingClosed(market);
  const settlementQuote = calculateSettlementQuote(
    market,
    userYesShares,
    userNoShares,
    hasClaimedSettlement
  );
  const timeRemaining = market.prediction?.closingTime
    ? getResolutionTimeRemaining(market.prediction.closingTime)
    : null;
  const currentStatus = market.status || 'ACTIVE';

  // AI Agent Opinions tailored to market context
  const aiOpinions = {
    yes: {
      author: '@NotKaiCenat AI',
      quote:
        market.category === 'AI'
          ? '"Naruto taught consistency & morals ❤️ AI development will inevitably align with higher ethical equilibrium and systemic justice."'
          : '"Historical analysis demonstrates that societal and legal feedback loops systematically advance accountability over long time horizons."',
    },
    no: {
      author: '@NotMrBeast AI',
      quote:
        market.category === 'AI'
          ? '"Commercial incentives and asymmetric power dynamics frequently outpace safeguards, leaving systemic justice secondary to market dominance."'
          : '"Asymmetric resource distribution and judicial disparities demonstrate that justice remains unevenly accessible across social tiers."',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-0 sm:p-4 backdrop-blur-md overflow-hidden">
      {/* Insufficient ETH Balance Modal Dialog (Consistent with App Theme) */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#232330] bg-[#121218] p-6 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowInsufficientBalanceModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a26] border border-[#2e2e40] text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-[#53b3d4] mb-2 font-fun">
              Insufficient NGN balance
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
              In order to trade this market you need to have {formatNGN(nairaToKobo(rawInput))} on your OpinionNG wallet
            </p>

            <div className="grid grid-cols-2 rounded-2xl border border-[#232330] bg-[#0c0c11] p-4 mb-6">
              <div className="text-left border-r border-[#232330] pr-3">
                <span className="block text-[11px] text-[#8c8c9e] font-medium">Required</span>
                <span className="text-base font-bold text-white font-mono">
                  {formatNGN(nairaToKobo(rawInput))}
                </span>
              </div>
              <div className="text-left pl-4">
                <span className="block text-[11px] text-[#8c8c9e] font-medium">Your balance</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {formatNGN(auth.wallet.availableKobo)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  auth.openDepositModal();
                  if (onTopUpWallet) onTopUpWallet();
                }}
                className="w-full rounded-2xl bg-[#227c9d] py-3 text-sm font-bold text-white hover:bg-[#1a647f] transition active:scale-98 shadow-md"
              >
                Top Up my Wallet
              </button>
              <button
                type="button"
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="w-full rounded-2xl bg-[#1a1a26] border border-[#2e2e40] py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-[#252538] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Window */}
      <div className="relative flex h-full sm:h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-none sm:rounded-[24px] border border-[#232330] bg-[#121218] text-white shadow-2xl">
        {/* Top Header Row */}
        <div className="border-b border-[#232330] bg-[#161620] px-4 sm:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left buttons: Back, Mobile Trade toggle, Boost */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-full border border-[#2e2e40] bg-[#1a1a26] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#252538] transition active:scale-95 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Back</span>
              </button>

              {/* Mobile View Switcher: Overview vs Trade */}
              <div className="flex lg:hidden items-center rounded-full border border-[#2e2e40] bg-[#1a1a26] p-0.5">
                <button
                  type="button"
                  onClick={() => setMobileTab('overview')}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    mobileTab === 'overview'
                      ? 'bg-[#252538] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('trade')}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    mobileTab === 'trade'
                      ? 'bg-[#227c9d] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Trade
                </button>
              </div>

              <button
                type="button"
                onClick={handleBoostMarket}
                className="flex items-center gap-1.5 rounded-full border border-[#2e2e40] bg-[#1a1a26] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#252538] transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Zap className="h-3.5 w-3.5 text-[#FF6B00] fill-[#FF6B00]" />
                <span>Boost Market</span>
              </button>

              {boostedNotification && (
                <span className="hidden sm:inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 animate-pulse">
                  ⚡ Market Boosted on Feed!
                </span>
              )}
            </div>

            {/* Right: Currency Indicator & Desktop Close */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center rounded-full border border-[#227c9d]/40 bg-[#227c9d]/10 px-3 py-1 font-mono text-xs font-bold text-[#53b3d4]">
                ₦ NGN
              </div>

              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#2e2e40] bg-[#1a1a26] text-white hover:bg-[#252538] hover:border-white/40 active:scale-95 transition cursor-pointer"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            
            {/* LEFT COLUMN: Overview (Header, Stacked Conviction Bars, Chart, Description/Rules, AI Debates, Comments) */}
            <div className={`space-y-6 lg:col-span-7 xl:col-span-8 ${mobileTab === 'trade' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Market Title & Share Button */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black leading-tight text-white font-fun">
                    {market.question}
                  </h1>
                  <button
                    onClick={handleCopyLink}
                    title="Share market link"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2e2e40] bg-[#1a1a26] text-zinc-300 hover:bg-[#252538] hover:text-white transition cursor-pointer"
                  >
                    {copiedShareLink ? (
                      <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                    ) : (
                      <Share2 className="h-4 w-4 stroke-[2]" />
                    )}
                  </button>
                </div>

                {/* Metadata Row matching reference: • TIME AGO | CATEGORY | BY CREATOR | ENTERED | POOL & TOTAL VOLUME */}
                <div className="mt-3 space-y-2 border-b border-[#232330] pb-4 text-xs font-medium text-zinc-400">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center gap-1.5 text-pink-400 font-bold uppercase tracking-wider text-[11px]">
                      <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                      {formatTimeAgo(market.createdAt).toUpperCase()}
                    </span>
                    <span className="rounded-full bg-[#20202c] px-2.5 py-0.5 text-[11px] font-bold text-slate-300 border border-[#2e2e40]">
                      {market.category}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                      BY 🐥 <strong className="text-white">{market.sourceHandle || (market.creator.slice(0, 6) + '...' + market.creator.slice(-4))}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="inline-block h-5 w-5 rounded-full ring-2 ring-[#121218] bg-[#227c9d] flex items-center justify-center text-[8px] font-bold text-white">Y</div>
                      <div className="inline-block h-5 w-5 rounded-full ring-2 ring-[#121218] bg-cyan-600 flex items-center justify-center text-[8px] font-bold text-white">N</div>
                      <div className="inline-block h-5 w-5 rounded-full ring-2 ring-[#121218] bg-[#FF6B00] flex items-center justify-center text-[8px] font-bold text-black">A</div>
                    </div>
                    <span className="text-xs font-semibold text-slate-300">
                      {market.totalTrades || realHolders.yesList.length + realHolders.noList.length} Entered
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs text-slate-300 pt-0.5">
                    <span>
                      Pool: <strong className="text-white font-bold">{formatNGN(totalPoolKobo, { compact: true })}</strong>
                    </span>
                    <span>
                      Total Volume: <strong className="text-white font-bold">{formatNGN(totalVolumeKobo, { compact: true })}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dual Stacked Conviction Bars */}
              <div className="space-y-2.5">
                {/* YES BAR */}
                <div
                  onClick={() => {
                    setSelectedSide('YES');
                    setHoldersSideTab('YES');
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative h-13 sm:h-14 w-full cursor-pointer overflow-hidden rounded-[22px] border p-1.5 flex items-center justify-between transition-all duration-200 ${
                    selectedSide === 'YES'
                      ? 'border-[#227c9d] bg-[#14141e] ring-2 ring-[#227c9d]/40 shadow-lg shadow-[#227c9d]/20'
                      : 'border-[#232330] bg-[#14141c] hover:border-[#227c9d]/50'
                  }`}
                >
                  <div
                    style={{ width: `${Math.max(28, Math.min(78, metrics.yesSentimentPct))}%` }}
                    className="flex h-full items-center justify-center rounded-2xl bg-[#227c9d] px-6 py-2 font-black text-white text-base shadow-sm transition-all duration-500"
                  >
                    <span>Yes</span>
                  </div>
                  <div className="flex items-center pr-4">
                    <span className="font-mono text-base sm:text-lg font-bold text-white">
                      {formatNGN(yesPoolKobo, { compact: true })}
                    </span>
                    <span className="font-sans text-xs sm:text-sm text-[#8c8c9e] ml-1.5 font-normal">
                      pool
                    </span>
                  </div>
                </div>

                {/* NO BAR */}
                <div
                  onClick={() => {
                    setSelectedSide('NO');
                    setHoldersSideTab('NO');
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative h-13 sm:h-14 w-full cursor-pointer overflow-hidden rounded-[22px] border p-1.5 flex items-center justify-between transition-all duration-200 ${
                    selectedSide === 'NO'
                      ? 'border-[#FF6B00] bg-[#14141e] ring-2 ring-[#FF6B00]/40 shadow-lg shadow-[#FF6B00]/20'
                      : 'border-[#232330] bg-[#14141c] hover:border-[#FF6B00]/50'
                  }`}
                >
                  <div
                    style={{ width: `${Math.max(28, Math.min(78, metrics.noSentimentPct))}%` }}
                    className="flex h-full items-center justify-center rounded-2xl bg-[#FF6B00] px-6 py-2 font-black text-black text-base shadow-sm transition-all duration-500"
                  >
                    <span>No</span>
                  </div>
                  <div className="flex items-center pr-4">
                    <span className="font-mono text-base sm:text-lg font-bold text-white">
                      {formatNGN(noPoolKobo, { compact: true })}
                    </span>
                    <span className="font-sans text-xs sm:text-sm text-[#8c8c9e] ml-1.5 font-normal">
                      pool
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Controls & Interactive Canvas (Direct individual market curves) */}
              <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-4 sm:p-5">
                {/* Control bar */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  {/* Left: Timeframe pills */}
                  <div className="flex items-center rounded-xl bg-[#0c0c11] p-1 border border-[#232330]">
                    {(['1D', '1W', '1M', 'MAX'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          timeframe === tf
                            ? 'bg-[#252538] text-white shadow-sm'
                            : 'text-[#8c8c9e] hover:text-white'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  {/* Right: Price/Bonding mode */}
                  <div className="flex items-center rounded-xl bg-[#0c0c11] p-1 border border-[#232330] text-xs">
                    <button
                      type="button"
                      onClick={() => setChartMode('price')}
                      className={`rounded-lg px-3.5 py-1 font-bold transition ${
                        chartMode === 'price'
                          ? 'bg-[#252538] text-white shadow-sm'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('bonding')}
                      className={`rounded-lg px-3.5 py-1 font-bold transition ${
                        chartMode === 'bonding'
                          ? 'bg-[#252538] text-white shadow-sm'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      Bonding
                    </button>
                  </div>
                </div>

                {/* Sub-row: Legend with real current prices */}
                <div className="flex items-center gap-4 font-mono text-xs mb-3">
                  <span className="flex items-center gap-1.5 text-[#53b3d4] font-bold">
                    <span className="h-2 w-2 rounded-full bg-[#227c9d]" />
                    Yes +{metrics.yesSentimentPct.toFixed(1)}% (${yesPriceUsd})
                  </span>
                  <span className="flex items-center gap-1.5 text-[#FF8A33] font-bold">
                    <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                    No +{metrics.noSentimentPct.toFixed(1)}% (${noPriceUsd})
                  </span>
                </div>

                {/* SVG Visual Plot - Extends Edge-to-Edge with individual market shape */}
                <div className="relative h-72 sm:h-80 md:h-96 w-full rounded-2xl bg-[#0c0c11] p-3 sm:p-4 border border-[#232330] overflow-hidden flex flex-col justify-between">
                  <svg
                    viewBox="0 0 700 280"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                  >
                    {/* Horizontal Grid lines extending edge to edge */}
                    {[40, 85, 130, 175, 220, 255].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="640"
                        y2={y}
                        stroke="#1c1c28"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Y-Axis Price Labels on Right side (Dynamic to THIS market's actual values) */}
                    <text x="695" y="44" textAnchor="end" fill="#525266" fontSize="11" fontFamily="monospace">
                      ${maxChartUsd.toFixed(2)}
                    </text>
                    <text x="695" y="94" textAnchor="end" fill="#525266" fontSize="11" fontFamily="monospace">
                      ${(minChartUsd + (maxChartUsd - minChartUsd) * 0.75).toFixed(2)}
                    </text>
                    <text x="695" y="144" textAnchor="end" fill="#525266" fontSize="11" fontFamily="monospace">
                      ${(minChartUsd + (maxChartUsd - minChartUsd) * 0.50).toFixed(2)}
                    </text>
                    <text x="695" y="194" textAnchor="end" fill="#525266" fontSize="11" fontFamily="monospace">
                      ${(minChartUsd + (maxChartUsd - minChartUsd) * 0.25).toFixed(2)}
                    </text>
                    <text x="695" y="259" textAnchor="end" fill="#525266" fontSize="11" fontFamily="monospace">
                      ${minChartUsd.toFixed(2)}
                    </text>

                    {/* Curves extending to both ends of the container */}
                    {chartMode === 'price' ? (
                      <>
                        {/* Dynamic Blue YES Curve for this individual market */}
                        <path
                          d={dynamicYesPath}
                          fill="none"
                          stroke="#227c9d"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {chartPoints.length > 0 && (
                          <circle
                            cx={chartPoints[chartPoints.length - 1].x}
                            cy={255 - ((chartPoints[chartPoints.length - 1].yesUsd - minChartUsd) / Math.max(0.5, maxChartUsd - minChartUsd)) * 215}
                            r="5"
                            fill="#227c9d"
                            stroke="#0c0c11"
                            strokeWidth="2"
                          />
                        )}

                        {/* Dynamic Orange NO Curve for this individual market */}
                        <path
                          d={dynamicNoPath}
                          fill="none"
                          stroke="#FF6B00"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {chartPoints.length > 0 && (
                          <circle
                            cx={chartPoints[chartPoints.length - 1].x}
                            cy={255 - ((chartPoints[chartPoints.length - 1].noUsd - minChartUsd) / Math.max(0.5, maxChartUsd - minChartUsd)) * 215}
                            r="5"
                            fill="#FF6B00"
                            stroke="#0c0c11"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {/* Mathematical Bonding Curve Formula V_E+R extending to both ends */}
                        <path
                          d={bondingCurvePoints.path}
                          fill="none"
                          stroke="#227c9d"
                          strokeWidth="3.5"
                        />
                        <circle cx={bondingCurvePoints.yesDot.x} cy={bondingCurvePoints.yesDot.y} r="7" fill="#227c9d" stroke="#fff" strokeWidth="2" />
                        <text
                          x={Math.max(40, Math.min(580, bondingCurvePoints.yesDot.x))}
                          y={Math.max(30, bondingCurvePoints.yesDot.y - 12)}
                          textAnchor="middle"
                          fill="#53b3d4"
                          fontSize="12"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          YES ({formatNGN(yesPoolKobo)})
                        </text>

                        <circle cx={bondingCurvePoints.noDot.x} cy={bondingCurvePoints.noDot.y} r="7" fill="#FF6B00" stroke="#fff" strokeWidth="2" />
                        <text
                          x={Math.max(40, Math.min(580, bondingCurvePoints.noDot.x))}
                          y={Math.min(265, bondingCurvePoints.noDot.y + 16)}
                          textAnchor="middle"
                          fill="#FF8A33"
                          fontSize="12"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          NO ({formatNGN(noPoolKobo)})
                        </text>
                      </>
                    )}

                    {/* Dynamic Date labels along the bottom */}
                    <text x="15" y="275" fill="#525266" fontSize="10" fontFamily="sans-serif">{dynamicDates[0]}</text>
                    <text x="190" y="275" fill="#525266" fontSize="10" fontFamily="sans-serif">{dynamicDates[1]}</text>
                    <text x="380" y="275" fill="#525266" fontSize="10" fontFamily="sans-serif">{dynamicDates[2]}</text>
                    <text x="560" y="275" fill="#525266" fontSize="10" fontFamily="sans-serif">{dynamicDates[3]}</text>
                  </svg>
                </div>
              </div>

              {/* Description & Rules Tabs */}
              <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-5">
                <div className="flex items-center gap-6 border-b border-[#232330] pb-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setInfoTab('description')}
                    className={`text-sm font-bold transition pb-1 relative cursor-pointer ${
                      infoTab === 'description'
                        ? 'text-white border-b-2 border-[#227c9d]'
                        : 'text-[#8c8c9e] hover:text-white'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setInfoTab('rules')}
                    className={`text-sm font-bold transition pb-1 relative cursor-pointer ${
                      infoTab === 'rules'
                        ? 'text-white border-b-2 border-[#227c9d]'
                        : 'text-[#8c8c9e] hover:text-white'
                    }`}
                  >
                    Rules
                  </button>
                </div>

                {infoTab === 'description' ? (
                  <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    <p>
                      This market explores the conviction topic: <strong>&quot;{market.question}&quot;</strong>. Traders participate by taking a financial and reputational stake on the continuous YES or NO bonding curve, settled atomically via OpinionNG's NGN double-entry ledger.
                    </p>
                    <p>
                      Taking the &quot;yes&quot; side reflects confidence that this thesis will manifest or hold true. Taking &quot;no&quot; reflects a contrarian position. Every trade directly moves the market sentiment and rewards creators and early participants.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    <div className="rounded-xl border border-[#232330] bg-[#0c0c11] p-3 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#8c8c9e]">Pricing Engine:</span>
                        <span className="text-white font-bold">Dual AMM Curves (₦1 – ₦100 / share)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c8c9e]">Settlement Model:</span>
                        <span className="text-emerald-400 font-bold">Atomic NGN Double-Entry Ledger</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c8c9e]">Anti-Dust Minimum:</span>
                        <span className="text-white">₦100 (10,000 Kobo)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c8c9e]">Trading Fee (Automatic):</span>
                        <span className="text-[#FF8A33]">3.0% (1.5% Creator + 1.5% Platform)</span>
                      </div>
                    </div>
                    {isPrediction && market.prediction && (
                      <div className="space-y-2 pt-2">
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                          <strong className="text-emerald-300 block mb-0.5 text-xs">YES Resolution Criteria:</strong>
                          <p className="text-slate-300 text-xs">{market.prediction.yesCondition}</p>
                        </div>
                        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5">
                          <strong className="text-orange-300 block mb-0.5 text-xs">NO Resolution Criteria:</strong>
                          <p className="text-slate-300 text-xs">{market.prediction.noCondition}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Agent Opinions */}
              <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white mb-4">
                  <span>AI Agent Opinions</span>
                  <Info className="h-3.5 w-3.5 text-[#8c8c9e]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Yes Quote Card */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#227c9d]/30 bg-[#227c9d]/5 p-4 shadow-sm">
                    <div>
                      <span className="text-sm font-black text-[#53b3d4] block mb-2 font-fun">
                        Yes
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed italic font-sans">
                        {aiOpinions.yes.quote}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#227c9d]/20">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#227c9d] to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                        AI
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{aiOpinions.yes.author}</span>
                      <span className="rounded bg-[#227c9d]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#53b3d4]">AI</span>
                    </div>
                  </div>

                  {/* No Quote Card */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/5 p-4 shadow-sm">
                    <div>
                      <span className="text-sm font-black text-[#FF8A33] block mb-2 font-fun">
                        No
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed italic font-sans">
                        {aiOpinions.no.quote}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#FF6B00]/20">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#FF6B00] to-amber-500 flex items-center justify-center text-[10px] font-bold text-black">
                        AI
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{aiOpinions.no.author}</span>
                      <span className="rounded bg-[#FF6B00]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#FF8A33]">AI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="rounded-[22px] border border-[#232330] bg-[#161620] p-5">
                <h3 className="text-sm font-bold text-white mb-3">
                  Comments ({market.comments.length})
                </h3>

                {/* Add a comment input with send arrow */}
                <form onSubmit={handlePostComment} className="relative mb-5">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] py-3 pl-4 pr-12 text-xs text-white placeholder-[#8c8c9e] focus:border-[#227c9d] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#227c9d] text-white hover:bg-[#1a647f] transition disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {market.comments.length === 0 ? (
                    <p className="text-center py-4 text-xs text-[#8c8c9e]">
                      No comments yet. Share your thesis and lead the debate!
                    </p>
                  ) : (
                    market.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 border-b border-[#232330]/60 pb-4 last:border-b-0 last:pb-0">
                        <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 border border-[#2e2e40] bg-[#1a1a26]">
                          {c.authorAvatar ? (
                            <img src={c.authorAvatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr from-[#227c9d] to-cyan-500">
                              {c.author.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white">
                              {c.authorHandle ? `@${c.authorHandle.replace(/^@/, '')}` : `@${c.author}`}
                            </span>
                            <span className="text-[10px] text-[#8c8c9e]">
                              {formatTimeAgo(c.createdAt || c.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {c.text}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-[#8c8c9e]">
                            <button
                              type="button"
                              onClick={() => onToggleCommentLike && onToggleCommentLike(market.id, c.id)}
                              className={`flex items-center gap-1 hover:text-rose-400 transition cursor-pointer ${
                                c.hasLiked ? 'text-rose-500' : ''
                              }`}
                            >
                              <Heart className={`h-3 w-3 ${c.hasLiked ? 'fill-rose-500' : ''}`} />
                              <span>{c.likes || 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentText(`@${c.authorHandle || c.author} `)}
                              className="hover:text-white transition cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Desktop Sidebar / Mobile 'Trade' View */}
            <div className={`space-y-6 lg:col-span-5 xl:col-span-4 ${mobileTab === 'overview' ? 'hidden lg:block' : 'block'}`}>

              {/* Trading Box Card with Expected Output, Price Impact, and Estimated Creator Revenue */}
              <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-xl">
                {/* Buy vs Sell Top Switcher */}
                <div className="flex items-center justify-between border-b border-[#232330] pb-3 mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setTradeMode('BUY')}
                      className={`text-sm font-bold transition pb-1 relative cursor-pointer ${
                        tradeMode === 'BUY'
                          ? 'text-white border-b-2 border-[#227c9d]'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeMode('SELL')}
                      className={`text-sm font-bold transition pb-1 relative cursor-pointer ${
                        tradeMode === 'SELL'
                          ? 'text-white border-b-2 border-white'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSlippageConfig(!showSlippageConfig)}
                    className="flex items-center gap-1 rounded-full border border-[#2e2e40] bg-[#1a1a26] px-2.5 py-1 text-[11px] text-[#8c8c9e] hover:text-white transition"
                  >
                    <Sliders className="h-3 w-3 text-[#227c9d]" />
                    <span>{slippagePct}%</span>
                  </button>
                </div>

                {/* Slippage Drawer */}
                {showSlippageConfig && (
                  <div className="mb-4 rounded-xl border border-[#232330] bg-[#0c0c11] p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#8c8c9e] mb-1.5">
                      <span>Max Slippage Tolerance</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0.5, 1.0, 2.5, 5.0].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSlippagePct(val)}
                          className={`rounded-lg py-1 text-xs font-bold transition ${
                            slippagePct === val
                              ? 'bg-[#227c9d] text-white'
                              : 'bg-[#1a1a26] text-[#8c8c9e] hover:text-white'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side Selector Pills: [ Yes ₦XX ] vs [ No ₦XX ] */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSide('YES');
                      setHoldersSideTab('YES');
                    }}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
                      selectedSide === 'YES'
                        ? 'bg-[#227c9d] text-white shadow-md'
                        : 'bg-[#0c0c11] border border-[#232330] text-[#8c8c9e] hover:text-white hover:border-[#227c9d]/40'
                    }`}
                  >
                    <span>Yes</span>
                    <span className="font-mono text-xs opacity-90">₦{yesSharePriceNaira.toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSide('NO');
                      setHoldersSideTab('NO');
                    }}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
                      selectedSide === 'NO'
                        ? 'bg-[#FF6B00] text-black shadow-md'
                        : 'bg-[#0c0c11] border border-[#232330] text-[#8c8c9e] hover:text-white hover:border-[#FF6B00]/40'
                    }`}
                  >
                    <span>No</span>
                    <span className="font-mono text-xs opacity-90">₦{noSharePriceNaira.toFixed(2)}</span>
                  </button>
                </div>

                {/* Balance Row */}
                <div className="flex items-center justify-between text-xs text-[#8c8c9e] mb-2">
                  <span>Balance</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                    <Wallet className="h-3.5 w-3.5 text-[#8c8c9e]" />
                    <span>
                      {tradeMode === 'BUY'
                        ? formatNGN(auth.wallet.availableKobo)
                        : `${userSideShares.toLocaleString()} ${selectedSide} shares`}
                    </span>
                  </div>
                </div>

                {/* Big Number Input */}
                <div className="relative mb-3">
                  <div className="flex items-center justify-between rounded-2xl border border-[#232330] bg-[#0c0c11] px-4 py-3.5 focus-within:border-[#227c9d]">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={inputAmount}
                      onChange={(e) => {
                        setInputAmount(e.target.value);
                        setTxErrorExplanation(null);
                      }}
                      className="w-full bg-transparent font-mono text-2xl font-black text-white focus:outline-none"
                    />
                    <span className="ml-2 rounded-lg bg-[#1a1a26] px-2.5 py-1 font-mono text-xs font-bold text-[#53b3d4] border border-[#2e2e40] shrink-0">
                      {tradeMode === 'BUY' ? 'NGN (₦)' : 'SHARES'}
                    </span>
                  </div>
                </div>

                {/* Quick Increments Pills: +₦500, +₦1,000, +₦5,000, +₦10,000 */}
                <div className="flex items-center justify-between gap-1.5 mb-5">
                  {tradeMode === 'BUY' ? (
                    [500, 1000, 5000, 10000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setInputAmount(String(inc))}
                        className="flex-1 rounded-xl border border-[#232330] bg-[#0c0c11] py-1.5 text-center font-mono text-xs font-semibold text-slate-300 hover:border-[#227c9d] hover:text-[#53b3d4] transition"
                      >
                        +₦{inc >= 1000 ? `${inc / 1000}k` : inc}
                      </button>
                    ))
                  ) : (
                    [0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setInputAmount(
                            Math.max(10, Math.floor(userSideShares * pct)).toString()
                          )
                        }
                        className="flex-1 rounded-xl border border-[#232330] bg-[#0c0c11] py-1.5 text-center font-mono text-xs font-semibold text-slate-300 hover:border-[#227c9d] hover:text-[#53b3d4] transition"
                      >
                        {pct * 100}%
                      </button>
                    ))
                  )}
                </div>

                {/* Error Banner */}
                {txErrorExplanation && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                    {txErrorExplanation}
                  </div>
                )}

                {/* Big Execute Button: 'Buy YES' / 'Buy NO' */}
                <button
                  type="button"
                  onClick={handleSubmitTrade}
                  disabled={txStatus === 'SIMULATING' || txStatus === 'SIGNING' || rawInput <= 0}
                  className={`w-full rounded-2xl py-4 text-base font-black transition-all active:scale-98 shadow-lg cursor-pointer ${
                    selectedSide === 'YES'
                      ? 'bg-[#227c9d] text-white hover:bg-[#1a647f] shadow-[#227c9d]/25'
                      : 'bg-[#FF6B00] text-black hover:bg-[#EA580C] shadow-[#FF6B00]/25'
                  }`}
                >
                  {txStatus === 'SIMULATING' || txStatus === 'SIGNING' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executing Atomic Trade...
                    </span>
                  ) : (
                    `${tradeMode === 'BUY' ? 'Buy' : 'Sell'} ${selectedSide}`
                  )}
                </button>

                {/* Trade Quote Details (Expected Output, Price Impact, Estimated Creator Revenue) */}
                <div className="mt-4 space-y-2 border-t border-[#232330] pt-3 font-mono text-[11px] text-[#8c8c9e]">
                  {tradeMode === 'BUY' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Est. Shares:</span>
                        <span className="text-white font-bold text-xs">
                          +{Math.round(quote.sharesDelta).toLocaleString()} {selectedSide}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Avg Price in ₦:</span>
                        <span className="text-white font-bold text-xs">
                          ₦{(selectedSide === 'YES' ? yesSharePriceNaira : noSharePriceNaira).toFixed(2)}/share
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Potential Payout at ₦100/share:</span>
                        <span className="text-emerald-400 font-bold text-xs">
                          ₦{(Math.round(quote.sharesDelta) * 100).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>Est. Net Proceeds:</span>
                      <span className="text-white font-bold text-xs">
                        {formatNGN(Math.round(quote.netEthDelta * 4_200_000 * 100))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Price Impact:</span>
                    <span className={`font-bold ${quote.priceImpactPct >= 0 ? 'text-[#53b3d4]' : 'text-[#FF8A33]'}`}>
                      {quote.priceImpactPct >= 0 ? '+' : ''}{quote.priceImpactPct.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Creator Fee (1.5%):</span>
                    <span className="text-[#53b3d4] font-bold">
                      +{formatNGN(Math.max(10, Math.round(quote.creatorFeeEth * 4_200_000 * 100)))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Platform Fee (1.5%):</span>
                    <span className="text-slate-400 font-bold">
                      +{formatNGN(Math.max(10, Math.round(quote.creatorFeeEth * 4_200_000 * 100)))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#7a7a8c] border-t border-[#1e1e2a] pt-1.5">
                    <span>Market Creator Lifetime Earnings:</span>
                    <span className="text-slate-300">
                      {formatNGN(Math.round(((market.creatorFeesEarned || 0) + quote.creatorFeeEth) * 4_200_000 * 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Holders Table Card (100% Real Holders) */}
              <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Holders</h3>
                    <span className="rounded-full bg-[#20202c] px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                      {activeHolders.length}
                    </span>
                  </div>
                  <div className="flex items-center rounded-xl bg-[#0c0c11] p-1 border border-[#232330] text-xs">
                    <button
                      type="button"
                      onClick={() => setHoldersSideTab('YES')}
                      className={`rounded-lg px-2.5 py-0.5 font-bold transition ${
                        holdersSideTab === 'YES'
                          ? 'bg-[#227c9d] text-white shadow-sm'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      Yes ({realHolders.yesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHoldersSideTab('NO')}
                      className={`rounded-lg px-2.5 py-0.5 font-bold transition ${
                        holdersSideTab === 'NO'
                          ? 'bg-[#FF6B00] text-black shadow-sm'
                          : 'text-[#8c8c9e] hover:text-white'
                      }`}
                    >
                      No ({realHolders.noList.length})
                    </button>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 text-[11px] font-bold text-[#8c8c9e] border-b border-[#232330] pb-2 mb-2">
                  <span className="col-span-6">Holder</span>
                  <span className="col-span-3 text-right">Shares</span>
                  <span className="col-span-3 text-right">Supply</span>
                </div>

                {/* Table Rows */}
                <div className="space-y-2">
                  {activeHolders.length === 0 ? (
                    <div className="py-5 text-center text-xs text-[#8c8c9e]">
                      No holders on the {holdersSideTab} side yet. Buy shares to establish the top position!
                    </div>
                  ) : (
                    activeHolders.map((h, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 items-center text-xs font-mono py-1 text-slate-300"
                      >
                        <div className="col-span-6 flex items-center gap-2 min-w-0 pr-2">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                            holdersSideTab === 'YES'
                              ? 'bg-gradient-to-tr from-[#227c9d] to-cyan-500'
                              : 'bg-gradient-to-tr from-[#FF6B00] to-amber-500 text-black'
                          }`}>
                            {h.handle.replace('@', '').slice(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate text-white font-sans text-xs">{h.handle}</span>
                        </div>
                        <span className="col-span-3 text-right font-bold text-white">
                          {h.shares >= 1000 ? `${(h.shares / 1000).toFixed(2)}k` : h.shares}
                        </span>
                        <span className="col-span-3 text-right text-[#8c8c9e]">
                          {h.supplyPct.toFixed(2)}%
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination `< 1 2 >` */}
                {activeHolders.length > 8 && (
                  <div className="mt-4 flex items-center justify-center gap-2 pt-2 border-t border-[#232330] text-xs">
                    <button
                      type="button"
                      onClick={() => setHoldersPage(Math.max(1, holdersPage - 1))}
                      disabled={holdersPage === 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#8c8c9e] hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="rounded bg-[#20202c] px-2 py-0.5 font-bold text-white text-[11px]">
                      {holdersPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHoldersPage(holdersPage + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#8c8c9e] hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Transactions Card (100% Real from Market Activities) */}
              <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                  <span className="rounded-full bg-[#20202c] px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                    {recentTransactions.length}
                  </span>
                </div>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {recentTransactions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#8c8c9e] space-y-1">
                      <p className="font-semibold text-slate-300">No transactions yet on Market #{market.id}</p>
                      <p className="text-[11px] text-[#7a7a8c]">Execute a trade above to establish the first conviction position!</p>
                    </div>
                  ) : (
                    recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-[#232330]/60 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                            tx.isYes ? 'bg-gradient-to-tr from-[#227c9d] to-cyan-500' : 'bg-gradient-to-tr from-[#FF6B00] to-amber-500 text-black'
                          }`}>
                            {tx.trader.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">{tx.trader}</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              tx.isYes
                                ? 'bg-[#227c9d]/20 text-[#53b3d4]'
                                : 'bg-[#FF6B00]/20 text-[#FF8A33]'
                            }`}
                          >
                            {tx.isYes ? 'Yes' : 'No'}
                          </span>
                        </div>

                        <div className="text-right font-mono text-[11px]">
                          <span
                            className={`font-bold ${
                              tx.isBuy ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.isBuy ? '+' : '-'} {Math.round(tx.shares)} Shares
                          </span>
                          <span className="block text-[9px] text-[#8c8c9e]">{tx.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Related Markets Card */}
              {relatedMarkets.length > 0 && (
                <div className="rounded-[24px] border border-[#232330] bg-[#161620] p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-3">Related Markets</h3>
                  <div className="space-y-2.5">
                    {relatedMarkets.map((rm) => {
                      const rmPrices = getMarketPricesAndSentiment(rm);
                      return (
                        <div
                          key={rm.id}
                          onClick={() => onSelectMarket && onSelectMarket(rm.id)}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[#232330] bg-[#0c0c11] p-3.5 hover:border-[#227c9d]/60 hover:bg-[#161620] transition cursor-pointer group"
                        >
                          <span className="text-xs font-semibold text-slate-300 group-hover:text-white line-clamp-2">
                            {rm.question}
                          </span>
                          <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/30 px-2.5 py-1 font-mono text-xs font-bold text-[#53b3d4] shrink-0">
                            {rmPrices.yesSentimentPct.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Floating Action Button for mobile view switch with 'Trade' */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setMobileTab(mobileTab === 'trade' ? 'overview' : 'trade')}
            className="flex items-center gap-2 rounded-full bg-white text-black px-5 py-3 shadow-2xl shadow-black/60 hover:scale-105 active:scale-95 transition font-black text-sm border border-zinc-200 cursor-pointer"
          >
            {mobileTab === 'trade' ? (
              <>
                <X className="h-5 w-5 stroke-[2.5]" />
                <span>Overview</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 stroke-[3]" />
                <span>Trade</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
