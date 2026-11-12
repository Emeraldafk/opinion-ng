-- ============================================================================
-- OpinionNG PostgreSQL / Supabase Off-Chain Schema & Double-Entry Ledger
-- All currency values are stored as 64-bit BIGINT in Kobo (1 NGN = 100 Kobo).
-- Share price scale: 100 to 10,000 Kobo (₦1.00 to ₦100.00).
-- Winning share payout: 10,000 Kobo (₦100.00).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entry type ENUM for double-entry immutable audit ledger
CREATE TYPE ledger_entry_type AS ENUM (
  'DEPOSIT',
  'TRADE_BUY',
  'TRADE_SELL',
  'MARKET_PAYOUT',
  'CREATOR_FEE',
  'MARKET_CREATION_FEE',
  'WITHDRAWAL',
  'WITHDRAWAL_REFUND'
);

-- Market and outcome status ENUMs
CREATE TYPE market_status AS ENUM (
  'ACTIVE',
  'CLOSED',
  'PROPOSED',
  'DISPUTED',
  'RESOLVED',
  'VOID'
);

CREATE TYPE market_outcome AS ENUM (
  'UNRESOLVED',
  'YES',
  'NO',
  'VOID'
);

CREATE TYPE market_side AS ENUM (
  'YES',
  'NO'
);

-- ============================================================================
-- 1. USERS TABLE
-- Supports Web2 authentication (Email OTP, Phone OTP) and X (Twitter) OAuth
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  x_handle VARCHAR(64) UNIQUE,
  x_user_id VARCHAR(64) UNIQUE,
  display_name VARCHAR(128),
  avatar_url TEXT,
  kyc_tier SMALLINT NOT NULL DEFAULT 0, -- 0: Unverified, 1: BVN/NIN, 2: Proof of Address
  bvn_nin_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. WALLETS TABLE
-- Dedicated NGN fiat wallet per user with segregated locked and creator balances
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available_kobo BIGINT NOT NULL DEFAULT 0 CHECK (available_kobo >= 0),
  locked_kobo BIGINT NOT NULL DEFAULT 0 CHECK (locked_kobo >= 0),
  creator_earnings_kobo BIGINT NOT NULL DEFAULT 0 CHECK (creator_earnings_kobo >= 0),
  virtual_account_number VARCHAR(32),
  virtual_account_bank VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. LEDGER ENTRIES TABLE (IMMUTABLE AUDIT LOG)
-- Double-entry transaction journal. Every debit/credit to any wallet MUST produce
-- an immutable record here with signed amount_kobo and resulting balance_after_kobo.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL, -- positive for credits (deposits/payouts), negative for debits (buys/withdrawals)
  balance_after_kobo BIGINT NOT NULL CHECK (balance_after_kobo >= 0),
  entry_type ledger_entry_type NOT NULL,
  reference_id VARCHAR(128) NOT NULL, -- External payment ref (Paystack/Monnify) or internal trade/market UUID
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet_id ON ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON ledger_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at DESC);

-- ============================================================================
-- 4. MARKETS TABLE
-- Adapted from OpinionMarket: supports NGN liquidity pools & creator economics
-- ============================================================================
CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  question TEXT NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'Trending',
  image_uri TEXT,
  source_handle VARCHAR(64),
  yes_pool_kobo BIGINT NOT NULL DEFAULT 0,
  no_pool_kobo BIGINT NOT NULL DEFAULT 0,
  total_volume_kobo BIGINT NOT NULL DEFAULT 0,
  creator_fee_bps INTEGER NOT NULL DEFAULT 150, -- 1.5% (150 basis points)
  platform_fee_bps INTEGER NOT NULL DEFAULT 150, -- 1.5% (150 basis points)
  status market_status NOT NULL DEFAULT 'ACTIVE',
  final_outcome market_outcome NOT NULL DEFAULT 'UNRESOLVED',
  closing_time TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  yes_condition TEXT,
  no_condition TEXT,
  evidence_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_creator_id ON markets(creator_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_total_volume ON markets(total_volume_kobo DESC);

-- ============================================================================
-- 5. POSITIONS TABLE
-- User share balances per outcome side
-- ============================================================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side market_side NOT NULL,
  shares_count BIGINT NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  total_cost_kobo BIGINT NOT NULL DEFAULT 0 CHECK (total_cost_kobo >= 0),
  avg_price_kobo BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_market_side UNIQUE (user_id, market_id, side)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);

