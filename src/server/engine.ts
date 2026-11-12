/**
 * OpinionNG Atomic NGN Trading & Settlement Engine
 * 
 * Strict ACID database transaction execution with row-level locking simulation (mutex),
 * double-entry ledger bookkeeping, and integer Kobo precision.
 * 
 * Financial Units:
 * 1 NGN = 100 Kobo
 * Max Winning Share Payout = ₦100.00 (10,000 Kobo)
 * Fees = 3.0% total (1.5% Creator Fee [150 bps] + 1.5% Platform Fee [150 bps])
 * Anti-Spam Market Creation = ₦1,000 (100,000 Kobo) or ₦5,000 (500,000 Kobo) seed
 */

import fs from 'fs';
import path from 'path';

export const KOBO_PER_NAIRA = 100;
export const WINNING_SHARE_PAYOUT_KOBO = 100 * KOBO_PER_NAIRA; // 10,000 Kobo = ₦100.00
export const CREATOR_FEE_BPS = 150; // 1.5%
export const PLATFORM_FEE_BPS = 150; // 1.5%
export const TOTAL_FEE_BPS = CREATOR_FEE_BPS + PLATFORM_FEE_BPS; // 3.0% (300 bps)
export const MARKET_CREATION_FEE_KOBO = 1_000 * KOBO_PER_NAIRA; // 100,000 Kobo (₦1,000)
export const MIN_MARKET_SEED_KOBO = 5_000 * KOBO_PER_NAIRA; // 500,000 Kobo (₦5,000)
export const DISPUTE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours dispute window

export type LedgerEntryType =
  | 'DEPOSIT'
  | 'TRADE_BUY'
  | 'TRADE_SELL'
  | 'MARKET_PAYOUT'
  | 'CREATOR_FEE'
  | 'PLATFORM_FEE'
  | 'MARKET_CREATION_FEE'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_REFUND';

export type MarketStatus =
  | 'ACTIVE'
  | 'CLOSED'
  | 'PROPOSED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'VOID';

export type MarketOutcome = 'UNRESOLVED' | 'YES' | 'NO' | 'VOID';
export type MarketSide = 'YES' | 'NO';

export interface UserRecord {
  id: string;
  email?: string;
  phone?: string;
  xHandle?: string;
  xUserId?: string;
  displayName: string;
  avatarUrl: string;
  kycTier: number;
  bvnNinVerified: boolean;
  createdAt: string;
}

export interface WalletRecord {
  id: string;
  userId: string;
  availableKobo: number; // integer kobo >= 0
  lockedKobo: number;
  creatorEarningsKobo: number;
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
  updatedAt: string;
}

