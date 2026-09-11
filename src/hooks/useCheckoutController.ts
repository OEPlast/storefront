'use client';

/**
 * useCheckoutController
 *
 * Every piece of checkout state, effect and handler that used to live inside
 * src/app/checkout/page.tsx. Behaviour is preserved verbatim except for the
 * deviations enumerated in the rebuild contract (D-1 … D-10), the most
 * load-bearing of which are:
 *
 *  - the three cart-correction flags are ONE atomic object, so the modal, the
 *    parsed errors and the button label can never desync;
 *  - coupon state lives here instead of the persisted zustand store, is
 *    hydrated once and then cleared, and is re-validated when the subtotal moves;
 *  - contact email is owned by the session rather than by the shipping address,
 *    so pickup orders finally carry contact details;
 *  - billing address / billingSameAsShipping are threaded into the payload.
 *
 * Hook-ordering constraints that MUST survive any future edit:
 *  1. useCheckoutStore() is read before the useState initialisers — `sections.shipping`
 *     seeds from the persisted shipping method.
 *  2. The shippingConfigs -> countryConfig -> stateConfig reset cascade keeps its
 *     source order; each is a functional update with an early `return prev`.
 *  3. The geocode effect is declared BEFORE the shipping-calculation effect, which
 *     reads isGeocodingAddress in the same commit.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Paystack from '@paystack/inline-js';
import toast from 'react-hot-toast';

import { useCart, type CartItem } from '@/context/CartContext';
import { calculateCartItemPricing, type CartItemPricing } from '@/utils/cart-pricing';
import { sumLineSavings } from '@/utils/variantLabel';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { hasProductIssues } from '@/utils/cartCorrections';

import { useCheckoutStore } from '@/store/useCheckoutStore';
import { usePaymentStore } from '@/store/usePaymentStore';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import {
  useAllShippingConfig,
  type LogisticsConfigRecord,
  type LogisticsLocationConfig,
  type LogisticsStateConfig,
} from '@/hooks/useLogisticsLocations';
import { useAddresses } from '@/hooks/queries/useAddresses';
import { useAddAddress } from '@/hooks/mutations/useAddressMutations';
import { useValidateCoupon } from '@/hooks/useValidateCoupon';
import { useProductSocket } from '@/hooks/useProductSocket';

import {
  EMPTY_CHECKOUT_ADDRESS,
  addressFromSavedAddress,
  addressSchema,
  validateCheckoutForm,
  type CheckoutAddress,
  type CheckoutFieldErrors,
  type CheckoutFormInput,
} from '@/libs/schemas/checkout.schema';

import type { CheckoutErrors } from '@/types/checkout';
import type { AddAddressInput, Address } from '@/types/user';
import type { DiscountType, ValidateCouponRequest } from '@/types/coupon';
import type { ProductSale } from '@/types/product';
import type { ShippingMethodType } from '@/store/useCheckoutStore';

export type { ShippingMethodType };

// ── Wire types (verbatim from checkout/page.tsx, re-homed here) ──────────────

export type PublicGIGCheckoutConfig = {
  enabledDeliveryMethods: Array<'shipping' | 'pickup' | 'gig'>;
  shippingDiscountAmountOff: number;
  gigDiscountAmountOff: number;
  freeShippingThreshold: number | null;
  shippingWindow: {
    minDays: number;
    maxDays: number;
    label: string;
  };
};

export type ShippingCalculationResponse = {
  shippingCost: number;
  deliveryType: 'shipping' | 'pickup';
  destination: {
    countryName: string;
    stateName: string;
    cityName?: string;
    lgaName?: string;
  } | null;
  currency: string;
  itemsSubtotal: number;
  estimatedTotal: number;
};

export type FlatCartShippingResponse = {
  amount: number;
};

export type CheckoutCorrectionPayload = {
  needsUpdate: true;
  errors?: CheckoutErrors;
  summary: {
    itemsRemaining: number;
    newSubtotal: number;
    newTotal: number;
    shippingCost: number;
    deliveryType: 'shipping' | 'pickup';
    couponDiscount: number;
  };
};

export type SecureCheckoutSuccessResponse = {
  orderId: string;
  payment: {
    paymentUrl: string;
    reference: string;
    transactionId: string;
    access_code: string;
  } | null;
  summary: {
    total: number;
    subtotal: number;
    couponDiscount: number;
    shippingCost: number;
    itemCount: number;
    deliveryType: 'shipping' | 'pickup';
  };
};

/** The three correction flags as ONE atomic value. Never split them again. */
export interface CheckoutCorrectionsState {
  payload: CheckoutCorrectionPayload | null;
  errors: CheckoutErrors | null;
  isModalOpen: boolean;
}

/** Controller-owned coupon. Never written back to the persisted zustand store. */
export interface AppliedCoupon {
  /** Uppercased code as submitted. */
  code: string;
  /** Server-calculated naira amount (validate response `data.data.discount`). */
  amount: number;
  discountType: DiscountType;
  minOrderValue: number;
  stackable?: boolean;
  couponId?: string;
}

/** Memoised option lists for ONE address (shipping or billing). */
export interface CheckoutLocationOptions {
  countryConfig: LogisticsConfigRecord | undefined;
  stateConfig: LogisticsStateConfig | undefined;
  countries: LogisticsConfigRecord[];
  states: LogisticsStateConfig[];
  /** stateConfig.cities — feeds the LGA select's "Cities" optgroup. */
  cities: LogisticsLocationConfig[];
  /** stateConfig.lgas — feeds the LGA select's "LGAs" optgroup. */
  lgas: LogisticsLocationConfig[];
  /** city match -> lga-against-cities -> lga-against-lgas. Sole source of etaDays. */
  locationMeta: LogisticsLocationConfig | undefined;
}

export type CheckoutSectionKey =
  | 'delivery'
  | 'shipping'
  | 'billing'
  | 'notes'
  | 'summary'
  | 'mobileSummary';

// ── Payload ─────────────────────────────────────────────────────────────────

export interface CheckoutAddressPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  state: string;
  city: string;
  lga: string;
  address1: string;
  address2: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

/** shippingAddress ALSO carries email — preserving today's wire shape. */
export interface ShippingAddressPayload extends CheckoutAddressPayload {
  email: string;
}

export interface CheckoutPayloadItem {
  _id: string;
  product: string;
  qty: number;
  selectedAttributes: Array<{ name: string; value: string }>;
  unitPrice: number;
  totalPrice: number;
  sale: ProductSale | null;
  saleVariantIndex?: string;
  appliedDiscount: number;
  saleDiscount: number;
  tierDiscount: number;
  pricingTier: CartItemPricing['pricingTier'];
  discountAmount: number;
  productSnapshot: { name: string; price: number; sku: string | number; image: string };
}

export interface SecureCheckoutPayload {
  items: CheckoutPayloadItem[];
  /** undefined for deliveryType 'pickup'. */
  shippingAddress?: ShippingAddressPayload;
  /** REQUIRED when billingSameAsShipping is false; omitted when true. */
  billingAddress?: CheckoutAddressPayload;
  billingSameAsShipping: boolean;
  paymentMethod: string;
  couponCodes: string[];
  taxPrice: number;
  subtotal: number;
  total: number;
  totalDiscount: number;
  estimatedShipping: { cost: number; days: number };
  deliveryType: 'shipping' | 'pickup' | 'gig';
  shippingCost: number;
  acceptChanges: boolean;
  notes: string;
}

// ── Module constants / helpers ──────────────────────────────────────────────

