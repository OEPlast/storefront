/**
 * Store branding and contact details, fetched from Main-server's `/settings/branding` and held in
 * Next.js's Data Cache under the `branding` tag. Main-server purges that tag the moment the
 * Settings document is saved (`SettingsService.triggerBrandingRevalidation`), and the 12-hour
 * revalidation is only the backstop for a purge that never arrived.
 *
 * The `revalidate` is not optional: in Next 15 an un-cached `fetch` defaults to `no-store`, so
 * while this only carried `tags` it was re-fetched on every single render — and, because the root
 * layout reads it, that was once per page view across the whole site.
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

import { CacheTag, DEFAULT_REVALIDATE } from '@/libs/api/cacheTags';

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
      next: { revalidate: DEFAULT_REVALIDATE, tags: [CacheTag.BRANDING] },
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
 * Public checkout delivery settings (`/gig/config`) for the shipping page, the FAQ and the top
 * bar's free-delivery line. Tagged `delivery-config`, which the admin delivery settings purge on
 * save; the 12-hour revalidate is the backstop.
 *
 * It used to revalidate every 10 minutes, with no tag. Since the root layout reads it, that 600
 * became the effective revalidate of every page on the site — a page can never be fresher than
 * the shortest-lived fetch in its render.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const fallback: ShippingConfig = {
    freeShippingThreshold: null,
    deliveryWindowLabel: null,
    pickupEnabled: false,
    deliveryEnabled: true,
  };
  try {
    const response = await fetch(`${API_URL}/gig/config`, {
      next: { revalidate: DEFAULT_REVALIDATE, tags: [CacheTag.DELIVERY_CONFIG] },
    });
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
