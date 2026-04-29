'use client';
import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAllShippingConfig, LogisticsConfigRecord, LogisticsStateConfig, LogisticsLocationConfig } from '@/hooks/useLogisticsLocations';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import CheckoutAlerts from '@/components/Checkout/CheckoutAlerts';
import CheckoutButton from '@/components/Checkout/CheckoutButton';
import CheckoutSuccess from '@/components/Checkout/CheckoutSuccess';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { usePaymentStore } from '@/store/usePaymentStore';
import CorrectionReviewModal from '@/components/Modal/CorrectionReviewModal';
import { CheckoutErrors } from '@/types/checkout';
import { hasProductIssues } from '@/utils/cartCorrections';
import Paystack from '@paystack/inline-js';
import { useSession } from 'next-auth/react';
import ShippingMethodSelector from '@/components/Checkout/ShippingMethodSelector';
import ShippingInformationForm from '@/components/Checkout/ShippingInformationForm';
import OrderNotesSection from '@/components/Checkout/OrderNotesSection';
import OrderSummaryBlock from '@/components/Checkout/OrderSummaryBlock';
import { useAddresses } from '@/hooks/queries/useAddresses';
import { useAddAddress } from '@/hooks/mutations/useAddressMutations';
import { Address, AddAddressInput } from '@/types/user';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import toast from 'react-hot-toast';
import { useProductSocket } from '@/hooks/useProductSocket';

type ShippingFormState = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    country: string;
    state: string;
    lga: string;
    city: string;
    streetAddress: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
};

