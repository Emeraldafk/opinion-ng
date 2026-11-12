import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Flame,
  Coins,
  Image as ImageIcon,
  AtSign,
  ShieldCheck,
  Target,
  Calendar,
  Clock,
  Link as LinkIcon,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { MarketCategory, MarketType } from '../lib/bondingCurve';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN } from '../lib/currency';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string | null;
  onRequireWallet?: (actionTitle?: string) => void;
  onCreateMarket: (data: {
    question: string;
    category: Exclude<MarketCategory, 'All'>;
    imageUri: string;
    sourceHandle: string;
    initialSideIsYes: boolean;
    initialBuyEth: number;
    marketType: MarketType;
    closingTime?: number;
    resolutionDeadline?: number;
    yesCondition?: string;
    noCondition?: string;
    evidenceSource?: string;
  }) => Promise<void>;
}

const PRESET_CATEGORIES: Exclude<MarketCategory, 'All'>[] = [
  'Economy',
  'Politics',
  'Culture',
  'Sports',
  'Tech',
  'Markets',
  'Other',
];

export interface PresetThumbnail {
  id: string;
  category: Exclude<MarketCategory, 'All'>;
  label: string;
  tag: string;
  url: string;
}

export const PRESET_THUMBNAILS: PresetThumbnail[] = [
  // --- SPORTS (Football, Basketball, Formula 1, Boxing, Tennis) ---
  {
    id: 'sp-1',
    category: 'Sports',
    label: 'Premier League Match Stadium',
    tag: '⚽ Football / Soccer',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-2',
    category: 'Sports',
    label: 'NBA Basketball Arena',
    tag: '🏀 Basketball',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-3',
    category: 'Sports',
    label: 'Formula 1 Grand Prix',
    tag: '🏎️ Racing',
    url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-4',
    category: 'Sports',
    label: 'Boxing & MMA Championship',
    tag: '🥊 Combat Sports',
    url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-5',
    category: 'Sports',
    label: 'Tennis Grand Slam Court',
    tag: '🎾 Tennis',
    url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80',
  },

  // --- CRYPTO (Bull Market, Bitcoin, Ethereum, Web3) ---
  {
    id: 'cr-1',
    category: 'Crypto',
    label: 'Crypto Bull Market',
    tag: '🐂 Bull Run',
    url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cr-2',
    category: 'Crypto',
    label: 'Physical Bitcoin & Gold',
    tag: '₿ Bitcoin',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cr-3',
    category: 'Crypto',
    label: 'Ethereum Virtual Machine',
    tag: 'Ξ Ethereum',
    url: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cr-4',
    category: 'Crypto',
    label: 'Trading Desk Candlesticks',
    tag: '📈 Trading',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
  },

  // --- AI (Robots, Neural Network, Code) ---
  {
    id: 'ai-1',
    category: 'AI',
    label: 'Humanoid AI Robot',
    tag: '🤖 Robotics',
    url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ai-2',
    category: 'AI',
    label: 'Neural Network Synapses',
    tag: '🧠 Deep Learning',
    url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ai-3',
    category: 'AI',
    label: 'Autonomous Agent Code',
    tag: '💻 Algorithms',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
  },

  // --- DEFI (Liquidity, Staking, RWA) ---
  {
    id: 'df-1',
    category: 'DeFi',
    label: 'DeFi Liquidity Pools',
    tag: '💧 Automated MM',
    url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'df-2',
    category: 'DeFi',
    label: 'Tokenized Real-World Assets',
    tag: '🏛️ RWA / Gold',
    url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'df-3',
    category: 'DeFi',
    label: 'Decentralized Staking Yield',
    tag: '🌾 Yield Farming',
    url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
  },

  // --- CULTURE (Festival, Cyberpunk, Memes) ---
  {
    id: 'cu-1',
    category: 'Culture',
    label: 'Music Festival Stadium',
    tag: '🎵 Viral Event',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cu-2',
    category: 'Culture',
    label: 'Cyberpunk Neon Metropolis',
    tag: '🌆 Pop Culture',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cu-3',
    category: 'Culture',
    label: 'Digital Art & Streetwear',
    tag: '🎨 Creative',
    url: 'https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=600&auto=format&fit=crop&q=80',
  },

  // --- POLITICS (Capitol, Debate, Global Summit) ---
  {
    id: 'po-1',
    category: 'Politics',
    label: 'Capitol Building & Government',
    tag: '🏛️ Governance',
    url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'po-2',
    category: 'Politics',
    label: 'Presidential Debate & Elections',
    tag: '🗳️ Elections',
    url: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'po-3',
    category: 'Politics',
    label: 'Global Geopolitical Summit',
    tag: '🌐 World Affairs',
    url: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&auto=format&fit=crop&q=80',
  },

  // --- ECONOMY (Central Bank, Oil & Gas, Lagos Infrastructure) ---
  {
    id: 'ec-1',
    category: 'Economy',
    label: 'Central Bank & Financial Markets',
    tag: '🏦 Banking & FX',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ec-2',
    category: 'Economy',
    label: 'Refinery & Energy Infrastructure',
    tag: '⛽ Energy / Petrol',
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ec-3',
    category: 'Economy',
    label: 'Lagos City & Rail Transit',
    tag: '🚆 Transit / Infrastructure',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
  },

  // --- OTHER (Space, Tech, Innovation) ---
  {
    id: 'ot-1',
    category: 'Other',
    label: 'Orbital Rocket Launch',
    tag: '🚀 Aerospace',
    url: 'https://images.unsplash.com/photo-1517976487507-5b3a4a0346a0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ot-2',
    category: 'Other',
    label: 'Electric Vehicle Tech',
    tag: '⚡ Clean Energy',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
  },
];

