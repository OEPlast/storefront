'use client';
import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import { ProductDetail } from '@/types/product';
import productData from '@/data/Product.json';
import Product from '@/components/Product/Product';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext';
import { calculateCartTotals, calculateCartItemPricing } from '@/utils/cart-pricing';
import type { CartSnapshotPayload } from '@/types/cart';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCdnUrl } from '@/libs/cdn-url';
import { useAllShippingConfig, LogisticsConfigRecord, LogisticsStateConfig, LogisticsLocationConfig } from '@/hooks/useLogisticsLocations';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import CheckoutAlerts from '@/components/Checkout/CheckoutAlerts';
import CheckoutButton from '@/components/Checkout/CheckoutButton';
import CheckoutSuccess from '@/components/Checkout/CheckoutSuccess';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { usePaymentStore } from '@/store/usePaymentStore';
import CorrectionReviewModal from '@/components/Modal/CorrectionReviewModal';
import { CheckoutErrors, CheckoutCorrectionResponse } from '@/types/checkout';
import { parseCheckoutErrors, buildCartUpdatePayload, hasProductIssues, hasOnlyNonProductIssues } from '@/utils/cartCorrections';
import Paystack from '@paystack/inline-js';
import { formatToNaira } from '@/utils/currencyFormatter';
import { useSession } from 'next-auth/react';
import ShippingMethodSelector from '@/components/Checkout/ShippingMethodSelector';
import ShippingInformationForm from '@/components/Checkout/ShippingInformationForm';
import OrderNotesSection from '@/components/Checkout/OrderNotesSection';
import OrderSummaryBlock from '@/components/Checkout/OrderSummaryBlock';
import CartItemCard from '@/components/Checkout/CartItemCard';
import { useAddresses } from '@/hooks/queries/useAddresses';
import { useAddAddress } from '@/hooks/mutations/useAddressMutations';
import { Address, AddAddressInput } from '@/types/user';
import AddressSelector from '@/components/Checkout/AddressSelector';
import toast from 'react-hot-toast';

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
    const [currentShippingMethod, setCurrentShippingMethod] = React.useState<'pickup' | 'normal' | 'express'>(storedShippingMethod);
    const shippingMethod = currentShippingMethod; // pickup, normal, express

    const {
        items,
        isLoading,
        isGuest,
        refreshCart,
        updateItem,
        removeItem,
        clearCart
    } = useCart();

    // Session and address management
    const { data: session } = useSession();
    const { data: addresses } = useAddresses();
    const createAddressMutation = useAddAddress();
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressValidationError, setAddressValidationError] = useState<string | null>(null);
    const [saveManualAddressToAccount, setSaveManualAddressToAccount] = useState(true);

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
        const deliveryType: 'shipping' | 'pickup' = shippingMethod === 'pickup' ? 'pickup' : 'shipping';
        const shippingCostValue = deliveryType === 'shipping' ? calculatedShippingCost ?? 0 : 0;
        const etaDays = deliveryType === 'shipping' ? selectedLocationMeta?.etaDays ?? 0 : 0;

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
                deliveryType === 'shipping'
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
                        onSuccess: (ss) => {
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
            console.log(submitError);

            // Try to handle as correction error first
            const isHandledAsCorrection = handleCheckoutCorrectionError(submitError);

            if (!isHandledAsCorrection) {
                // Not a correction error - show generic error message
                setCheckoutError(handleApiError(submitError));
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
        if (shippingMethod === 'pickup') return true;
        return isShippingFormComplete && calculatedShippingCost !== null && !isCalculatingShipping;
    }, [shippingMethod, isShippingFormComplete, calculatedShippingCost, isCalculatingShipping]);

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
                    });

                    if (!response.data || typeof response.data.amount !== 'number') {
                        throw new Error('Invalid shipping response');
                    }

                    return response.data.amount;
                };

                let shippingCost: number | null = null;

                if (!isGuest) {
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
    ]);

    const handlePayment = (item: string) => {
        setActivePayment(item);
    };

    const handleShippingFormChange = <K extends keyof ShippingFormState>(field: K, value: ShippingFormState[K]) => {
        setShippingForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleChangeShippingMethod = (newMethod: 'pickup' | 'normal' | 'express') => {

        setCurrentShippingMethod(newMethod);
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
                                <div className="heading5">Information</div>

                                <ShippingMethodSelector
                                    currentMethod={shippingMethod}
                                    isExpanded={isChangingShippingMethod}
                                    onToggle={() => setIsChangingShippingMethod(!isChangingShippingMethod)}
                                    onMethodChange={handleChangeShippingMethod}
                                />

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
                                            isExpanded={isNotesExpanded}
                                            onToggle={() => setIsNotesExpanded(!isNotesExpanded)}
                                        />

                                        <CheckoutAlerts
                                            pendingCorrections={pendingCorrections}
                                            checkoutError={checkoutError}
                                            checkoutSuccess={checkoutSuccess}
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
                                    </form>
                                </div>
                            </div>

                        </div>
                        <div className="right w-full lg:w-5/12">
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
                                isCalculatingShipping={isCalculatingShipping}
                                shippingCalculationError={shippingCalculationError}
                                pendingCorrections={pendingCorrections}
                                parsedCheckoutErrors={parsedCheckoutErrors}
                                discountInfo={discountInfo}
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