const EXPRESS_SURCHARGE_MULTIPLIER = 1.5;

/** Debounce for the shipping quote, unchanged from the page. */
const SHIPPING_QUOTE_DEBOUNCE_MS = 1000;
/** Debounce for the GIG geocode lookup, unchanged from the page. */
const GEOCODE_DEBOUNCE_MS = 500;
/** Debounce for the "does this coupon still qualify?" re-check. */
const COUPON_REVALIDATE_DEBOUNCE_MS = 500;

const EMPTY_CORRECTIONS: CheckoutCorrectionsState = {
  payload: null,
  errors: null,
  isModalOpen: false,
};

/** Stable identity so `fieldErrors` does not churn while the form is valid. */
const EMPTY_FIELD_ERRORS: CheckoutFieldErrors = {};

const isCorrectionsEmpty = (state: CheckoutCorrectionsState) =>
  state.payload === null && state.errors === null && !state.isModalOpen;

/** The composed one-line address the geocoder is asked about. Also the cache key. */
const composeGeocodeAddress = (address: CheckoutAddress): string =>
  [address.address1, address.lga, address.city, address.state, address.country]
    .filter(Boolean)
    .join(', ');

const toAddressPayload = (address: CheckoutAddress): CheckoutAddressPayload => ({
  firstName: address.firstName,
  lastName: address.lastName,
  phoneNumber: address.phoneNumber,
  country: address.country,
  state: address.state,
  city: address.city,
  lga: address.lga,
  address1: address.address1,
  address2: address.address2,
  zipCode: address.zipCode,
  latitude: address.latitude,
  longitude: address.longitude,
});

/**
 * Saved Address -> CheckoutAddress, with the country reconciled against the
 * logistics configs. An unserviceable country falls back to Nigeria (or the
 * empty string) and clears state/lga/city, exactly as the page did.
 */
const addressForConfigs = (
  address: Address,
  configs: LogisticsConfigRecord[] | undefined
): CheckoutAddress => {
  const base = addressFromSavedAddress(address);
  const isCountryAvailable = configs?.some((config) => config.countryName === base.country);
  const countryToUse = isCountryAvailable
    ? base.country
    : configs?.find((config) => config.countryName.toLowerCase() === 'nigeria')?.countryName || '';
  const shouldClearLocation = !isCountryAvailable;

  return {
    ...base,
    country: countryToUse,
    state: shouldClearLocation ? '' : base.state,
    lga: shouldClearLocation ? '' : base.lga,
    city: shouldClearLocation ? '' : base.city,
  };
};

/**
 * Option lists for ONE address. Called twice (shipping, billing) — it holds only
 * memos, so calling it does not disturb the controller's effect ordering.
 */
function useCheckoutLocationOptions(
  shippingConfigs: LogisticsConfigRecord[] | undefined,
  address: CheckoutAddress
): CheckoutLocationOptions {
  const countries = useMemo<LogisticsConfigRecord[]>(
    () => shippingConfigs ?? [],
    [shippingConfigs]
  );

  const countryConfig = useMemo<LogisticsConfigRecord | undefined>(() => {
    if (!shippingConfigs) {
      return undefined;
    }
    return shippingConfigs.find((config) => config.countryName === address.country);
  }, [shippingConfigs, address.country]);

  const states = useMemo<LogisticsStateConfig[]>(() => countryConfig?.states ?? [], [countryConfig]);

  const stateConfig = useMemo<LogisticsStateConfig | undefined>(() => {
    if (!countryConfig) {
      return undefined;
    }
    return countryConfig.states.find((state) => state.name === address.state);
  }, [countryConfig, address.state]);

  const cities = useMemo<LogisticsLocationConfig[]>(() => stateConfig?.cities ?? [], [stateConfig]);
  const lgas = useMemo<LogisticsLocationConfig[]>(() => stateConfig?.lgas ?? [], [stateConfig]);

  // Resolution order matters: an exact city hit, then `lga` matched against the
  // CITY list (the LGA select writes city names through its "Cities" optgroup),
  // then `lga` against the real LGA list.
  const locationMeta = useMemo<LogisticsLocationConfig | undefined>(() => {
    if (!stateConfig) {
      return undefined;
    }

    if (address.city) {
      const cityMatch = stateConfig.cities?.find((city) => city.name === address.city);
      if (cityMatch) {
        return cityMatch;
      }
    }

    if (address.lga) {
      const cityAlias = stateConfig.cities?.find((city) => city.name === address.lga);
      if (cityAlias) {
        return cityAlias;
      }
      const lgaMatch = stateConfig.lgas?.find((lga) => lga.name === address.lga);
      if (lgaMatch) {
        return lgaMatch;
      }
    }

    return undefined;
  }, [stateConfig, address.city, address.lga]);

  return useMemo(
    () => ({ countryConfig, stateConfig, countries, states, cities, lgas, locationMeta }),
    [countryConfig, stateConfig, countries, states, cities, lgas, locationMeta]
  );
}

// ── Return type ─────────────────────────────────────────────────────────────

export interface UseCheckoutControllerReturn {
  // ---- cart -----------------------------------------------------------------
  items: CartItem[];
  isCartLoading: boolean;
  isGuest: boolean;
  cartStats: { totalItems: number; uniqueProducts: number };
  subtotal: number;

  // ---- contact / auth -------------------------------------------------------
  contactEmail: string;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  userName: string | null;
  openLoginModal: (redirectPath?: string | null) => void;

  // ---- delivery method ------------------------------------------------------
  shippingMethod: ShippingMethodType;
  availableShippingMethods: Array<'pickup' | 'normal' | 'gig'> | null;
  shippingEtaLabel: string;
  isMethodAvailable: (method: ShippingMethodType) => boolean;
  handleChangeShippingMethod: (method: ShippingMethodType) => void;
  deliveryType: 'shipping' | 'pickup' | 'gig';

  // ---- shipping address -----------------------------------------------------
  shippingAddress: CheckoutAddress;
  setShippingAddress: React.Dispatch<React.SetStateAction<CheckoutAddress>>;
  handleShippingAddressChange: <K extends keyof CheckoutAddress>(
    field: K,
    value: CheckoutAddress[K]
  ) => void;
  populateFormFromAddress: (address: Address) => void;
  addresses: Address[] | undefined;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  saveShippingAddressToAccount: boolean;
  setSaveShippingAddressToAccount: (save: boolean) => void;
  addressValidationError: string | null;
  setAddressValidationError: (error: string | null) => void;
  shippingLocation: CheckoutLocationOptions;

  // ---- billing --------------------------------------------------------------
  billingSameAsShipping: boolean;
  setBillingSameAsShipping: (same: boolean) => void;
  billingAddress: CheckoutAddress;
  setBillingAddress: React.Dispatch<React.SetStateAction<CheckoutAddress>>;
  handleBillingAddressChange: <K extends keyof CheckoutAddress>(
    field: K,
    value: CheckoutAddress[K]
  ) => void;
  selectedBillingAddressId: string | null;
  setSelectedBillingAddressId: (id: string | null) => void;
  populateBillingFromAddress: (address: Address | null) => void;
  billingLocation: CheckoutLocationOptions;

  // ---- logistics config -----------------------------------------------------
  shippingConfigs: LogisticsConfigRecord[] | undefined;
  isLoadingShippingConfigs: boolean;
  shippingConfigError: Error | null;

  // ---- shipping cost --------------------------------------------------------
  calculatedShippingCost: number | null;
  isCalculatingShipping: boolean;
  shippingCalculationError: string | null;
  isGeocodingAddress: boolean;

