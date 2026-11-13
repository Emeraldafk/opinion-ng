/**
 * OpinionNG Unified API Client
 * Connects frontend UI components directly to the live atomic NGN Trading Engine.
 */

import { KOBO_PER_NAIRA, MAX_SHARE_PAYOUT_KOBO as WINNING_SHARE_PAYOUT_KOBO } from './currency';

export const DEMO_USER_ID = 'usr_demo_893240';
export const OPINION_NG_SESSION_KEY = 'opinion_ng_session_token_v1';

export interface TradeQuoteResult {
  isBuy: boolean;
  side: 'YES' | 'NO';
  grossAmountKobo: number;
  netAmountKobo: number;
  creatorFeeKobo: number;
  platformFeeKobo: number;
  totalFeeKobo: number;
  startPriceKobo: number;
  avgPriceKobo: number;
  endPriceKobo?: number;
  estimatedShares: number;
  potentialPayoutKobo: number;
  potentialProfitKobo: number;
  currentProbabilityPct: number;
  newProbabilityPct: number;
  sharesToSell?: number;
  grossProceedsKobo?: number;
  netProceedsKobo?: number;
}

export interface TradeExecutionResult {
  success: boolean;
  tradeRef: string;
  marketId: number;
  side: 'YES' | 'NO';
  sharesReceived?: number;
  sharesSold?: number;
  avgPriceKobo: number;
  grossAmountKobo?: number;
  netAmountKobo?: number;
  grossProceedsKobo?: number;
  netProceedsKobo?: number;
  creatorFeeKobo: number;
  platformFeeKobo: number;
  userBalanceAfterKobo: number;
  creatorEarningsAfterKobo?: number;
  marketState: {
    yesPriceKobo: number;
    noPriceKobo: number;
    yesPct: number;
    noPct: number;
  };
}

class ApiClient {
  public getSessionToken(): string | null {
    try {
      return localStorage.getItem(OPINION_NG_SESSION_KEY);
    } catch {
      return null;
    }
  }

  public setSessionToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(OPINION_NG_SESSION_KEY, token);
      } else {
        localStorage.removeItem(OPINION_NG_SESSION_KEY);
      }
    } catch {}
  }

  private getHeaders(userId?: string): HeadersInit {
    const token = this.getSessionToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'x-user-id': userId || DEMO_USER_ID,
    };
  }

  public async register(params: {
    fullName: string;
    emailOrPhone: string;
    password?: string;
    xHandle?: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed');
    }
    if (data.token) {
      this.setSessionToken(data.token);
    }
    return data;
  }

  public async login(params: {
    identifier: string;
    password?: string;
    otp?: string;
  }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    if (data.token) {
      this.setSessionToken(data.token);
    }
    return data;
  }

  public async loginWithX(params: { handle: string }) {
    const res = await fetch('/api/auth/x-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'X authentication failed');
    }
    if (data.token) {
      this.setSessionToken(data.token);
    }
    return data;
  }

  public async getSession() {
    const token = this.getSessionToken();
    if (!token) return null;
    const res = await fetch('/api/auth/session', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      this.setSessionToken(null);
      return null;
    }
    return res.json();
  }

  public async logout() {
    const token = this.getSessionToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders(),
      }).catch(() => {});
    }
    this.setSessionToken(null);
  }

  public async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  }

  public async getMe(userId?: string) {
    const uid = userId || DEMO_USER_ID;
    const res = await fetch(`/api/user/me?userId=${encodeURIComponent(uid)}`, {
      headers: this.getHeaders(uid),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user state');
    }
    return res.json();
  }

  public async getQuote(params: {
    marketId: number;
    side: 'YES' | 'NO';
    isBuy: boolean;
    amount: number; // in Kobo if buy, in shares if sell
  }): Promise<TradeQuoteResult> {
    const res = await fetch('/api/trades/quote', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate trade quote');
    }
    return res.json();
  }

  public async buyShares(params: {
    userId?: string;
    marketId: number;
    side: 'YES' | 'NO';
    grossAmountKobo: number;
    slippagePct?: number;
  }): Promise<TradeExecutionResult> {
    const res = await fetch('/api/trades/buy', {
      method: 'POST',
      headers: this.getHeaders(params.userId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute buy order');
    }
    return res.json();
  }

  public async sellShares(params: {
    userId?: string;
    marketId: number;
    side: 'YES' | 'NO';
    sharesCount: number;
    slippagePct?: number;
  }): Promise<TradeExecutionResult> {
    const res = await fetch('/api/trades/sell', {
      method: 'POST',
      headers: this.getHeaders(params.userId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute sell order');
    }
    return res.json();
  }

  public async createMarket(params: {
    creatorId?: string;
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
  }) {
    const res = await fetch('/api/markets/create', {
      method: 'POST',
      headers: this.getHeaders(params.creatorId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create market');
    }
    return res.json();
  }

  public async triggerXMentionBot(params: {
    tweet_id?: string;
    author_id: string;
    author_username: string;
    text: string;
  }) {
    const res = await fetch('/api/webhooks/x-mentions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'X webhook execution failed');
    }
    return res.json();
  }

  public async claimCreatorEarnings(userId?: string) {
    const res = await fetch('/api/creator/claim', {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to claim creator earnings');
    }
    return res.json();
  }

  public async deposit(params: {
    userId?: string;
    amountKobo: number;
    channel?: string;
    referenceId?: string;
  }) {
    const res = await fetch('/api/wallet/deposit', {
      method: 'POST',
      headers: this.getHeaders(params.userId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Deposit failed');
    }
    return res.json();
  }

  public async withdraw(params: {
    userId?: string;
    amountKobo: number;
    bankCode?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) {
    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: this.getHeaders(params.userId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Withdrawal failed');
    }
    return res.json();
  }

  public async resolveMarket(params: {
    marketId: number;
    outcome: 'YES' | 'NO' | 'VOID';
    evidenceUrl?: string;
    adminUserId?: string;
    immediate?: boolean;
  }) {
    const res = await fetch(`/api/markets/${params.marketId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(params.adminUserId),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resolve market');
    }
    return res.json();
  }

  public async settleMarket(params: {
    marketId: number;
    forceImmediate?: boolean;
  }) {
    const res = await fetch(`/api/markets/${params.marketId}/settle`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to settle market payouts');
    }
    return res.json();
  }

  public async getLedger(userId?: string) {
    const res = await fetch(`/api/ledger`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch ledger');
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