type ShippingCalculationResponse = {
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

type FlatCartShippingResponse = {
    amount: number;
};

type PublicGIGCheckoutConfig = {
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

const EXPRESS_SURCHARGE_MULTIPLIER = 1.5;

type CheckoutChangeDetail = {
    field: string;
    previous: number | string | null;
    current: number | string | null;
    message: string;
    context?: 'item' | 'coupon' | 'subtotal' | 'total' | 'shipping' | 'other';
};

type CheckoutCorrectionPayload = {
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

type SecureCheckoutSuccessResponse = {
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


const Checkout = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    // Use Zustand store for checkout state
    const { shippingMethod: storedShippingMethod, discountInfo, setShippingMethod: setCheckoutShippingMethod } = useCheckoutStore();
    const { add: addPaymentReference, verify: verifyPaymentReference, clear: clearPaymentReference } = usePaymentStore();
    const [currentShippingMethod, setCurrentShippingMethod] = React.useState<'pickup' | 'normal' | 'express' | 'gig'>(storedShippingMethod);
    const [availableShippingMethods, setAvailableShippingMethods] = React.useState<Array<'pickup' | 'normal' | 'gig'> | null>(null);
    const [shippingEtaLabel, setShippingEtaLabel] = React.useState<string>('2 - 5 days');
    const shippingMethod = currentShippingMethod; // pickup, normal, express, gig

    const isMethodAvailable = useCallback(
        (method: 'pickup' | 'normal' | 'express' | 'gig') => {
            if (availableShippingMethods === null) return true;
            if (method === 'express' || method === 'normal') {
                return availableShippingMethods.includes('normal');
            }

            return availableShippingMethods.includes(method);
        },
        [availableShippingMethods]
    );

    React.useEffect(() => {
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

    React.useEffect(() => {
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

    const {
        items,
        isLoading,
        isGuest,
        refreshCart,
        updateItem,
        removeItem,
        clearCart
    } = useCart();
    const { openLoginModal } = useLoginModalStore();


    // Session and address management
    const { data: session } = useSession();
    const { data: addresses } = useAddresses();
    const createAddressMutation = useAddAddress();
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressValidationError, setAddressValidationError] = useState<string | null>(null);
    const [saveManualAddressToAccount, setSaveManualAddressToAccount] = useState(true);
    const [notes, setNotes] = useState<string>('');

    // Calculate subtotal from items using ModalCart's exact pricing method
    const subtotal = React.useMemo(() => {
        return items.reduce((sum, item) => {
            const pricing = calculateCartItemPricing(item);
            return sum + pricing.totalPrice;
        }, 0);
    }, [items]);

    const [activePayment, setActivePayment] = useState<string>('credit-card');
    const [isShippingExpanded, setIsShippingExpanded] = useState<boolean>(shippingMethod !== 'pickup');
    const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);
    const [isOrdersExpanded, setIsOrdersExpanded] = useState<boolean>(true);
    const [isChangingShippingMethod, setIsChangingShippingMethod] = useState<boolean>(false);

    // Live stock tracking via socket
    const [outOfStockProductIds, setOutOfStockProductIds] = useState<Set<string>>(new Set());

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
                    e.type === 'product_update' ? e.data.stock :
                    e.type === 'inventory_update' ? e.data.currentStock : undefined;
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

    // Clear out-of-stock flags for items that were removed from cart
    React.useEffect(() => {
        const cartIds = new Set(items.map((i) => i._id || i.id));
        setOutOfStockProductIds((prev) => {
            const next = new Set(Array.from(prev).filter((id) => cartIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [items]);

    // Refresh cart data when checkout page mounts to ensure accurate subtotal after cart edits
    React.useEffect(() => {
        refreshCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Shipping form state
    const [shippingForm, setShippingForm] = useState<ShippingFormState>({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        country: 'Nigeria',
        state: '',
        lga: '',
        city: '',
        streetAddress: '',
        postalCode: '',
    });

    const { data: shippingConfigs, isLoading: isLoadingShippingConfigs, error: shippingConfigError } = useAllShippingConfig();

    React.useEffect(() => {
        if (!shippingConfigs || shippingConfigs.length === 0) {
            return;
        }

        setShippingForm((prev) => {
            const hasCurrentCountry = prev.country
                ? shippingConfigs.some((config) => config.countryName === prev.country)
                : false;

            if (hasCurrentCountry) {
                return prev;
            }

            const fallback =
                shippingConfigs.find((config) => config.countryName.toLowerCase() === 'nigeria') || shippingConfigs[0];

            return {
                ...prev,
                country: fallback.countryName,
                state: '',
                lga: '',
                city: '',
            };
        });
    }, [shippingConfigs]);

    const selectedCountryConfig: LogisticsConfigRecord | undefined = React.useMemo(() => {
        if (!shippingConfigs) {
            return undefined;
        }
        return shippingConfigs.find((config) => config.countryName === shippingForm.country);
    }, [shippingConfigs, shippingForm.country]);

    React.useEffect(() => {
        if (!selectedCountryConfig) {
            return;
        }

        setShippingForm((prev) => {
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

    const selectedStateConfig: LogisticsStateConfig | undefined = React.useMemo(() => {
        if (!selectedCountryConfig) {
            return undefined;
        }
        return selectedCountryConfig.states.find((state) => state.name === shippingForm.state);
    }, [selectedCountryConfig, shippingForm.state]);

    React.useEffect(() => {
        if (!selectedStateConfig) {
            return;
        }

        setShippingForm((prev) => {
            if (!prev.lga) {
                return prev;
            }

            const availableLgas = selectedStateConfig.lgas ?? [];
            const availableCities = selectedStateConfig.cities ?? [];
            const hasLga = availableLgas.some((lga) => lga.name === prev.lga) || availableCities.some((city) => city.name === prev.lga);
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

    const availableStates = selectedCountryConfig?.states ?? [];
    const availableCities: LogisticsLocationConfig[] = selectedStateConfig?.cities ?? [];
    const availableLGAs: LogisticsLocationConfig[] = React.useMemo(() => {
        return selectedStateConfig?.lgas ?? [];
    }, [selectedStateConfig]);

    // Function to populate form from selected address
    const populateFormFromAddress = useCallback((address: Address) => {
        // Check if address country is in available shipping configs
        const isCountryAvailable = shippingConfigs?.some((config) => config.countryName === address.country);

        // If country is not available, default to Nigeria or empty string
        const countryToUse = isCountryAvailable
            ? address.country
            : (shippingConfigs?.find((config) => config.countryName.toLowerCase() === 'nigeria')?.countryName || '');

        // If country changed, clear state/lga/city
        const shouldClearLocation = !isCountryAvailable;

        // Populate form with address data
        setShippingForm({
            firstName: address.firstName,
            lastName: address.lastName,
            email: session?.user?.email || '',
            phoneNumber: address.phoneNumber,
            country: countryToUse,
            state: shouldClearLocation ? '' : address.state,
            lga: shouldClearLocation ? '' : address.lga,
            city: shouldClearLocation ? '' : address.city,
            streetAddress: address.address1,
            postalCode: address.zipCode,
            latitude: address.latitude,
            longitude: address.longitude,
        });

        setAddressValidationError(null);
    }, [shippingConfigs, session]);

    // Auto-populate active address on mount
    React.useEffect(() => {
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
                populateFormFromAddress(activeAddress);
                setSelectedAddressId(activeAddress._id);
            }
        }
    }, [addresses, isGuest, shippingMethod, session, selectedAddressId, populateFormFromAddress]);

    const appliedCouponCodes = useMemo(() => {
        // Use discount info from checkout store
        if (discountInfo?.couponCode) {
            return [discountInfo.couponCode];
        }
        return [] as string[];
    }, [discountInfo]);

    const selectedLocationMeta = useMemo(() => {
        if (!selectedStateConfig) {
            return undefined;
        }

        if (shippingForm.city) {
            const cityMatch = selectedStateConfig.cities?.find((city) => city.name === shippingForm.city);
            if (cityMatch) {
                return cityMatch;
            }
        }

        if (shippingForm.lga) {
            const cityAlias = selectedStateConfig.cities?.find((city) => city.name === shippingForm.lga);
            if (cityAlias) {
                return cityAlias;
            }
            const lgaMatch = selectedStateConfig.lgas?.find((lga) => lga.name === shippingForm.lga);
            if (lgaMatch) {
                return lgaMatch;
            }
        }

        return undefined;
    }, [selectedStateConfig, shippingForm.city, shippingForm.lga]);

    // Shipping calculation state
    const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
    const [shippingCalculationError, setShippingCalculationError] = useState<string | null>(null);
    const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false);
    const [pendingCorrections, setPendingCorrections] = useState<CheckoutCorrectionPayload | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isSubmittingCheckout, setIsSubmittingCheckout] = useState<boolean>(false);
    const [isAcceptingCorrections, setIsAcceptingCorrections] = useState<boolean>(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState<SecureCheckoutSuccessResponse | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
    const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
    const [parsedCheckoutErrors, setParsedCheckoutErrors] = useState<CheckoutErrors | null>(null);

    // Calculate cart statistics
    const cartStats = useMemo(() => {
        const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
        const uniqueProducts = pendingCorrections?.summary.itemsRemaining ?? items.length;
        return { totalItems, uniqueProducts };
    }, [items, pendingCorrections]);

    // Use discount from Zustand store
    const resolvedDiscount = pendingCorrections
        ? pendingCorrections.summary.couponDiscount
        : discountInfo?.amount || 0;

    const resolvedSubtotal = pendingCorrections?.summary.newSubtotal ?? subtotal;

    const resolvedShippingCost = shippingMethod === 'pickup'
        ? 0
        : calculatedShippingCost ?? pendingCorrections?.summary.shippingCost ?? null;

    const totalBeforeShipping = pendingCorrections
        ? pendingCorrections.summary.newTotal - pendingCorrections.summary.shippingCost
        : resolvedSubtotal - resolvedDiscount;

    const resolvedTotal = resolvedShippingCost === null
        ? null
        : totalBeforeShipping + resolvedShippingCost;

    React.useEffect(() => {
        setPendingCorrections(null);
    }, [items]);

    const buildCheckoutPayload = useCallback((acceptChanges: boolean = false) => {
        const deliveryType: 'shipping' | 'pickup' | 'gig' = shippingMethod === 'pickup' ? 'pickup' : shippingMethod === 'gig' ? 'gig' : 'shipping';
        const shippingCostValue = deliveryType === 'pickup' ? 0 : calculatedShippingCost ?? 0;
        const etaDays = deliveryType === 'pickup' ? 0 : selectedLocationMeta?.etaDays ?? 0;

        return {
            items: items.map((item) => {
                const pricing = calculateCartItemPricing(item);
                return {
                    _id: item._id,
                    product: item._id || item.id, // Use product ID
                    qty: item.qty,
                    selectedAttributes: item.selectedAttributes,
                    unitPrice: pricing.unitPrice,
                    totalPrice: pricing.totalPrice,
                    sale: pricing.sale,
                    saleVariantIndex: item.selectedVariant,
                    appliedDiscount: pricing.appliedDiscount, // Cumulative discount (sale + tier)
                    saleDiscount: pricing.saleDiscount, // Sale discount only
                    tierDiscount: pricing.tierDiscount, // Tier discount only
                    pricingTier: pricing.pricingTier, // Tier info for validation
                    discountAmount: pricing.discountAmount,
                    productSnapshot: {
                        name: item.name || 'Product',
                        price: item.price || 0,
                        sku: item.sku || '',
                        image: item.description_images?.find((img) => img.cover_image)?.url || item.description_images?.[0]?.url || '',
                    },
                };
            }),
            shippingAddress:
                (deliveryType === 'shipping' || deliveryType === 'gig')
                    ? {
                        firstName: shippingForm.firstName,
                        lastName: shippingForm.lastName,
                        email: shippingForm.email,
                        phoneNumber: shippingForm.phoneNumber,
                        country: shippingForm.country,
                        state: shippingForm.state,
                        city: shippingForm.city,
                        lga: shippingForm.lga,
                        address1: shippingForm.streetAddress,
                        zipCode: shippingForm.postalCode,
                        latitude: shippingForm.latitude,
                        longitude: shippingForm.longitude,
                    }
                    : undefined,
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
            deliveryType,
            shippingCost: shippingCostValue,
            acceptChanges,
            notes
        };
    }, [shippingMethod, calculatedShippingCost, selectedLocationMeta, items, shippingForm, activePayment, appliedCouponCodes, subtotal, resolvedDiscount]);

    const handleAcceptCorrections = useCallback(async () => {
        if (!parsedCheckoutErrors) {
            return;
        }

        setIsAcceptingCorrections(true);
        setCheckoutError(null);
        setCheckoutSuccess(null);
        setShowCorrectionModal(false);

        try {
            // Step 1: Apply cart corrections locally (client-side only)
            if (parsedCheckoutErrors.products && parsedCheckoutErrors.products.length > 0) {
                // Process each product error
                for (const productError of parsedCheckoutErrors.products) {
                    // Find cart item by matching product ID (not cartItemId, as backend returns productId)
                    const cartItem = items.find(item => {
                        const itemProductId = item._id || item.id;
                        return itemProductId === productError.productId;
                    });

                    if (!cartItem) {
                        console.warn(`Cart item not found for product ${productError.productId}`);
                        continue;
                    }

                    // Apply correction based on suggested action
                    switch (productError.suggestedAction) {
                        case 'remove':
                            // Remove item from cart
                            console.log(`Removing item ${cartItem.cartItemId} (${productError.productName})`);
                            removeItem(cartItem.cartItemId);
                            break;

                        case 'reduceQuantity':
                            // Update quantity to available stock
                            console.log(`Reducing ${cartItem.cartItemId} quantity: ${cartItem.qty} → ${productError.availableStock}`);
                            updateItem(cartItem.cartItemId, {
                                qty: productError.availableStock,
                            });
                            break;

                        case 'changeAttribute':
                            // Update to first available attribute combination
                            if (productError.availableAttributes && productError.availableAttributes.length > 0) {
                                console.log(`Changing attributes for ${cartItem.cartItemId}`);
                                updateItem(cartItem.cartItemId, {
                                    selectedAttributes: productError.availableAttributes[0],
                                });
                            } else {
                                // No available attributes - remove item
                                console.log(`No available attributes, removing ${cartItem.cartItemId}`);
                                removeItem(cartItem.cartItemId);
                            }
                            break;

                        case 'acceptPrice':
                            // Price changed - no cart action needed, just log
                            console.log(`Price changed for ${cartItem.cartItemId}: ${productError.currentPrice} → ${productError.correctedPrice}`);
                            break;
                    }
                }

                // Small delay to ensure cart state updates propagate
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Step 2: Close modal and clear pending corrections
            setPendingCorrections(null);
            setParsedCheckoutErrors(null);

            // User will need to manually click "Place Order" again after seeing updated cart
            // This gives them a chance to review the corrected cart before proceeding

        } catch (acceptError) {
            const errorMessage = handleApiError(acceptError);
            setCheckoutError(errorMessage);
            console.error('Accept corrections error:', acceptError);
        } finally {
            setIsAcceptingCorrections(false);
        }
    }, [parsedCheckoutErrors, items, removeItem, updateItem]);

    /**
     * Reusable function to handle 400 checkout correction errors
     * Extracts nested correction data from error.response.data.data structure
     */
    const handleCheckoutCorrectionError = useCallback((error: unknown): boolean => {
        // Check if this is a 400 error with correction data
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            const correctionData = error.response.data?.data as CheckoutCorrectionPayload | undefined;

            if (correctionData?.needsUpdate && correctionData.errors) {
                setPendingCorrections(correctionData);
                setParsedCheckoutErrors(correctionData.errors);
                setShowCorrectionModal(true);
                setCheckoutError(null);
                return true;
            }
        }

        return false; // Not a correction error
    }, []);

    const handleSubmitCheckout = useCallback(async () => {

        if (items.length === 0) {
            setCheckoutError('Your cart is empty.');
            return;
        }

        if (shippingMethod !== 'pickup' && calculatedShippingCost === null) {
            setCheckoutError('Please calculate shipping before proceeding.');
            return;
        }

        // Save manually entered address to account (non-blocking) if checkbox is checked
        if (saveManualAddressToAccount && !isGuest && !selectedAddressId && shippingMethod !== 'pickup') {
            const addressData: AddAddressInput = {
                firstName: shippingForm.firstName,
                lastName: shippingForm.lastName,
                phoneNumber: shippingForm.phoneNumber,
                address1: shippingForm.streetAddress,
                address2: '',
                city: shippingForm.city,
                zipCode: shippingForm.postalCode,
                state: shippingForm.state,
                lga: shippingForm.lga,
                country: shippingForm.country,
                active: false,
                latitude: shippingForm.latitude,
                longitude: shippingForm.longitude,
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

            const response = await apiClient.post<SecureCheckoutSuccessResponse | CheckoutCorrectionPayload>(
                api.checkout.secure,
                payload,
                { skipErrorHandling: true } as any // Handle errors manually
            );

            const responseData = response.data;
            if (!responseData) {
                throw new Error('Unable to complete checkout. Please try again.');
            }


            if ('needsUpdate' in responseData && responseData.needsUpdate) {
                setPendingCorrections(responseData);
                setCheckoutSuccess(null);

                // Parse checkout errors
                const errors = responseData.errors || null;
                setParsedCheckoutErrors(errors);

                // Update shipping cost from summary
                const updatedShippingCost = responseData.summary.shippingCost;
                if (typeof updatedShippingCost === 'number') {
                    setCalculatedShippingCost(updatedShippingCost);
                }
                setShippingCalculationError(null);

                // Determine display strategy
                if (errors && hasProductIssues(errors)) {
                    // Product issues exist - show modal
                    setShowCorrectionModal(true);
                } else if (errors && errors.total) {
                    // Total-only error - show blocking error
                    setCheckoutError(errors.total.message || 'Order total verification failed. Please refresh and try again.');
                } else {
                    // Only shipping/coupon changes - these are shown as inline alerts (no modal)
                    // User can proceed or accept changes via button
                }

                return;
            }

            const successPayload = responseData as SecureCheckoutSuccessResponse;
            setCheckoutSuccess(successPayload);
            setPendingCorrections(null);
            setShippingCalculationError(null);

            if (!isGuest) {
                const refreshResult = refreshCart();
                await Promise.resolve(refreshResult);
            }

            if (typeof successPayload.summary.shippingCost === 'number') {
                setCalculatedShippingCost(successPayload.summary.shippingCost);
            }

            if (successPayload.payment?.paymentUrl) {
                // Store payment reference before opening payment popup
                if (successPayload.payment?.reference) {
                    addPaymentReference(successPayload.payment.reference);
                }

                if (typeof window !== 'undefined') {

                    const popup = new Paystack();
                    popup.resumeTransaction(successPayload.payment?.access_code, {
                        onCancel: async () => {
                            console.log('canelled');
                            await verifyPaymentReference();

                        },
                        onError: async (ee) => {
                            await verifyPaymentReference();
                            console.log('error', ee);

                        },
                        onLoad: (ll) => {
                            console.log('load', ll);

                        },
                        onSuccess: async (ss) => {
                            await verifyPaymentReference();
                            setPaymentSuccess(true);
                            clearCart();
                            console.log('success', ss);

                        }
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
                errorM = "An unknown error occurred.";
            }

            if (errorM === 'No token provided') {
                openLoginModal();
            } else {

                // Try to handle as correction error first
                const isHandledAsCorrection = handleCheckoutCorrectionError(submitError);

                if (!isHandledAsCorrection) {
                    // Not a correction error - show generic error message
                    setCheckoutError(handleApiError(submitError));
                }
            }
        } finally {
            setIsSubmittingCheckout(false);
        }
    }, [
        items.length,
        shippingMethod,
        calculatedShippingCost,
        buildCheckoutPayload,
        isGuest,
        refreshCart,
        router,
        handleCheckoutCorrectionError,
        addPaymentReference,
        verifyPaymentReference,
        clearCart,
        saveManualAddressToAccount,
        selectedAddressId,
        shippingForm,
        createAddressMutation
    ]);

    // Check if shipping form is complete (only needed for delivery methods)
    const isShippingFormComplete = useMemo(() => {
        if (shippingMethod === 'pickup') return true;

        return (
            (shippingForm.firstName || '').trim() !== '' &&
            (shippingForm.lastName || '').trim() !== '' &&
            (shippingForm.email || '').trim() !== '' &&
            (shippingForm.phoneNumber || '').trim() !== '' &&
            shippingForm.state !== '' &&
            (shippingForm.lga || '').trim() !== '' &&
            (shippingForm.city || '').trim() !== '' &&
            (shippingForm.streetAddress || '').trim() !== '' &&
            shippingForm.country !== '' &&
            (shippingForm.postalCode || '').trim() !== ''
        );
    }, [shippingForm, shippingMethod]);

    const isShippingAddressReady = useMemo(() => {
        if (shippingMethod === 'pickup') return false;

        return (
            shippingForm.state !== '' &&
            (shippingForm.lga || '').trim() !== '' &&
            (shippingForm.city || '').trim() !== '' &&
            (shippingForm.streetAddress || '').trim() !== '' &&
            shippingForm.country !== '' &&
            (shippingForm.postalCode || '').trim() !== ''
        );
    }, [shippingForm, shippingMethod]);

    // Check if payment button should be enabled
    const canProceedToPayment = useMemo(() => {
        if (outOfStockProductIds.size > 0) return false;
        if (shippingMethod === 'pickup') return true;
        return isShippingFormComplete && calculatedShippingCost !== null && !isCalculatingShipping;
    }, [outOfStockProductIds, shippingMethod, isShippingFormComplete, calculatedShippingCost, isCalculatingShipping]);

    // Geocode receiver address for GIG shipping (coordinates are mandatory)
    React.useEffect(() => {
        if (shippingMethod !== 'gig') return;
        if (!shippingForm.streetAddress || !shippingForm.state) return;

        let cancelled = false;

        // Clear stale coordinates immediately so the shipping calc won't fire
        // with old coords while a new geocoding request is in flight
        setShippingForm((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        setAddressValidationError(null);
        setIsGeocodingAddress(true);

        const timer = setTimeout(async () => {
            const addressParts = [
                shippingForm.streetAddress,
                shippingForm.lga,
                shippingForm.city,
                shippingForm.state,
                'Nigeria',
            ].filter(Boolean).join(', ');

            try {
                const resp = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressParts)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                );
                const data = await resp.json();
                if (cancelled) return;

                if (data.status === 'OK' && data.results?.length > 0) {
                    const { lat, lng } = data.results[0].geometry.location;
                    setShippingForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                    setAddressValidationError(null);
                } else {
                    setShippingForm((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
                    setAddressValidationError('Address not found. Please enter a valid address.');
                }
            } catch {
                if (cancelled) return;
                setShippingForm((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
                setAddressValidationError('Could not validate address. Please check your connection.');
            } finally {
                if (!cancelled) setIsGeocodingAddress(false);
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            setIsGeocodingAddress(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        shippingMethod,
        shippingForm.streetAddress,
        shippingForm.city,
        shippingForm.lga,
        shippingForm.state,
    ]);

    // Calculate shipping cost when form is complete
    React.useEffect(() => {
        let isCancelled = false;
        let debounceTimeout: NodeJS.Timeout;

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

            // GIG requires valid coordinates — they must come from geocoding
            if (shippingMethod === 'gig') {
                if (isGeocodingAddress) {
                    // Geocoding still in progress, stand by
                    setIsCalculatingShipping(false);
                    setCalculatedShippingCost(null);
                    return;
                }
                if (!shippingForm.latitude || !shippingForm.longitude) {
                    setIsCalculatingShipping(false);
                    setCalculatedShippingCost(null);
                    // addressValidationError is already set by the geocoding effect
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
                country: shippingForm.country,
                state: shippingForm.state,
                city: shippingForm.city,
                lga: shippingForm.lga,
            };

            const destinationPayload = {
                countryName: shippingForm.country,
                stateName: shippingForm.state,
                stateCode: shippingForm.state,
                lgaName: shippingForm.lga,
                cityName: shippingForm.city || undefined,
            };

            try {
                const fetchAuthenticatedQuote = async () => {
                    const response = await apiClient.post<ShippingCalculationResponse>(api.checkout.calculateShipping, {
                        items: cartItemsPayload,
                        shippingAddress: shippingAddressPayload,
                        deliveryType: 'shipping',
                    });

                    if (!response.data || typeof response.data.shippingCost !== 'number') {
                        throw new Error('Invalid shipping response');
                    }

                    return response.data.shippingCost;
                };

                const fetchPublicQuote = async () => {
                    const response = await apiClient.post<FlatCartShippingResponse>(api.logistics.cartFlatShipping, {
                        items: cartItemsPayload.map((item) => ({
                            productId: item.product,
                            quantity: item.qty,
                        })),
                        destination: destinationPayload,
                        itemsSubtotal: subtotal,
                    });

                    if (!response.data || typeof response.data.amount !== 'number') {
                        throw new Error('Invalid shipping response');
                    }

                    return response.data.amount;
                };

                const fetchGIGQuote = async () => {
                    const response = await apiClient.post<{ shippingCost: number; currency: string; }>(api.gig.calculateShipping, {
                        items: items.map((item) => ({
                            productId: item._id || item.id,
                            quantity: item.qty,
                            selectedAttributes: item.selectedAttributes,
                        })),
                        receiverAddress: shippingForm.streetAddress,
                        receiverState: shippingForm.state,
                        receiverCity: shippingForm.city || undefined,
                        receiverLatitude: shippingForm.latitude,
                        receiverLongitude: shippingForm.longitude,
                        receiverName: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
                        receiverPhoneNumber: shippingForm.phoneNumber,
                    });

                    if (!response.data || typeof response.data.shippingCost !== 'number') {
                        throw new Error('Invalid GIG shipping response');
                    }

                    return response.data.shippingCost;
                };

                let shippingCost: number | null = null;

                if (shippingMethod === 'gig') {
                    // GIG shipping: always call the GIG endpoint (requires auth)
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

        // Debounce shipping calculation by 1 second
        debounceTimeout = setTimeout(() => {
            calculateShipping();
        }, 1000);

        return () => {
            isCancelled = true;
            clearTimeout(debounceTimeout);
        };
    }, [
        shippingMethod,
        isShippingAddressReady,
        items,
        isGuest,
        shippingForm.country,
        shippingForm.state,
        shippingForm.city,
        shippingForm.lga,
        shippingForm.latitude,
        shippingForm.longitude,
        shippingForm.streetAddress,
        shippingForm.firstName,
        shippingForm.lastName,
        shippingForm.phoneNumber,
        isGeocodingAddress,
        subtotal,
    ]);

    const handlePayment = (item: string) => {
        setActivePayment(item);
    };

    const handleShippingFormChange = <K extends keyof ShippingFormState>(field: K, value: ShippingFormState[K]) => {
        setShippingForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleChangeShippingMethod = (newMethod: 'pickup' | 'normal' | 'express' | 'gig') => {
        if (!isMethodAvailable(newMethod)) {
            return;
        }

        setCurrentShippingMethod(newMethod);
        setCheckoutShippingMethod(newMethod);
        setCalculatedShippingCost(newMethod === 'pickup' ? 0 : null);
        setIsChangingShippingMethod(false);
        setIsShippingExpanded(newMethod !== 'pickup');


    };

    {/* Show success screen if checkout was successful */ }
    if (paymentSuccess) return (
        <CheckoutSuccess
            orderId={checkoutSuccess!.orderId}
        />
    );
    return (
        <>
            <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                <div className="text-content">
                    <div className="heading2 text-center m4-2">Checkout</div>
                </div>
            </div>
            <div className="cart-block md:py-20 py-10">
                <div className="container">
                    {/* Back to Cart Button */}
                    <div className="mb-4 md:mb-6">
                        <Link
                            href="/cart"
                            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-line rounded-lg hover:bg-surface transition-all text-button text-sm md:text-base"
                        >
                            <Icon.ArrowLeft size={18} weight="bold" className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden xs:inline">Back to Cart</span>
                            <span className="xs:hidden">Back</span>
                        </Link>
                    </div>

                    <div className="content-main flex flex-col-reverse lg:flex-row justify-between gap-4">
                        <div className="left w-full lg:w-1/2">


                            <div className="information mt-5">
                                {/* <div className="heading5">Information</div> */}

                                {availableShippingMethods === null ? (
                                    <div className="my-6 checkout-block">
                                        <div className="heading5">Delivery</div>
                                        <div className="mt-5 h-[60px] animate-pulse rounded-lg bg-gray-100" />
                                    </div>
                                ) : (
                                    <ShippingMethodSelector
                                        currentMethod={shippingMethod}
                                        availableMethods={availableShippingMethods}
                                        shippingEtaLabel={shippingEtaLabel}
                                        isExpanded={isChangingShippingMethod}
                                        onToggle={() => setIsChangingShippingMethod(!isChangingShippingMethod)}
                                        onMethodChange={handleChangeShippingMethod}
                                    />
                                )}

                                <div className="form-checkout">
                                    <form>
                                        {/* Shipping Information - Only for delivery methods */}
                                        {shippingMethod !== 'pickup' && (
                                            <ShippingInformationForm
                                                isExpanded={isShippingExpanded}
                                                onToggle={() => setIsShippingExpanded(!isShippingExpanded)}
                                                formState={shippingForm}
                                                onFormChange={handleShippingFormChange}
                                                setFormState={setShippingForm}
                                                addresses={addresses}
                                                selectedAddressId={selectedAddressId}
                                                onAddressSelect={(addr) => {
                                                    if (addr) {
                                                        populateFormFromAddress(addr);
                                                        setSelectedAddressId(addr._id);
                                                    } else {
                                                        setSelectedAddressId(null);
                                                    }
                                                }}
                                                setSelectedAddressId={setSelectedAddressId}
                                                isGuest={isGuest}
                                                shippingConfigs={shippingConfigs}
                                                isLoadingConfigs={isLoadingShippingConfigs}
                                                configError={shippingConfigError}
                                                selectedCountryConfig={selectedCountryConfig}
                                                selectedStateConfig={selectedStateConfig}
                                                availableStates={availableStates}
                                                availableCities={availableCities}
                                                availableLGAs={availableLGAs}
                                                addressValidationError={addressValidationError}
                                                setAddressValidationError={setAddressValidationError}
                                                saveToAccount={saveManualAddressToAccount}
                                                onSaveToAccountChange={setSaveManualAddressToAccount}
                                                isShippingFormComplete={isShippingFormComplete}
                                                populateFormFromAddress={populateFormFromAddress}
                                            />
                                        )}

                                        <OrderNotesSection
                                            notes={notes}
                                            setNotes={setNotes}
                                            isExpanded={isNotesExpanded}
                                            onToggle={() => setIsNotesExpanded(!isNotesExpanded)}
                                        />

                                        <CheckoutAlerts
                                            pendingCorrections={pendingCorrections}
                                            checkoutError={checkoutError}
                                            checkoutSuccess={checkoutSuccess}
                                        />

                                        <span className="block lg:hidden">
                                            <CheckoutButton
                                                pendingCorrections={!!pendingCorrections}
                                                isAcceptingCorrections={isAcceptingCorrections}
                                                canProceedToPayment={canProceedToPayment}
                                                isCalculatingShipping={isCalculatingShipping}
                                                isSubmittingCheckout={isSubmittingCheckout}
                                                shippingMethod={shippingMethod}
                                                isShippingFormComplete={isShippingFormComplete}
                                                handleAcceptCorrections={handleAcceptCorrections}
                                                handleSubmitCheckout={handleSubmitCheckout}
                                            />
                                        </span>
                                    </form>
                                </div>
                            </div>

                        </div>
                        <div className="right w-full lg:w-5/12">
                            <div className="checkout-block lg:sticky lg:top-[120px] border border-line rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">

                                <OrderSummaryBlock
                                    items={items}
                                    isLoading={isLoading}
                                    isExpanded={isOrdersExpanded}
                                    onToggle={() => setIsOrdersExpanded(!isOrdersExpanded)}
                                    cartStats={cartStats}
                                    resolvedSubtotal={resolvedSubtotal}
                                    resolvedDiscount={resolvedDiscount}
                                    resolvedShippingCost={resolvedShippingCost}
                                    resolvedTotal={resolvedTotal}
                                    shippingMethod={shippingMethod}
                                    shippingEtaLabel={shippingEtaLabel}
                                    isCalculatingShipping={isCalculatingShipping}
                                    shippingCalculationError={shippingCalculationError}
                                    pendingCorrections={pendingCorrections}
                                    parsedCheckoutErrors={parsedCheckoutErrors}
                                    discountInfo={discountInfo}
                                    outOfStockProductIds={outOfStockProductIds}
                                />
                                <span className="hidden lg:block">
                                    <CheckoutButton
                                        pendingCorrections={!!pendingCorrections}
                                        isAcceptingCorrections={isAcceptingCorrections}
                                        canProceedToPayment={canProceedToPayment}
                                        isCalculatingShipping={isCalculatingShipping}
                                        isSubmittingCheckout={isSubmittingCheckout}
                                        shippingMethod={shippingMethod}
                                        isShippingFormComplete={isShippingFormComplete}
                                        handleAcceptCorrections={handleAcceptCorrections}
                                        handleSubmitCheckout={handleSubmitCheckout}
                                    />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Correction Review Modal */}
            {parsedCheckoutErrors && showCorrectionModal && (
                <CorrectionReviewModal
                    isOpen={true}
                    checkoutErrors={parsedCheckoutErrors}
                    onAcceptAll={handleAcceptCorrections}
                    onClose={() => setShowCorrectionModal(false)}
                />
            )}

        </>

    );
};

export default Checkout;