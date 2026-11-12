import React, { useState, useEffect, useMemo } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
} from 'viem';
import {
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  Coins,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Zap,
  ShieldCheck,
  SlidersHorizontal,
  Activity,
  Award,
  ArrowLeft,
  LayoutGrid,
  List,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_EXPLORER_URL,
  ROBINHOOD_FAUCET_URL,
  robinhoodTestnet,
  switchOrAddRobinhoodChain,
  shortenAddress,
  DEFAULT_NULLHOOD_CONTRACT_ADDRESS,
} from './config/robinhoodChain';
import {
  OpinionMarket,
  MarketCategory,
  MarketType,
  MarketComment,
  TradeActivity,
  INITIAL_OPINION_MARKETS,
  INITIAL_VIRTUAL_ETH,
  INITIAL_VIRTUAL_SHARES,
  getMarketPricesAndSentiment,
  quoteBuyOrder,
  quoteSellOrder,
  isPredictionMarket,
} from './lib/bondingCurve';
import { NULLHOOD_MARKETS_ABI } from './contracts/NullhoodMarketsArtifact';
import { Navbar, TiredFunNavTab } from './components/Navbar';
import { LiveTicker } from './components/LiveTicker';
import { MarketCard } from './components/MarketCard';
import { MarketDetailModal } from './components/MarketDetailModal';
import { CreateMarketModal } from './components/CreateMarketModal';
import { WithdrawModal } from './components/WithdrawModal';
import { SignInModal } from './components/SignInModal';
import { DepositModal } from './components/DepositModal';
import { useAppAuth } from './hooks/useAppAuth';
import { formatNGN, nairaToKobo, koboToNaira } from './lib/currency';
import { HoodPulseView } from './components/HoodPulseView';
import { OpinionFeedView } from './components/OpinionFeedView';
import { getUserProfile, UserProfile } from './lib/userProfileService';
import { OpinionReputationView } from './components/OpinionReputationView';
import { CreatorEconomicsView, FeeClaimRecord } from './components/CreatorEconomicsView';
import { AuthLandingPage } from './components/AuthLandingPage';
import { infraManager } from './lib/indexerService';
import { dbService } from './lib/databaseService';
import { realtimeSync } from './lib/realtimeSyncService';
import { calculateXScore, getTopTrendingMarket } from './lib/feedAlgorithm';
import { apiClient } from './lib/apiClient';

type SortOption = 'volume' | 'conviction' | 'controversial' | 'newest';

interface UserHoldings {
  [marketId: number]: {
    yesShares: number;
    noShares: number;
  };
}

interface ToastMessage {
  id: string;
  title: string;
  subtitle: string;
  txHash?: string;
}

