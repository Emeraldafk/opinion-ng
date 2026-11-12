import React, { useState } from 'react';
import {
  Plus,
  Wallet,
  Sparkles,
  Flame,
  Award,
  Coins,
  Scale,
  Layers,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
  shortenAddress,
} from '../config/robinhoodChain';
import { UserProfile } from '../lib/userProfileService';
import { useAppAuth } from '../hooks/useAppAuth';
import { formatNGN } from '../lib/currency';

export type TiredFunNavTab =
  | 'feed'
  | 'pulse'
  | 'reputation'
  | 'portfolio'
  | 'resolution'
  | 'how-it-works';

export type NullhoodNavTab = TiredFunNavTab;

interface NavbarProps {
  walletAddress?: string | null;
  chainId?: number | null;
  ethBalance?: string;
  claimableCreatorFees?: number;
  contractAddress?: string;
  isLiveOnChainMode?: boolean;
  activeTab: TiredFunNavTab;
  setActiveTab: (tab: TiredFunNavTab) => void;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  onSwitchNetwork?: () => void;
  onOpenCreateModal: () => void;
  onClaimCreatorFees?: () => void;
  userProfile?: UserProfile | null;
}

const NAV_ITEMS: {
  id: TiredFunNavTab;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { id: 'feed', label: 'Markets', shortLabel: 'Markets', icon: Sparkles, description: 'Perpetual opinions & predictions' },
  { id: 'pulse', label: 'Feed', shortLabel: 'Feed', icon: Flame, description: 'Live conviction posts & debaters' },
  { id: 'reputation', label: 'Reputation', shortLabel: 'Ranks', icon: Award, description: 'Trader ranking & track records' },
  { id: 'portfolio', label: 'Portfolio & Fees', shortLabel: 'Portfolio', icon: Coins, description: 'Holdings & 1% creator earnings' },
  { id: 'resolution', label: 'Resolutions', shortLabel: 'Resolve', icon: Scale, description: 'Adjudication & Pari-Mutuel payouts' },
  { id: 'how-it-works', label: 'Architecture', shortLabel: 'Model', icon: Layers, description: 'Bonding curve mathematical model' },
];

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  chainId,
  ethBalance,
  claimableCreatorFees,
  contractAddress = '',
  isLiveOnChainMode = false,
  activeTab,
  setActiveTab,
  onConnectWallet,
  onDisconnectWallet,
  onSwitchNetwork,
  onOpenCreateModal,
  userProfile,
}) => {
  const auth = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const isUserLoggedIn = auth.isAuthenticated || Boolean(walletAddress);

  const handleSelectTab = (tab: TiredFunNavTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#21212c] bg-[#0c0c11]/95 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 max-w-[1600px] mx-auto gap-2 sm:gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => handleSelectTab('feed')}
            className="flex items-center gap-1.5 sm:gap-2 text-left focus:outline-none group shrink-0"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/25 transition-transform group-hover:scale-105 shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 fill-white" />
            </div>
            <span className="font-fun text-xl sm:text-2xl font-black tracking-tight text-white whitespace-nowrap">
              Opinion<span className="text-purple-400">NG</span>
            </span>
          </button>
        </div>

        {/* Center: Desktop Navigation Tabs (Primary 4 on lg+, all 6 on 2xl+, More dropdown on lg-xl) */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 min-w-0 px-2">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            // Secondary items (Resolutions & Architecture) only direct-show on 2xl+ (1536px+)
            const isSecondary = idx >= 4;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`items-center gap-1.5 rounded-full px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 ${
                  isSecondary ? 'hidden 2xl:flex' : 'flex'
                } ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                    : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="inline xl:hidden">{item.shortLabel || item.label}</span>
              </button>
            );
          })}

          {/* Compact More Dropdown for Resolutions & Architecture on lg to 2xl */}
          <div className="relative hidden lg:block 2xl:hidden shrink-0">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 xl:px-3 xl:py-2 text-xs xl:text-[13px] font-bold transition-all ${
                activeTab === 'resolution' || activeTab === 'how-it-works'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[#8c8c9e] hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded-2xl border border-[#232330] bg-[#14141c] p-1.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('resolution')}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      activeTab === 'resolution'
                        ? 'bg-purple-600 text-white'
                        : 'text-[#8c8c9e] hover:text-white hover:bg-[#1f1f2c]'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5 text-purple-400" />
                    <span>Resolutions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('how-it-works')}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      activeTab === 'how-it-works'
                        ? 'bg-purple-600 text-white'
                        : 'text-[#8c8c9e] hover:text-white hover:bg-[#1f1f2c]'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                    <span>Architecture</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Right: Actions (Create, Sign In / Balance Pill, Profile, Mobile Menu Toggle) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Create Market Button */}
          <button
            onClick={onOpenCreateModal}
            className="hidden lg:flex items-center gap-1 sm:gap-1.5 rounded-full bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold text-[#0e0e13] shadow-sm transition hover:bg-slate-200 active:scale-95 shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>Create</span>
          </button>

          {/* Connect / NGN Balance Pill */}
          {!isUserLoggedIn ? (
            <button
              onClick={() => {
                auth.openSignInModal();
                if (onConnectWallet) onConnectWallet();
              }}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-purple-600 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-purple-600/25 transition hover:bg-purple-500 active:scale-95 shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sign In / Get Started</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#232330] bg-[#171722] py-1 px-2.5 sm:px-3 shrink-0">
              <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">
                {formatNGN(auth.wallet.availableKobo)}
              </span>
              <button
                type="button"
                onClick={auth.openDepositModal}
                className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 text-[11px] font-bold transition shadow-sm"
                title="Deposit NGN"
              >
                + Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  auth.logout();
                  if (onDisconnectWallet) onDisconnectWallet();
                }}
                title="Sign Out"
                className="ml-0.5 rounded px-1 text-[11px] text-[#7a7a8c] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* User Profile Avatar */}
          {isUserLoggedIn && (
            <button
              onClick={() => handleSelectTab('portfolio')}
              className="flex items-center gap-1.5 rounded-full border border-[#232330] bg-[#14141c] p-0.5 sm:p-1 pr-1.5 sm:pr-3 hover:border-purple-500/60 hover:bg-[#1a1a24] active:scale-95 transition shrink-0 cursor-pointer shadow-sm"
              title="View Profile & Settings"
            >
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                {auth.user?.avatarUrl ? (
                  <img
                    src={auth.user.avatarUrl}
                    alt={auth.user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white">
                    {(auth.user?.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-white max-w-[85px] truncate hidden xl:inline-block">
                {auth.user?.displayName || userProfile?.displayName || 'Trader'}
              </span>
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#232330] bg-[#14141c] text-[#8c8c9e] hover:text-white transition lg:hidden shrink-0"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-[#21212c] bg-[#0c0c11]/98 px-3 py-3 lg:hidden shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-2 duration-150 w-full max-w-[100vw] overflow-x-hidden">
          {/* Mobile Auth & NGN Balance Action */}
          {!isUserLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                auth.openSignInModal();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3 px-4 text-sm font-extrabold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 active:scale-95 transition mb-3 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Sign In / Get Started</span>
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-[#232330] bg-[#14141c] p-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-white truncate max-w-[130px]">
                  {auth.user?.displayName || 'OpinionNG Trader'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {formatNGN(auth.wallet.availableKobo)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    auth.openDepositModal();
                  }}
                  className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                >
                  + Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    auth.logout();
                  }}
                  title="Sign Out"
                  className="rounded px-1.5 py-0.5 text-[11px] text-[#7a7a8c] hover:text-red-400 hover:bg-red-500/10 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Mobile Profile Card - only visible when wallet is connected */}
          {walletAddress && userProfile && (
            <div
              onClick={() => handleSelectTab('portfolio')}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#14141c] border border-[#232330] mb-2.5 cursor-pointer hover:border-[#38384d] transition"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{userProfile.displayName}</div>
                <div className="text-[10px] text-[#8c8c9e] font-mono">@{userProfile.username}</div>
              </div>
              <span className="text-[11px] font-bold text-[#FF6B00]">Profile ›</span>
            </div>
          )}
          {/* Featured Settlement & Protocol Info (Resolutions & Architecture) */}
          <div className="space-y-2 mb-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7a7a8c] px-1">
              Protocol & Settlement
            </div>

            <button
              type="button"
              onClick={() => handleSelectTab('resolution')}
              className={`flex w-full items-center justify-between rounded-2xl p-3 transition text-left border ${
                activeTab === 'resolution'
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/25'
                  : 'border-[#232330] bg-[#14141c] text-[#8c8c9e] hover:text-white hover:border-[#343446]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    activeTab === 'resolution'
                      ? 'bg-black/25 text-white'
                      : 'bg-[#181824] text-amber-400'
                  }`}
                >
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">Resolutions</div>
                  <div
                    className={`text-[10px] leading-tight mt-0.5 ${
                      activeTab === 'resolution' ? 'text-white/80' : 'text-[#7a7a8c]'
                    }`}
                  >
                    Adjudication & Pari-Mutuel payouts
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 ${activeTab === 'resolution' ? 'text-white' : 'text-[#555566]'}`}
              />
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('how-it-works')}
              className={`flex w-full items-center justify-between rounded-2xl p-3 transition text-left border ${
                activeTab === 'how-it-works'
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/25'
                  : 'border-[#232330] bg-[#14141c] text-[#8c8c9e] hover:text-white hover:border-[#343446]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    activeTab === 'how-it-works'
                      ? 'bg-black/25 text-white'
                      : 'bg-[#181824] text-[#53b3d4]'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">Architecture</div>
                  <div
                    className={`text-[10px] leading-tight mt-0.5 ${
                      activeTab === 'how-it-works' ? 'text-white/80' : 'text-[#7a7a8c]'
                    }`}
                  >
                    Bonding curve mathematical model
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`h-4 w-4 ${activeTab === 'how-it-works' ? 'text-white' : 'text-[#555566]'}`}
              />
            </button>
          </div>

          {/* Mobile Footer Status */}
          <div className="mt-3 pt-3 border-t border-[#1f1f2c] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-300">NGN Ledger Active</span>
            </div>
            <span className="text-[11px] text-purple-400 font-semibold">
              Instant Settlement
            </span>
          </div>
        </div>
      )}
    </header>

    {/* Top Navbar Spacer to prevent layout shift under fixed top navbar */}
    <div className="h-[53px] sm:h-[61px] w-full shrink-0" aria-hidden="true" />

    {/* Mobile Web App Bottom Navigation Bar (Fixed bottom, Web App / X Style) */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#21212c] bg-[#0c0c11]/95 backdrop-blur-xl px-2 py-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* 1. Market Button */}
        <button
          type="button"
          onClick={() => handleSelectTab('feed')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'feed'
              ? 'text-[#FF6B00]'
              : 'text-[#8c8c9e] hover:text-white'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Market</span>
        </button>

        {/* 2. Feed Button */}
        <button
          type="button"
          onClick={() => handleSelectTab('pulse')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'pulse'
              ? 'text-[#FF6B00]'
              : 'text-[#8c8c9e] hover:text-white'
          }`}
        >
          <Flame className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Feed</span>
        </button>

        {/* 3. Create Button (Centerpiece replacing Grok button) */}
        <div className="flex flex-col items-center justify-center -mt-4">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF6B00] to-orange-500 text-white shadow-lg shadow-[#FF6B00]/40 ring-4 ring-[#0c0c11] hover:brightness-110 active:scale-90 transition-transform"
            aria-label="Create Market"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
          <span className="text-[10px] font-extrabold text-[#FF6B00] mt-0.5 tracking-tight">Create</span>
        </div>

        {/* 4. Portfolio Button */}
        <button
          type="button"
          onClick={() => handleSelectTab('portfolio')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'portfolio'
              ? 'text-[#FF6B00]'
              : 'text-[#8c8c9e] hover:text-white'
          }`}
        >
          <Coins className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Portfolio</span>
        </button>

        {/* 5. Reputation Button */}
        <button
          type="button"
          onClick={() => handleSelectTab('reputation')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'reputation'
              ? 'text-[#FF6B00]'
              : 'text-[#8c8c9e] hover:text-white'
          }`}
        >
          <Award className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Reputation</span>
        </button>
      </div>
    </nav>
  </>
  );
};