  // ---- coupon ---------------------------------------------------------------
  couponCodeInput: string;
  setCouponCodeInput: (value: string) => void;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  isValidatingCoupon: boolean;
  applyCoupon: () => void;
  removeCoupon: () => void;

  // ---- totals (null == unknown; never coerce with ?? 0) ----------------------
  resolvedSubtotal: number;
  resolvedDiscount: number;
  resolvedShippingCost: number | null;
  resolvedTotal: number | null;
  lineSavings: number;
  totalSavings: number;

  // ---- notes ----------------------------------------------------------------
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;

  // ---- section open/closed --------------------------------------------------
  sections: Record<CheckoutSectionKey, boolean>;
  toggleSection: (key: CheckoutSectionKey) => void;
  setSection: (key: CheckoutSectionKey, open: boolean) => void;

  // ---- validation -----------------------------------------------------------
  fieldErrors: CheckoutFieldErrors;
  hasAttemptedSubmit: boolean;
  isShippingFormComplete: boolean;
  isShippingAddressReady: boolean;
  isBillingComplete: boolean;
  canProceedToPayment: boolean;

  // ---- payment / submission -------------------------------------------------
  activePayment: string;
  setActivePayment: (method: string) => void;
  isSubmittingCheckout: boolean;
  checkoutError: string | null;
  setCheckoutError: (error: string | null) => void;
  checkoutSuccess: SecureCheckoutSuccessResponse | null;
  paymentSuccess: boolean;
  handleSubmitCheckout: () => Promise<void>;

  // ---- cart corrections (ONE atomic object — D-3) ----------------------------
  corrections: CheckoutCorrectionsState;
  setCorrectionModalOpen: (open: boolean) => void;
  isAcceptingCorrections: boolean;
  handleAcceptCorrections: () => Promise<void>;

  // ---- live stock -----------------------------------------------------------
  outOfStockProductIds: Set<string>;
  outOfStockCartItemIds: Set<string>;
}

// ── The controller ──────────────────────────────────────────────────────────

