/**
 * Store branding and contact details, fetched once from Main-server's `/settings/branding` and
 * cached indefinitely by Next.js's Data Cache — no time-based revalidation. The cache is only ever
 * busted on-demand, by `/api/revalidate-branding`, which Main-server calls the moment the
 * Settings document is actually saved (see `SettingsService.triggerBrandingRevalidation`).
 * This avoids polling Main-server on every request for values that change essentially never.
 *
 * `storeName` falls back to `NEXT_PUBLIC_STORE_NAME` on failure — a generic title beats a
 * broken page. Contact fields have no env fallback: they come from the Settings document only,
 * so they're empty until someone sets them via the admin Store Settings form, and every page
 * that shows them must hide the line when empty.
 *
 * `policies` (return window, refund time) are code constants on Main-server
 * (`config/storePolicies.ts`), served here so the policy pages can't drift from what the
 * returns flow actually enforces.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Rawura';

export interface StorePolicies {
  returnWindowDays: number;
  refundEtaDays: number;
}

export interface StoreBranding {
  storeName: string;
  /** Legal/company name for the terms page; falls back to storeName. */
  companyName: string;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  /** Free text such as "Mon–Sat, 9am–6pm WAT"; empty when not set. */
  supportHours: string;
  /** One-line postal address, empty when not set. */
  addressLine: string;
  policies: StorePolicies;
  socialLinks?: Partial<Record<'instagram' | 'facebook' | 'whatsapp' | 'x' | 'threads', string>>;
}

/** Must match Main-server `config/storePolicies.ts`; only used when the API is unreachable. */
const FALLBACK_POLICIES: StorePolicies = { returnWindowDays: 7, refundEtaDays: 7 };

const FALLBACK_BRANDING: StoreBranding = {
  storeName: FALLBACK_STORE_NAME,
  companyName: FALLBACK_STORE_NAME,
  whatsappNumber: '',
  supportEmail: '',
  supportPhone: '',
  supportHours: '',
  addressLine: '',
  policies: FALLBACK_POLICIES,
  socialLinks: {},
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const positiveInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;

export async function getStoreBranding(): Promise<StoreBranding> {
  try {
    const response = await fetch(`${API_URL}/settings/branding`, {
      next: { tags: ['branding'] },
    });

    if (!response.ok) return FALLBACK_BRANDING;

    const json = await response.json();
    const data = json?.data ?? {};
    const storeName = text(data.storeName) || FALLBACK_STORE_NAME;

    return {
      storeName,
      companyName: text(data.companyName) || storeName,
      whatsappNumber: text(data.whatsappNumber),
      supportEmail: text(data.supportEmail),
      supportPhone: text(data.supportPhone),
      supportHours: text(data.supportHours),
      addressLine: text(data.addressLine),
      policies: {
        returnWindowDays: positiveInt(data.policies?.returnWindowDays, FALLBACK_POLICIES.returnWindowDays),
        refundEtaDays: positiveInt(data.policies?.refundEtaDays, FALLBACK_POLICIES.refundEtaDays),
      },
      socialLinks: data.socialLinks && typeof data.socialLinks === 'object' ? data.socialLinks : {},
    };
  } catch {
    return FALLBACK_BRANDING;
  }
}

export async function getStoreName(): Promise<string> {
  return (await getStoreBranding()).storeName;
}

export interface ShippingConfig {
  /** Orders at or above this total ship free; null when there is no free-shipping offer. */
  freeShippingThreshold: number | null;
  /** Delivery estimate label, e.g. "2 - 5 days"; null when not configured. */
  deliveryWindowLabel: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

/**
 * Public checkout delivery settings (`/gig/config`) for the shipping page and FAQ. Revalidated
 * every 10 minutes rather than tagged: these are edited in the admin delivery settings, which
 * don't call the branding revalidation hook.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const fallback: ShippingConfig = {
    freeShippingThreshold: null,
    deliveryWindowLabel: null,
    pickupEnabled: false,
    deliveryEnabled: true,
  };
  try {
    const response = await fetch(`${API_URL}/gig/config`, { next: { revalidate: 600 } });
    if (!response.ok) return fallback;
    const data = (await response.json())?.data ?? {};
    const threshold = data.freeShippingThreshold;
    const methods: unknown[] = Array.isArray(data.enabledDeliveryMethods) ? data.enabledDeliveryMethods : [];
    return {
      freeShippingThreshold:
        typeof threshold === 'number' && Number.isFinite(threshold) && threshold > 0 ? threshold : null,
      deliveryWindowLabel: text(data.shippingWindow?.label) || null,
      pickupEnabled: methods.includes('pickup'),
      deliveryEnabled: methods.length === 0 || methods.some((m) => m !== 'pickup'),
    };
  } catch {
    return fallback;
  }
}

/** "₦300,000" */
export const formatNaira = (amount: number): string => `₦${amount.toLocaleString('en-NG')}`;
