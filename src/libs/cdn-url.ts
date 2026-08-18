/**
 * CDN URL utilities
 * Constructs full CDN URLs from relative paths
 *
 * Base URL is read from `NEXT_PUBLIC_CDN_BASE_URL` (client-visible, since this is called from
 * both Server and Client Components) with the historical value as the fallback — mirrors
 * `shared/emails/src/cdn-url.ts`, whose header explains why: a CDN move used to silently break
 * every image on whichever copy of this file still hardcoded the host.
 */

function resolveCdnBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_CDN_BASE_URL ?? '').trim();
  const base = configured.length > 0 ? configured : 'https://oeptest.b-cdn.net/';
  return base.endsWith('/') ? base : `${base}/`;
}

const CDN_BASE_URL = resolveCdnBaseUrl();

/**
 * Image variant type
 */
export type ImageVariant = 'base' | 'mini' | 'png';

/**
 * Constructs full CDN URL from a relative path
 * @param path - Relative path from upload response (e.g., "reviews/c140fb28-...")
 * @param variant - Image variant: 'base' (original) or 'mini' (optimized thumbnail)
 * @returns Full CDN URL or original if already a full URL
 */
export function getCdnUrl(path: string | undefined | null, variant: ImageVariant = 'base'): string {
  if (!path) return '';
  
  // If already a full URL, return as is (but apply variant logic)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // For mini variant, convert path to mini version if not already
    if (variant === 'mini' && !path.includes('-mini.')) {
      return convertToMiniUrl(path);
    }
    if (variant === 'png') {
      return convertToPngUrl(path);
    }
    return path;
  }
  
  // Remove leading slash if present
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // For mini variant, convert path to mini version
  if (variant === 'mini' && !cleanPath.includes('-mini.')) {
    cleanPath = convertToMiniPath(cleanPath);
  }
  
  // For png variant, convert path to png version
  if (variant === 'png') {
    cleanPath = convertToPngPath(cleanPath);
  }
  
  // Construct full CDN URL
  return `${CDN_BASE_URL}${cleanPath}`;
}

/**
 * Convert a base path to mini path
 * @param path - Base path (e.g., "products/uuid-timestamp.webp")
 * @returns Mini path (e.g., "products/uuid-timestamp-mini.webp")
 */
function convertToMiniPath(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) return path; // No extension, return as is
  
  const basePath = path.substring(0, lastDotIndex);
  const extension = path.substring(lastDotIndex);
  return `${basePath}-mini${extension}`;
}

/**
 * Convert a base URL to mini URL
 * @param url - Base URL
 * @returns Mini URL
 */
function convertToMiniUrl(url: string): string {
  const lastDotIndex = url.lastIndexOf('.');
  if (lastDotIndex === -1) return url; // No extension, return as is
  
  const baseUrl = url.substring(0, lastDotIndex);
  const extension = url.substring(lastDotIndex);
  return `${baseUrl}-mini${extension}`;
}

/**
 * Convert a base path to png path
 * @param path - Base path (e.g., "products/uuid-timestamp.webp")
 * @returns PNG path (e.g., "products/uuid-timestamp.png")
 */
function convertToPngPath(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) return `${path}.png`;
  return `${path.substring(0, lastDotIndex)}.png`;
}

/**
 * Convert a base URL to png URL
 * @param url - Base URL
 * @returns PNG URL
 */
function convertToPngUrl(url: string): string {
  const lastDotIndex = url.lastIndexOf('.');
  if (lastDotIndex === -1) return `${url}.png`;
  return `${url.substring(0, lastDotIndex)}.png`;
}

/**
 * Get CDN base URL
 */
export function getCdnBaseUrl(): string {
  return CDN_BASE_URL;
}

/**
 * Check if a URL is a CDN URL
 */
export function isCdnUrl(url: string): boolean {
  return url.startsWith(CDN_BASE_URL);
}

/**
 * Extract path from CDN URL
 * @param url - Full CDN URL
 * @returns Relative path
 */
export function extractPathFromCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE_URL)) {
    return url.slice(CDN_BASE_URL.length);
  }
  return url;
}