export function useCheckoutController(): UseCheckoutControllerReturn {
  const router = useRouter();

  // Read the persisted store BEFORE the useState initialisers — `sections.shipping`
  // seeds off the shipping method the cart page handed over.
  const {
    shippingMethod: storedShippingMethod,
    setShippingMethod: setCheckoutShippingMethod,
    setDiscountInfo,
  } = useCheckoutStore();
  const { add: addPaymentReference, verify: verifyPaymentReference } = usePaymentStore();

  // ---- delivery method ------------------------------------------------------
  const [currentShippingMethod, setCurrentShippingMethod] =
    useState<ShippingMethodType>(storedShippingMethod);
  const [availableShippingMethods, setAvailableShippingMethods] = useState<Array<
    'pickup' | 'normal' | 'gig'
  > | null>(null);
  const [shippingEtaLabel, setShippingEtaLabel] = useState<string>('2 - 5 days');
  const shippingMethod = currentShippingMethod;

  const deliveryType: 'shipping' | 'pickup' | 'gig' =
    shippingMethod === 'pickup' ? 'pickup' : shippingMethod === 'gig' ? 'gig' : 'shipping';

  const isMethodAvailable = useCallback(
    (method: ShippingMethodType) => {
      if (availableShippingMethods === null) return true;
      if (method === 'express' || method === 'normal') {
        return availableShippingMethods.includes('normal');
      }

      return availableShippingMethods.includes(method);
    },
    [availableShippingMethods]
  );

  // E1 — delivery config probe. Fails OPEN: a dead /gig/config must not lock the
  // shopper out of every delivery method.
  useEffect(() => {
    let isCancelled = false;

    const loadDeliveryConfig = async () => {
      try {
        const response = await apiClient.get<PublicGIGCheckoutConfig>(api.gig.config);
        const config = response.data;

        if (!config || !Array.isArray(config.enabledDeliveryMethods)) {
          return;
        }

        const methods: Array<'pickup' | 'normal' | 'gig'> = [];

        if (config.enabledDeliveryMethods.includes('pickup')) {
          methods.push('pickup');
        }
        if (config.enabledDeliveryMethods.includes('shipping')) {
          methods.push('normal');
        }
        if (config.enabledDeliveryMethods.includes('gig')) {
          methods.push('gig');
        }

        const normalizedMethods: Array<'pickup' | 'normal' | 'gig'> =
          methods.length > 0 ? methods : ['pickup'];

        if (!isCancelled) {
          setAvailableShippingMethods(normalizedMethods);
          if (config.shippingWindow?.label) {
            setShippingEtaLabel(config.shippingWindow.label);
          }
        }
      } catch {
        if (!isCancelled) {
          setAvailableShippingMethods(['pickup', 'normal', 'gig']);
          setShippingEtaLabel('2 - 5 days');
        }
      }
    };

    loadDeliveryConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  // E2 — reconcile the selected method against what the store actually offers.
  // A stale persisted 'express' downgrades to 'normal' here.
  useEffect(() => {
    if (availableShippingMethods === null) return;

    if (shippingMethod === 'express' && availableShippingMethods.includes('normal')) {
      setCurrentShippingMethod('normal');
      setCheckoutShippingMethod('normal');
      return;
    }

    if (isMethodAvailable(shippingMethod)) {
      return;
    }

    const fallbackMethod = availableShippingMethods[0] || 'pickup';
    setCurrentShippingMethod(fallbackMethod);
    setCheckoutShippingMethod(fallbackMethod);
  }, [availableShippingMethods, shippingMethod, isMethodAvailable, setCheckoutShippingMethod]);

  // ---- cart / session -------------------------------------------------------
  const { items, isLoading, isGuest, refreshCart, updateItem, removeItem, clearCart } = useCart();
  const { openLoginModal } = useLoginModalStore();

  const { data: session, status: sessionStatus } = useSession();
  const { data: addresses } = useAddresses();
  const createAddressMutation = useAddAddress();

  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;
  const isSessionLoading = sessionStatus === 'loading';
  const contactEmail = session?.user?.email ?? '';
  const userName = session?.user?.name ?? null;

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);
  const [saveShippingAddressToAccount, setSaveShippingAddressToAccount] = useState(true);
  const [notes, setNotes] = useState<string>('');

  // ---- line pricing ---------------------------------------------------------
  const itemPricings = useMemo<CartItemPricing[]>(
    () => items.map((item) => calculateCartItemPricing(item)),
    [items]
  );

  const subtotal = useMemo(
    () => itemPricings.reduce((sum, pricing) => sum + pricing.totalPrice, 0),
    [itemPricings]
  );

  const lineSavings = useMemo(() => sumLineSavings(itemPricings), [itemPricings]);

  // ---- payment method + section state ---------------------------------------
  const [activePayment, setActivePayment] = useState<string>('credit-card');

  const [sections, setSections] = useState<Record<CheckoutSectionKey, boolean>>(() => ({
    delivery: false,
    shipping: storedShippingMethod !== 'pickup',
    billing: false,
    notes: false,
    summary: true,
    mobileSummary: false,
  }));

  const toggleSection = useCallback((key: CheckoutSectionKey) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setSection = useCallback((key: CheckoutSectionKey, open: boolean) => {
    setSections((prev) => (prev[key] === open ? prev : { ...prev, [key]: open }));
  }, []);

  // ---- live stock -----------------------------------------------------------
  const [outOfStockProductIds, setOutOfStockProductIds] = useState<Set<string>>(
    () => new Set<string>()
  );

  const checkoutProductIds = useMemo(
    () => items.map((i) => i._id || i.id).filter(Boolean) as string[],
    [items]
  );

  useProductSocket({
    productIds: checkoutProductIds,
    onUpdate: (update) => {
      for (const event of update.events) {
        const e = event as unknown as { type: string; data: Record<string, unknown> };
        const stock =
          e.type === 'product_update'
            ? e.data.stock
            : e.type === 'inventory_update'
              ? e.data.currentStock
              : undefined;
        if (typeof stock === 'number' && stock === 0) {
          setOutOfStockProductIds((prev) => {
            const next = new Set(prev);
            next.add(update.productId);
            return next;
          });
        }
      }
    },
  });

  // E3 — drop out-of-stock flags for items no longer in the cart.
  useEffect(() => {
    const cartIds = new Set(items.map((i) => i._id || i.id));
    setOutOfStockProductIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => cartIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  // D-6 — line-level projection of the product-keyed socket set. Per-line UI must
  // consume this; canProceedToPayment keeps using the product-id set.
  const outOfStockCartItemIds = useMemo(() => {
    const next = new Set<string>();
    if (outOfStockProductIds.size === 0) return next;

    for (const item of items) {
      const productId = item._id || item.id;
      if (productId && outOfStockProductIds.has(productId)) {
        next.add(item.cartItemId);
      }
    }
    return next;
  }, [items, outOfStockProductIds]);

  // E4 — one-shot refresh so the subtotal reflects edits made on the cart page.
  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- addresses ------------------------------------------------------------
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddress>(EMPTY_CHECKOUT_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState<boolean>(true);
  const [billingAddress, setBillingAddress] = useState<CheckoutAddress>(EMPTY_CHECKOUT_ADDRESS);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | null>(null);

  const {
    data: shippingConfigs,
    isLoading: isLoadingShippingConfigs,
    error: shippingConfigError,
  } = useAllShippingConfig();

  const shippingLocation = useCheckoutLocationOptions(shippingConfigs, shippingAddress);
  const billingLocation = useCheckoutLocationOptions(shippingConfigs, billingAddress);

  const selectedCountryConfig = shippingLocation.countryConfig;
  const selectedStateConfig = shippingLocation.stateConfig;
  const selectedLocationMeta = shippingLocation.locationMeta;

  // E5 / E6 / E7 — the reset cascade. Source order is load-bearing: each is a
  // functional update with an identity-preserving early return, and re-ordering
  // them produces extra renders and spurious clears.
  useEffect(() => {
    if (!shippingConfigs || shippingConfigs.length === 0) {
      return;
    }

    setShippingAddress((prev) => {
      const hasCurrentCountry = prev.country
        ? shippingConfigs.some((config) => config.countryName === prev.country)
        : false;

      if (hasCurrentCountry) {
        return prev;
      }

      const fallback =
        shippingConfigs.find((config) => config.countryName.toLowerCase() === 'nigeria') ||
        shippingConfigs[0];

      return {
        ...prev,
        country: fallback.countryName,
        state: '',
        lga: '',
        city: '',
      };
    });
  }, [shippingConfigs]);

  useEffect(() => {
    if (!selectedCountryConfig) {
      return;
    }

    setShippingAddress((prev) => {
      if (!prev.state) {
        return prev;
      }

      const hasState = selectedCountryConfig.states.some((state) => state.name === prev.state);
      if (hasState) {
        return prev;
      }

      return {
        ...prev,
        state: '',
        lga: '',
        city: '',
      };
    });
  }, [selectedCountryConfig]);

  useEffect(() => {
    if (!selectedStateConfig) {
      return;
    }

    setShippingAddress((prev) => {
      if (!prev.lga) {
        return prev;
      }

      // An `lga` value is valid if it matches EITHER an LGA name OR a city name —
      // the LGA select genuinely writes city names through its "Cities" optgroup.
      const availableLgas = selectedStateConfig.lgas ?? [];
      const availableCities = selectedStateConfig.cities ?? [];
      const hasLga =
        availableLgas.some((lga) => lga.name === prev.lga) ||
        availableCities.some((city) => city.name === prev.lga);
      if (hasLga) {
        return prev;
      }

      return {
        ...prev,
        lga: '',
        city: '',
      };
    });
  }, [selectedStateConfig]);

  // D-8(c) — the composed address whose coordinates we currently trust. Keeps a
  // saved address's real coordinates from being wiped and re-fetched, and stops
  // every keystroke from re-triggering the quote effect through isGeocodingAddress.
  const lastGeocodedKeyRef = useRef<string | null>(null);

  const populateFormFromAddress = useCallback(
    (address: Address) => {
      const next = addressForConfigs(address, shippingConfigs);

      // A saved address that already carries coordinates is trusted as-is.
      lastGeocodedKeyRef.current =
        typeof next.latitude === 'number' && typeof next.longitude === 'number'
          ? composeGeocodeAddress(next)
          : null;

      setShippingAddress(next);
      setAddressValidationError(null);
    },
    [shippingConfigs]
  );

  const populateBillingFromAddress = useCallback(
    (address: Address | null) => {
      if (!address) {
        setBillingAddress(EMPTY_CHECKOUT_ADDRESS);
        setSelectedBillingAddressId(null);
        return;
      }

      setBillingAddress(addressForConfigs(address, shippingConfigs));
      setSelectedBillingAddressId(address._id);
    },
    [shippingConfigs]
  );

  // D-7 — set once, never cleared. Without it, picking "Enter new address
  // manually" nulls selectedAddressId, re-arms this effect and instantly
  // re-applies the saved address, making manual entry impossible.
  const hasAutoSelectedAddressRef = useRef(false);

  useEffect(() => {
    if (hasAutoSelectedAddressRef.current) return;

    if (
      addresses &&
      addresses.length > 0 &&
      !isGuest &&
      shippingMethod !== 'pickup' &&
      session?.user?.email &&
      !selectedAddressId
    ) {
      const activeAddress = addresses.find((a) => a.active);
      if (activeAddress) {
        hasAutoSelectedAddressRef.current = true;
        populateFormFromAddress(activeAddress);
        setSelectedAddressId(activeAddress._id);
      }
    }
  }, [addresses, isGuest, shippingMethod, session, selectedAddressId, populateFormFromAddress]);

  // D-9 — pickup has no shipping address to be "the same as", so billing collapses
  // to same-as-shipping and the payload carries no billingAddress.
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setBillingSameAsShipping(true);
    }
  }, [deliveryType]);

  const effectiveBillingSameAsShipping = deliveryType === 'pickup' ? true : billingSameAsShipping;

  const handleShippingAddressChange = useCallback(
    <K extends keyof CheckoutAddress>(field: K, value: CheckoutAddress[K]) => {
      setShippingAddress((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleBillingAddressChange = useCallback(
    <K extends keyof CheckoutAddress>(field: K, value: CheckoutAddress[K]) => {
      setBillingAddress((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---- shipping cost / submission state -------------------------------------
  const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
  const [shippingCalculationError, setShippingCalculationError] = useState<string | null>(null);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState<boolean>(false);
  const [isAcceptingCorrections, setIsAcceptingCorrections] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<SecureCheckoutSuccessResponse | null>(
    null
  );
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  // D-3 — payload + errors + modal as one value. Splitting them let the modal sit
  // open with stale errors while the button had already flipped back.
  const [corrections, setCorrections] = useState<CheckoutCorrectionsState>(EMPTY_CORRECTIONS);
  const isAcceptingCorrectionsRef = useRef(false);

  const setCorrectionModalOpen = useCallback((open: boolean) => {
    setCorrections((prev) => (prev.isModalOpen === open ? prev : { ...prev, isModalOpen: open }));
  }, []);

  // ---- coupon (controller-owned; NOT persisted) ------------------------------
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const validateCouponMutation = useValidateCoupon();
  const isValidatingCoupon = validateCouponMutation.isPending;

  const buildCouponRequest = useCallback(
    (code: string, orderTotal: number): ValidateCouponRequest => ({
      code: code.trim().toUpperCase(),
      orderTotal,
      productIds: items.map((item) => item._id || item.id),
      categoryIds: items
        .map((item) => (item.category ? String(item.category) : null))
        .filter((category): category is string => category !== null),
    }),
    [items]
  );

  // `${code}|${orderTotal}` already answered by the server — stops the re-check
  // effect from firing a duplicate request immediately after an apply/hydrate.
  const lastCouponValidationKeyRef = useRef<string | null>(null);
  const hasHydratedCouponRef = useRef(false);

  // D-4 — hydrate the cart page's coupon ONCE, then clear the persisted copy.
  // Never clearCheckoutState(): that would also reset shippingMethod and break
  // the cart -> checkout handoff.
  useEffect(() => {
    if (hasHydratedCouponRef.current) return;
    hasHydratedCouponRef.current = true;

    const stored = useCheckoutStore.getState().discountInfo;

    if (stored && stored.couponCode && typeof stored.amount === 'number' && stored.amount > 0) {
      setAppliedCoupon({
        code: stored.couponCode.toUpperCase(),
        amount: stored.amount,
        discountType: stored.couponDetails?.discountType ?? 'fixed',
        minOrderValue: stored.couponDetails?.minOrderValue ?? 0,
      });
    }

    setDiscountInfo(null);
  }, [setDiscountInfo]);

  const applyCoupon = useCallback(() => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    const orderTotal = subtotal;
    setCouponError(null);

    validateCouponMutation.mutate(buildCouponRequest(code, orderTotal), {
      onSuccess: (data) => {
        // A bad coupon is an HTTP 200 with valid:false, so it lands here too.
        if (data.success && data.valid && data.data) {
          const appliedCode = data.data.coupon.code || code;
          lastCouponValidationKeyRef.current = `${appliedCode}|${orderTotal}`;
          setAppliedCoupon({
            code: appliedCode,
            // Server-calculated naira amount, already resolved from
            // percentage/fixed and capped by maxDiscountAmount. Never recompute.
            amount: data.data.discount,
            discountType: data.data.discountType,
            minOrderValue: data.data.coupon.minOrderValue,
            stackable: data.data.coupon.stackable,
            couponId: data.data.coupon._id,
          });
          setCouponError(null);
          setCouponCodeInput('');
        } else {
          setCouponError(data.message || 'Coupon cannot be applied');
        }
      },
      onError: (error) => {
        setCouponError(error.message || 'Invalid coupon code');
      },
    });
  }, [couponCodeInput, subtotal, buildCouponRequest, validateCouponMutation]);

  const removeCoupon = useCallback(() => {
    lastCouponValidationKeyRef.current = null;
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  const buildCouponRequestRef = useRef(buildCouponRequest);
  buildCouponRequestRef.current = buildCouponRequest;
  const validateCouponRef = useRef(validateCouponMutation.mutateAsync);
  validateCouponRef.current = validateCouponMutation.mutateAsync;

  // §9.4.5 — re-validate whenever the subtotal moves. Without this a shopper can
  // qualify for a coupon, drop below minOrderValue, and keep the discount.
  useEffect(() => {
    const code = appliedCoupon?.code;
    if (!code) return;

    const key = `${code}|${subtotal}`;
    if (lastCouponValidationKeyRef.current === key) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      lastCouponValidationKeyRef.current = key;

      try {
        const data = await validateCouponRef.current(
          buildCouponRequestRef.current(code, subtotal)
        );
        if (cancelled) return;

        if (data.success && data.valid && data.data) {
          const amount = data.data.discount;
          setAppliedCoupon((prev) => (prev && prev.code === code ? { ...prev, amount } : prev));
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          setCouponError(data.message || 'Coupon is no longer valid for this order.');
        }
      } catch (error) {
        if (cancelled) return;
        setAppliedCoupon(null);
        setCouponError(
          error instanceof Error ? error.message : 'Coupon is no longer valid for this order.'
        );
      }
    }, COUPON_REVALIDATE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `appliedCoupon` itself is deliberately absent: the success path rewrites its
    // `amount`, and depending on the object identity would loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCoupon?.code]);

  const appliedCouponCodes = useMemo(
    () => (appliedCoupon?.code ? [appliedCoupon.code] : ([] as string[])),
    [appliedCoupon]
  );

  // ---- derived totals -------------------------------------------------------
  const cartStats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const uniqueProducts = corrections.payload?.summary.itemsRemaining ?? items.length;
    return { totalItems, uniqueProducts };
  }, [items, corrections.payload]);

  const resolvedDiscount = corrections.payload
    ? corrections.payload.summary.couponDiscount
    : appliedCoupon?.amount ?? 0;

  const resolvedSubtotal = corrections.payload?.summary.newSubtotal ?? subtotal;

  const resolvedShippingCost =
    shippingMethod === 'pickup'
      ? 0
      : calculatedShippingCost ?? corrections.payload?.summary.shippingCost ?? null;

  const totalBeforeShipping = corrections.payload
    ? corrections.payload.summary.newTotal - corrections.payload.summary.shippingCost
    : resolvedSubtotal - resolvedDiscount;

  const resolvedTotal =
    resolvedShippingCost === null ? null : totalBeforeShipping + resolvedShippingCost;

  const totalSavings = lineSavings + resolvedDiscount;

  // A cart identity change invalidates any correction the server sent. Skipped
  // while handleAcceptCorrections is mutating the cart itself — that handler owns
  // clearing the object once it finishes.
  useEffect(() => {
    if (isAcceptingCorrectionsRef.current) return;
    setCorrections((prev) => (isCorrectionsEmpty(prev) ? prev : EMPTY_CORRECTIONS));
  }, [items]);

  // ---- payload --------------------------------------------------------------
  const buildCheckoutPayload = useCallback(
    (acceptChanges: boolean = false): SecureCheckoutPayload => {
      const payloadDeliveryType: 'shipping' | 'pickup' | 'gig' =
        shippingMethod === 'pickup' ? 'pickup' : shippingMethod === 'gig' ? 'gig' : 'shipping';
      const shippingCostValue =
        payloadDeliveryType === 'pickup' ? 0 : calculatedShippingCost ?? 0;
      const etaDays =
        payloadDeliveryType === 'pickup' ? 0 : selectedLocationMeta?.etaDays ?? 0;
      const billingSame = payloadDeliveryType === 'pickup' ? true : billingSameAsShipping;

      const payload: SecureCheckoutPayload = {
        items: items.map((item) => {
          const pricing = calculateCartItemPricing(item);
          return {
            _id: item._id,
            product: item._id || item.id,
            qty: item.qty,
            selectedAttributes: item.selectedAttributes,
            unitPrice: pricing.unitPrice,
            totalPrice: pricing.totalPrice,
            sale: pricing.sale,
            saleVariantIndex: item.selectedVariant,
            appliedDiscount: pricing.appliedDiscount,
            saleDiscount: pricing.saleDiscount,
            tierDiscount: pricing.tierDiscount,
            pricingTier: pricing.pricingTier,
            discountAmount: pricing.discountAmount,
            productSnapshot: {
              name: item.name || 'Product',
              price: item.price || 0,
              sku: item.sku || '',
              image:
                item.description_images?.find((img) => img.cover_image)?.url ||
                item.description_images?.[0]?.url ||
                '',
            },
          };
        }),
        shippingAddress:
          payloadDeliveryType === 'shipping' || payloadDeliveryType === 'gig'
            ? { ...toAddressPayload(shippingAddress), email: contactEmail }
            : undefined,
        billingSameAsShipping: billingSame,
        paymentMethod: activePayment,
        couponCodes: appliedCouponCodes,
        taxPrice: 0,
        subtotal,
        total: subtotal - resolvedDiscount + shippingCostValue,
        totalDiscount: resolvedDiscount,
        estimatedShipping: {
          cost: shippingCostValue,
          days: etaDays,
        },
        deliveryType: payloadDeliveryType,
        shippingCost: shippingCostValue,
        acceptChanges,
        notes,
      };

      // The backend rejects billingSameAsShipping:false with no billingAddress, and
      // rejects a stray billingAddress alongside `true`. Only ever send one shape.
      if (!billingSame) {
        payload.billingAddress = toAddressPayload(billingAddress);
      }

      return payload;
    },
    [
      shippingMethod,
      calculatedShippingCost,
      selectedLocationMeta,
      items,
      shippingAddress,
      contactEmail,
      billingSameAsShipping,
      billingAddress,
      activePayment,
      appliedCouponCodes,
      subtotal,
      resolvedDiscount,
      notes,
    ]
  );

  // ---- cart corrections -----------------------------------------------------
  const handleAcceptCorrections = useCallback(async () => {
    const acceptedErrors = corrections.errors;
    if (!acceptedErrors) {
      return;
    }

    isAcceptingCorrectionsRef.current = true;
    setIsAcceptingCorrections(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);
    setCorrections((prev) => (prev.isModalOpen ? { ...prev, isModalOpen: false } : prev));

    try {
      if (acceptedErrors.products && acceptedErrors.products.length > 0) {
        for (const productError of acceptedErrors.products) {
          // Matched by PRODUCT id — the backend reports productId, not cartItemId.
          const cartItem = items.find((item) => {
            const itemProductId = item._id || item.id;
            return itemProductId === productError.productId;
          });

          if (!cartItem) {
            continue;
          }

          switch (productError.suggestedAction) {
            case 'remove':
              removeItem(cartItem.cartItemId);
              break;

            case 'reduceQuantity':
              updateItem(cartItem.cartItemId, {
                qty: productError.availableStock,
              });
              break;

            case 'changeAttribute':
              if (productError.availableAttributes && productError.availableAttributes.length > 0) {
                updateItem(cartItem.cartItemId, {
                  selectedAttributes: productError.availableAttributes[0],
                });
              } else {
                removeItem(cartItem.cartItemId);
              }
              break;

            case 'acceptPrice':
              // Price change only — nothing to edit in the cart.
              break;
          }
        }

        // Let the cart state updates propagate before clearing the correction.
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setCorrections(EMPTY_CORRECTIONS);

      // Deliberately does NOT re-submit: the shopper reviews the corrected cart
      // and presses the button again.
    } catch (acceptError) {
      const errorMessage = handleApiError(acceptError);
      setCheckoutError(errorMessage);
      console.error('Accept corrections error:', acceptError);
    } finally {
      isAcceptingCorrectionsRef.current = false;
      setIsAcceptingCorrections(false);
    }
  }, [corrections.errors, items, removeItem, updateItem]);

  /**
   * 400 responses nest the correction one level deeper than 200 responses:
   * error.response.data.data vs response.data. Both depths are real.
   */
  const handleCheckoutCorrectionError = useCallback((error: unknown): boolean => {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const correctionData = error.response.data?.data as CheckoutCorrectionPayload | undefined;

      if (correctionData?.needsUpdate && correctionData.errors) {
        setCorrections({
          payload: correctionData,
          errors: correctionData.errors,
          isModalOpen: true,
        });
        setCheckoutError(null);
        return true;
      }
    }

    return false;
  }, []);

  // ---- validation -----------------------------------------------------------
  const isShippingFormComplete = useMemo(() => {
    if (shippingMethod === 'pickup') return true;

    return (
      (shippingAddress.firstName || '').trim() !== '' &&
      (shippingAddress.lastName || '').trim() !== '' &&
      (shippingAddress.phoneNumber || '').trim() !== '' &&
      shippingAddress.state !== '' &&
      (shippingAddress.lga || '').trim() !== '' &&
      (shippingAddress.city || '').trim() !== '' &&
      (shippingAddress.address1 || '').trim() !== '' &&
      shippingAddress.country !== '' &&
      (shippingAddress.zipCode || '').trim() !== ''
    );
  }, [shippingAddress, shippingMethod]);

  // Deliberately false for pickup: the quote effect reads this as "needs a quote".
  const isShippingAddressReady = useMemo(() => {
    if (shippingMethod === 'pickup') return false;

    return (
      shippingAddress.state !== '' &&
      (shippingAddress.lga || '').trim() !== '' &&
      (shippingAddress.city || '').trim() !== '' &&
      (shippingAddress.address1 || '').trim() !== '' &&
      shippingAddress.country !== '' &&
      (shippingAddress.zipCode || '').trim() !== ''
    );
  }, [shippingAddress, shippingMethod]);

  const isBillingComplete = useMemo(() => {
    if (effectiveBillingSameAsShipping) return true;
    return addressSchema.safeParse(billingAddress).success;
  }, [effectiveBillingSameAsShipping, billingAddress]);

  const checkoutFormValue = useMemo<CheckoutFormInput>(
    () => ({
      deliveryType,
      email: contactEmail,
      shippingAddress: deliveryType === 'pickup' ? undefined : shippingAddress,
      billingSameAsShipping: effectiveBillingSameAsShipping,
      billingAddress: effectiveBillingSameAsShipping ? undefined : billingAddress,
      notes,
      saveShippingAddressToAccount,
    }),
    [
      deliveryType,
      contactEmail,
      shippingAddress,
      effectiveBillingSameAsShipping,
      billingAddress,
      notes,
      saveShippingAddressToAccount,
    ]
  );

  // Nothing goes red until the first submit attempt; after that the projection is
  // re-derived on every change so errors clear as the shopper types.
  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    if (!hasAttemptedSubmit) return EMPTY_FIELD_ERRORS;

    const result = validateCheckoutForm(checkoutFormValue);
    return result.success ? EMPTY_FIELD_ERRORS : result.errors;
  }, [hasAttemptedSubmit, checkoutFormValue]);

  const canProceedToPayment = useMemo(() => {
    if (outOfStockProductIds.size > 0) return false;
    if (!isAuthenticated) return false;
    if (!isBillingComplete) return false;
    if (shippingMethod === 'pickup') return true;
    return isShippingFormComplete && calculatedShippingCost !== null && !isCalculatingShipping;
  }, [
    outOfStockProductIds,
    isAuthenticated,
    isBillingComplete,
    shippingMethod,
    isShippingFormComplete,
    calculatedShippingCost,
    isCalculatingShipping,
  ]);

  // ---- submission -----------------------------------------------------------
  const handleSubmitCheckout = useCallback(async () => {
    setHasAttemptedSubmit(true);

    if (items.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (shippingMethod !== 'pickup' && calculatedShippingCost === null) {
      setCheckoutError('Please calculate shipping before proceeding.');
      return;
    }

    const validation = validateCheckoutForm(checkoutFormValue);
    if (!validation.success) {
      setCheckoutError(
        validation.errors.form ?? 'Please complete the highlighted fields before continuing.'
      );
      return;
    }

    // Save a manually typed address to the account (non-blocking).
    if (
      saveShippingAddressToAccount &&
      !isGuest &&
      !selectedAddressId &&
      shippingMethod !== 'pickup'
    ) {
      const addressData: AddAddressInput = {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phoneNumber: shippingAddress.phoneNumber,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        zipCode: shippingAddress.zipCode,
        state: shippingAddress.state,
        lga: shippingAddress.lga,
        country: shippingAddress.country,
        active: false,
        latitude: shippingAddress.latitude,
        longitude: shippingAddress.longitude,
      };

      try {
        await createAddressMutation.mutateAsync(addressData);
        toast.success('Address saved to your account');
      } catch (error) {
        console.error('Failed to save address:', error);
      }
    }

    setIsSubmittingCheckout(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    try {
      await verifyPaymentReference();
      const payload = buildCheckoutPayload();

      const response = await apiClient.post<
        SecureCheckoutSuccessResponse | CheckoutCorrectionPayload
      >(
        api.checkout.secure,
        payload,
        { skipErrorHandling: true } as any // Handle errors manually
      );

      const responseData = response.data;
      if (!responseData) {
        throw new Error('Unable to complete checkout. Please try again.');
      }

      if ('needsUpdate' in responseData && responseData.needsUpdate) {
        const errors = responseData.errors || null;
        const showModal = !!(errors && hasProductIssues(errors));

        setCorrections({ payload: responseData, errors, isModalOpen: showModal });
        setCheckoutSuccess(null);

        const updatedShippingCost = responseData.summary.shippingCost;
        if (typeof updatedShippingCost === 'number') {
          setCalculatedShippingCost(updatedShippingCost);
        }
        setShippingCalculationError(null);

        if (!showModal && errors && errors.total) {
          // Total-only mismatch: blocking error, no modal.
          setCheckoutError(
            errors.total.message || 'Order total verification failed. Please refresh and try again.'
          );
        }
        // Shipping/coupon-only changes surface as inline alerts.

        return;
      }

      const successPayload = responseData as SecureCheckoutSuccessResponse;
      setCheckoutSuccess(successPayload);
      setCorrections(EMPTY_CORRECTIONS);
      setShippingCalculationError(null);

      if (!isGuest) {
        const refreshResult = refreshCart();
        await Promise.resolve(refreshResult);
      }

      if (typeof successPayload.summary.shippingCost === 'number') {
        setCalculatedShippingCost(successPayload.summary.shippingCost);
      }

      // Gated on paymentUrl while the popup is handed access_code — preserved.
      if (successPayload.payment?.paymentUrl) {
        if (successPayload.payment?.reference) {
          addPaymentReference(successPayload.payment.reference);
        }

        if (typeof window !== 'undefined') {
          const popup = new Paystack();
          popup.resumeTransaction(successPayload.payment?.access_code, {
            onCancel: async () => {
              await verifyPaymentReference();
            },
            onError: async () => {
              await verifyPaymentReference();
            },
            onSuccess: async () => {
              await verifyPaymentReference();
              setPaymentSuccess(true);
              clearCart();
            },
          });
        } else {
          router.push(successPayload.payment.paymentUrl);
        }
      }
    } catch (submitError) {
      let errorM: string;
      if (axios.isAxiosError(submitError)) {
        errorM = submitError.response?.data?.message || submitError.message;
      } else if (submitError instanceof Error) {
        errorM = submitError.message;
      } else {
        errorM = 'An unknown error occurred.';
      }

      if (errorM === 'No token provided') {
        if (isAuthenticated) {
          // A session without a backend token (e.g. a failed provider login): the
          // popup never shows while authenticated, so drop the broken session first.
          toast.error('Your session has expired. Please sign in again.');
          try {
            await signOut({ redirect: false });
          } catch (signOutError) {
            console.error('Failed to clear the expired session', signOutError);
          }
        }
        openLoginModal();
      } else {
        const isHandledAsCorrection = handleCheckoutCorrectionError(submitError);

        if (!isHandledAsCorrection) {
          setCheckoutError(handleApiError(submitError));
        }
      }
    } finally {
      setIsSubmittingCheckout(false);
    }
  }, [
    items,
    shippingMethod,
    calculatedShippingCost,
    checkoutFormValue,
    buildCheckoutPayload,
    isGuest,
    refreshCart,
    router,
    handleCheckoutCorrectionError,
    addPaymentReference,
    verifyPaymentReference,
    clearCart,
    saveShippingAddressToAccount,
    selectedAddressId,
    shippingAddress,
    createAddressMutation,
    openLoginModal,
    isAuthenticated,
  ]);

  // ---- geocoding (MUST stay declared before the quote effect) ----------------
  // GIG will not quote without coordinates, so they are resolved here and the
  // quote effect stands by on isGeocodingAddress.
  useEffect(() => {
    if (shippingMethod !== 'gig') return;
    if (!shippingAddress.address1 || !shippingAddress.state) return;

    const addressParts = composeGeocodeAddress(shippingAddress);
    const hasCoordinates =
      typeof shippingAddress.latitude === 'number' &&
      typeof shippingAddress.longitude === 'number';

    // Already resolved for exactly this address — do not wipe and re-fetch.
    if (lastGeocodedKeyRef.current === addressParts && hasCoordinates) return;

    let cancelled = false;

    // Clear stale coordinates immediately so the quote effect cannot fire with
    // old coords while a new lookup is in flight.
    setShippingAddress((prev) =>
      prev.latitude === undefined && prev.longitude === undefined
        ? prev
        : { ...prev, latitude: undefined, longitude: undefined }
    );
    setAddressValidationError(null);
    setIsGeocodingAddress(true);

    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressParts)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await resp.json();
        if (cancelled) return;

        if (data.status === 'OK' && data.results?.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          lastGeocodedKeyRef.current = addressParts;
          setShippingAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }));
          setAddressValidationError(null);
        } else {
          lastGeocodedKeyRef.current = null;
          setShippingAddress((prev) => ({
            ...prev,
            latitude: undefined,
            longitude: undefined,
          }));
          setAddressValidationError('Address not found. Please enter a valid address.');
        }
      } catch {
        if (cancelled) return;
        lastGeocodedKeyRef.current = null;
        setShippingAddress((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        setAddressValidationError('Could not validate address. Please check your connection.');
      } finally {
        if (!cancelled) setIsGeocodingAddress(false);
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsGeocodingAddress(false);
    };
    // latitude/longitude are read but deliberately NOT deps: this effect writes
    // them, and depending on them would cost an extra debounce cycle per lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shippingMethod,
    shippingAddress.address1,
    shippingAddress.city,
    shippingAddress.lga,
    shippingAddress.state,
    shippingAddress.country,
  ]);

  // ---- shipping quote -------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;
    let debounceTimeout: ReturnType<typeof setTimeout>;

    const calculateShipping = async () => {
      if (shippingMethod === 'pickup') {
        setCalculatedShippingCost(0);
        setShippingCalculationError(null);
        setIsCalculatingShipping(false);
        return;
      }

      if (!isShippingAddressReady || items.length === 0) {
        setIsCalculatingShipping(false);
        setShippingCalculationError(null);
        setCalculatedShippingCost(null);
        return;
      }

      // GIG requires valid coordinates — they must come from geocoding.
      if (shippingMethod === 'gig') {
        if (isGeocodingAddress) {
          setIsCalculatingShipping(false);
          setCalculatedShippingCost(null);
          return;
        }
        // D-8(b): 0 is a legal coordinate, so test the type, not truthiness.
        if (
          typeof shippingAddress.latitude !== 'number' ||
          typeof shippingAddress.longitude !== 'number'
        ) {
          setIsCalculatingShipping(false);
          setCalculatedShippingCost(null);
          // addressValidationError is already set by the geocoding effect.
          return;
        }
      }

      setIsCalculatingShipping(true);
      setShippingCalculationError(null);
      setCalculatedShippingCost(null);

      const cartItemsPayload = items.map((item) => {
        const pricing = calculateCartItemPricing(item);
        return {
          product: item._id || item.id,
          qty: item.qty,
          selectedAttributes: item.selectedAttributes,
          unitPrice: pricing.unitPrice,
          totalPrice: pricing.totalPrice,
        };
      });

      const shippingAddressPayload = {
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        lga: shippingAddress.lga,
      };

      const destinationPayload = {
        countryName: shippingAddress.country,
        stateName: shippingAddress.state,
        // stateCode really is filled with the state NAME. The endpoint accepts it.
        stateCode: shippingAddress.state,
        lgaName: shippingAddress.lga,
        cityName: shippingAddress.city || undefined,
      };

      try {
        const fetchAuthenticatedQuote = async () => {
          const response = await apiClient.post<ShippingCalculationResponse>(
            api.checkout.calculateShipping,
            {
              items: cartItemsPayload,
              shippingAddress: shippingAddressPayload,
              deliveryType: 'shipping',
            }
          );

          if (!response.data || typeof response.data.shippingCost !== 'number') {
            throw new Error('Invalid shipping response');
          }

          return response.data.shippingCost;
        };

        const fetchPublicQuote = async () => {
          const response = await apiClient.post<FlatCartShippingResponse>(
            api.logistics.cartFlatShipping,
            {
              items: cartItemsPayload.map((item) => ({
                productId: item.product,
                quantity: item.qty,
              })),
              destination: destinationPayload,
              itemsSubtotal: subtotal,
            }
          );

          if (!response.data || typeof response.data.amount !== 'number') {
            throw new Error('Invalid shipping response');
          }

          return response.data.amount;
        };

        const fetchGIGQuote = async () => {
          const response = await apiClient.post<{ shippingCost: number; currency: string }>(
            api.gig.calculateShipping,
            {
              items: items.map((item) => ({
                productId: item._id || item.id,
                quantity: item.qty,
                selectedAttributes: item.selectedAttributes,
              })),
              receiverAddress: shippingAddress.address1,
              receiverState: shippingAddress.state,
              receiverCity: shippingAddress.city || undefined,
              receiverLatitude: shippingAddress.latitude,
              receiverLongitude: shippingAddress.longitude,
              receiverName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
              receiverPhoneNumber: shippingAddress.phoneNumber,
            }
          );

          if (!response.data || typeof response.data.shippingCost !== 'number') {
            throw new Error('Invalid GIG shipping response');
          }

          return response.data.shippingCost;
        };

        let shippingCost: number | null = null;

        if (shippingMethod === 'gig') {
          shippingCost = await fetchGIGQuote();
        } else if (!isGuest) {
          try {
            shippingCost = await fetchAuthenticatedQuote();
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              shippingCost = await fetchPublicQuote();
            } else {
              throw error;
            }
          }
        } else {
          shippingCost = await fetchPublicQuote();
        }

        if (shippingCost === null) {
          throw new Error('Shipping cost not available');
        }

        if (shippingMethod === 'express') {
          shippingCost = Math.round(shippingCost * EXPRESS_SURCHARGE_MULTIPLIER * 100) / 100;
        }

        if (isCancelled) return;
        setCalculatedShippingCost(shippingCost);
      } catch (error) {
        if (isCancelled) return;
        setShippingCalculationError(handleApiError(error));
        setCalculatedShippingCost(null);
      } finally {
        if (!isCancelled) {
          setIsCalculatingShipping(false);
        }
      }
    };

    debounceTimeout = setTimeout(() => {
      calculateShipping();
    }, SHIPPING_QUOTE_DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimeout);
    };
  }, [
    shippingMethod,
    isShippingAddressReady,
    items,
    isGuest,
    shippingAddress.country,
    shippingAddress.state,
    shippingAddress.city,
    shippingAddress.lga,
    shippingAddress.latitude,
    shippingAddress.longitude,
    shippingAddress.address1,
    shippingAddress.firstName,
    shippingAddress.lastName,
    shippingAddress.phoneNumber,
    isGeocodingAddress,
    subtotal,
  ]);

  const handleChangeShippingMethod = useCallback(
    (newMethod: ShippingMethodType) => {
      if (!isMethodAvailable(newMethod)) {
        return;
      }

      setCurrentShippingMethod(newMethod);
      setCheckoutShippingMethod(newMethod);
      setCalculatedShippingCost(newMethod === 'pickup' ? 0 : null);
      setSections((prev) => ({
        ...prev,
        delivery: false,
        shipping: newMethod !== 'pickup',
      }));
    },
    [isMethodAvailable, setCheckoutShippingMethod]
  );

  return {
    // cart
    items,
    isCartLoading: isLoading,
    isGuest,
    cartStats,
    subtotal,

    // contact / auth
    contactEmail,
    isAuthenticated,
    isSessionLoading,
    userName,
    openLoginModal,

    // delivery method
    shippingMethod,
    availableShippingMethods,
    shippingEtaLabel,
    isMethodAvailable,
    handleChangeShippingMethod,
    deliveryType,

    // shipping address
    shippingAddress,
    setShippingAddress,
    handleShippingAddressChange,
    populateFormFromAddress,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    saveShippingAddressToAccount,
    setSaveShippingAddressToAccount,
    addressValidationError,
    setAddressValidationError,
    shippingLocation,

    // billing
    billingSameAsShipping: effectiveBillingSameAsShipping,
    setBillingSameAsShipping,
    billingAddress,
    setBillingAddress,
    handleBillingAddressChange,
    selectedBillingAddressId,
    setSelectedBillingAddressId,
    populateBillingFromAddress,
    billingLocation,

    // logistics config
    shippingConfigs,
    isLoadingShippingConfigs,
    shippingConfigError,

    // shipping cost
    calculatedShippingCost,
    isCalculatingShipping,
    shippingCalculationError,
    isGeocodingAddress,

    // coupon
    couponCodeInput,
    setCouponCodeInput,
    appliedCoupon,
    couponError,
    isValidatingCoupon,
    applyCoupon,
    removeCoupon,

    // totals
    resolvedSubtotal,
    resolvedDiscount,
    resolvedShippingCost,
    resolvedTotal,
    lineSavings,
    totalSavings,

    // notes
    notes,
    setNotes,

    // sections
    sections,
    toggleSection,
    setSection,

    // validation
    fieldErrors,
    hasAttemptedSubmit,
    isShippingFormComplete,
    isShippingAddressReady,
    isBillingComplete,
    canProceedToPayment,

    // payment / submission
    activePayment,
    setActivePayment,
    isSubmittingCheckout,
    checkoutError,
    setCheckoutError,
    checkoutSuccess,
    paymentSuccess,
    handleSubmitCheckout,

    // cart corrections
    corrections,
    setCorrectionModalOpen,
    isAcceptingCorrections,
    handleAcceptCorrections,

    // live stock
    outOfStockProductIds,
    outOfStockCartItemIds,
  };
}

export default useCheckoutController;
