import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  DEFAULT_DEMO_BALANCE_KOBO,
  KOBO_PER_NAIRA,
  formatNGN,
  koboToNaira,
  nairaToKobo,
} from '../lib/currency';
import { apiClient } from '../lib/apiClient';

export interface AppUser {
  id: string;
  email?: string;
  phone?: string;
  xHandle?: string;
  displayName: string;
  avatarUrl: string;
  kycTier: number; // 0: None, 1: BVN/NIN, 2: Full
  bvnNinVerified: boolean;
  virtualAccount?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  };
}

export interface AppWallet {
  availableKobo: number; // Stored as integer Kobo
  lockedKobo: number;
  creatorEarningsKobo: number;
}

export interface AuthContextType {
  user: AppUser | null;
  wallet: AppWallet;
  isAuthenticated: boolean;
  isSignInModalOpen: boolean;
  isDepositModalOpen: boolean;
  isWithdrawModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
  openDepositModal: () => void;
  closeDepositModal: () => void;
  openWithdrawModal: () => void;
  closeWithdrawModal: () => void;
  loginWithEmail: (email: string, otp?: string) => Promise<boolean>;
  loginWithPhone: (phone: string, otp?: string) => Promise<boolean>;
  loginWithX: (handle?: string) => Promise<boolean>;
  signUp: (params: {
    fullName: string;
    emailOrPhone: string;
    password?: string;
    xHandle?: string;
  }) => Promise<boolean>;
  loginDemoUser: () => void;
  switchUserAccount: (userId: string) => void;
  logout: () => void;
  depositKobo: (kobo: number, reference?: string) => Promise<boolean>;
  withdrawKobo: (kobo: number, bankDetails?: any) => Promise<boolean>;
  deductKoboForTrade: (kobo: number) => boolean;
  creditKoboForTrade: (kobo: number) => void;
  creditCreatorEarningsKobo: (kobo: number) => void;
  claimCreatorEarnings: () => Promise<number>;
  syncWithBackend: () => Promise<void>;
}

const STORAGE_KEYS = {
  USER: 'opinion_ng_user_v2',
  WALLET: 'opinion_ng_wallet_v2',
};

export const PRESET_ACCOUNTS: AppUser[] = [
  {
    id: 'usr_demo_893240',
    email: 'trader@opinion.ng',
    phone: '+2348012345678',
    xHandle: 'opinion_trader',
    displayName: 'Tunde Afolabi',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    kycTier: 1,
    bvnNinVerified: true,
    virtualAccount: {
      accountNumber: '9920194821',
      bankName: 'Wema Bank (OpinionNG)',
      accountName: 'OPINION-NG / TUNDE AFOLABI',
    },
  },
  {
    id: 'usr_creator_burna',
    email: 'curator@opinion.ng',
    phone: '+2348098765432',
    xHandle: 'BurnaBoyFanClub',
    displayName: 'NaijaPopCurator',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    kycTier: 2,
    bvnNinVerified: true,
    virtualAccount: {
      accountNumber: '9920198834',
      bankName: 'Wema Bank (OpinionNG)',
      accountName: 'OPINION-NG / NAIJAPOPCURATOR',
    },
  },
];

export const DEFAULT_DEMO_USER: AppUser = PRESET_ACCOUNTS[0];