const PRESET_COVERS = PRESET_THUMBNAILS.slice(0, 4);

// Helper to format ISO string to local input format YYYY-MM-DDTHH:mm
function getIsoDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({
  isOpen,
  onClose,
  onCreateMarket,
  walletAddress,
  onRequireWallet,
}) => {
  const auth = useAppAuth();
  // Market Type: Perpetual Opinion vs Resolvable Prediction
  const [marketType, setMarketType] = useState<MarketType>('PERPETUAL_OPINION');

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Exclude<MarketCategory, 'All'>>('Robinhood');
  const [sourceHandle, setSourceHandle] = useState('@TheTiredFun');
  const [imageUri, setImageUri] = useState(PRESET_THUMBNAILS[0].url);
  const [initialSideIsYes, setInitialSideIsYes] = useState(true);
  const [initialBuyEth, setInitialBuyEth] = useState('1000');
  const [antiSpamOption, setAntiSpamOption] = useState<'fee' | 'seed'>('fee');

  // Thumbnail Gallery Dropdown state
  const [isThumbnailMenuOpen, setIsThumbnailMenuOpen] = useState(false);
  const [thumbnailCategoryFilter, setThumbnailCategoryFilter] = useState<'All' | Exclude<MarketCategory, 'All'>>('All');

  // Prediction market specific governance states
  const now = new Date();
  const defaultClose = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const defaultResolve = new Date(defaultClose.getTime() + 24 * 60 * 60 * 1000); // +24 hours

  const [closingDateTimeStr, setClosingDateTimeStr] = useState<string>(
    getIsoDateTimeLocal(defaultClose)
  );
  const [resolutionDeadlineStr, setResolutionDeadlineStr] = useState<string>(
    getIsoDateTimeLocal(defaultResolve)
  );
  const [yesCondition, setYesCondition] = useState('');
  const [noCondition, setNoCondition] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('https://defillama.com');

  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!walletAddress && !auth.isAuthenticated) {
      if (onRequireWallet) {
        onRequireWallet(
          marketType === 'RESOLVABLE_PREDICTION'
            ? 'Spawning a Prediction Market'
            : 'Spawning an Opinion Market'
        );
      }
      return;
    }

    if (!question.trim()) {
      setFormError('Please enter a clear market debate question.');
      return;
    }

    let closingTimeSec: number | undefined = undefined;
    let resolutionDeadlineSec: number | undefined = undefined;

    if (marketType === 'RESOLVABLE_PREDICTION') {
      const closeDate = new Date(closingDateTimeStr);
      const resolveDate = new Date(resolutionDeadlineStr);
      const nowSec = Math.floor(Date.now() / 1000);

      closingTimeSec = Math.floor(closeDate.getTime() / 1000);
      resolutionDeadlineSec = Math.floor(resolveDate.getTime() / 1000);

      if (isNaN(closingTimeSec) || isNaN(resolutionDeadlineSec)) {
        setFormError('Please select valid closing and resolution dates.');
        return;
      }

      // Min 24 hours governance rule
      if (closingTimeSec < nowSec + 86400 - 60) {
        setFormError('Trading closing time must be at least 24 hours into the future.');
        return;
      }

      // Max 90 days governance rule
      if (closingTimeSec > nowSec + 90 * 86400) {
        setFormError('Trading closing time cannot exceed 90 days from creation.');
        return;
      }

      // Resolution deadline must be >= closing time
      if (resolutionDeadlineSec < closingTimeSec) {
        setFormError('Resolution deadline must be on or after the trading closing date.');
        return;
      }

      if (!yesCondition.trim()) {
        setFormError('Please specify an objective YES condition for verification.');
        return;
      }

      if (!noCondition.trim()) {
        setFormError('Please specify an objective NO condition for verification.');
        return;
      }

      if (!evidenceSource.trim()) {
        setFormError('Please provide an approved evidence source URL or publication.');
        return;
      }
    }

    setIsCreating(true);
    try {
      await onCreateMarket({
        question: question.trim(),
        category,
        imageUri: imageUri.trim() || PRESET_COVERS[0].url,
        sourceHandle: sourceHandle.trim() || '@TheTiredFun',
        initialSideIsYes,
        initialBuyEth: parseFloat(initialBuyEth) || 0,
        marketType,
        closingTime: closingTimeSec,
        resolutionDeadline: resolutionDeadlineSec,
        yesCondition: yesCondition.trim(),
        noCondition: noCondition.trim(),
        evidenceSource: evidenceSource.trim(),
      });
      setQuestion('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Market creation failed';
      setFormError(msg.slice(0, 120));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-2 sm:my-8 w-full max-w-xl overflow-hidden rounded-[24px] sm:rounded-[28px] border border-[#232330] bg-[#121218] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232330] bg-[#161620] px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl text-white shadow-md transition-colors ${
                marketType === 'RESOLVABLE_PREDICTION'
                  ? 'bg-[#FF6B00] shadow-[#FF6B00]/30'
                  : 'bg-[#227c9d] shadow-[#227c9d]/30'
              }`}
            >
              {marketType === 'RESOLVABLE_PREDICTION' ? (
                <Target className="h-4 w-4 sm:h-5 sm:w-5 fill-white/20 text-white" />
              ) : (
                <Flame className="h-4 w-4 sm:h-5 sm:w-5 fill-white" />
              )}
            </div>
            <div>
              <h2 className="font-fun text-base sm:text-lg font-black text-white">
                {marketType === 'RESOLVABLE_PREDICTION'
                  ? 'Spawn Prediction Market'
                  : 'Spawn Opinion Market'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#8c8c9e] line-clamp-1">
                {marketType === 'RESOLVABLE_PREDICTION'
                  ? 'Closing date & Pari-Mutuel settlement rewards'
                  : 'Earn 1.00% ETH fees on continuous conviction'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Create Market"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#2e2e40] bg-[#1a1a26] text-white hover:bg-[#252538] hover:border-white/40 active:scale-95 transition shadow-sm shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {/* Phase 2: Market Type Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Market Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMarketType('PERPETUAL_OPINION')}
                className={`flex flex-col items-start rounded-2xl border p-3 sm:p-3.5 text-left transition ${
                  marketType === 'PERPETUAL_OPINION'
                    ? 'border-[#227c9d] bg-[#227c9d]/15 shadow-md shadow-[#227c9d]/10'
                    : 'border-[#232330] bg-[#0c0c11] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-fun text-xs sm:text-sm font-black text-white">
                  <Flame className="h-4 w-4 text-[#53b3d4]" />
                  <span>Perpetual Opinion</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8c8c9e]">
                  Continuous 24/7 conviction trading. No expiry, no settlement.
                </p>
                <span className="mt-2 rounded-full bg-[#227c9d]/20 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-[#53b3d4]">
                  Type 0 • Endless Curves
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMarketType('RESOLVABLE_PREDICTION')}
                className={`flex flex-col items-start rounded-2xl border p-3 sm:p-3.5 text-left transition ${
                  marketType === 'RESOLVABLE_PREDICTION'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/15 shadow-md shadow-[#FF6B00]/10'
                    : 'border-[#232330] bg-[#0c0c11] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-fun text-xs sm:text-sm font-black text-white">
                  <Target className="h-4 w-4 text-[#FF6B00]" />
                  <span>Resolvable Prediction</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8c8c9e]">
                  Fixed closing date & winning share payouts.
                </p>
                <span className="mt-2 rounded-full bg-[#FF6B00]/20 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-[#FF8A33]">
                  Type 1 • Settlement Pool
                </span>
              </button>
            </div>
          </div>

          {/* Market Question */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Market Question
            </label>
            <textarea
              rows={2}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                marketType === 'RESOLVABLE_PREDICTION'
                  ? 'e.g., Will Dangote Refinery petrol price drop below ₦850/L before Q4 2026?'
                  : 'e.g., Will Burna Boy or Wizkid headline the 2026 World Cup Closing Ceremony?'
              }
              className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] px-4 py-3 text-sm font-semibold text-white placeholder-[#7a7a8c] focus:border-[#227c9d] focus:outline-none transition"
            />
          </div>

          {/* Category + Source Handle */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as Exclude<MarketCategory, 'All'>;
                  setCategory(newCat);
                  setThumbnailCategoryFilter(newCat);
                  const matchingThumbnail = PRESET_THUMBNAILS.find((t) => t.category === newCat);
                  if (matchingThumbnail) {
                    setImageUri(matchingThumbnail.url);
                  }
                }}
                className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#227c9d] focus:outline-none transition"
              >
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#121218]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                X / Source Handle
              </label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a7a8c]" />
                <input
                  type="text"
                  value={sourceHandle}
                  onChange={(e) => setSourceHandle(e.target.value)}
                  placeholder="@username"
                  className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] pl-9 pr-3 py-2.5 font-mono text-xs text-white focus:border-[#227c9d] focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* PHASE 3: Prediction Market Date & Resolution Governance Fields */}
          {marketType === 'RESOLVABLE_PREDICTION' && (
            <div className="space-y-4 rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/5 p-4">
              <div className="flex items-center gap-2 border-b border-[#FF6B00]/20 pb-2">
                <Target className="h-4 w-4 text-[#FF6B00]" />
                <span className="font-fun text-xs font-bold uppercase tracking-wider text-orange-200">
                  Prediction Date & Criteria Governance
                </span>
              </div>

              {/* Trading Closing Date & Resolution Deadline */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span>Trading Closes (UTC)</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={closingDateTimeStr}
                    onChange={(e) => setClosingDateTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3 py-2 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#8c8c9e]">
                    Trading automatically stops at this exact timestamp (Min: 24h, Max: 90d).
                  </p>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-[#53b3d4]" />
                    <span>Resolution Deadline (UTC)</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={resolutionDeadlineStr}
                    onChange={(e) => setResolutionDeadlineStr(e.target.value)}
                    className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3 py-2 font-mono text-xs text-white focus:border-[#227c9d] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#8c8c9e]">
                    Expected date by which outcome evidence will be proposed.
                  </p>
                </div>
              </div>

              {/* Objective YES Condition */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">
                  Objective YES Criteria
                </label>
                <input
                  type="text"
                  required
                  value={yesCondition}
                  onChange={(e) => setYesCondition(e.target.value)}
                  placeholder="e.g., DefiLlama TVL report >= $500,000,000 USD before close."
                  className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3 py-2 text-xs text-white placeholder-[#7a7a8c] focus:border-[#FF6B00] focus:outline-none"
                />
              </div>

              {/* Objective NO Condition */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">
                  Objective NO Criteria
                </label>
                <input
                  type="text"
                  required
                  value={noCondition}
                  onChange={(e) => setNoCondition(e.target.value)}
                  placeholder="e.g., DefiLlama TVL remains strictly below $500M at closing time."
                  className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3 py-2 text-xs text-white placeholder-[#FF6B00] focus:outline-none"
                />
              </div>

              {/* Approved Evidence Source */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <LinkIcon className="h-3.5 w-3.5 text-[#53b3d4]" />
                  <span>Approved Evidence Source URL</span>
                </label>
                <input
                  type="url"
                  required
                  value={evidenceSource}
                  onChange={(e) => setEvidenceSource(e.target.value)}
                  placeholder="https://defillama.com/chain/Robinhood or official source"
                  className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-3 py-2 font-mono text-xs text-white focus:border-[#227c9d] focus:outline-none"
                />
              </div>

              {/* Anti-manipulation Notice */}
              <div className="flex items-start gap-2 rounded-xl bg-orange-950/40 p-2.5 text-[11px] text-orange-200 border border-orange-500/20">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#FF6B00] mt-0.5" />
                <span>
                  <strong>Anti-Manipulation Rule:</strong> As market creator, you can never resolve or finalize your own market. An authorized resolver proposes with verifiable evidence, subject to a 24-hour dispute window.
                </span>
              </div>
            </div>
          )}

          {/* Thumbnail Image Preset Gallery & Dropdown */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-[#FF6B00]" />
                <span>Market Thumbnail</span>
              </span>
              <span className="font-mono text-[10px] text-[#53b3d4]">Sports, Crypto, AI & more</span>
            </label>

            {/* Selected Thumbnail Quick Preview Bar & Dropdown Toggle */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#232330] bg-[#0c0c11] p-2 pr-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-10 w-14 rounded-xl overflow-hidden bg-[#181824] shrink-0 border border-[#262638]">
                  {imageUri ? (
                    <img
                      src={imageUri}
                      alt="Thumbnail preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PRESET_THUMBNAILS[0].url;
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#7a7a8c]">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {PRESET_THUMBNAILS.find((t) => t.url === imageUri)?.label || 'Custom Thumbnail Image'}
                  </div>
                  <div className="text-[10px] text-[#FF8A33] font-mono">
                    {PRESET_THUMBNAILS.find((t) => t.url === imageUri)?.tag || 'Web Image Link'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsThumbnailMenuOpen(!isThumbnailMenuOpen)}
                className="flex items-center gap-1 rounded-xl bg-[#181824] hover:bg-[#202030] border border-[#2d2d40] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 shrink-0"
              >
                <span>{isThumbnailMenuOpen ? 'Close Gallery' : 'Select Thumbnail'}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#FF6B00] transition-transform ${isThumbnailMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Interactive Thumbnail Gallery Dropdown Menu */}
            {isThumbnailMenuOpen && (
              <div className="rounded-2xl border border-[#28283a] bg-[#12121b] p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
                <div className="flex items-center justify-between border-b border-[#20202e] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span>Choose from Category Thumbnails</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#8c8c9e]">
                    {PRESET_THUMBNAILS.length} Presets Available
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {(['All', 'Sports', 'Crypto', 'AI', 'DeFi', 'Culture', 'Politics', 'Robinhood', 'Other'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setThumbnailCategoryFilter(cat)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition ${
                          thumbnailCategoryFilter === cat
                            ? 'bg-[#FF6B00] text-white shadow-sm'
                            : 'bg-[#181824] text-[#8c8c9e] hover:text-white hover:bg-[#222232]'
                        }`}
                      >
                        {cat === 'Sports' ? '⚽ Sports' : cat === 'Crypto' ? '⚡ Crypto' : cat === 'AI' ? '🤖 AI' : cat === 'DeFi' ? '🏦 DeFi' : cat === 'Culture' ? '🎭 Culture' : cat === 'Politics' ? '🏛️ Politics' : cat === 'Robinhood' ? '🏹 Robinhood' : cat === 'Other' ? '🚀 Tech' : 'All'}
                      </button>
                    )
                  )}
                </div>

                {/* Thumbnails Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {(thumbnailCategoryFilter === 'All'
                    ? PRESET_THUMBNAILS
                    : PRESET_THUMBNAILS.filter((t) => t.category === thumbnailCategoryFilter)
                  ).map((preset) => {
                    const isSelected = imageUri === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setImageUri(preset.url);
                          setIsThumbnailMenuOpen(false);
                        }}
                        className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#FF6B00] ring-1 ring-[#FF6B00] bg-[#FF6B00]/10'
                            : 'border-[#232332] bg-[#161622] hover:border-[#3a3a52] hover:bg-[#1b1c2b]'
                        }`}
                      >
                        <div className="aspect-[16/10] w-full overflow-hidden bg-black/40 relative">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-sm">
                            {preset.tag}
                          </span>
                        </div>
                        <div className="p-1.5">
                          <div className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-[#FF8A33]">
                            {preset.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom URL Input Field */}
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a7a8c]" />
              <input
                type="url"
                value={imageUri}
                onChange={(e) => setImageUri(e.target.value)}
                placeholder="Or paste custom image URL..."
                className="w-full rounded-2xl border border-[#232330] bg-[#0c0c11] pl-9 pr-3 py-2 font-mono text-xs text-white placeholder-[#5a5a6e] focus:border-[#227c9d] focus:outline-none transition"
              />
            </div>
          </div>

          {/* Initial Seed Position */}
          <div className="rounded-2xl border border-[#232330] bg-[#161620] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Initial Seed Position (Early-Bird Entry)
              </span>
              <span className="font-mono text-[11px] text-[#53b3d4]">Optional</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <button
                type="button"
                onClick={() => setInitialSideIsYes(true)}
                className={`rounded-xl border py-2.5 text-xs font-black transition ${
                  initialSideIsYes
                    ? 'border-[#227c9d] bg-[#227c9d] text-white shadow-sm'
                    : 'border-[#232330] bg-[#0c0c11] text-[#8c8c9e]'
                }`}
              >
                SEED YES
              </button>
              <button
                type="button"
                onClick={() => setInitialSideIsYes(false)}
                className={`rounded-xl border py-2.5 text-xs font-black transition ${
                  !initialSideIsYes
                    ? 'border-[#FF6B00] bg-[#FF6B00] text-black shadow-sm'
                    : 'border-[#232330] bg-[#0c0c11] text-[#8c8c9e]'
                }`}
              >
                SEED NO
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={initialBuyEth}
                onChange={(e) => setInitialBuyEth(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-[#232330] bg-[#0c0c11] px-4 py-2 font-mono text-sm font-bold text-white focus:border-[#227c9d] focus:outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#53b3d4] font-bold">
                NGN (₦)
              </span>
            </div>
          </div>

          {/* Anti-Spam Market Creation Requirement */}
          <div className="rounded-2xl border border-[#2e2e42] bg-[#0c0c14] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#227c9d]" />
                <span>Anti-Spam Requirement</span>
              </span>
              <span className="text-[11px] text-[#8c8c9e]">
                Available: <strong className="text-white">{formatNGN(auth.wallet.availableKobo)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAntiSpamOption('fee')}
                className={`rounded-xl border p-2.5 text-left transition ${
                  antiSpamOption === 'fee'
                    ? 'border-[#227c9d] bg-[#227c9d]/15 text-white'
                    : 'border-[#232330] bg-[#12121a] text-[#8c8c9e]'
                }`}
              >
                <div className="font-bold text-white">₦1,000 Creation Fee</div>
                <div className="text-[10px] text-[#8c8c9e] mt-0.5">Deducted once to combat spam</div>
              </button>

              <button
                type="button"
                onClick={() => setAntiSpamOption('seed')}
                className={`rounded-xl border p-2.5 text-left transition ${
                  antiSpamOption === 'seed'
                    ? 'border-[#227c9d] bg-[#227c9d]/15 text-white'
                    : 'border-[#232330] bg-[#12121a] text-[#8c8c9e]'
                }`}
              >
                <div className="font-bold text-white">₦5,000 Liquidity Seed</div>
                <div className="text-[10px] text-[#8c8c9e] mt-0.5">Adds initial liquidity to pools</div>
              </button>
            </div>
          </div>

          {/* Creator Reward Note */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#227c9d]/30 bg-[#227c9d]/10 p-3 text-xs text-[#53b3d4]">
            <Coins className="h-4 w-4 shrink-0 text-[#53b3d4]" />
            <span>
              You earn <strong>1.50% NGN</strong> creator fees on every buy/sell trade. Automatically credited to your OpinionNG wallet.
            </span>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-fun text-base font-black uppercase tracking-wider text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
              marketType === 'RESOLVABLE_PREDICTION'
                ? 'bg-[#FF6B00] hover:bg-[#EA580C] text-black'
                : 'bg-[#227c9d] hover:bg-[#1a647f]'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {!walletAddress && !auth.isAuthenticated
                ? 'Sign In to Launch Market'
                : isCreating
                ? 'Creating Opinion Market...'
                : marketType === 'RESOLVABLE_PREDICTION'
                ? 'Launch Prediction Market'
                : 'Launch Opinion Market'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
