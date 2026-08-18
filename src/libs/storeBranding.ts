/**
 * Store branding (`storeName`, `whatsappNumber`), fetched once from Main-server and cached
 * indefinitely by Next.js's Data Cache — no time-based revalidation. The cache is only ever
 * busted on-demand, by `/api/revalidate-branding`, which Main-server calls the moment the
 * Settings document is actually saved (see `SettingsService.triggerBrandingRevalidation`).
 * This avoids polling Main-server on every request for values that change essentially never.
 *
 * `storeName` falls back to `NEXT_PUBLIC_STORE_NAME` on failure — a generic title beats a
 * broken page. `whatsappNumber` has no env fallback: it comes from the Settings document only,
 * so it's empty until someone sets it via the admin Store Settings form.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Rawura';

export interface StoreBranding {
  storeName: string;
  whatsappNumber: string;
}

export async function getStoreBranding(): Promise<StoreBranding> {
  try {
    const response = await fetch(`${API_URL}/settings/branding`, {
      next: { tags: ['branding'] },
    });

    if (!response.ok) return { storeName: FALLBACK_STORE_NAME, whatsappNumber: '' };

    const json = await response.json();
    const storeName = json?.data?.storeName;
    const whatsappNumber = json?.data?.whatsappNumber;

    return {
      storeName: typeof storeName === 'string' && storeName.trim() ? storeName : FALLBACK_STORE_NAME,
      whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber : '',
    };
  } catch {
    return { storeName: FALLBACK_STORE_NAME, whatsappNumber: '' };
  }
}

export async function getStoreName(): Promise<string> {
  return (await getStoreBranding()).storeName;
}