function formatAppUser(backendUser: any, backendWallet?: any): AppUser {
  return {
    id: backendUser.id,
    email: backendUser.email,
    phone: backendUser.phone,
    xHandle: backendUser.xHandle,
    displayName: backendUser.displayName || 'Opinion Trader',
    avatarUrl: backendUser.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(backendUser.id)}`,
    kycTier: backendUser.kycTier ?? 1,
    bvnNinVerified: backendUser.bvnNinVerified ?? true,
    virtualAccount: {
      accountNumber: backendUser.virtualAccountNumber || backendWallet?.virtualAccountNumber || '9920194821',
      bankName: backendUser.virtualAccountBank || backendWallet?.virtualAccountBank || 'Wema Bank (OpinionNG)',
      accountName: backendUser.virtualAccountName || `OPINION-NG / ${(backendUser.displayName || 'TRADER').toUpperCase()}`,
    },
  };
}

function formatAppWallet(backendWallet?: any): AppWallet {
  return {
    availableKobo: Number(backendWallet?.availableKobo ?? DEFAULT_DEMO_BALANCE_KOBO),
    lockedKobo: Number(backendWallet?.lockedKobo ?? 0),
    creatorEarningsKobo: Number(backendWallet?.creatorEarningsKobo ?? 0),
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  const [wallet, setWallet] = useState<AppWallet>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WALLET);
      if (saved) return JSON.parse(saved);
      return {
        availableKobo: DEFAULT_DEMO_BALANCE_KOBO, // ₦10,000 in Kobo (1,000,000)
        lockedKobo: 0,
        creatorEarningsKobo: 25_000 * KOBO_PER_NAIRA, // ₦250 creator earnings
      };
    } catch {
      return {
        availableKobo: DEFAULT_DEMO_BALANCE_KOBO,
        lockedKobo: 0,
        creatorEarningsKobo: 25_000 * KOBO_PER_NAIRA,
      };
    }
  });

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Restore live session from backend on initial mount
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const session = await apiClient.getSession();
        if (!isMounted) return;
        if (session && session.user) {
          setUser(formatAppUser(session.user, session.wallet));
          setWallet(formatAppWallet(session.wallet));
        } else {
          // If no active token in backend, clear local user to enforce login gate
          const token = apiClient.getSessionToken();
          if (!token) {
            setUser(null);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
  }, [wallet]);

  const openSignInModal = () => setIsSignInModalOpen(true);
  const closeSignInModal = () => setIsSignInModalOpen(false);
  const openDepositModal = () => setIsDepositModalOpen(true);
  const closeDepositModal = () => setIsDepositModalOpen(false);
  const openWithdrawModal = () => setIsWithdrawModalOpen(true);
  const closeWithdrawModal = () => setIsWithdrawModalOpen(false);

  const signUp = async (params: {
    fullName: string;
    emailOrPhone: string;
    password?: string;
    xHandle?: string;
  }): Promise<boolean> => {
    try {
      const data = await apiClient.register(params);
      setUser(formatAppUser(data.user, data.wallet));
      setWallet(formatAppWallet(data.wallet));
      closeSignInModal();
      return true;
    } catch (err: any) {
      console.error('[SignUp Error]:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, otp?: string): Promise<boolean> => {
    try {
      const data = await apiClient.login({
        identifier: email,
        password: otp || 'password123',
        otp,
      });
      setUser(formatAppUser(data.user, data.wallet));
      setWallet(formatAppWallet(data.wallet));
      closeSignInModal();
      return true;
    } catch (err: any) {
      console.error('[Login Error]:', err);
      throw err;
    }
  };

  const loginWithPhone = async (phone: string, otp?: string): Promise<boolean> => {
    try {
      const data = await apiClient.login({
        identifier: phone,
        password: otp || 'password123',
        otp,
      });
      setUser(formatAppUser(data.user, data.wallet));
      setWallet(formatAppWallet(data.wallet));
      closeSignInModal();
      return true;
    } catch (err: any) {
      console.error('[Login Error]:', err);
      throw err;
    }
  };

  const loginWithX = async (handle: string = 'crypto_sage'): Promise<boolean> => {
    try {
      const data = await apiClient.loginWithX({ handle });
      setUser(formatAppUser(data.user, data.wallet));
      setWallet(formatAppWallet(data.wallet));
      closeSignInModal();
      return true;
    } catch (err: any) {
      console.error('[X Auth Error]:', err);
      throw err;
    }
  };

  const loginDemoUser = async () => {
    try {
      const data = await apiClient.login({
        identifier: 'trader@opinion.ng',
        password: 'password123',
      });
      setUser(formatAppUser(data.user, data.wallet));
      setWallet(formatAppWallet(data.wallet));
    } catch {
      setUser(DEFAULT_DEMO_USER);
    }
    closeSignInModal();
  };

  const switchUserAccount = async (userId: string) => {
    const target = PRESET_ACCOUNTS.find((a) => a.id === userId);
    if (target) {
      try {
        const data = await apiClient.login({
          identifier: target.email || target.xHandle || target.id,
          password: 'password123',
          otp: '123456',
        });
        setUser(formatAppUser(data.user, data.wallet));
        setWallet(formatAppWallet(data.wallet));
      } catch {
        setUser(target);
      }
    }
  };

  const logout = () => {
    apiClient.logout();
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.WALLET);
    setUser(null);
  };

  const depositKobo = async (kobo: number, reference?: string): Promise<boolean> => {
    if (kobo <= 0) return false;

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || DEFAULT_DEMO_USER.id,
          amountKobo: kobo,
          referenceId: reference,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWallet((prev) => ({
          ...prev,
          availableKobo: data.userBalanceAfterKobo,
        }));
        return true;
      }
    } catch {
      // Local fallback
    }

    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo + kobo,
    }));
    return true;
  };

  const withdrawKobo = async (kobo: number, bankDetails?: any): Promise<boolean> => {
    if (kobo <= 0 || wallet.availableKobo < kobo) return false;

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || DEFAULT_DEMO_USER.id,
          amountKobo: kobo,
          bankName: bankDetails?.bankName,
          accountNumber: bankDetails?.accountNumber,
          accountName: bankDetails?.accountName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWallet((prev) => ({
          ...prev,
          availableKobo: data.userBalanceAfterKobo,
        }));
        return true;
      }
    } catch {
      // Local fallback
    }

    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo - kobo,
    }));
    return true;
  };

  const deductKoboForTrade = (kobo: number): boolean => {
    if (kobo <= 0) return false;
    if (wallet.availableKobo < kobo) return false;
    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo - kobo,
    }));
    return true;
  };

  const creditKoboForTrade = (kobo: number) => {
    if (kobo <= 0) return;
    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo + kobo,
    }));
  };

  const creditCreatorEarningsKobo = (kobo: number) => {
    if (kobo <= 0) return;
    setWallet((prev) => ({
      ...prev,
      creatorEarningsKobo: prev.creatorEarningsKobo + kobo,
    }));
  };

  const syncWithBackend = async () => {
    try {
      const data = await apiClient.getMe(user?.id);
      if (data && data.wallet) {
        setWallet({
          availableKobo: Number(data.wallet.availableKobo),
          lockedKobo: Number(data.wallet.lockedKobo || 0),
          creatorEarningsKobo: Number(data.wallet.creatorEarningsKobo || 0),
        });
      }
      if (data && data.user) {
        setUser((prev) => (prev ? { ...prev, ...formatAppUser(data.user, data.wallet) } : prev));
      }
    } catch {
      // Offline fallback silently keeps local state
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, [user?.id]);

  const claimCreatorEarnings = async (): Promise<number> => {
    const claimable = wallet.creatorEarningsKobo;
    if (claimable <= 0) return 0;

    try {
      const res = await fetch('/api/creator/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || DEFAULT_DEMO_USER.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setWallet((prev) => ({
          ...prev,
          availableKobo: data.newAvailableKobo,
          creatorEarningsKobo: data.newCreatorEarningsKobo,
        }));
        return data.claimedKobo;
      }
    } catch {
      // Local fallback
    }

    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo + claimable,
      creatorEarningsKobo: 0,
    }));
    return claimable;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isAuthenticated: !!user,
        isSignInModalOpen,
        isDepositModalOpen,
        isWithdrawModalOpen,
        openSignInModal,
        closeSignInModal,
        openDepositModal,
        closeDepositModal,
        openWithdrawModal,
        closeWithdrawModal,
        loginWithEmail,
        loginWithPhone,
        loginWithX,
        signUp,
        loginDemoUser,
        switchUserAccount,
        logout,
        depositKobo,
        withdrawKobo,
        deductKoboForTrade,
        creditKoboForTrade,
        creditCreatorEarningsKobo,
        claimCreatorEarnings,
        syncWithBackend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAppAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAppAuth must be used within an AuthProvider');
  }
  return context;
};

