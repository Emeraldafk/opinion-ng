// EIP-4361: Sign-In with Ethereum (SIWE) & Cryptographic Discourse Verification for Tired.Fun
// Guarantees anti-Sybil reputation tracking and prevents user/creator impersonation

import { verifyMessage } from 'viem';
import { ROBINHOOD_CHAIN_ID } from '../config/robinhoodChain';

export interface SiweAuthSession {
  address: string;
  chainId: number;
  domain: string;
  nonce: string;
  issuedAt: string;
  signature: string;
  verified: boolean;
}

export interface SignedThesisComment {
  id: string;
  marketId: number;
  author: string;
  side: 'YES' | 'NO';
  sharesHeld: number;
  text: string;
  timestamp: string;
  signature?: string;
  verifiedOnChain: boolean;
}

/**
 * Generate a standard random alphanumeric nonce for SIWE challenge
 */
export function generateSiweNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format a standard EIP-4361 Sign-In with Ethereum message
 */
export function createSiweMessage(params: {
  address: string;
  domain?: string;
  statement?: string;
  uri?: string;
  nonce: string;
  issuedAt?: string;
}): string {
  const domain = params.domain || window.location.host;
  const uri = params.uri || window.location.origin;
  const statement =
    params.statement ||
    'Sign in to Tired.Fun to verify your on-chain conviction reputation and sign discussion theses.';
  const issuedAt = params.issuedAt || new Date().toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${params.address}

${statement}

URI: ${uri}
Version: 1
Chain ID: ${ROBINHOOD_CHAIN_ID}
Nonce: ${params.nonce}
Issued At: ${issuedAt}`;
}

/**
 * Format an EIP-712-style comment signature statement
 */
export function createCommentSignMessage(
  marketId: number,
  side: 'YES' | 'NO',
  text: string,
  nonce: string
): string {
  return `Tired.Fun Opinion Thesis Verification:
Market ID: #${marketId}
Side: ${side}
Thesis: "${text}"
Nonce: ${nonce}
Chain ID: ${ROBINHOOD_CHAIN_ID}`;
}

/**
 * Verify signature against signer wallet address using viem
 */
export async function verifySignature(
  address: string,
  message: string,
  signature: `0x${string}`
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    });
  } catch (err) {
    console.warn('SIWE verification failed:', err);
    return false;
  }
}