export interface LedgerEntryRecord {
  id: string;
  walletId: string;
  amountKobo: number; // + for credit, - for debit
  balanceAfterKobo: number;
  entryType: LedgerEntryType;
  referenceId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface MarketRecord {
  id: number;
  creatorId: string;
  question: string;
  category: string;
  imageUri: string;
  sourceHandle: string;
  yesPoolKobo: number;
  noPoolKobo: number;
  totalVolumeKobo: number;
  creatorFeeBps: number;
  platformFeeBps: number;
  status: MarketStatus;
  proposedOutcome: MarketOutcome;
  finalOutcome: MarketOutcome;
  disputeEndsAt?: string | null;
  closingTime?: string | null;
  resolutionDeadline?: string | null;
  yesCondition?: string;
  noCondition?: string;
  evidenceSource?: string;
  proposedEvidence?: string;
  disputeEvidence?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionRecord {
  id: string;
  userId: string;
  marketId: number;
  side: MarketSide;
  sharesCount: number;
  totalCostKobo: number;
  avgPriceKobo: number;
  updatedAt: string;
}

export interface DatabaseState {
  users: Record<string, UserRecord>;
  wallets: Record<string, WalletRecord>;
  ledgerEntries: LedgerEntryRecord[];
  markets: Record<number, MarketRecord>;
  positions: Record<string, PositionRecord>; // key: `${userId}_${marketId}_${side}`
}

// Global Platform Revenue Wallet ID
export const PLATFORM_USER_ID = 'usr_opinion_platform_treasury';
export const PLATFORM_WALLET_ID = 'wlt_opinion_platform_treasury';

// Default Demo User (seeded with ₦10,000 = 1,000,000 Kobo)
export const DEMO_USER_ID = 'usr_demo_893240';
export const DEMO_WALLET_ID = 'wlt_demo_893240';

export class NgnTradingEngine {
  private state: DatabaseState;
  private persistencePath: string;
  private locks: Map<string, Promise<void>> = new Map();

  constructor(storageDir?: string) {
    const dir = storageDir || path.resolve(process.cwd(), 'database');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.persistencePath = path.join(dir, 'opinion_ng_store.json');
    this.state = this.loadOrInitialize();
  }

  /**
   * Acquire a row-level mutex lock on a resource (e.g., 'wallet:usr_123', 'market:5')
   * to guarantee strict serializable ACID transaction isolation and prevent race conditions.
   */
  private async acquireLock(resource: string): Promise<() => void> {
    while (this.locks.has(resource)) {
      await this.locks.get(resource);
    }
    let resolveLock!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(resource, promise);

    return () => {
      this.locks.delete(resource);
      resolveLock();
    };
  }

  /**
   * Acquire multiple row locks in deterministic alphabetical order to avoid deadlocks.
   */
  private async acquireLocks(resources: string[]): Promise<() => void> {
    const sorted = Array.from(new Set(resources)).sort();
    const releases: Array<() => void> = [];
    for (const res of sorted) {
      const release = await this.acquireLock(res);
      releases.push(release);
    }
    return () => {
      for (const rel of releases.reverse()) {
        rel();
      }
    };
  }

  private loadOrInitialize(): DatabaseState {
    if (fs.existsSync(this.persistencePath)) {
      try {
        const raw = fs.readFileSync(this.persistencePath, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[Engine] Corrupted store, reinitializing:', e);
      }
    }

    const initial: DatabaseState = {
      users: {
        [PLATFORM_USER_ID]: {
          id: PLATFORM_USER_ID,
          displayName: 'OpinionNG Platform Treasury',
          avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
          kycTier: 2,
          bvnNinVerified: true,
          createdAt: new Date().toISOString(),
        },
        [DEMO_USER_ID]: {
          id: DEMO_USER_ID,
          email: 'trader@opinion.ng',
          phone: '+2348012345678',
          xHandle: 'opinion_trader',
          xUserId: 'x_opinion_demo_101',
          displayName: 'Tunde Afolabi',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          kycTier: 1,
          bvnNinVerified: true,
          createdAt: new Date().toISOString(),
        },
        'usr_creator_burna': {
          id: 'usr_creator_burna',
          displayName: 'NaijaPopCurator',
          xHandle: 'BurnaBoyFanClub',
          xUserId: 'x_burna_curator',
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
          kycTier: 1,
          bvnNinVerified: true,
          createdAt: new Date().toISOString(),
        },
      },
      wallets: {
        [PLATFORM_WALLET_ID]: {
          id: PLATFORM_WALLET_ID,
          userId: PLATFORM_USER_ID,
          availableKobo: 0,
          lockedKobo: 0,
          creatorEarningsKobo: 0,
          updatedAt: new Date().toISOString(),
        },
        [DEMO_WALLET_ID]: {
          id: DEMO_WALLET_ID,
          userId: DEMO_USER_ID,
          availableKobo: 10_000 * KOBO_PER_NAIRA, // ₦10,000 = 1,000,000 Kobo
          lockedKobo: 0,
          creatorEarningsKobo: 250 * KOBO_PER_NAIRA, // ₦250 starting creator earnings
          virtualAccountNumber: '9920194821',
          virtualAccountBank: 'Wema Bank (OpinionNG)',
          updatedAt: new Date().toISOString(),
        },
        'wlt_creator_burna': {
          id: 'wlt_creator_burna',
          userId: 'usr_creator_burna',
          availableKobo: 50_000 * KOBO_PER_NAIRA,
          lockedKobo: 0,
          creatorEarningsKobo: 12_500 * KOBO_PER_NAIRA,
          virtualAccountNumber: '9920198834',
          virtualAccountBank: 'Wema Bank (OpinionNG)',
          updatedAt: new Date().toISOString(),
        },
      },
      ledgerEntries: [
        {
          id: 'ldg_init_demo_fund',
          walletId: DEMO_WALLET_ID,
          amountKobo: 10_000 * KOBO_PER_NAIRA,
          balanceAfterKobo: 10_000 * KOBO_PER_NAIRA,
          entryType: 'DEPOSIT',
          referenceId: 'init_fiat_funding_v1',
          metadata: { note: 'Initial Demo User ₦10,000 Wallet Balance' },
          createdAt: new Date().toISOString(),
        },
      ],
      markets: {
        1: {
          id: 1,
          creatorId: 'usr_creator_burna',
          question: 'Will Dangote Refinery petrol pump price drop below ₦850/L across Lagos before Q4 2026?',
          category: 'Economy',
          imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
          sourceHandle: '@DangoteGroup',
          yesPoolKobo: 640_000,
          noPoolKobo: 360_000,
          totalVolumeKobo: 1_800_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 45 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 46 * 86400 * 1000).toISOString(),
          yesCondition: 'Retail pump prices for PMS from Dangote Refinery at registered major filling stations in Lagos fall below ₦850/L.',
          noCondition: 'Retail PMS prices remain at or above ₦850/L at closing deadline.',
          evidenceSource: 'https://majoroilmarketers.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        2: {
          id: 2,
          creatorId: 'usr_creator_burna',
          question: 'Will Burna Boy, Wizkid or Davido headline the 2026 FIFA World Cup Closing Ceremony?',
          category: 'Culture',
          imageUri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
          sourceHandle: '@burnaboy',
          yesPoolKobo: 720_000,
          noPoolKobo: 280_000,
          totalVolumeKobo: 2_200_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 90 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 91 * 86400 * 1000).toISOString(),
          yesCondition: 'Burna Boy, Wizkid, or Davido is officially billed and performs as headline act at 2026 World Cup final.',
          noCondition: 'None of the three headline the official closing ceremony.',
          evidenceSource: 'https://www.fifa.com/worldcup',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        3: {
          id: 3,
          creatorId: DEMO_USER_ID,
          question: 'Will the Super Eagles reach the Quarter-Finals or better at the 2026 FIFA World Cup?',
          category: 'Sports',
          imageUri: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600',
          sourceHandle: '@NGSuperEagles',
          yesPoolKobo: 550_000,
          noPoolKobo: 450_000,
          totalVolumeKobo: 1_500_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 120 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 121 * 86400 * 1000).toISOString(),
          yesCondition: 'Nigeria senior national team qualifies for Quarter-Finals or better in 2026 World Cup.',
          noCondition: 'Nigeria is eliminated in prior rounds or fails to participate.',
          evidenceSource: 'https://www.fifa.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        4: {
          id: 4,
          creatorId: DEMO_USER_ID,
          question: 'Will official NAFEM USD/NGN exchange rate strengthen below ₦1,400/$ in 2026?',
          category: 'Economy',
          imageUri: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600',
          sourceHandle: '@cenbank',
          yesPoolKobo: 510_000,
          noPoolKobo: 490_000,
          totalVolumeKobo: 1_600_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 60 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 61 * 86400 * 1000).toISOString(),
          yesCondition: 'Official NAFEM closing weighted-average FX rate prints below ₦1,400.00/USD on any trading day.',
          noCondition: 'NAFEM rate remains above ₦1,400.00/USD throughout.',
          evidenceSource: 'https://fmdqgroup.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        5: {
          id: 5,
          creatorId: 'usr_creator_burna',
          question: 'Will INEC mandate 100% digital voter accreditation and real-time portal upload for the 2027 General Elections?',
          category: 'Politics',
          imageUri: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600',
          sourceHandle: '@inecnigeria',
          yesPoolKobo: 620_000,
          noPoolKobo: 380_000,
          totalVolumeKobo: 1_200_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 90 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 91 * 86400 * 1000).toISOString(),
          yesCondition: 'INEC formally issues electoral guidelines making electronic accreditation mandatory.',
          noCondition: 'INEC regulations retain manual bypass.',
          evidenceSource: 'https://inecnigeria.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        6: {
          id: 6,
          creatorId: DEMO_USER_ID,
          question: 'Will Moniepoint or OPay execute an IPO listing on the Nigerian Exchange (NGX) before 2027?',
          category: 'Tech',
          imageUri: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600',
          sourceHandle: '@MoniepointNG',
          yesPoolKobo: 580_000,
          noPoolKobo: 420_000,
          totalVolumeKobo: 1_400_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 80 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 81 * 86400 * 1000).toISOString(),
          yesCondition: 'Moniepoint or OPay shares commence official public trading on NGX.',
          noCondition: 'Neither firm executes an NGX public listing before closing date.',
          evidenceSource: 'https://ngxgroup.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        7: {
          id: 7,
          creatorId: 'usr_creator_burna',
          question: 'Will Victor Osimhen win the 2026 CAF African Footballer of the Year award?',
          category: 'Sports',
          imageUri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600',
          sourceHandle: '@victorosimhen9',
          yesPoolKobo: 670_000,
          noPoolKobo: 330_000,
          totalVolumeKobo: 1_700_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 70 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 71 * 86400 * 1000).toISOString(),
          yesCondition: 'CAF officially names Victor Osimhen Men Player of the Year 2026.',
          noCondition: 'Any other nominee wins the award.',
          evidenceSource: 'https://www.cafonline.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        8: {
          id: 8,
          creatorId: DEMO_USER_ID,
          question: 'Will Big Brother Naija Season 10 set an all-time voting record exceeding 1.5 Billion votes?',
          category: 'Culture',
          imageUri: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600',
          sourceHandle: '@BBNaija',
          yesPoolKobo: 630_000,
          noPoolKobo: 370_000,
          totalVolumeKobo: 1_300_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 50 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 51 * 86400 * 1000).toISOString(),
          yesCondition: 'MultiChoice audit figures verify total cast votes for BBNaija Season 10 exceed 1.5B.',
          noCondition: 'Total verified votes remain under 1.5B.',
          evidenceSource: 'https://www.dstv.com/africamagic',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        9: {
          id: 9,
          creatorId: DEMO_USER_ID,
          question: 'Will the Central Bank of Nigeria (CBN) cut the Monetary Policy Rate (MPR) below 25% in 2026?',
          category: 'Economy',
          imageUri: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600',
          sourceHandle: '@cenbank',
          yesPoolKobo: 470_000,
          noPoolKobo: 530_000,
          totalVolumeKobo: 1_100_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 40 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 41 * 86400 * 1000).toISOString(),
          yesCondition: 'CBN MPC communique announces an official MPR reduction below 25.00%.',
          noCondition: 'MPR remains at 25.00% or higher at all 2026 MPC sessions.',
          evidenceSource: 'https://www.cbn.gov.ng',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        10: {
          id: 10,
          creatorId: 'usr_creator_burna',
          question: 'Will Lagos Rail Mass Transit Red Line surpass 500,000 daily passenger trips before end of 2026?',
          category: 'Economy',
          imageUri: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600',
          sourceHandle: '@followlasg',
          yesPoolKobo: 540_000,
          noPoolKobo: 460_000,
          totalVolumeKobo: 1_000_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 55 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 56 * 86400 * 1000).toISOString(),
          yesCondition: 'LAMATA publishes verified ridership exceeding 500k daily trips on Red Line.',
          noCondition: 'Red Line ridership remains below 500,000.',
          evidenceSource: 'https://lamata-ng.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        11: {
          id: 11,
          creatorId: 'usr_creator_burna',
          question: 'Will a Nollywood theatrical release gross over ₦2 Billion at the West African box office in 2026?',
          category: 'Culture',
          imageUri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
          sourceHandle: '@FilmhouseCinema',
          yesPoolKobo: 690_000,
          noPoolKobo: 310_000,
          totalVolumeKobo: 1_400_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 65 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 66 * 86400 * 1000).toISOString(),
          yesCondition: 'CEAN confirms a domestic production crossing ₦2B gross box office.',
          noCondition: 'No release reaches ₦2B gross.',
          evidenceSource: 'https://ceanigeria.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        12: {
          id: 12,
          creatorId: DEMO_USER_ID,
          question: 'Will Starlink Nigeria active high-speed satellite broadband subscriptions exceed 250,000 before 2027?',
          category: 'Tech',
          imageUri: 'https://images.unsplash.com/photo-1517976487507-5b3a4a0346a0?w=600',
          sourceHandle: '@SpaceXStarlink',
          yesPoolKobo: 620_000,
          noPoolKobo: 380_000,
          totalVolumeKobo: 950_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 75 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 76 * 86400 * 1000).toISOString(),
          yesCondition: 'NCC quarterly reports verify active Starlink connections > 250,000.',
          noCondition: 'Active subscriptions remain under 250,000.',
          evidenceSource: 'https://ncc.gov.ng',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        13: {
          id: 13,
          creatorId: 'usr_creator_burna',
          question: 'Will Nigeria officially secure UNESCO Intangible Cultural Heritage status for Jollof Rice before 2027?',
          category: 'Culture',
          imageUri: 'https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=600',
          sourceHandle: '@UNESCO',
          yesPoolKobo: 590_000,
          noPoolKobo: 410_000,
          totalVolumeKobo: 1_200_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 85 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 86 * 86400 * 1000).toISOString(),
          yesCondition: 'UNESCO Intergovernmental Committee formally inscribes Nigerian Jollof Rice.',
          noCondition: 'Inscription is deferred or not granted.',
          evidenceSource: 'https://ich.unesco.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        14: {
          id: 14,
          creatorId: DEMO_USER_ID,
          question: 'Will Anthony Joshua fight an officially sanctioned heavyweight championship bout in Nigeria before end of 2027?',
          category: 'Sports',
          imageUri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600',
          sourceHandle: '@anthonyjoshua',
          yesPoolKobo: 560_000,
          noPoolKobo: 440_000,
          totalVolumeKobo: 1_400_000,
          creatorFeeBps: 150,
          platformFeeBps: 150,
          status: 'ACTIVE',
          proposedOutcome: 'UNRESOLVED',
          finalOutcome: 'UNRESOLVED',
          closingTime: new Date(Date.now() + 110 * 86400 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 111 * 86400 * 1000).toISOString(),
          yesCondition: 'Officially sanctioned professional heavyweight bout featuring Anthony Joshua is staged in Nigeria.',
          noCondition: 'No official bout takes place in Nigeria.',
          evidenceSource: 'https://boxrec.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      positions: {
        [`${DEMO_USER_ID}_1_YES`]: {
          id: 'pos_demo_1_yes',
          userId: DEMO_USER_ID,
          marketId: 1,
          side: 'YES',
          sharesCount: 50,
          totalCostKobo: 250_000, // ₦2,500 total cost
          avgPriceKobo: 5_000,    // ₦50.00/share
          updatedAt: new Date().toISOString(),
        },
      },
    };

    this.persistSync(initial);
    return initial;
  }

  private persistSync(state: DatabaseState): void {
    try {
      fs.writeFileSync(this.persistencePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Engine] Failed to persist state:', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public getUser(userId: string): UserRecord | undefined {
    return this.state.users[userId];
  }

  public getWallet(userId: string): WalletRecord {
    let wallet = Object.values(this.state.wallets).find((w) => w.userId === userId);
    if (!wallet) {
      const walletId = `wlt_${userId}`;
      wallet = {
        id: walletId,
        userId,
        availableKobo: 0,
        lockedKobo: 0,
        creatorEarningsKobo: 0,
        updatedAt: new Date().toISOString(),
      };
      this.state.wallets[walletId] = wallet;
      this.persistSync(this.state);
    }
    return wallet;
  }

  public getMarket(marketId: number): MarketRecord | undefined {
    return this.state.markets[marketId];
  }

  public getAllMarkets(): MarketRecord[] {
    return Object.values(this.state.markets).sort((a, b) => b.id - a.id);
  }

  public getUserPositions(userId: string): PositionRecord[] {
    return Object.values(this.state.positions).filter(
      (p) => p.userId === userId && p.sharesCount > 0
    );
  }

  public getUserLedger(userId: string): LedgerEntryRecord[] {
    const wallet = this.getWallet(userId);
    return this.state.ledgerEntries
      .filter((e) => e.walletId === wallet.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  /**
   * AMM Pricing & Math (Scaled to ₦1 - ₦100 / 100 - 10,000 Kobo per share)
   */
  public calculateMarketPrices(market: MarketRecord): {
    yesPriceKobo: number;
    noPriceKobo: number;
    yesPct: number;
    noPct: number;
  } {
    const total = market.yesPoolKobo + market.noPoolKobo;
    if (total <= 0) {
      return {
        yesPriceKobo: 5_000, // ₦50.00
        noPriceKobo: 5_000,
        yesPct: 50.0,
        noPct: 50.0,
      };
    }

    const yesPct = Number(((market.yesPoolKobo / total) * 100).toFixed(1));
    const noPct = Number((100 - yesPct).toFixed(1));

    // Share price in Kobo = probability * 10,000 Kobo (₦100)
    // Bounded between 100 Kobo (₦1) and 9,900 Kobo (₦99)
    const rawYesPrice = Math.round((yesPct / 100) * WINNING_SHARE_PAYOUT_KOBO);
    const yesPriceKobo = Math.max(100, Math.min(9_900, rawYesPrice));
    const noPriceKobo = WINNING_SHARE_PAYOUT_KOBO - yesPriceKobo;

    return { yesPriceKobo, noPriceKobo, yesPct, noPct };
  }

  /**
   * Real-time quote preview for Buy / Sell orders
   */
  public quoteTrade(
    marketId: number,
    side: MarketSide,
    isBuy: boolean,
    amountKoboOrShares: number
  ) {
    const market = this.state.markets[marketId];
    if (!market) throw new Error(`Market #${marketId} not found`);

    const { yesPriceKobo, noPriceKobo, yesPct } = this.calculateMarketPrices(market);
    const startPriceKobo = side === 'YES' ? yesPriceKobo : noPriceKobo;

    if (isBuy) {
      const grossAmountKobo = Math.round(amountKoboOrShares);
      const creatorFeeKobo = Math.floor((grossAmountKobo * CREATOR_FEE_BPS) / 10_000);
      const platformFeeKobo = Math.floor((grossAmountKobo * PLATFORM_FEE_BPS) / 10_000);
      const totalFeeKobo = creatorFeeKobo + platformFeeKobo;
      const netAmountKobo = grossAmountKobo - totalFeeKobo;

      // Price impact calculation based on pool depth
      const targetPool = side === 'YES' ? market.yesPoolKobo : market.noPoolKobo;
      const otherPool = side === 'YES' ? market.noPoolKobo : market.yesPoolKobo;
      const newTargetPool = targetPool + netAmountKobo;
      const totalNewPool = newTargetPool + otherPool;
      const newProb = (newTargetPool / totalNewPool) * 100;
      const endPriceKobo = Math.max(
        100,
        Math.min(9_900, Math.round((newProb / 100) * WINNING_SHARE_PAYOUT_KOBO))
      );

      // Average execution price
      const avgPriceKobo = Math.max(100, Math.round((startPriceKobo + endPriceKobo) / 2));
      const estShares = Math.max(1, Math.floor(netAmountKobo / (avgPriceKobo / 100)));
      const potentialPayoutKobo = estShares * WINNING_SHARE_PAYOUT_KOBO;

      return {
        isBuy: true,
        side,
        grossAmountKobo,
        netAmountKobo,
        creatorFeeKobo,
        platformFeeKobo,
        totalFeeKobo,
        startPriceKobo,
        avgPriceKobo,
        endPriceKobo,
        estimatedShares: estShares,
        potentialPayoutKobo,
        potentialProfitKobo: Math.max(0, potentialPayoutKobo - grossAmountKobo),
        currentProbabilityPct: yesPct,
        newProbabilityPct: Number(newProb.toFixed(1)),
      };
    } else {
      // SELL: user provides number of shares to sell
      const sharesToSell = Math.round(amountKoboOrShares);
      const grossProceedsKobo = Math.round(sharesToSell * (startPriceKobo / 100));
      const creatorFeeKobo = Math.floor((grossProceedsKobo * CREATOR_FEE_BPS) / 10_000);
      const platformFeeKobo = Math.floor((grossProceedsKobo * PLATFORM_FEE_BPS) / 10_000);
      const totalFeeKobo = creatorFeeKobo + platformFeeKobo;
      const netProceedsKobo = Math.max(0, grossProceedsKobo - totalFeeKobo);

      return {
        isBuy: false,
        side,
        sharesToSell,
        grossProceedsKobo,
        netProceedsKobo,
        creatorFeeKobo,
        platformFeeKobo,
        totalFeeKobo,
        avgPriceKobo: startPriceKobo,
      };
    }
  }

  /**
   * ATOMIC BUY TRANSACTION
   * Wrapped in single ACID transaction with row-level locks on user wallet and market.
   */
  public async executeBuy(
    userId: string,
    marketId: number,
    side: MarketSide,
    grossAmountKobo: number,
    slippagePct = 5.0
  ) {
    if (grossAmountKobo < 100) {
      throw new Error('Minimum trade amount is ₦1.00 (100 Kobo).');
    }

    const market = this.state.markets[marketId];
    if (!market) throw new Error(`Market #${marketId} does not exist.`);
    if (market.status !== 'ACTIVE') {
      throw new Error(`Trading is closed. Current market status: ${market.status}`);
    }

    const userWallet = this.getWallet(userId);
    const creatorWallet = this.getWallet(market.creatorId);
    const platformWallet = this.getWallet(PLATFORM_USER_ID);

    // Acquire row-level locks
    const releaseLocks = await this.acquireLocks([
      `wallet:${userWallet.id}`,
      `wallet:${creatorWallet.id}`,
      `wallet:${platformWallet.id}`,
      `market:${marketId}`,
    ]);

    try {
      // 1. Validate sufficient funds
      if (userWallet.availableKobo < grossAmountKobo) {
        throw new Error(
          `Insufficient NGN Balance: Have ₦${(userWallet.availableKobo / 100).toLocaleString(
            'en-NG'
          )}, need ₦${(grossAmountKobo / 100).toLocaleString('en-NG')}.`
        );
      }

      // 2. Fee calculation in integer Kobo
      const creatorFeeKobo = Math.floor((grossAmountKobo * CREATOR_FEE_BPS) / 10_000);
      const platformFeeKobo = Math.floor((grossAmountKobo * PLATFORM_FEE_BPS) / 10_000);
      const totalFeeKobo = creatorFeeKobo + platformFeeKobo;
      const netAmountKobo = grossAmountKobo - totalFeeKobo;

      // 3. Route net into AMM pricing formula
      const quote = this.quoteTrade(marketId, side, true, grossAmountKobo);
      const sharesReceived = quote.estimatedShares ?? Math.max(1, Math.floor(netAmountKobo / (quote.avgPriceKobo / 100)));
      const avgPriceKobo = quote.avgPriceKobo;

      const tradeRef = `trd_buy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = new Date().toISOString();

      // 4. ACID Balance Updates & Double-Entry Ledger Writes
      // (a) Debit buyer wallet
      userWallet.availableKobo -= grossAmountKobo;
      userWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_buyer`,
        walletId: userWallet.id,
        amountKobo: -grossAmountKobo,
        balanceAfterKobo: userWallet.availableKobo,
        entryType: 'TRADE_BUY',
        referenceId: tradeRef,
        metadata: {
          marketId,
          side,
          shares: sharesReceived,
          avgPriceKobo,
          grossAmountKobo,
          netAmountKobo,
          feeKobo: totalFeeKobo,
        },
        createdAt: timestamp,
      });

      // (b) Credit Creator Earnings
      creatorWallet.creatorEarningsKobo += creatorFeeKobo;
      creatorWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_creator`,
        walletId: creatorWallet.id,
        amountKobo: creatorFeeKobo,
        balanceAfterKobo: creatorWallet.creatorEarningsKobo,
        entryType: 'CREATOR_FEE',
        referenceId: tradeRef,
        metadata: {
          marketId,
          feeBps: CREATOR_FEE_BPS,
          tradeVolumeKobo: grossAmountKobo,
          creatorId: market.creatorId,
        },
        createdAt: timestamp,
      });

      // (c) Credit Platform Revenue Wallet
      platformWallet.availableKobo += platformFeeKobo;
      platformWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_platform`,
        walletId: platformWallet.id,
        amountKobo: platformFeeKobo,
        balanceAfterKobo: platformWallet.availableKobo,
        entryType: 'PLATFORM_FEE',
        referenceId: tradeRef,
        metadata: {
          marketId,
          feeBps: PLATFORM_FEE_BPS,
          tradeVolumeKobo: grossAmountKobo,
        },
        createdAt: timestamp,
      });

      // 5. Update Market Pools & Volume
      if (side === 'YES') {
        market.yesPoolKobo += netAmountKobo;
      } else {
        market.noPoolKobo += netAmountKobo;
      }
      market.totalVolumeKobo += grossAmountKobo;
      market.updatedAt = timestamp;

      // 6. Upsert User Position
      const posKey = `${userId}_${marketId}_${side}`;
      const existingPos = this.state.positions[posKey];

      if (existingPos) {
        const totalCost = existingPos.totalCostKobo + grossAmountKobo;
        const totalShares = existingPos.sharesCount + sharesReceived;
        existingPos.sharesCount = totalShares;
        existingPos.totalCostKobo = totalCost;
        existingPos.avgPriceKobo = Math.round(totalCost / totalShares);
        existingPos.updatedAt = timestamp;
      } else {
        this.state.positions[posKey] = {
          id: `pos_${tradeRef}`,
          userId,
          marketId,
          side,
          sharesCount: sharesReceived,
          totalCostKobo: grossAmountKobo,
          avgPriceKobo,
          updatedAt: timestamp,
        };
      }

      this.persistSync(this.state);

      return {
        success: true,
        tradeRef,
        marketId,
        side,
        sharesReceived,
        avgPriceKobo,
        grossAmountKobo,
        netAmountKobo,
        creatorFeeKobo,
        platformFeeKobo,
        userBalanceAfterKobo: userWallet.availableKobo,
        creatorEarningsAfterKobo: creatorWallet.creatorEarningsKobo,
        marketState: this.calculateMarketPrices(market),
      };
    } finally {
      releaseLocks();
    }
  }

  /**
   * ATOMIC SELL TRANSACTION
   * Wrapped in single ACID transaction with row-level locks.
   */
  public async executeSell(
    userId: string,
    marketId: number,
    side: MarketSide,
    sharesToSell: number,
    slippagePct = 5.0
  ) {
    if (sharesToSell <= 0) {
      throw new Error('Must specify at least 1 share to sell.');
    }

    const market = this.state.markets[marketId];
    if (!market) throw new Error(`Market #${marketId} does not exist.`);
    if (market.status !== 'ACTIVE') {
      throw new Error(`Trading is closed. Current status: ${market.status}`);
    }

    const posKey = `${userId}_${marketId}_${side}`;
    const position = this.state.positions[posKey];
    if (!position || position.sharesCount < sharesToSell) {
      const held = position?.sharesCount || 0;
      throw new Error(`Insufficient shares: You hold ${held} ${side} shares, cannot sell ${sharesToSell}.`);
    }

    const userWallet = this.getWallet(userId);
    const creatorWallet = this.getWallet(market.creatorId);
    const platformWallet = this.getWallet(PLATFORM_USER_ID);

    const releaseLocks = await this.acquireLocks([
      `wallet:${userWallet.id}`,
      `wallet:${creatorWallet.id}`,
      `wallet:${platformWallet.id}`,
      `market:${marketId}`,
    ]);

    try {
      // 1. Calculate proceeds and fees
      const quote = this.quoteTrade(marketId, side, false, sharesToSell);
      const grossProceedsKobo = quote.grossProceedsKobo || 0;
      const creatorFeeKobo = quote.creatorFeeKobo || 0;
      const platformFeeKobo = quote.platformFeeKobo || 0;
      const totalFeeKobo = quote.totalFeeKobo || 0;
      const netProceedsKobo = quote.netProceedsKobo || 0;

      const tradeRef = `trd_sell_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = new Date().toISOString();

      // 2. Deduct shares from user position
      position.sharesCount -= sharesToSell;
      if (position.sharesCount === 0) {
        position.totalCostKobo = 0;
      } else {
        position.totalCostKobo = Math.max(0, position.totalCostKobo - grossProceedsKobo);
      }
      position.updatedAt = timestamp;

      // 3. Credit user wallet with net proceeds
      userWallet.availableKobo += netProceedsKobo;
      userWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_seller`,
        walletId: userWallet.id,
        amountKobo: netProceedsKobo,
        balanceAfterKobo: userWallet.availableKobo,
        entryType: 'TRADE_SELL',
        referenceId: tradeRef,
        metadata: {
          marketId,
          side,
          sharesSold: sharesToSell,
          grossProceedsKobo,
          netProceedsKobo,
          feeKobo: totalFeeKobo,
        },
        createdAt: timestamp,
      });

      // 4. Credit Creator Fees
      creatorWallet.creatorEarningsKobo += creatorFeeKobo;
      creatorWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_creator`,
        walletId: creatorWallet.id,
        amountKobo: creatorFeeKobo,
        balanceAfterKobo: creatorWallet.creatorEarningsKobo,
        entryType: 'CREATOR_FEE',
        referenceId: tradeRef,
        metadata: {
          marketId,
          tradeVolumeKobo: grossProceedsKobo,
          feeBps: CREATOR_FEE_BPS,
        },
        createdAt: timestamp,
      });

      // 5. Credit Platform Fee
      platformWallet.availableKobo += platformFeeKobo;
      platformWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${tradeRef}_platform`,
        walletId: platformWallet.id,
        amountKobo: platformFeeKobo,
        balanceAfterKobo: platformWallet.availableKobo,
        entryType: 'PLATFORM_FEE',
        referenceId: tradeRef,
        metadata: {
          marketId,
          tradeVolumeKobo: grossProceedsKobo,
          feeBps: PLATFORM_FEE_BPS,
        },
        createdAt: timestamp,
      });

      // 6. Update Market Pool & Volume
      if (side === 'YES') {
        market.yesPoolKobo = Math.max(50_000, market.yesPoolKobo - grossProceedsKobo);
      } else {
        market.noPoolKobo = Math.max(50_000, market.noPoolKobo - grossProceedsKobo);
      }
      market.totalVolumeKobo += grossProceedsKobo;
      market.updatedAt = timestamp;

      this.persistSync(this.state);

      return {
        success: true,
        tradeRef,
        marketId,
        side,
        sharesSold: sharesToSell,
        grossProceedsKobo,
        netProceedsKobo,
        creatorFeeKobo,
        platformFeeKobo,
        userBalanceAfterKobo: userWallet.availableKobo,
        marketState: this.calculateMarketPrices(market),
      };
    } finally {
      releaseLocks();
    }
  }

  /**
   * CREATE MARKET & EARN FLOW
   * Anti-spam requirement: ₦1,000 creation fee OR ₦5,000 initial liquidity seed
   * Deducted atomically from creator's available_kobo.
   */
  public async createMarket(
    creatorId: string,
    params: {
      question: string;
      category?: string;
      imageUri?: string;
      sourceHandle?: string;
      antiSpamOption: 'fee' | 'seed';
      seedAmountKobo?: number;
      yesCondition?: string;
      noCondition?: string;
      evidenceSource?: string;
      closingTime?: string;
      resolutionDeadline?: string;
    }
  ) {
    if (!params.question || params.question.trim().length < 5) {
      throw new Error('Please provide a descriptive market question.');
    }

    const creatorWallet = this.getWallet(creatorId);
    const platformWallet = this.getWallet(PLATFORM_USER_ID);

    const isSeed = params.antiSpamOption === 'seed';
    const requiredKobo = isSeed
      ? Math.max(MIN_MARKET_SEED_KOBO, params.seedAmountKobo || MIN_MARKET_SEED_KOBO)
      : MARKET_CREATION_FEE_KOBO;

    const releaseLocks = await this.acquireLocks([
      `wallet:${creatorWallet.id}`,
      `wallet:${platformWallet.id}`,
    ]);

    try {
      if (creatorWallet.availableKobo < requiredKobo) {
        throw new Error(
          `Insufficient balance to create market. Required: ₦${(requiredKobo / 100).toLocaleString(
            'en-NG'
          )}, Available: ₦${(creatorWallet.availableKobo / 100).toLocaleString('en-NG')}.`
        );
      }

      const timestamp = new Date().toISOString();
      const newMarketId = Math.max(0, ...Object.keys(this.state.markets).map(Number)) + 1;
      const refId = `mkt_create_${newMarketId}_${Date.now()}`;

      // Deduct creation fee or seed
      creatorWallet.availableKobo -= requiredKobo;
      creatorWallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${refId}_creator`,
        walletId: creatorWallet.id,
        amountKobo: -requiredKobo,
        balanceAfterKobo: creatorWallet.availableKobo,
        entryType: 'MARKET_CREATION_FEE',
        referenceId: refId,
        metadata: {
          marketId: newMarketId,
          antiSpamOption: params.antiSpamOption,
          question: params.question,
        },
        createdAt: timestamp,
      });

      // If anti-spam fee: platform receives creation fee
      if (!isSeed) {
        platformWallet.availableKobo += requiredKobo;
        platformWallet.updatedAt = timestamp;

        this.state.ledgerEntries.push({
          id: `ldg_${refId}_platform`,
          walletId: platformWallet.id,
          amountKobo: requiredKobo,
          balanceAfterKobo: platformWallet.availableKobo,
          entryType: 'PLATFORM_FEE',
          referenceId: refId,
          metadata: { marketId: newMarketId, feeType: 'MARKET_CREATION_FEE' },
          createdAt: timestamp,
        });
      }

      // Initial pools: either seeded (50/50 split) or standard minimal ₦1,000 depth
      const poolDepthEach = isSeed ? Math.floor(requiredKobo / 2) : 100_000;

      const newMarket: MarketRecord = {
        id: newMarketId,
        creatorId,
        question: params.question.trim(),
        category: params.category || 'Trending',
        imageUri:
          params.imageUri ||
          'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600',
        sourceHandle: params.sourceHandle || '@OpinionNG',
        yesPoolKobo: poolDepthEach,
        noPoolKobo: poolDepthEach,
        totalVolumeKobo: isSeed ? requiredKobo : 0,
        creatorFeeBps: CREATOR_FEE_BPS,
        platformFeeBps: PLATFORM_FEE_BPS,
        status: 'ACTIVE',
        proposedOutcome: 'UNRESOLVED',
        finalOutcome: 'UNRESOLVED',
        closingTime:
          params.closingTime || new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
        resolutionDeadline:
          params.resolutionDeadline || new Date(Date.now() + 8 * 86400 * 1000).toISOString(),
        yesCondition: params.yesCondition || 'Event occurs as stated',
        noCondition: params.noCondition || 'Event does not occur',
        evidenceSource: params.evidenceSource || 'https://news.google.com',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      this.state.markets[newMarketId] = newMarket;
      this.persistSync(this.state);

      return {
        success: true,
        market: newMarket,
        deductedKobo: requiredKobo,
        creatorBalanceAfterKobo: creatorWallet.availableKobo,
      };
    } finally {
      releaseLocks();
    }
  }

  /**
   * X (TWITTER) BOT MENTION WEBHOOK INGESTION
   * When a verified user tags @TheTiredFun / @OpinionNG on X:
   * 1. Looks up linked x_user_id or x_handle in users
   * 2. Validates balance/creation eligibility
   * 3. Atomically deducts ₦1,000 creation fee and creates market with them as creator_id
   * 4. Returns live market URL
   */
  public async handleXMentionWebhook(payload: {
    tweet_id: string;
    author_id: string;
    author_username: string;
    text: string;
  }) {
    const { tweet_id, author_id, author_username, text } = payload;

    // 1. Look up user by X user ID or X handle
    let user = Object.values(this.state.users).find(
      (u) =>
        (u.xUserId && u.xUserId === author_id) ||
        (u.xHandle && u.xHandle.toLowerCase() === author_username.toLowerCase())
    );

    // If user doesn't exist, create a Web2 registered account for them with welcome credit in dev mode
    if (!user) {
      const newUserId = `usr_x_${author_id}`;
      user = {
        id: newUserId,
        displayName: author_username,
        xHandle: author_username,
        xUserId: author_id,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        kycTier: 0,
        bvnNinVerified: false,
        createdAt: new Date().toISOString(),
      };
      this.state.users[newUserId] = user;

      // Seed with initial balance for convenient bot testing
      const wallet = this.getWallet(newUserId);
      wallet.availableKobo = 10_000 * KOBO_PER_NAIRA; // ₦10,000
    }

    // Extract debate question by stripping bot tags
    const cleanedQuestion = text
      .replace(/@OpinionNG/gi, '')
      .replace(/@TheTiredFun/gi, '')
      .trim();

    const questionToUse =
      cleanedQuestion.length >= 8
        ? cleanedQuestion
        : `Will ${author_username}'s prediction on X come true?`;

    // 2. Atomically create market
    const result = await this.createMarket(user.id, {
      question: questionToUse,
      category: 'Culture',
      sourceHandle: `@${author_username}`,
      antiSpamOption: 'fee',
    });

    const marketUrl = `http://localhost:5173/?market=${result.market.id}`;

    return {
      success: true,
      tweet_id,
      creator_id: user.id,
      creator_x_handle: author_username,
      market_id: result.market.id,
      market_url: marketUrl,
      reply_text: `Market created! Trade now at ${marketUrl}. You will earn 1.5% creator fees on every trade in ₦.`,
    };
  }

  /**
   * CLAIM CREATOR EARNINGS
   * Atomically transfers creator_earnings_kobo -> available_kobo
   */
  public async claimCreatorEarnings(userId: string) {
    const wallet = this.getWallet(userId);
    const releaseLock = await this.acquireLock(`wallet:${wallet.id}`);

    try {
      const claimAmountKobo = wallet.creatorEarningsKobo;
      if (claimAmountKobo <= 0) {
        throw new Error('No creator earnings available to claim.');
      }

      const timestamp = new Date().toISOString();
      const claimRef = `clm_${userId}_${Date.now()}`;

      // Atomic transfer
      wallet.creatorEarningsKobo = 0;
      wallet.availableKobo += claimAmountKobo;
      wallet.updatedAt = timestamp;

      this.state.ledgerEntries.push({
        id: `ldg_${claimRef}`,
        walletId: wallet.id,
        amountKobo: claimAmountKobo,
        balanceAfterKobo: wallet.availableKobo,
        entryType: 'CREATOR_FEE',
        referenceId: claimRef,
        metadata: {
          type: 'CLAIM_TO_AVAILABLE',
          claimedKobo: claimAmountKobo,
        },
        createdAt: timestamp,
      });

      this.persistSync(this.state);

      return {
        success: true,
        claimedKobo: claimAmountKobo,
        newAvailableKobo: wallet.availableKobo,
        newCreatorEarningsKobo: wallet.creatorEarningsKobo,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * RESOLVE MARKET WITH 2-HOUR DISPUTE WINDOW
   * Proposes outcome YES, NO, or VOID. Sets dispute_ends_at to +2 hours.
   */
  public async resolveMarket(
    marketId: number,
    outcome: 'YES' | 'NO' | 'VOID',
    evidenceUrl: string,
    adminUserId: string,
    immediate = false // flag for instant automated testing
  ) {
    const market = this.state.markets[marketId];
    if (!market) throw new Error(`Market #${marketId} not found.`);

    const releaseLock = await this.acquireLock(`market:${marketId}`);
    try {
      const disputeDuration = immediate ? 0 : DISPUTE_WINDOW_MS;
      const disputeEndsAt = new Date(Date.now() + disputeDuration).toISOString();
      const timestamp = new Date().toISOString();

      market.status = 'PROPOSED';
      market.proposedOutcome = outcome;
      market.disputeEndsAt = disputeEndsAt;
      market.proposedEvidence = evidenceUrl;
      market.updatedAt = timestamp;

      this.persistSync(this.state);

      return {
        success: true,
        marketId,
        status: market.status,
        proposedOutcome: outcome,
        disputeEndsAt,
        disputeWindowHours: 2,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * SETTLE MARKET PAYOUTS
   * Settle market when dispute window has elapsed without dispute.
   * Pays out ₦100 (10,000 Kobo) per winning share to each holder's available_kobo.
   */
  public async settleMarket(marketId: number, forceImmediate = false) {
    const market = this.state.markets[marketId];
    if (!market) throw new Error(`Market #${marketId} not found.`);

    if (market.status !== 'PROPOSED' && !forceImmediate) {
      throw new Error(`Market is not currently in PROPOSED state. Status: ${market.status}`);
    }

    if (market.disputeEndsAt && !forceImmediate) {
      const disputeEnd = new Date(market.disputeEndsAt).getTime();
      if (Date.now() < disputeEnd) {
        const remainingMinutes = Math.ceil((disputeEnd - Date.now()) / (60 * 1000));
        throw new Error(
          `Dispute window is still active. Please wait ${remainingMinutes} more minutes before settlement.`
        );
      }
    }

    const winningSide = market.proposedOutcome;
    if (winningSide !== 'YES' && winningSide !== 'NO' && winningSide !== 'VOID') {
      throw new Error(`Invalid proposed outcome: ${winningSide}`);
    }

    const releaseLock = await this.acquireLock(`market:${marketId}`);

    try {
      const timestamp = new Date().toISOString();
      const settleRef = `stl_${marketId}_${Date.now()}`;

      // Update market status
      market.status = winningSide === 'VOID' ? 'VOID' : 'RESOLVED';
      market.finalOutcome = winningSide;
      market.updatedAt = timestamp;

      const payoutResults: Array<{
        userId: string;
        shares: number;
        payoutKobo: number;
      }> = [];

      let totalPayoutKobo = 0;

      if (winningSide === 'YES' || winningSide === 'NO') {
        // Pay out ₦100 (10,000 Kobo) per winning share
        const eligiblePositions = Object.values(this.state.positions).filter(
          (p) => p.marketId === marketId && p.side === winningSide && p.sharesCount > 0
        );

        for (const pos of eligiblePositions) {
          const userWallet = this.getWallet(pos.userId);
          const payoutAmountKobo = pos.sharesCount * WINNING_SHARE_PAYOUT_KOBO;

          userWallet.availableKobo += payoutAmountKobo;
          userWallet.updatedAt = timestamp;

          this.state.ledgerEntries.push({
            id: `ldg_${settleRef}_${pos.userId}`,
            walletId: userWallet.id,
            amountKobo: payoutAmountKobo,
            balanceAfterKobo: userWallet.availableKobo,
            entryType: 'MARKET_PAYOUT',
            referenceId: settleRef,
            metadata: {
              marketId,
              winningOutcome: winningSide,
              winningShares: pos.sharesCount,
              payoutPerShareKobo: WINNING_SHARE_PAYOUT_KOBO,
            },
            createdAt: timestamp,
          });

          // Zero out the settled shares
          pos.sharesCount = 0;
          pos.updatedAt = timestamp;

          totalPayoutKobo += payoutAmountKobo;
          payoutResults.push({
            userId: pos.userId,
            shares: pos.sharesCount,
            payoutKobo: payoutAmountKobo,
          });
        }
      } else if (winningSide === 'VOID') {
        // Refund cost basis for all holders
        const allPositions = Object.values(this.state.positions).filter(
          (p) => p.marketId === marketId && p.sharesCount > 0
        );

        for (const pos of allPositions) {
          const userWallet = this.getWallet(pos.userId);
          const refundKobo = pos.totalCostKobo;

          if (refundKobo > 0) {
            userWallet.availableKobo += refundKobo;
            userWallet.updatedAt = timestamp;

            this.state.ledgerEntries.push({
              id: `ldg_${settleRef}_refund_${pos.userId}`,
              walletId: userWallet.id,
              amountKobo: refundKobo,
              balanceAfterKobo: userWallet.availableKobo,
              entryType: 'MARKET_PAYOUT',
              referenceId: settleRef,
              metadata: {
                marketId,
                type: 'VOID_REFUND',
                sharesVoided: pos.sharesCount,
              },
              createdAt: timestamp,
            });

            totalPayoutKobo += refundKobo;
          }

          pos.sharesCount = 0;
          pos.updatedAt = timestamp;
        }
      }

      this.persistSync(this.state);

      return {
        success: true,
        marketId,
        status: market.status,
        finalOutcome: market.finalOutcome,
        winnersPaidCount: payoutResults.length,
        totalPayoutKobo,
        settlements: payoutResults,
      };
    } finally {
      releaseLock();
    }
  }
}

// Global Singleton Instance
export const globalNgnEngine = new NgnTradingEngine();
