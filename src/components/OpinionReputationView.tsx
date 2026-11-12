import React, { useState, useMemo } from 'react';
import {
  Award,
  Users,
  MessageSquare,
  Layers,
  TrendingUp,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Info,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { OpinionMarket, TradeActivity } from '../lib/bondingCurve';
import {
  buildProfilesFromPlatformState,
  UserReputationProfile,
} from '../lib/reputationEngine';
import { ROBINHOOD_EXPLORER_URL } from '../config/robinhoodChain';

interface OpinionReputationViewProps {
  markets: OpinionMarket[];
  activities: TradeActivity[];
  walletAddress: string | null;
  holdings: { [marketId: number]: { yesShares: number; noShares: number } };
}

export const OpinionReputationView: React.FC<OpinionReputationViewProps> = ({
  markets,
  activities,
  walletAddress,
  holdings,
}) => {
  const [followedAddresses, setFollowedAddresses] = useState<string[]>([
    '0x71C9...89A4',
  ]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  const profiles = useMemo(
    () =>
      buildProfilesFromPlatformState(
        markets,
        activities,
        walletAddress,
        holdings,
        followedAddresses
      ),
    [markets, activities, walletAddress, holdings, followedAddresses]
  );

  const activeProfile: UserReputationProfile =
    profiles.find((p) => p.address === selectedAddress) || profiles[0];

  const toggleFollow = (addr: string) => {
    setFollowedAddresses((prev) =>
      prev.includes(addr) ? prev.filter((x) => x !== addr) : [...prev, addr]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Methodology & Anti-Manipulation Specification */}
      <div className="rounded-[28px] border border-[#1c313a] bg-gradient-to-r from-[#0e1c24] via-[#121218] to-[#161622] p-6 sm:p-7 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#227c9d]/30 bg-[#227c9d]/15 px-3.5 py-1 text-xs font-fun font-bold text-[#53b3d4]">
              <Award className="h-3.5 w-3.5 text-[#227c9d]" />
              <span>OPINION REPUTATION SYSTEM • NON-PNL & SYBIL-RESISTANT</span>
            </div>
            <h2 className="text-2xl font-fun font-bold text-white sm:text-3xl">
              Verifiable Conviction & Curation Standing
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Because Tired.Fun markets measure perpetual collective conviction rather than binary
              oracle outcomes, <strong className="text-white">Reputation never equates trading profit with truth</strong>.
              Scores are computed deterministically from four logarithmic pillars that cap whale
              wash-trading and require active curve stake for discussion weight:
            </p>
          </div>

          <div className="rounded-[20px] border border-[#232330] bg-[#0f1015] p-4 font-mono text-[11px] text-slate-300 shadow-inner">
            <div className="mb-1.5 font-fun font-bold text-[#227c9d]">
              Deterministic Reputation Formula (Max 1,000):
            </div>
            <div className="space-y-0.5 text-slate-400">
              <div>• Creator Impact (0–400): <span className="text-slate-200">150 · ln(1 + M_created · U_factor)</span></div>
              <div>• Market Diversity (0–250): <span className="text-slate-200">120 · ln(1 + UniqueMarketsTraded)</span></div>
              <div>• Backed Discourse (0–200): <span className="text-slate-200">90 · ln(1 + StakeBackedComments)</span></div>
              <div>• Curve Participation (0–150): <span className="text-slate-200">80 · ln(1 + CumulativeVolumeETH)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Leaderboard List (5 cols) + Selected User Profile Inspector (7 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Community Reputation Directory */}
        <div className="space-y-3 lg:col-span-5">
          <h3 className="text-xs font-fun font-bold uppercase tracking-wider text-slate-300">
            Tired.Fun Reputation Directory ({profiles.length} Profiles)
          </h3>

          <div className="space-y-2.5">
            {profiles.map((prof, idx) => {
              const isSelected = prof.address === activeProfile.address;
              return (
                <div
                  key={prof.address}
                  onClick={() => setSelectedAddress(prof.address)}
                  className={`cursor-pointer rounded-[22px] border p-4 transition ${
                    isSelected
                      ? 'border-[#227c9d] bg-[#11222b] shadow-[0_0_25px_rgba(34,124,157,0.2)]'
                      : 'border-[#232330] bg-[#161620] hover:border-[#227c9d]/40 hover:bg-[#11222b]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: `${prof.avatarColor}20`, color: prof.avatarColor }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/30 font-fun text-sm font-bold shadow-sm"
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-fun text-sm font-bold text-white">
                            {prof.address}
                          </span>
                          <span className="text-xs text-slate-400 font-sans">{prof.handle}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/30 px-2 py-0.5 font-fun text-[10px] font-bold text-[#53b3d4]">
                            {prof.breakdown.tier}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {prof.marketsCreatedCount} created • {prof.uniqueMarketsTraded} markets
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-fun text-lg font-bold text-white">
                        {prof.breakdown.totalScore}
                      </div>
                      <div className="font-mono text-[10px] uppercase text-slate-400">
                        REP SCORE
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Profile Inspector */}
        {activeProfile && (
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-[28px] border border-[#232330] bg-[#161620] p-6 shadow-xl">
              {/* Top Profile Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232330] pb-5">
                <div className="flex items-center gap-4">
                  <div
                    style={{
                      backgroundColor: `${activeProfile.avatarColor}20`,
                      color: activeProfile.avatarColor,
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border border-current/40 font-fun text-2xl font-bold shadow-md"
                  >
                    {activeProfile.handle.slice(1, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-fun text-xl font-bold text-white">
                        {activeProfile.address}
                      </h3>
                      <span className="rounded-full bg-[#227c9d]/20 border border-[#227c9d]/30 px-2.5 py-0.5 font-fun text-xs font-bold text-[#53b3d4]">
                        {activeProfile.breakdown.tier}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 font-sans">{activeProfile.bio}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
                      <span>{activeProfile.handle}</span>
                      <span>•</span>
                      <span>{activeProfile.followersCount} Followers</span>
                      <span>•</span>
                      <span>{activeProfile.followingCount} Following</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleFollow(activeProfile.address)}
                  className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-fun font-bold transition ${
                    activeProfile.isFollowedByUser
                      ? 'border border-[#227c9d]/50 bg-[#227c9d]/20 text-[#53b3d4]'
                      : 'bg-[#227c9d] text-white hover:bg-[#1a647f] shadow-[0_0_15px_rgba(34,124,157,0.3)]'
                  }`}
                >
                  {activeProfile.isFollowedByUser ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Follow Voice</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Pillar Reputation Breakdown Bars */}
              <div className="my-6">
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="text-xs font-fun font-bold uppercase tracking-wider text-white">
                    Deterministic Reputation Pillars
                  </span>
                  <span className="font-fun text-sm font-bold text-[#227c9d]">
                    {activeProfile.breakdown.totalScore} / 1,000 PTS
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-400 font-sans">Creator Impact (Max 400)</span>
                      <span className="font-mono font-bold text-[#227c9d]">
                        {activeProfile.breakdown.creatorImpactScore} pts
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#132128]">
                      <div
                        style={{
                          width: `${(activeProfile.breakdown.creatorImpactScore / 400) * 100}%`,
                        }}
                        className="h-full bg-[#227c9d] rounded-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-400 font-sans">Market Diversity (Max 250)</span>
                      <span className="font-mono font-bold text-[#53b3d4]">
                        {activeProfile.breakdown.marketDiversityScore} pts
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#132128]">
                      <div
                        style={{
                          width: `${(activeProfile.breakdown.marketDiversityScore / 250) * 100}%`,
                        }}
                        className="h-full bg-[#53b3d4] rounded-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-400 font-sans">Backed Discourse (Max 200)</span>
                      <span className="font-mono font-bold text-[#FF6B00]">
                        {activeProfile.breakdown.discourseScore} pts
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#132128]">
                      <div
                        style={{
                          width: `${(activeProfile.breakdown.discourseScore / 200) * 100}%`,
                        }}
                        className="h-full bg-[#FF6B00] rounded-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-400 font-sans">Curve Participation (Max 150)</span>
                      <span className="font-mono font-bold text-orange-300">
                        {activeProfile.breakdown.volumeParticipationScore} pts
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#132128]">
                      <div
                        style={{
                          width: `${
                            (activeProfile.breakdown.volumeParticipationScore / 150) * 100
                          }%`,
                        }}
                        className="h-full bg-amber-300 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Performance Grid */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                  <span className="text-[10px] font-fun font-bold uppercase text-slate-400">
                    Markets Created
                  </span>
                  <div className="mt-1 font-fun text-xl font-bold text-white">
                    {activeProfile.marketsCreatedCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                  <span className="text-[10px] font-fun font-bold uppercase text-slate-400">
                    Vol Attracted
                  </span>
                  <div className="mt-1 font-fun text-xl font-bold text-[#227c9d]">
                    {activeProfile.creatorVolumeAttractedEth.toFixed(1)} ETH
                  </div>
                </div>

                <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                  <span className="text-[10px] font-fun font-bold uppercase text-slate-400">
                    Creator Fees Earned
                  </span>
                  <div className="mt-1 font-fun text-xl font-bold text-[#FF6B00]">
                    {activeProfile.creatorFeesEarnedEth.toFixed(3)} ETH
                  </div>
                </div>

                <div className="rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5">
                  <span className="text-[10px] font-fun font-bold uppercase text-slate-400">
                    Backed Theses
                  </span>
                  <div className="mt-1 font-fun text-xl font-bold text-white">
                    {activeProfile.positionBackedCommentsCount}
                  </div>
                </div>
              </div>

              {/* Historical Activity Timeline */}
              <div className="mt-6">
                <h4 className="mb-3 text-xs font-fun font-bold uppercase tracking-wider text-slate-300">
                  Verifiable Activity History ({activeProfile.recentHistory.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeProfile.recentHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#232330] bg-[#0f1015] p-3.5 text-xs"
                    >
                      <div>
                        <div className="font-fun font-bold text-white">{item.description}</div>
                        {item.marketQuestion && (
                          <div className="mt-0.5 text-[11px] text-slate-400 font-sans">
                            “{item.marketQuestion}”
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right font-mono text-[10px]">
                        <div className="text-slate-400">{item.timestampLabel}</div>
                        {item.txHash ? (
                          <a
                            href={`${ROBINHOOD_EXPLORER_URL}/tx/${item.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#227c9d] hover:underline"
                          >
                            <span>Explorer</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-orange-300/80">Platform Record</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