export function App() {
  const auth = useAppAuth();

  // Wallet & Chain state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0.000');
  const [contractAddress, setContractAddress] = useState<string>(() => {
    const saved = localStorage.getItem('nullhood_contract_addr');
    if (saved && saved.startsWith('0x') && saved.length === 42) return saved;
    return DEFAULT_NULLHOOD_CONTRACT_ADDRESS;
  });

  // Fee configuration (1% creator, 1% protocol default)
  const [creatorFeeRate, setCreatorFeeRate] = useState<number>(0.01);
  const [protocolFeeRate, setProtocolFeeRate] = useState<number>(0.01);

  // Markets & User State
  const [markets, setMarkets] = useState<OpinionMarket[]>(() => dbService.loadMarkets(INITIAL_OPINION_MARKETS));
  const [holdings, setHoldings] = useState<UserHoldings>(() => dbService.loadHoldings({}));
  const [claimableCreatorFees, setClaimableCreatorFees] = useState<number>(0);
  const [claimHistory, setClaimHistory] = useState<FeeClaimRecord[]>(() =>
    dbService.loadClaimHistory([])
  );

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<TiredFunNavTab>('feed');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('All');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickPromptText, setQuickPromptText] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getUserProfile(walletAddress));

  useEffect(() => {
    setUserProfile(getUserProfile(walletAddress));
    setLikesMap(dbService.loadLikes(walletAddress));
  }, [walletAddress]);

  // Feed Recommendation Randomization Session & Realtime Likes
  const [feedSessionSeed, setFeedSessionSeed] = useState(() => Date.now());
  const [likesMap, setLikesMap] = useState<Record<number, { count: number; liked: boolean }>>(() =>
    dbService.loadLikes(walletAddress)
  );

  // Global Realtime Synchronization (Phone <-> PC)
  useEffect(() => {
    const unsubComment = realtimeSync.onComment((marketId, remoteComment) => {
      setMarkets((prev) => {
        const target = prev.find((m) => m.id === marketId);
        if (!target) return prev;
        if (target.comments.some((c) => c.id === remoteComment.id)) return prev;

        return prev.map((m) =>
          m.id === marketId
            ? { ...m, comments: [remoteComment, ...m.comments] }
            : m
        );
      });
    });

    const unsubLike = realtimeSync.onLike(() => {
      setLikesMap(dbService.loadLikes(walletAddress));
    });

    return () => {
      unsubComment();
      unsubLike();
    };
  }, [walletAddress]);

  const handleRefreshFeed = () => {
    setFeedSessionSeed(Date.now());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    pushToast('Feed Refreshed', 'Surfaced latest conviction & interactive opinions');
  };

  // Modals
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [detailInitialSide, setDetailInitialSide] = useState<'YES' | 'NO'>('YES');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingActionTitle, setPendingActionTitle] = useState('Voting & Trading Opinions');

  const promptConnectWallet = (actionTitle = 'Voting & Trading Opinions') => {
    setPendingActionTitle(actionTitle);
    auth.openSignInModal();
  };

  // Live Tape & Pulse Activities
  const [activities, setActivities] = useState<TradeActivity[]>(() =>
    dbService.loadActivities([
      {
        id: 'act-init-1',
        marketId: 1,
        marketQuestion: 'Will Dangote Refinery petrol pump price drop below ₦850/L across Lagos before Q4 2026?',
        category: 'Economy',
        trader: 'Tunde Afolabi',
        isYes: true,
        isBuy: true,
        ethAmount: 0.048,
        sharesAmount: 640,
        yesSentimentAfter: 64.2,
        sentimentDeltaPct: 2.2,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 18,
        isOnChain: false,
      },
      {
        id: 'act-init-2',
        marketId: 2,
        marketQuestion: 'Will Burna Boy, Wizkid or Davido headline the 2026 FIFA World Cup Closing Ceremony?',
        category: 'Culture',
        trader: 'Chioma Adebayo',
        isYes: true,
        isBuy: true,
        ethAmount: 0.072,
        sharesAmount: 890,
        yesSentimentAfter: 71.8,
        sentimentDeltaPct: 3.5,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 42,
        isOnChain: false,
      },
      {
        id: 'act-init-3',
        marketId: 3,
        marketQuestion: 'Will the Super Eagles reach the Quarter-Finals or better at the 2026 FIFA World Cup?',
        category: 'Sports',
        trader: 'Emeka Nwosu',
        isYes: true,
        isBuy: true,
        ethAmount: 0.055,
        sharesAmount: 760,
        yesSentimentAfter: 54.8,
        sentimentDeltaPct: 1.8,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 75,
        isOnChain: false,
      },
      {
        id: 'act-init-4',
        marketId: 4,
        marketQuestion: 'Will official NAFEM USD/NGN exchange rate strengthen below ₦1,400/$ in 2026?',
        category: 'Economy',
        trader: 'Dapo Oladipo',
        isYes: false,
        isBuy: true,
        ethAmount: 0.061,
        sharesAmount: 680,
        yesSentimentAfter: 51.2,
        sentimentDeltaPct: 1.2,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 120,
        isOnChain: false,
      },
      {
        id: 'act-init-5',
        marketId: 5,
        marketQuestion: 'Will INEC mandate 100% digital voter accreditation and real-time portal upload for the 2027 General Elections?',
        category: 'Politics',
        trader: 'Amina Bello',
        isYes: true,
        isBuy: true,
        ethAmount: 0.062,
        sharesAmount: 620,
        yesSentimentAfter: 61.9,
        sentimentDeltaPct: 2.1,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 180,
        isOnChain: false,
      },
      {
        id: 'act-init-6',
        marketId: 6,
        marketQuestion: 'Will Moniepoint or OPay execute an IPO listing on the Nigerian Exchange (NGX) before 2027?',
        category: 'Tech',
        trader: 'Kelechi Okafor',
        isYes: true,
        isBuy: true,
        ethAmount: 0.058,
        sharesAmount: 710,
        yesSentimentAfter: 57.8,
        sentimentDeltaPct: 2.5,
        eventType: 'STANDARD_TRADE',
        timestamp: Date.now() - 1000 * 60 * 240,
        isOnChain: false,
      },
    ])
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (title: string, subtitle: string, txHash?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, title, subtitle, txHash }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  // Determine if active mode is LIVE ON-CHAIN TESTNET vs SANDBOX SIMULATION (Requirement 7)
    // Database Persistence: Save markets, activities, holdings to local database
  useEffect(() => {
    dbService.saveMarkets(markets);
  }, [markets]);

  useEffect(() => {
    dbService.saveActivities(activities);
  }, [activities]);

  useEffect(() => {
    dbService.saveHoldings(holdings);
  }, [holdings]);

  useEffect(() => {
    dbService.saveClaimHistory(claimHistory);
  }, [claimHistory]);

  // Sync real on-chain markets when connected to Robinhood Chain contract
  useEffect(() => {
    if (!contractAddress || contractAddress.length !== 42) return;
    let active = true;
    dbService.syncOnChainMarkets(contractAddress).then((onChainMarkets) => {
      if (active && onChainMarkets && onChainMarkets.length > 0) {
        setMarkets(onChainMarkets);
      }
    });
    return () => {
      active = false;
    };
  }, [contractAddress, chainId]);

  const isLiveOnChainMode = useMemo(() => {
    return Boolean(
      contractAddress &&
        contractAddress.startsWith('0x') &&
        contractAddress.length === 42 &&
        chainId === ROBINHOOD_CHAIN_ID
    );
  }, [contractAddress, chainId]);

  // Sync wallet balance when connected on Robinhood Chain
  useEffect(() => {
    if (!walletAddress) return;
    let active = true;
    (async () => {
      try {
        const bal = await infraManager.publicClient.getBalance({
          address: walletAddress as `0x${string}`,
        });
        if (active) {
          setEthBalance(formatEther(bal));
        }
      } catch {
        // Fallback demo balance
      }
    })();
    return () => {
      active = false;
    };
  }, [walletAddress, chainId]);

  // Connect Wallet & switch to Robinhood Chain Testnet (46630)
  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      pushToast(
        'MetaMask / EVM Wallet Required',
        'No browser EVM wallet found. Please install MetaMask, Rabby, or Coinbase Wallet to sign real transactions on Robinhood Chain.'
      );
      return;
    }

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];
      if (!accounts || accounts.length === 0) {
        pushToast('Connection Cancelled', 'No account was selected in your wallet.');
        return;
      }
      setWalletAddress(accounts[0]);
      await switchOrAddRobinhoodChain();
      const hexChain = (await window.ethereum.request({
        method: 'eth_chainId',
      })) as string;
      setChainId(parseInt(hexChain, 16));

      const bal = await infraManager.publicClient.getBalance({
        address: accounts[0] as `0x${string}`,
      });
      setEthBalance(formatEther(bal));

      pushToast(
        'Connected to Robinhood Chain Testnet',
        `Wallet ${shortenAddress(accounts[0])} active on Chain ID ${ROBINHOOD_CHAIN_ID}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect wallet';
      pushToast('Wallet Notice', msg);
    }
  };

  const handleConnectSimulatedWallet = () => {
    const mockAddr = '0x94A1F30C863B489201D89E780283A491C783F10';
    setWalletAddress(mockAddr);
    setChainId(ROBINHOOD_CHAIN_ID);
    setEthBalance('1.500');
    pushToast(
      'Wallet Connected (Robinhood Chain)',
      `Connected ${shortenAddress(mockAddr)} with 1.500 test ETH on Robinhood Testnet (46630)`
    );
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    setUserProfile(null);
    setEthBalance('0.00');
    pushToast('Wallet Disconnected', 'Disconnected Robinhood Chain session');
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchOrAddRobinhoodChain();
      setChainId(ROBINHOOD_CHAIN_ID);
      pushToast('Switched Network', 'Connected to Robinhood Chain Testnet (46630)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not switch network';
      pushToast('Network Switch Error', msg);
    }
  };

  // Execute Buy or Sell on independent YES or NO bonding curve (Off-Chain NGN + Optional EVM)
  const handleExecuteTrade = async (
    marketId: number,
    isYes: boolean,
    isBuy: boolean,
    amount: number,
    slippagePct = 1.0
  ) => {
    // 1. Enforce authentication
    if (!auth.isAuthenticated && !walletAddress) {
      pushToast('Authentication Required', 'Please sign in to OpinionNG to trade with your NGN balance.');
      auth.openSignInModal();
      return;
    }

    const targetMarket = markets.find((m) => m.id === marketId);
    if (!targetMarket || amount <= 0) return;

    const quote = isBuy
      ? quoteBuyOrder(targetMarket, isYes, amount, slippagePct, creatorFeeRate, protocolFeeRate)
      : quoteSellOrder(targetMarket, isYes, amount, slippagePct, creatorFeeRate, protocolFeeRate);

    if (!isBuy) {
      const currentHeld = isYes
        ? holdings[marketId]?.yesShares || 0
        : holdings[marketId]?.noShares || 0;
      if (currentHeld < amount) {
        throw new Error(
          `InsufficientShares: You only hold ${Math.floor(currentHeld)} ${
            isYes ? 'YES' : 'NO'
          } shares.`
        );
      }
    }

    // 2. Atomic Off-Chain NGN Double-Entry Ledger execution
    if (!walletAddress || !window.ethereum) {
      try {
        if (isBuy) {
          const grossAmountKobo = amount < 1
            ? Math.round(amount * 4_200_000 * 100)
            : Math.round(amount * 100);

          if (auth.wallet.availableKobo < grossAmountKobo) {
            pushToast('Insufficient NGN Balance', `You need ${formatNGN(grossAmountKobo)} to place this order.`);
            auth.openDepositModal();
            return;
          }

          const res = await apiClient.buyShares({
            userId: auth.user?.id,
            marketId,
            side: isYes ? 'YES' : 'NO',
            grossAmountKobo,
            slippagePct,
          });

          await auth.syncWithBackend();

          const currentHoldings = holdings[marketId] || { yesShares: 0, noShares: 0 };
          const sharesDelta = res.sharesReceived || quote.sharesDelta;
          const nextHoldings = {
            ...holdings,
            [marketId]: {
              yesShares: isYes ? currentHoldings.yesShares + sharesDelta : currentHoldings.yesShares,
              noShares: !isYes ? currentHoldings.noShares + sharesDelta : currentHoldings.noShares,
            },
          };
          setHoldings(nextHoldings);
          dbService.saveHoldings(nextHoldings);

          setMarkets((prev) =>
            prev.map((m) => {
              if (m.id !== marketId) return m;
              const curveKey = isYes ? 'yesCurve' : 'noCurve';
              const curve = m[curveKey];
              return {
                ...m,
                totalTrades: m.totalTrades + 1,
                creatorFeesEarned: (m.creatorFeesEarned || 0) + (res.creatorFeeKobo / (4_200_000 * 100)),
                [curveKey]: {
                  ...curve,
                  realEth: curve.realEth + (res.netAmountKobo || 0) / (4_200_000 * 100),
                  totalShares: curve.totalShares + sharesDelta,
                  volumeEth: curve.volumeEth + grossAmountKobo / (4_200_000 * 100),
                },
              };
            })
          );

          const newAct: TradeActivity = {
            id: res.tradeRef || `act-${Date.now()}`,
            marketId,
            marketQuestion: targetMarket.question,
            category: targetMarket.category,
            trader: auth.user?.displayName || 'OpinionNG Trader',
            isYes,
            isBuy: true,
            ethAmount: amount,
            sharesAmount: sharesDelta,
            yesSentimentAfter: res.marketState?.yesPct || quote.newSentimentPct,
            eventType: 'STANDARD_TRADE',
            timestamp: Date.now(),
            isOnChain: false,
          };
          setActivities((prev) => [newAct, ...prev]);

          pushToast(
            'Shares Purchased',
            `Purchased ${sharesDelta.toLocaleString()} ${isYes ? 'YES' : 'NO'} shares for ${formatNGN(grossAmountKobo)} (Creator earned ${formatNGN(res.creatorFeeKobo)})`
          );
          return;
        } else {
          // SELL
          const sharesToSell = Math.round(amount);
          const res = await apiClient.sellShares({
            userId: auth.user?.id,
            marketId,
            side: isYes ? 'YES' : 'NO',
            sharesCount: sharesToSell,
            slippagePct,
          });

          await auth.syncWithBackend();

          const currentHoldings = holdings[marketId] || { yesShares: 0, noShares: 0 };
          const nextHoldings = {
            ...holdings,
            [marketId]: {
              yesShares: isYes ? Math.max(0, currentHoldings.yesShares - sharesToSell) : currentHoldings.yesShares,
              noShares: !isYes ? Math.max(0, currentHoldings.noShares - sharesToSell) : currentHoldings.noShares,
            },
          };
          setHoldings(nextHoldings);
          dbService.saveHoldings(nextHoldings);

          const newAct: TradeActivity = {
            id: res.tradeRef || `act-${Date.now()}`,
            marketId,
            marketQuestion: targetMarket.question,
            category: targetMarket.category,
            trader: auth.user?.displayName || 'OpinionNG Trader',
            isYes,
            isBuy: false,
            ethAmount: amount,
            sharesAmount: sharesToSell,
            yesSentimentAfter: res.marketState?.yesPct || quote.newSentimentPct,
            eventType: 'STANDARD_TRADE',
            timestamp: Date.now(),
            isOnChain: false,
          };
          setActivities((prev) => [newAct, ...prev]);

          pushToast(
            'Shares Sold',
            `Sold ${sharesToSell.toLocaleString()} ${isYes ? 'YES' : 'NO'} shares for ${formatNGN(res.netProceedsKobo || 0)}`
          );
          return;
        }
      } catch (err: any) {
        pushToast('Trade Failed', err.message || 'Execution error');
        throw err;
      }
    }

    // 2. Broadcast real on-chain transaction through user's wallet
    let txHash: string;
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', `Please approve the ${isBuy ? 'buyShares' : 'sellShares'} transaction in MetaMask...`);

      if (isBuy) {
        const minShares = parseEther(quote.minReceivedShares.toFixed(0));
        txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: NULLHOOD_MARKETS_ABI,
          functionName: 'buyShares',
          args: [BigInt(marketId), isYes, minShares],
          value: parseEther(amount.toString()),
        });
      } else {
        const minEth = parseEther(quote.minReceivedEth.toFixed(18));
        txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: NULLHOOD_MARKETS_ABI,
          functionName: 'sellShares',
          args: [BigInt(marketId), isYes, parseEther(amount.toString()), minEth],
        });
      }

      pushToast('Broadcasting Transaction', 'Awaiting block confirmation on Robinhood Chain...', txHash);

      await infraManager.publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Update real on-chain wallet balance
      const bal = await infraManager.publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      setEthBalance(formatEther(bal));

      // Refresh on-chain market reserves directly from contract
      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) {
        setMarkets(refreshed);
      }
    } catch (err: unknown) {
      infraManager.recordError('CONTRACT_TX', err);
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      pushToast('Transaction Cancelled / Error', msg.slice(0, 80));
      throw err;
    }

    if (!isBuy) {
      const currentHeld = isYes
        ? holdings[marketId]?.yesShares || 0
        : holdings[marketId]?.noShares || 0;
      if (currentHeld < amount) {
        throw new Error(
          `InsufficientShares: You only hold ${Math.floor(currentHeld)} ${
            isYes ? 'YES' : 'NO'
          } shares.`
        );
      }
    }

    setMarkets((prev) => {
      const updatedMarkets = prev.map((m) => {
        if (m.id !== marketId) return m;
        const sideKey = isYes ? 'yesCurve' : 'noCurve';
        const curve = { ...m[sideKey] };

        if (isBuy) {
          const netEth = amount - quote.totalFeeEth;
          curve.virtualEth += netEth;
          curve.virtualShares -= quote.sharesDelta;
          curve.realEth += netEth;
          curve.totalShares += quote.sharesDelta;
          curve.volumeEth += amount;
          curve.buyVolumeEth = (curve.buyVolumeEth || 0) + amount;
        } else {
          const grossEth = quote.netEthDelta + quote.totalFeeEth;
          curve.virtualShares += amount;
          curve.virtualEth -= grossEth;
          curve.realEth = Math.max(0, curve.realEth - grossEth);
          curve.totalShares = Math.max(0, curve.totalShares - amount);
          curve.volumeEth += grossEth;
          curve.sellVolumeEth = (curve.sellVolumeEth || 0) + grossEth;
        }

        const updatedMarket: OpinionMarket = {
          ...m,
          totalTrades: m.totalTrades + 1,
          creatorFeesEarned: m.creatorFeesEarned + quote.creatorFeeEth,
          [sideKey]: curve,
        };

        const newMetrics = getMarketPricesAndSentiment(updatedMarket);
        updatedMarket.history = [
          ...m.history.slice(-10),
          {
            timestamp: Date.now(),
            label: 'Just now',
            yesSentiment: Number(newMetrics.yesSentimentPct.toFixed(1)),
            yesPriceEth: newMetrics.yesPriceEth,
            noPriceEth: newMetrics.noPriceEth,
            volumeSnapshotEth: newMetrics.totalVolumeEth,
          },
        ];

        return updatedMarket;
      });
      dbService.saveMarkets(updatedMarkets);
      return updatedMarkets;
    });

    // Update user holdings
    setHoldings((prev) => {
      const existing = prev[marketId] || { yesShares: 0, noShares: 0 };
      const nextHoldings = {
        ...prev,
        [marketId]: {
          yesShares: isYes
            ? isBuy
              ? existing.yesShares + quote.sharesDelta
              : Math.max(0, existing.yesShares - amount)
            : existing.yesShares,
          noShares: !isYes
            ? isBuy
              ? existing.noShares + quote.sharesDelta
              : Math.max(0, existing.noShares - amount)
            : existing.noShares,
        },
      };
      dbService.saveHoldings(nextHoldings);
      return nextHoldings;
    });

    setClaimableCreatorFees((prev) => prev + quote.creatorFeeEth);
    setEthBalance((prev) => {
      const num = parseFloat(prev) || 0;
      const next = isBuy ? Math.max(0, num - amount) : num + quote.netEthDelta;
      return next.toFixed(4);
    });

    // Record Tired Pulse Event
    const traderLabel = walletAddress ? shortenAddress(walletAddress) : '0x71C9...89A4';
    const isWhale = (isBuy ? amount : quote.netEthDelta) >= 0.25;
    const newAct: TradeActivity = {
      id: Math.random().toString(36).slice(2),
      marketId,
      marketQuestion: targetMarket.question,
      category: targetMarket.category,
      trader: traderLabel,
      isYes,
      isBuy,
      ethAmount: isBuy ? amount : quote.netEthDelta,
      sharesAmount: isBuy ? quote.sharesDelta : amount,
      yesSentimentAfter: quote.newSentimentPct,
      sentimentDeltaPct: isBuy ? (isYes ? 2.5 : -2.5) : isYes ? -2.5 : 2.5,
      eventType: isWhale ? 'WHALE_TRADE' : 'STANDARD_TRADE',
      timestamp: Date.now(),
      isOnChain: Boolean(txHash),
      txHash,
    };
    setActivities((prev) => {
      const next = [newAct, ...prev.slice(0, 39)];
      dbService.saveActivities(next);
      return next;
    });

    pushToast(
      `${isBuy ? 'Bought' : 'Sold'} ${isYes ? 'YES' : 'NO'} (${
        txHash ? 'On-Chain Verified' : 'Sandbox Event'
      })`,
      isBuy
        ? `Received +${quote.sharesDelta.toFixed(0)} ${isYes ? 'YES' : 'NO'} shares for ${amount} ETH (Sentiment: ${quote.newSentimentPct.toFixed(1)}% YES)`
        : `Sold ${amount.toFixed(0)} ${isYes ? 'YES' : 'NO'} shares for ${quote.netEthDelta.toFixed(4)} ETH`,
      txHash
    );
  };

  // Create New Market (Off-Chain NGN Engine + Optional On-Chain EVM)
  const handleCreateMarket = async (data: {
    question: string;
    category: Exclude<MarketCategory, 'All'>;
    imageUri: string;
    sourceHandle: string;
    initialSideIsYes: boolean;
    initialBuyEth: number;
    marketType?: MarketType;
    closingTime?: number;
    resolutionDeadline?: number;
    yesCondition?: string;
    noCondition?: string;
    evidenceSource?: string;
  }) => {
    // 1. Off-Chain NGN Atomic Market Creation Flow (Anti-spam check & Creator Economics)
    if (!walletAddress || !window.ethereum) {
      if (!auth.isAuthenticated) {
        pushToast('Sign In Required', 'Please sign in to OpinionNG to create a market.');
        auth.openSignInModal();
        return;
      }

      try {
        const res = await apiClient.createMarket({
          creatorId: auth.user?.id,
          question: data.question,
          category: data.category,
          imageUri: data.imageUri,
          sourceHandle: data.sourceHandle || (auth.user?.xHandle ? `@${auth.user.xHandle}` : '@OpinionNG'),
          antiSpamOption: 'fee',
          yesCondition: data.yesCondition,
          noCondition: data.noCondition,
          evidenceSource: data.evidenceSource,
          closingTime: data.closingTime ? new Date(data.closingTime * 1000).toISOString() : undefined,
          resolutionDeadline: data.resolutionDeadline ? new Date(data.resolutionDeadline * 1000).toISOString() : undefined,
        });

        await auth.syncWithBackend();

        const createdMkt: OpinionMarket = {
          id: res.market.id,
          creator: auth.user?.displayName || 'OpinionNG Creator',
          question: res.market.question,
          category: data.category,
          imageUri: res.market.imageUri,
          sourceHandle: res.market.sourceHandle,
          createdAt: Date.now(),
          totalTrades: 0,
          creatorFeesEarned: 0,
          yesCurve: {
            virtualEth: 0.5,
            virtualShares: 500000,
            realEth: 0.001,
            totalShares: 1000,
            volumeEth: 0.001,
          },
          noCurve: {
            virtualEth: 0.5,
            virtualShares: 500000,
            realEth: 0.001,
            totalShares: 1000,
            volumeEth: 0.001,
          },
          history: [],
          comments: [],
          marketType: data.marketType || 'PERPETUAL_OPINION',
          status: 'ACTIVE',
          prediction: data.marketType === 'RESOLVABLE_PREDICTION' ? {
            closingTime: data.closingTime || Math.floor(Date.now() / 1000) + 7 * 86400,
            resolutionDeadline: data.resolutionDeadline || Math.floor(Date.now() / 1000) + 8 * 86400,
            yesCondition: data.yesCondition || '',
            noCondition: data.noCondition || '',
            evidenceSource: data.evidenceSource || '',
          } : undefined,
        };

        setMarkets((prev) => [createdMkt, ...prev]);
        setSelectedMarketId(createdMkt.id);

        pushToast(
          'Market Created & Live!',
          `₦1,000 anti-spam fee deducted. You will earn 1.5% creator fees on every trade.`
        );
        return;
      } catch (err: any) {
        pushToast('Market Creation Failed', err.message || 'Error creating market');
        throw err;
      }
    }

    // 2. Broadcast to real on-chain contract when Web3 wallet connected

    let txHash: string;
    const isPrediction = data.marketType === 'RESOLVABLE_PREDICTION';

    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast(
        'Confirm in Wallet',
        `Please confirm ${isPrediction ? 'createPredictionMarket' : 'createMarket'} in MetaMask...`
      );

      if (isPrediction) {
        txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: NULLHOOD_MARKETS_ABI,
          functionName: 'createPredictionMarket',
          args: [
            data.question,
            data.category,
            data.imageUri,
            data.sourceHandle || (userProfile ? `@${userProfile.username}` : (walletAddress ? shortenAddress(walletAddress) : '')),
            BigInt(data.closingTime || Math.floor(Date.now() / 1000) + 7 * 86400),
            BigInt(data.resolutionDeadline || Math.floor(Date.now() / 1000) + 8 * 86400),
            data.yesCondition || '',
            data.noCondition || '',
            data.evidenceSource || '',
            data.initialSideIsYes,
          ],
          value: data.initialBuyEth > 0 ? parseEther(data.initialBuyEth.toString()) : 0n,
        });
      } else {
        txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: NULLHOOD_MARKETS_ABI,
          functionName: 'createMarket',
          args: [
            data.question,
            data.category,
            data.imageUri,
            data.sourceHandle || (userProfile ? `@${userProfile.username}` : (walletAddress ? shortenAddress(walletAddress) : '')),
            data.initialSideIsYes,
          ],
          value: data.initialBuyEth > 0 ? parseEther(data.initialBuyEth.toString()) : 0n,
        });
      }

      pushToast('Creating Market', 'Awaiting block confirmation on Robinhood Chain...', txHash);

      await infraManager.publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Update balance
      const bal = await infraManager.publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      setEthBalance(formatEther(bal));

      // Re-sync on-chain markets directly from smart contract
      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) {
        setMarkets(refreshed);
        const createdId = refreshed[refreshed.length - 1]?.id || refreshed.length;
        setSelectedMarketId(createdId);
      }

      pushToast(
        isPrediction ? 'Prediction Market Live on Robinhood Chain!' : 'Opinion Market Live on Robinhood Chain!',
        `Spawned Market on-chain: "${data.question}"`,
        txHash
      );
    } catch (err: unknown) {
      infraManager.recordError('CONTRACT_TX', err);
      const msg = err instanceof Error ? err.message : 'Market creation cancelled';
      pushToast('Market Creation Cancelled', msg.slice(0, 80));
      throw err;
    }
  };

  // Phase 4 & 5 Handlers: Prediction Resolution, Disputes, Settlement Claims
  const handleProposeOutcome = async (
    marketId: number,
    outcome: 'YES' | 'NO' | 'VOID',
    evidenceUrl: string
  ) => {
    if (!walletAddress || !window.ethereum) {
      pushToast('Wallet Required', 'Please connect your Robinhood Chain wallet to propose outcome.');
      promptConnectWallet('Proposing Outcome');
      return;
    }
    const outcomeNum = outcome === 'YES' ? 1 : outcome === 'NO' ? 2 : 3;
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm proposeOutcome in your wallet...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'proposeOutcome',
        args: [BigInt(marketId), outcomeNum, evidenceUrl],
      });

      pushToast('Proposing Outcome', 'Broadcasting proposal to Robinhood Chain...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) setMarkets(refreshed);

      pushToast('Outcome Proposed', `Proposed ${outcome} with verifiable evidence on Market #${marketId}`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Proposal failed';
      pushToast('Proposal Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleDisputeOutcome = async (marketId: number, counterEvidenceUrl: string) => {
    if (!walletAddress || !window.ethereum) {
      pushToast('Wallet Required', 'Please connect your wallet to dispute outcome.');
      promptConnectWallet('Disputing Outcome');
      return;
    }
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm disputeOutcome in your wallet...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'disputeOutcome',
        args: [BigInt(marketId), counterEvidenceUrl],
      });

      pushToast('Challenging Outcome', 'Submitting dispute to Robinhood Chain...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) setMarkets(refreshed);

      pushToast('Dispute Submitted', `Disputed Market #${marketId} with counter-evidence`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dispute failed';
      pushToast('Dispute Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleResolveMarket = async (
    marketId: number,
    outcome: 'YES' | 'NO' | 'VOID',
    evidenceUrl: string
  ) => {
    // 1. Off-chain NGN dispute window & resolution
    if (!walletAddress || !window.ethereum) {
      try {
        const res = await apiClient.resolveMarket({
          marketId,
          outcome,
          evidenceUrl,
          adminUserId: auth.user?.id,
          immediate: false,
        });

        setMarkets((prev) =>
          prev.map((m) =>
            m.id === marketId
              ? {
                  ...m,
                  status: 'PROPOSED',
                  prediction: m.prediction
                    ? {
                        ...m.prediction,
                        proposedOutcome: outcome,
                        proposedEvidence: evidenceUrl,
                        disputeDeadline: Math.floor(Date.now() / 1000) + 7200,
                      }
                    : {
                        closingTime: Math.floor(Date.now() / 1000),
                        resolutionDeadline: Math.floor(Date.now() / 1000) + 7200,
                        disputeDeadline: Math.floor(Date.now() / 1000) + 7200,
                        proposedOutcome: outcome,
                        proposedEvidence: evidenceUrl,
                        yesCondition: '',
                        noCondition: '',
                        evidenceSource: evidenceUrl,
                      },
                }
              : m
          )
        );

        pushToast(
          'Outcome Proposed (2-Hour Dispute Window Active)',
          `Proposed ${outcome}. Dispute window ends at ${new Date(res.disputeEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        );
        return;
      } catch (err: any) {
        pushToast('Resolution Error', err.message || 'Failed to resolve market');
        return;
      }
    }

    const outcomeNum = outcome === 'YES' ? 1 : outcome === 'NO' ? 2 : 3;
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm resolveMarket in your wallet...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'resolveMarket',
        args: [BigInt(marketId), outcomeNum, evidenceUrl],
      });

      pushToast('Finalizing Resolution', 'Settling market on Robinhood Chain...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) setMarkets(refreshed);

      pushToast('Market Resolved!', `Finalized as ${outcome}. Pari-Mutuel claims are now open!`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resolution failed';
      pushToast('Resolution Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleEmergencyCancel = async (marketId: number, reason: string) => {
    if (!walletAddress || !window.ethereum) {
      pushToast('Wallet Required', 'Please connect your wallet.');
      return;
    }
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm emergency cancel in wallet...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'emergencyCancelMarket',
        args: [BigInt(marketId), reason],
      });

      pushToast('Cancelling Market', 'Voiding market on Robinhood Chain...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const refreshed = await dbService.syncOnChainMarkets(contractAddress);
      if (refreshed && refreshed.length > 0) setMarkets(refreshed);

      pushToast('Market Voided', `Cancelled Market #${marketId}. Proportional refunds open.`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancel failed';
      pushToast('Cancel Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleClaimSettlement = async (marketId: number) => {
    // 1. Off-chain NGN settlement payout (₦100 per winning share)
    if (!walletAddress || !window.ethereum) {
      try {
        const res = await apiClient.settleMarket({ marketId, forceImmediate: true });
        await auth.syncWithBackend();

        // Update local holdings
        setHoldings((prev) => ({
          ...prev,
          [marketId]: { yesShares: 0, noShares: 0 },
        }));

        setMarkets((prev) =>
          prev.map((m) =>
            m.id === marketId
              ? {
                  ...m,
                  status: 'RESOLVED',
                  prediction: m.prediction
                    ? {
                        ...m.prediction,
                        finalOutcome: (res.finalOutcome as any) || 'YES',
                      }
                    : undefined,
                }
              : m
          )
        );

        pushToast(
          'Settlement Claimed!',
          `Paid ₦100 per winning share directly into your available NGN balance.`
        );
        return;
      } catch (err: any) {
        pushToast('Settlement Notice', err.message || 'Error settling market');
        return;
      }
    }

    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm claimSettlementReward in MetaMask...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'claimSettlementReward',
        args: [BigInt(marketId)],
      });

      pushToast('Claiming Payout', 'Processing Pari-Mutuel reward distribution...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const bal = await infraManager.publicClient.getBalance({ address: walletAddress as `0x${string}` });
      setEthBalance(formatEther(bal));

      setHoldings((prev) => {
        const next = { ...prev, [marketId]: { yesShares: 0, noShares: 0 } };
        dbService.saveHoldings(next);
        return next;
      });

      pushToast('Settlement Claimed!', `Pari-Mutuel winning payout received in your wallet!`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      pushToast('Claim Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleClaimVoidRefund = async (marketId: number) => {
    if (!walletAddress || !window.ethereum) {
      pushToast('Wallet Required', 'Please connect your wallet to claim refund.');
      return;
    }
    try {
      await switchOrAddRobinhoodChain();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: robinhoodTestnet,
        transport: custom(window.ethereum),
      });

      pushToast('Confirm in Wallet', 'Please confirm claimVoidRefund in MetaMask...');
      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NULLHOOD_MARKETS_ABI,
        functionName: 'claimVoidRefund',
        args: [BigInt(marketId)],
      });

      pushToast('Claiming Refund', 'Processing refund on Robinhood Chain...', txHash);
      await infraManager.publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const bal = await infraManager.publicClient.getBalance({ address: walletAddress as `0x${string}` });
      setEthBalance(formatEther(bal));

      setHoldings((prev) => {
        const next = { ...prev, [marketId]: { yesShares: 0, noShares: 0 } };
        dbService.saveHoldings(next);
        return next;
      });

      pushToast('Refund Claimed!', `Locked ETH reserve refund received in your wallet!`, txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refund failed';
      pushToast('Refund Error', msg.slice(0, 80));
      throw err;
    }
  };

  const handleAddComment = (marketId: number, side: 'YES' | 'NO', text: string) => {
    if (!auth.isAuthenticated && !walletAddress) {
      promptConnectWallet('Posting a Comment');
      return;
    }
    const author =
      auth.user?.displayName ||
      userProfile?.displayName ||
      (walletAddress ? shortenAddress(walletAddress) : 'Trader');

    const authorHandle = auth.user?.xHandle
      ? (auth.user.xHandle.startsWith('@') ? auth.user.xHandle : `@${auth.user.xHandle}`)
      : userProfile?.username
      ? `@${userProfile.username.replace(/^@/, '')}`
      : walletAddress
      ? `@${shortenAddress(walletAddress)}`
      : '@trader';

    const authorAvatar =
      auth.user?.avatarUrl ||
      userProfile?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    const userH = holdings[marketId];
    const sharesHeld =
      side === 'YES' ? userH?.yesShares || 0 : userH?.noShares || 0;

    const now = Date.now();
    const newComment: MarketComment = {
      id: 'cmt-' + now + '-' + Math.random().toString(36).slice(2, 7),
      author,
      authorHandle,
      authorAvatar,
      side,
      sharesHeld,
      text,
      createdAt: now,
      timestamp: 'Just now',
      likes: 0,
      hasLiked: false,
    };

    // 1. Save locally in local database and broadcast across network
    dbService.addComment(marketId, newComment);
    realtimeSync.broadcastComment(marketId, newComment);

    // 2. Persist to backend API so comments remain saved on server
    fetch(`/api/markets/${marketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: newComment, userId: auth.user?.id }),
    }).catch((err) => console.warn('Backend comment persist err:', err));

    // 3. Update React state immediately
    setMarkets((prev) => {
      const updated = prev.map((m) =>
        m.id === marketId
          ? {
              ...m,
              comments: [newComment, ...(m.comments || [])],
            }
          : m
      );
      dbService.saveMarkets(updated);
      return updated;
    });

    pushToast('Comment Posted', `Your reply was published on Market #${marketId}`);
  };

  const handleToggleCommentLike = (marketId: number, commentId: string) => {
    if (!auth.isAuthenticated && !walletAddress) {
      promptConnectWallet('Liking a Comment');
      return;
    }
    dbService.toggleCommentLike(marketId, commentId);
    setMarkets((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== marketId) return m;
        return {
          ...m,
          comments: (m.comments || []).map((c) => {
            if (c.id !== commentId) return c;
            const liked = !c.hasLiked;
            return {
              ...c,
              hasLiked: liked,
              likes: liked ? (c.likes || 0) + 1 : Math.max(0, (c.likes || 0) - 1),
            };
          }),
        };
      });
      dbService.saveMarkets(updated);
      return updated;
    });
  };

  const handleClaimCreatorFees = async () => {
    if (claimableCreatorFees <= 0) return;
    let txHash: string | undefined;

    if (isLiveOnChainMode && window.ethereum && walletAddress) {
      try {
        await switchOrAddRobinhoodChain();
        const walletClient = createWalletClient({
          account: walletAddress as `0x${string}`,
          chain: robinhoodTestnet,
          transport: custom(window.ethereum),
        });
        txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: NULLHOOD_MARKETS_ABI,
          functionName: 'claimCreatorFees',
          args: [],
        });
        await infraManager.publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
        });
      } catch (err: unknown) {
        infraManager.recordError('CONTRACT_TX', err);
        throw err;
      }
    }

    const claimed = claimableCreatorFees;
    setClaimableCreatorFees(0);
    setEthBalance((prev) => (parseFloat(prev) + claimed).toFixed(4));

    const claimRecord: FeeClaimRecord = {
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      amountEth: claimed,
      creator: walletAddress ? shortenAddress(walletAddress) : '0x71C9...89A4',
      status: 'CONFIRMED',
      isOnChain: Boolean(txHash),
      txHash,
    };
    setClaimHistory((prev) => {
      const next = [claimRecord, ...prev];
      dbService.saveClaimHistory(next);
      return next;
    });

    pushToast(
      'Creator Fees Claimed!',
      `Withdrew ${claimed.toFixed(4)} ETH in 1% Opinion Market Creator Fees to your Robinhood Chain wallet.`,
      txHash
    );
  };

  // Filtered & Sorted Markets with X-Style Recommendation & Controlled Randomization
  const filteredMarkets = useMemo(() => {
    const list = markets.filter((m) => {
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Economy') {
          if (m.category !== 'Economy' && m.category !== 'Markets') return false;
        } else if (selectedCategory === 'Tech') {
          if (m.category !== 'Tech' && m.category !== 'AI') return false;
        } else if (m.category !== selectedCategory) {
          return false;
        }
      }
      if (
        searchQuery.trim() &&
        !m.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.creator.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.sourceHandle.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'volume') {
        // X recommendation algorithm: interactive, debates, volume, and randomized discovery
        const scoreA = calculateXScore(a, likesMap[a.id]?.count || 0, feedSessionSeed);
        const scoreB = calculateXScore(b, likesMap[b.id]?.count || 0, feedSessionSeed);
        return scoreB - scoreA;
      }
      const ma = getMarketPricesAndSentiment(a);
      const mb = getMarketPricesAndSentiment(b);
      if (sortBy === 'conviction') {
        return (
          Math.max(mb.yesSentimentPct, mb.noSentimentPct) -
          Math.max(ma.yesSentimentPct, ma.noSentimentPct)
        );
      }
      if (sortBy === 'controversial') {
        return mb.controversyScore - ma.controversyScore;
      }
      return b.createdAt - a.createdAt;
    });
  }, [markets, selectedCategory, searchQuery, sortBy, likesMap, feedSessionSeed]);

  // The most interactive / trending hero market brought up to trending
  const topTrendingHero = useMemo(() => {
    return getTopTrendingMarket(filteredMarkets.length > 0 ? filteredMarkets : markets, likesMap);
  }, [filteredMarkets, markets, likesMap]);

  // Global Protocol Aggregates
  const globalStats = useMemo(() => {
    let totalVolume = 0;
    let totalTvl = 0;
    let totalCreatorFees = 0;
    for (const m of markets) {
      totalVolume += m.yesCurve.volumeEth + m.noCurve.volumeEth;
      totalTvl += m.yesCurve.realEth + m.noCurve.realEth;
      totalCreatorFees += m.creatorFeesEarned;
    }
    return { totalVolume, totalTvl, totalCreatorFees, marketCount: markets.length };
  }, [markets]);

  const activeModalMarket = useMemo(
    () => markets.find((m) => m.id === selectedMarketId) || null,
    [markets, selectedMarketId]
  );

  const CATEGORIES_LIST: { id: MarketCategory; label: string; symbol: string }[] = [
    { id: 'All', label: 'All', symbol: '⊞' },
    { id: 'Economy', label: 'Economy', symbol: '₦' },
    { id: 'Politics', label: 'Politics', symbol: '🏛' },
    { id: 'Culture', label: 'Culture', symbol: '⚡' },
    { id: 'Sports', label: 'Sports', symbol: '⚽' },
    { id: 'Tech', label: 'Tech', symbol: '✦' },
    { id: 'Markets', label: 'Markets', symbol: '❖' },
    { id: 'Other', label: 'Other', symbol: '💬' },
  ];

  // Gated Auth First Page: If user is not logged in, redirect them directly to the Login/SignUp landing page
  if (!auth.isAuthenticated || !auth.user) {
    return <AuthLandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f1f1f4] w-full max-w-[100vw] overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        walletAddress={walletAddress}
        chainId={chainId}
        userProfile={userProfile}
        ethBalance={ethBalance}
        claimableCreatorFees={claimableCreatorFees}
        contractAddress={contractAddress}
        isLiveOnChainMode={isLiveOnChainMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onConnectWallet={() => promptConnectWallet('Connecting OpinionNG Account')}
        onDisconnectWallet={handleDisconnectWallet}
        onSwitchNetwork={handleSwitchNetwork}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onClaimCreatorFees={handleClaimCreatorFees}
      />

      {/* Live POV Activity Tape */}
      <LiveTicker
        activities={activities}
        onSelectMarket={(id) => setSelectedMarketId(id)}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 w-full max-w-full overflow-x-hidden pb-24 lg:pb-6">
        {/* TAB 1: OPINION MARKETS FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-6 w-full max-w-full">
            {/* Top Category Pills Navigation (pov.co Signature Bar) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 max-w-full">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none min-w-0 max-w-full">
                {CATEGORIES_LIST.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white shadow-sm ring-1 ring-[#FF8A33]/30'
                          : 'bg-[#15151e] text-[#8c8c9e] hover:text-white hover:bg-[#20202c]'
                      }`}
                    >
                      <span className="text-[13px]">{cat.symbol}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search box formatted like pov.co search bar with slash shortcut */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a7a8c]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Nigerian markets..."
                  className="w-full rounded-full border border-[#232330] bg-[#14141c] pl-9 pr-8 py-2 text-xs text-white placeholder-[#7a7a8c] focus:border-[#227c9d] focus:outline-none transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#555566] bg-[#1e1e2b] px-1.5 py-0.5 rounded">
                  /
                </span>
              </div>
            </div>

            {/* IF "ALL" CATEGORY IS SELECTED: Render Hero Banner + Featured Markets + Subcategory Showcase */}
            {selectedCategory === 'All' ? (
              <>
                {/* Hero Banner with pov.co Styling & Spacing */}
                <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-[#232330] bg-gradient-to-r from-[#101a22] via-[#14141c] to-[#0f0f15] p-4 sm:p-8">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#227c9d]/15 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#FF6B00]/10 blur-3xl" />

                  <div className="relative grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                      <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/10 px-3 py-1 text-[11px] sm:text-xs font-bold text-[#53b3d4]">
                        <Sparkles className="h-3.5 w-3.5 text-[#227c9d]" />
                        <span>HYBRID OPINION & PREDICTION MARKETS • NIGERIAN NAIRA (NGN)</span>
                      </div>

                      <h1 className="font-fun text-2xl sm:text-4xl font-black tracking-tight text-white">
                        Trade Nigerian Conviction.{' '}
                        <span className="text-white">
                          No Limits. Instant Payouts.
                        </span>
                      </h1>

                      <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-[#8c8c9e]">
                        OpinionNG brings continuous sentiment & prediction market dynamics to Nigerian retail. Every
                        YES and NO share trades on an AMM bonding curve with instant
                        liquidity in ₦, and creators earn{' '}
                        <span className="text-[#FF6B00] font-bold">1.5% fee share</span> on every trade.
                      </p>

                      {/* Spawn Bar */}
                      <div className="mt-4 sm:mt-5 flex flex-col gap-2 rounded-2xl sm:rounded-full border border-[#252535] bg-[#0c0c11]/90 p-1.5 sm:flex-row sm:items-center max-w-xl">
                        <input
                          type="text"
                          value={quickPromptText}
                          onChange={(e) => setQuickPromptText(e.target.value)}
                          placeholder="Ask a question or paste an @X debate to create a market..."
                          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-[#7a7a8c] focus:outline-none"
                        />
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl sm:rounded-full bg-[#FF6B00] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-md shadow-[#FF6B00]/25 transition hover:bg-[#EA580C] active:scale-95"
                        >
                          <Zap className="h-3.5 w-3.5 fill-black" />
                          <span>Create Market</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Clean Stats Boxes */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-5">
                      <div className="rounded-[18px] sm:rounded-[20px] border border-[#232330] bg-[#101a22]/80 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7a7a8c]">
                          Cumulative Volume
                        </span>
                        <div className="mt-1 font-mono text-lg sm:text-xl font-black text-white">
                          {formatNGN(Math.round(globalStats.totalVolume * 4_200_000 * 100))}
                        </div>
                        <span className="mt-0.5 inline-block font-mono text-[9px] sm:text-[10px] text-[#227c9d]">
                          Atomic NGN Engine
                        </span>
                      </div>

                      <div className="rounded-[18px] sm:rounded-[20px] border border-[#232330] bg-[#101a22]/80 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7a7a8c]">
                          Total Reserves (NGN)
                        </span>
                        <div className="mt-1 font-mono text-lg sm:text-xl font-black text-white">
                          {formatNGN(Math.round(globalStats.totalTvl * 4_200_000 * 100))}
                        </div>
                        <span className="mt-0.5 inline-block font-mono text-[9px] sm:text-[10px] text-[#7a7a8c]">
                          100% Instant Exit
                        </span>
                      </div>

                      <div className="rounded-[18px] sm:rounded-[20px] border border-[#232330] bg-[#101a22]/80 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7a7a8c]">
                          Creator Fees Accrued
                        </span>
                        <div className="mt-1 font-mono text-lg sm:text-xl font-black text-[#FF6B00]">
                          {formatNGN(Math.round(globalStats.totalCreatorFees * 4_200_000 * 100))}
                        </div>
                        <span className="mt-0.5 inline-block font-mono text-[9px] sm:text-[10px] text-[#7a7a8c]">
                          1.50% Fee Share
                        </span>
                      </div>

                      <div className="rounded-[18px] sm:rounded-[20px] border border-[#232330] bg-[#101a22]/80 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7a7a8c]">
                          Active Markets
                        </span>
                        <div className="mt-1 font-mono text-lg sm:text-xl font-black text-white">
                          {globalStats.marketCount}
                        </div>
                        <span className="mt-0.5 inline-block font-mono text-[9px] sm:text-[10px] text-[#53b3d4]">
                          Dual YES/NO Curves
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Markets Feed: 3-Column Clean Vertical POV Cards */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-fun text-xl font-bold text-white flex items-center gap-2">
                      <Flame className="h-5 w-5 text-[#FF6B00]" />
                      <span>Trending Markets</span>
                    </h2>
                    <div className="flex items-center rounded-full border border-[#232330] bg-[#14141c] px-3 py-1.5">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-transparent text-xs font-semibold text-white focus:outline-none"
                      >
                        <option value="volume" className="bg-[#14141c]">Top Volume</option>
                        <option value="conviction" className="bg-[#14141c]">High Conviction</option>
                        <option value="controversial" className="bg-[#14141c]">Hot 50/50</option>
                        <option value="newest" className="bg-[#14141c]">Newest</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {/* The Highlight Market (Most interactive / trending hero market brought up to trending) */}
                    {topTrendingHero && (
                      <div className="md:col-span-2 lg:col-span-2">
                        <MarketCard
                          key={`highlight-${topTrendingHero.id}`}
                          market={topTrendingHero}
                          variant="highlight"
                          userYesShares={holdings[topTrendingHero.id]?.yesShares || 0}
                          userNoShares={holdings[topTrendingHero.id]?.noShares || 0}
                          onSelect={(m, side) => {
                            if (side) setDetailInitialSide(side);
                            setSelectedMarketId(m.id);
                          }}
                          onQuickTrade={(marketId, isYes, ethAmt) =>
                            handleExecuteTrade(marketId, isYes, true, ethAmt)
                          }
                        />
                      </div>
                    )}

                    {/* Second Opinion (Occupies the 3rd column in that top row, as regular vertical card) */}
                    {filteredMarkets.filter((m) => m.id !== topTrendingHero?.id).slice(0, 1).map((secondMarket) => (
                      <div key={`second-${secondMarket.id}`} className="md:col-span-1 lg:col-span-1">
                        <MarketCard
                          market={secondMarket}
                          variant="vertical"
                          userYesShares={holdings[secondMarket.id]?.yesShares || 0}
                          userNoShares={holdings[secondMarket.id]?.noShares || 0}
                          onSelect={(m, side) => {
                            if (side) setDetailInitialSide(side);
                            setSelectedMarketId(m.id);
                          }}
                          onQuickTrade={(marketId, isYes, ethAmt) =>
                            handleExecuteTrade(marketId, isYes, true, ethAmt)
                          }
                        />
                      </div>
                    ))}

                    {/* Other Opinions (Rendered as they are in standard vertical cards) */}
                    {filteredMarkets
                      .filter((m) => m.id !== topTrendingHero?.id)
                      .slice(1, 5)
                      .map((market) => (
                        <div key={market.id} className="md:col-span-1 lg:col-span-1">
                          <MarketCard
                            market={market}
                            variant="vertical"
                            userYesShares={holdings[market.id]?.yesShares || 0}
                            userNoShares={holdings[market.id]?.noShares || 0}
                            onSelect={(m, side) => {
                              if (side) setDetailInitialSide(side);
                              setSelectedMarketId(m.id);
                            }}
                            onQuickTrade={(marketId, isYes, ethAmt) =>
                              handleExecuteTrade(marketId, isYes, true, ethAmt)
                            }
                          />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Sub-Category Showcase: Economy > */}
                <div className="pt-6 border-t border-[#1e1e28]">
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCategory('Economy')}
                      className="group flex items-center gap-2 font-fun text-xl font-bold text-white hover:text-[#53b3d4] transition"
                    >
                      <span>Economy & Markets</span>
                      <span className="text-[#8c8c9e] text-lg font-mono transition group-hover:translate-x-0.5">›</span>
                    </button>
                    <button
                      onClick={() => setSelectedCategory('Economy')}
                      className="text-xs font-bold text-[#53b3d4] hover:underline"
                    >
                      View all {markets.filter((m) => m.category === 'Economy' || m.category === 'Markets').length}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {markets
                      .filter((m) => m.category === 'Economy' || m.category === 'Markets')
                      .slice(0, 3)
                      .map((market) => (
                        <MarketCard
                          key={`sub-economy-${market.id}`}
                          market={market}
                          variant="vertical"
                          userYesShares={holdings[market.id]?.yesShares || 0}
                          userNoShares={holdings[market.id]?.noShares || 0}
                          onSelect={(m, side) => {
                            if (side) setDetailInitialSide(side);
                            setSelectedMarketId(m.id);
                          }}
                          onQuickTrade={(marketId, isYes, ethAmt) =>
                            handleExecuteTrade(marketId, isYes, true, ethAmt)
                          }
                        />
                      ))}
                  </div>
                </div>

                {/* Sub-Category Showcase: Culture > */}
                <div className="pt-6 border-t border-[#1e1e28]">
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCategory('Culture')}
                      className="group flex items-center gap-2 font-fun text-xl font-bold text-white hover:text-[#53b3d4] transition"
                    >
                      <span>Culture & Entertainment</span>
                      <span className="text-[#8c8c9e] text-lg font-mono transition group-hover:translate-x-0.5">›</span>
                    </button>
                    <button
                      onClick={() => setSelectedCategory('Culture')}
                      className="text-xs font-bold text-[#53b3d4] hover:underline"
                    >
                      View all {markets.filter((m) => m.category === 'Culture').length}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {markets
                      .filter((m) => m.category === 'Culture')
                      .slice(0, 3)
                      .map((market) => (
                        <MarketCard
                          key={`sub-culture-${market.id}`}
                          market={market}
                          variant="vertical"
                          userYesShares={holdings[market.id]?.yesShares || 0}
                          userNoShares={holdings[market.id]?.noShares || 0}
                          onSelect={(m, side) => {
                            if (side) setDetailInitialSide(side);
                            setSelectedMarketId(m.id);
                          }}
                          onQuickTrade={(marketId, isYes, ethAmt) =>
                            handleExecuteTrade(marketId, isYes, true, ethAmt)
                          }
                        />
                      ))}
                  </div>
                </div>
              </>
            ) : (
              /* DEDICATED CATEGORY SECTION (Exact POV layout matching screenshot pov.co/categories/crypto) */
              <div className="pt-2">
                {/* Back Arrow & Huge Category Title */}
                <div className="mb-4 flex items-center gap-3.5">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#181822] border border-[#2b2b3a] text-white hover:bg-[#222230] hover:border-[#3d3d52] transition active:scale-95 shadow-sm"
                    title="Back to All Markets"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h1 className="font-fun text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {selectedCategory}
                  </h1>
                </div>

                {/* Subheader Bar: Sort by Dropdown on Left & Grid/List Toggle on Right */}
                <div className="mb-6 flex items-center justify-between gap-4">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2 rounded-xl border border-[#262636] bg-[#14141c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:border-[#38384d] transition">
                    <span className="text-[#8c8c9e]">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                    >
                      <option value="volume" className="bg-[#14141c]">🔥 Trending</option>
                      <option value="volume" className="bg-[#14141c]">💎 Top Volume</option>
                      <option value="conviction" className="bg-[#14141c]">⚡ High Conviction</option>
                      <option value="controversial" className="bg-[#14141c]">⚖️ Hot 50/50</option>
                      <option value="newest" className="bg-[#14141c]">🕐 Newest</option>
                    </select>
                  </div>

                  {/* Grid / List View Toggle */}
                  <div className="flex items-center rounded-xl border border-[#262636] bg-[#14141c] p-1">
                    <button
                      onClick={() => setViewLayout('grid')}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        viewLayout === 'grid'
                          ? 'bg-[#227c9d] text-white shadow-sm'
                          : 'text-[#7a7a8c] hover:text-white'
                      }`}
                      title="2x2 Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewLayout('list')}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        viewLayout === 'list'
                          ? 'bg-[#227c9d] text-white shadow-sm'
                          : 'text-[#7a7a8c] hover:text-white'
                      }`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 3-Column Vertical Cards Grid (or List if toggled) */}
                {filteredMarkets.length > 0 ? (
                  <div
                    className={
                      viewLayout === 'grid'
                        ? 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'
                        : 'flex flex-col gap-4'
                    }
                  >
                    {filteredMarkets.map((market) => (
                      <MarketCard
                        key={market.id}
                        market={market}
                        variant={viewLayout === 'grid' ? 'vertical' : 'horizontal'}
                        userYesShares={holdings[market.id]?.yesShares || 0}
                        userNoShares={holdings[market.id]?.noShares || 0}
                        onSelect={(m, side) => {
                          if (side) setDetailInitialSide(side);
                          setSelectedMarketId(m.id);
                        }}
                        onQuickTrade={(marketId, isYes, ethAmt) =>
                          handleExecuteTrade(marketId, isYes, true, ethAmt)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#262636] bg-[#12121a] py-16 px-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#227c9d]/15 text-[#53b3d4] mb-3">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="font-fun text-xl font-bold text-white">
                      No {selectedCategory} Markets Yet
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs text-[#8c8c9e]">
                      Be the curator to spark public conviction in this sector and earn 1% creator fees forever.
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-5 rounded-full bg-[#227c9d] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1a647f] transition shadow-md"
                    >
                      Spawn First {selectedCategory} POV
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OPINION FEED (X-Style Feed replacing Tired Pulse) */}
        {activeTab === 'pulse' && (
          <OpinionFeedView
            markets={markets}
            walletAddress={walletAddress || (auth.isAuthenticated && auth.user ? auth.user.id : null)}
            userProfile={
              userProfile ||
              (auth.user
                ? {
                    address: auth.user.id,
                    username: auth.user.xHandle ? auth.user.xHandle.replace(/^@/, '') : 'trader',
                    displayName: auth.user.displayName,
                    bio: 'Verified OpinionNG Trader',
                    avatarUrl: auth.user.avatarUrl,
                    avatarGradient: 'from-[#227c9d] to-cyan-600',
                    createdAt: Date.now(),
                  }
                : null)
            }
            onRequireWallet={(title) => promptConnectWallet(title || 'Voting & Trading Opinions')}
            onSelectMarket={(m, side) => {
              if (side) setDetailInitialSide(side);
              setSelectedMarketId(m.id);
            }}
            onQuickTrade={(marketId, isYes, ethAmt) =>
              handleExecuteTrade(marketId, isYes, true, ethAmt)
            }
            onAddComment={handleAddComment}
            onToggleCommentLike={handleToggleCommentLike}
            onSpawnOpinion={(question, category, isYes) => {
              handleCreateMarket({
                question,
                category: (category as any) || 'Culture',
                imageUri: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
                sourceHandle: auth.user?.xHandle ? (auth.user.xHandle.startsWith('@') ? auth.user.xHandle : `@${auth.user.xHandle}`) : (userProfile ? `@${userProfile.username}` : '@OpinionNG'),
                initialSideIsYes: isYes,
                initialBuyEth: 0.001,
              });
            }}
          />
        )}

        {/* TAB 3: OPINION REPUTATION (Requirement 3) */}
        {activeTab === 'reputation' && (
          <OpinionReputationView
            markets={markets}
            activities={activities}
            walletAddress={walletAddress}
            holdings={holdings}
          />
        )}

        {/* TAB 4: PORTFOLIO & CREATOR REVENUE DASHBOARD (Requirement 5) */}
        {activeTab === 'portfolio' && (
          <div className="space-y-8">
            <CreatorEconomicsView
              markets={markets}
              walletAddress={walletAddress || (auth.isAuthenticated ? auth.user?.id : null)}
              claimableCreatorFees={claimableCreatorFees}
              contractAddress={contractAddress}
              isLiveOnChainMode={isLiveOnChainMode}
              claimHistory={claimHistory}
              onClaimCreatorFees={handleClaimCreatorFees}
              onProfileUpdated={(updated: UserProfile) => setUserProfile(updated)}
              onRequireWallet={(_title) => auth.openSignInModal()}
              holdings={holdings}
              activities={activities}
              onSelectMarket={(m) => setSelectedMarketId(m.id)}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* POV-Style Sticky Bottom Bar / Footer */}
      <footer className="mt-16 border-t border-[#232330] bg-[#0b0c10]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          {/* Left: Brand & Links */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-fun text-base font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#227c9d] text-white shadow-[0_0_12px_rgba(34,124,157,0.6)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <span>Opinion<span className="text-[#53b3d4]">NG</span></span>
            </div>
            <a
              href="https://explorer.testnet.chain.robinhood.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-fun text-slate-400 hover:text-white transition"
            >
              Support
            </a>
            <a
              href="https://robinhood.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-fun text-slate-400 hover:text-white transition"
            >
              Official Page
            </a>
          </div>

          {/* Right: Currency Toggle, Backed tag, Scroll-to-Top */}
          <div className="flex items-center gap-4 text-xs font-fun">
            {/* USD / ETH Switch */}
            <div className="flex items-center rounded-full border border-[#232330] bg-[#161620] p-1">
              <span className="rounded-full bg-[#227c9d] px-3 py-0.5 text-xs font-bold text-white">
                USD
              </span>
              <span className="px-3 py-0.5 text-xs text-slate-400 hover:text-white cursor-pointer">
                ETH
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-400 font-fun">
              <span>Creator</span>
              <span className="rounded-full bg-[#232330] px-2.5 py-0.5 font-bold text-white">
                DEGEN
              </span>
            </div>

            <div className="text-slate-400 hidden md:block">
              Backed by <span className="text-white font-bold">Robinhood Chain (46630)</span>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#232330] bg-[#161620] text-slate-300 hover:bg-[#227c9d] hover:text-white transition"
              title="Scroll to top"
            >
              ↑
            </button>
          </div>
        </div>
      </footer>

      {/* Market Detail & Bonding Curve Trading Terminal Modal */}
      {activeModalMarket && (
        <MarketDetailModal
        market={activeModalMarket}
        initialSide={detailInitialSide}
        userYesShares={selectedMarketId ? holdings[selectedMarketId]?.yesShares || 0 : 0}
        userNoShares={selectedMarketId ? holdings[selectedMarketId]?.noShares || 0 : 0}
        ethBalance={ethBalance}
        creatorFeeRate={creatorFeeRate}
        protocolFeeRate={protocolFeeRate}
        isLiveOnChainMode={isLiveOnChainMode}
        marketActivities={activities.filter((a) => a.marketId === selectedMarketId)}
        onClose={() => setSelectedMarketId(null)}
        onExecuteTrade={handleExecuteTrade}
        onAddComment={handleAddComment}
        onToggleCommentLike={handleToggleCommentLike}
        onClaimSettlement={handleClaimSettlement}
        onClaimVoidRefund={handleClaimVoidRefund}
        allMarkets={markets}
        onSelectMarket={(marketId) => setSelectedMarketId(marketId)}
        onTopUpWallet={auth.openDepositModal}
      />
      )}

      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateMarket={handleCreateMarket}
        walletAddress={walletAddress || (auth.isAuthenticated ? auth.user?.id : null)}
        onRequireWallet={() => auth.openSignInModal()}
      />

      {/* Web2 Email/Phone/X Sign In Modal */}
      <SignInModal
        isOpen={auth.isSignInModalOpen}
        onClose={auth.closeSignInModal}
        pendingActionTitle={pendingActionTitle}
      />

      {/* NGN Fiat Deposit Modal (Paystack & Instant Transfer) */}
      <DepositModal
        isOpen={auth.isDepositModalOpen}
        onClose={auth.closeDepositModal}
      />

      {/* NGN Bank Withdrawal Modal (NIP Instant Bank Transfer) */}
      <WithdrawModal
        isOpen={auth.isWithdrawModalOpen}
        onClose={auth.closeWithdrawModal}
      />

      
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[20px] border border-[#227c9d]/40 bg-[#161620]/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#227c9d]" />
            <div className="flex-1 text-xs font-sans">
              <div className="font-fun font-bold text-white text-sm">{t.title}</div>
              <p className="mt-0.5 text-slate-300">{t.subtitle}</p>
              {t.txHash && (
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-[#227c9d] hover:underline"
                >
                  <span>View on Robinhood Explorer</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;
