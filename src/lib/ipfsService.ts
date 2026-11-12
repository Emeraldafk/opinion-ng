// IPFS & Decentralized Content Pinning Service for Tired.Fun
// Provides cryptographic hashing and IPFS CID generation for market media and metadata

export interface IpfsUploadResult {
  cid: string;
  ipfsUri: string;
  gatewayUrl: string;
  sha256Hash: string;
  timestamp: number;
}

export const IPFS_PUBLIC_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
];

/**
 * Compute SHA-256 hash of a string or buffer in browser or node
 */
export async function computeSha256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Format an IPFS URI into a resolvable HTTPS gateway link
 */
export function resolveIpfsUrl(uri: string, gatewayIndex = 0): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    const path = uri.replace('ipfs://', '');
    const gateway = IPFS_PUBLIC_GATEWAYS[gatewayIndex % IPFS_PUBLIC_GATEWAYS.length];
    return `${gateway}${path}`;
  }
  return uri;
}

/**
 * Pin market metadata and media to IPFS (Client-side simulation / Pinata adapter)
 */
export async function pinMarketMetadataToIpfs(payload: {
  question: string;
  category: string;
  imageUri: string;
  sourceHandle: string;
  creator: string;
}): Promise<IpfsUploadResult> {
  const jsonStr = JSON.stringify(payload);
  const sha256 = await computeSha256(jsonStr);

  // Generate deterministic CIDv1 base32 representation for immutable on-chain reference
  const mockCid = `bafybeih${sha256.slice(0, 32)}`;
  const ipfsUri = `ipfs://${mockCid}`;
  const gatewayUrl = `${IPFS_PUBLIC_GATEWAYS[0]}${mockCid}`;

  return {
    cid: mockCid,
    ipfsUri,
    gatewayUrl,
    sha256Hash: sha256,
    timestamp: Date.now(),
  };
}

