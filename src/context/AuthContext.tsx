import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  DEFAULT_DEMO_BALANCE_KOBO,
  KOBO_PER_NAIRA,
  formatNGN,
  koboToNaira,
  nairaToKobo,
} from '../lib/currency';

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
  openSignInModal: () => void;
  closeSignInModal: () => void;
  openDepositModal: () => void;
  closeDepositModal: () => void;
  loginWithEmail: (email: string, otp?: string) => Promise<boolean>;
  loginWithPhone: (phone: string, otp?: string) => Promise<boolean>;
  loginWithX: (handle?: string) => Promise<boolean>;
  loginDemoUser: () => void;
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
  USER: 'opinion_ng_user_v1',
  WALLET: 'opinion_ng_wallet_v1',
};

const DEFAULT_DEMO_USER: AppUser = {
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
      // Default to demo authenticated user for seamless first boot
      return DEFAULT_DEMO_USER;
    } catch {
      return DEFAULT_DEMO_USER;
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

  const loginWithEmail = async (email: string, _otp?: string): Promise<boolean> => {
    const handle = email.split('@')[0];
    const newUser: AppUser = {
      id: `usr_${Date.now().toString(36)}`,
      email,
      xHandle: handle,
      displayName: handle.charAt(0).toUpperCase() + handle.slice(1),
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
      kycTier: 0,
      bvnNinVerified: false,
      virtualAccount: {
        accountNumber: '99' + Math.floor(10000000 + Math.random() * 90000000),
        bankName: 'Wema Bank (OpinionNG)',
        accountName: `OPINION-NG / ${handle.toUpperCase()}`,
      },
    };
    setUser(newUser);
    closeSignInModal();
    return true;
  };

  const loginWithPhone = async (phone: string, _otp?: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const newUser: AppUser = {
      id: `usr_${Date.now().toString(36)}`,
      phone: cleanPhone,
      displayName: `User ${cleanPhone.slice(-4)}`,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanPhone)}`,
      kycTier: 0,
      bvnNinVerified: false,
      virtualAccount: {
        accountNumber: '99' + Math.floor(10000000 + Math.random() * 90000000),
        bankName: 'Providus Bank (OpinionNG)',
        accountName: `OPINION-NG / ${cleanPhone.slice(-4)}`,
      },
    };
    setUser(newUser);
    closeSignInModal();
    return true;
  };

  const loginWithX = async (handle: string = 'crypto_sage'): Promise<boolean> => {
    const cleanHandle = handle.replace(/^@/, '');
    const newUser: AppUser = {
      id: `usr_x_${cleanHandle}`,
      xHandle: cleanHandle,
      displayName: `@${cleanHandle}`,
      avatarUrl: `https://unavatar.io/twitter/${cleanHandle}`,
      kycTier: 1,
      bvnNinVerified: true,
      virtualAccount: {
        accountNumber: '99' + Math.floor(10000000 + Math.random() * 90000000),
        bankName: 'Wema Bank (OpinionNG)',
        accountName: `OPINION-NG / @${cleanHandle.toUpperCase()}`,
      },
    };
    setUser(newUser);
    closeSignInModal();
    return true;
  };

  const loginDemoUser = () => {
    setUser(DEFAULT_DEMO_USER);
    setWallet((prev) => ({
      ...prev,
      availableKobo: Math.max(prev.availableKobo, DEFAULT_DEMO_BALANCE_KOBO),
    }));
    closeSignInModal();
  };

  const logout = () => {
    setUser(null);
  };

  const depositKobo = async (kobo: number, _reference?: string): Promise<boolean> => {
    if (kobo <= 0) return false;
    setWallet((prev) => ({
      ...prev,
      availableKobo: prev.availableKobo + kobo,
    }));
    return true;
  };

  const withdrawKobo = async (kobo: number, _bankDetails?: any): Promise<boolean> => {
    if (kobo <= 0 || wallet.availableKobo < kobo) return false;
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
      const res = await fetch(`/api/user/me?userId=${encodeURIComponent(user?.id || DEFAULT_DEMO_USER.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setWallet({
            availableKobo: Number(data.wallet.availableKobo),
            lockedKobo: Number(data.wallet.lockedKobo || 0),
            creatorEarningsKobo: Number(data.wallet.creatorEarningsKobo || 0),
          });
        }
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
        openSignInModal,
        closeSignInModal,
        openDepositModal,
        closeDepositModal,
        loginWithEmail,
        loginWithPhone,
        loginWithX,
        loginDemoUser,
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

