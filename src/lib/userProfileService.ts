// User profile and username management bound to Robinhood Chain wallet address
export interface UserProfile {
  address: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string; // Uploaded Base64 Data URL or Image URL
  avatarGradient: string;
  createdAt: number;
  usernameLastChangedAt?: number;
  pfpLastChangedAt?: number;
}

const STORAGE_PREFIX = 'nullhood_user_profile_';

// 15 days cooldown for username and profile picture (PFP) updates to prevent choking the database
export const PROFILE_CHANGE_COOLDOWN_DAYS = 15;
export const PROFILE_CHANGE_COOLDOWN_MS = PROFILE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // 15 days = 1,296,000,000 ms

export interface CooldownStatus {
  canChange: boolean;
  remainingMs: number;
  remainingDays: number;
  remainingHours: number;
  nextAvailableDate: Date | null;
  message?: string;
}

/**
 * Validates whether the username can be modified or is within the 15-day rate limit
 */
export function checkUsernameCooldown(profile: UserProfile): CooldownStatus {
  if (!profile.usernameLastChangedAt) {
    return {
      canChange: true,
      remainingMs: 0,
      remainingDays: 0,
      remainingHours: 0,
      nextAvailableDate: null,
    };
  }

  const elapsed = Date.now() - profile.usernameLastChangedAt;
  if (elapsed >= PROFILE_CHANGE_COOLDOWN_MS) {
    return {
      canChange: true,
      remainingMs: 0,
      remainingDays: 0,
      remainingHours: 0,
      nextAvailableDate: null,
    };
  }

  const remainingMs = PROFILE_CHANGE_COOLDOWN_MS - elapsed;
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const nextAvailableDate = new Date(profile.usernameLastChangedAt + PROFILE_CHANGE_COOLDOWN_MS);

  const timeDesc = remainingDays > 0 ? `${remainingDays}d ${remainingHours}h` : `${remainingHours}h`;

  return {
    canChange: false,
    remainingMs,
    remainingDays,
    remainingHours,
    nextAvailableDate,
    message: `Username can only be updated once every 15 days to protect database throughput. Next change available in ${timeDesc} (${nextAvailableDate.toLocaleDateString()}).`,
  };
}

/**
 * Validates whether the profile picture (PFP) can be modified or is within the 15-day rate limit
 */
export function checkPfpCooldown(profile: UserProfile): CooldownStatus {
  if (!profile.pfpLastChangedAt) {
    return {
      canChange: true,
      remainingMs: 0,
      remainingDays: 0,
      remainingHours: 0,
      nextAvailableDate: null,
    };
  }

  const elapsed = Date.now() - profile.pfpLastChangedAt;
  if (elapsed >= PROFILE_CHANGE_COOLDOWN_MS) {
    return {
      canChange: true,
      remainingMs: 0,
      remainingDays: 0,
      remainingHours: 0,
      nextAvailableDate: null,
    };
  }

  const remainingMs = PROFILE_CHANGE_COOLDOWN_MS - elapsed;
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const nextAvailableDate = new Date(profile.pfpLastChangedAt + PROFILE_CHANGE_COOLDOWN_MS);

  const timeDesc = remainingDays > 0 ? `${remainingDays}d ${remainingHours}h` : `${remainingHours}h`;

  return {
    canChange: false,
    remainingMs,
    remainingDays,
    remainingHours,
    nextAvailableDate,
    message: `Profile picture (PFP) can only be changed once every 15 days to prevent choking the database. Next change available in ${timeDesc} (${nextAvailableDate.toLocaleDateString()}).`,
  };
}

const DEFAULT_AVATAR_GRADIENTS = [
  'from-[#FF6B00] to-orange-500',
  'from-teal-400 to-emerald-600',
  'from-sky-400 to-blue-600',
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-700',
];

export function getDefaultUsername(address?: string | null): string {
  if (!address) return 'guest_trader';
  return `trader_${address.slice(2, 6).toLowerCase()}`;
}

export function getDefaultDisplayName(address?: string | null): string {
  if (!address) return 'Robinhood Trader';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getUserProfile(address?: string | null): UserProfile | null {
  if (!address || !address.trim()) {
    return null;
  }
  const normAddr = address.toLowerCase();
  
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${normAddr}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }

  // Deterministic default profile for this specific wallet
  let hash = 0;
  for (let i = 0; i < normAddr.length; i++) {
    hash = normAddr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = DEFAULT_AVATAR_GRADIENTS[Math.abs(hash) % DEFAULT_AVATAR_GRADIENTS.length];

  const defaultProfile: UserProfile = {
    address: normAddr,
    username: `trader_${normAddr.slice(2, 8)}`,
    displayName: `${normAddr.slice(0, 6)}...${normAddr.slice(-4)}`,
    bio: 'Perpetual conviction trader on Robinhood Chain (46630). No oracles, no expiry.',
    avatarGradient: gradient,
    createdAt: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${normAddr}`, JSON.stringify(defaultProfile));
    } catch (e) {
      console.warn('Failed to save default profile', e);
    }
  }

  return defaultProfile;
}

export function saveUserProfile(
  address: string,
  updates: Partial<UserProfile>
): UserProfile {
  if (!address) {
    throw new Error('Wallet address is required to save user profile');
  }
  const normAddr = address.toLowerCase();
  const current = getUserProfile(normAddr) || {
    address: normAddr,
    username: `trader_${normAddr.slice(2, 8)}`,
    displayName: `${normAddr.slice(0, 6)}...${normAddr.slice(-4)}`,
    bio: 'Perpetual conviction trader on Robinhood Chain (46630).',
    avatarGradient: DEFAULT_AVATAR_GRADIENTS[0],
    createdAt: Date.now(),
  };

  const updated: UserProfile = {
    ...current,
    ...updates,
    address: normAddr,
    usernameLastChangedAt: updates.username ? Date.now() : current.usernameLastChangedAt,
    pfpLastChangedAt: updates.avatarUrl !== undefined ? Date.now() : current.pfpLastChangedAt,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${normAddr}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save user profile to localStorage', e);
    }
  }

  return updated;
}
