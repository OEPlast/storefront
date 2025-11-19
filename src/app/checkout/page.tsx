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
    shippingCost: number;
    deliveryType: 'shipping' | 'pickup';
    correctedCart: CartSnapshotPayload & {
        couponDiscount?: number;
        validatedCoupons?: Array<{ code: string; discountAmount: number; }>;
        rejectedCoupons?: Array<{ code: string; reason: string; }>;
        status?: string;
        lastUpdated?: string;
        updatedAt?: string;
    };
    changes: string[];
    changeDetails: CheckoutChangeDetail[];
    checkoutErrors?: CheckoutErrors;
};

type SecureCheckoutSuccessResponse = {
    orderId: string;
    order: {
        _id: string;
        total: number;
        subtotal: number;
        couponDiscount: number;
        shippingPrice: number;
        deliveryType: 'shipping' | 'pickup';
        items: Array<{
            product: string;
            qty: number;
            price: number;
            attributes: Array<{ name: string; value: string; }>;
            sale?: string;
            saleType?: string;
            saleDiscount?: number;
        }>;
        status: string;
        isPaid: boolean;
    };
    validation: {
        priceValidated: boolean;
        totalDiscrepancy: number;
    };
    payment: {
        paymentUrl: string;
        reference: string;
        transactionId: string;
        access_code: string;
    } | null;
};


const Checkout = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    // Use Zustand store for checkout state
    const { shippingMethod: storedShippingMethod, discountInfo, setShippingMethod: setCheckoutShippingMethod } = useCheckoutStore();
    const { add: addPaymentReference, verify: verifyPaymentReference, clear: clearPaymentReference } = usePaymentStore();
    const [currentShippingMethod, setCurrentShippingMethod] = React.useState<string>(storedShippingMethod);
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
    const availableLGAs: LogisticsLocationConfig[] = selectedStateConfig?.lgas ?? [];

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
        const uniqueProducts = items.length;
        return { totalItems, uniqueProducts };
    }, [items]);

    // Use discount from Zustand store
    const resolvedDiscount = pendingCorrections
        ? pendingCorrections.correctedCart.totalDiscount ?? pendingCorrections.correctedCart.couponDiscount ?? 0
        : discountInfo?.amount || 0;

    const resolvedSubtotal = pendingCorrections?.correctedCart.subtotal ?? subtotal;

    const resolvedShippingCost = shippingMethod === 'pickup'
        ? 0
        : calculatedShippingCost ?? pendingCorrections?.correctedCart.estimatedShipping?.cost ?? null;

    const totalBeforeShipping = pendingCorrections
        ? pendingCorrections.correctedCart.total ?? (resolvedSubtotal - resolvedDiscount)
        : resolvedSubtotal - resolvedDiscount;

    const resolvedTotal = resolvedShippingCost === null
        ? null
        : totalBeforeShipping + resolvedShippingCost;

    React.useEffect(() => {
        setPendingCorrections(null);
    }, [items]);

    const buildCheckoutPayload = useCallback(() => {
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
        };
    }, [shippingMethod, calculatedShippingCost, selectedLocationMeta, items, shippingForm, activePayment, appliedCouponCodes, subtotal, resolvedDiscount]);

    const handleAcceptCorrections = useCallback(async () => {
        if (!pendingCorrections || !parsedCheckoutErrors) {
            return;
        }

        setIsAcceptingCorrections(true);
        setCheckoutError(null);
        setCheckoutSuccess(null);

        try {
            // Build cart update operations from product issues
            const correctionPayload = buildCartUpdatePayload(parsedCheckoutErrors.products || []);

            // Apply all updates
            for (const operation of correctionPayload.operations) {
                if (operation.action === 'remove') {
                    await removeItem(operation.cartItemId);
                } else if (operation.action === 'update' && operation.updates) {
                    await updateItem(operation.cartItemId, operation.updates);
                }
            }

            // Refresh cart to get latest data
            await refreshCart();

            // Invalidate product queries for affected products
            for (const slug of correctionPayload.affectedProductSlugs) {
                queryClient.invalidateQueries({ queryKey: ['product', slug] });
            }

            // Update shipping cost from corrections if shipping changed
            if (parsedCheckoutErrors.shipping) {
                setCalculatedShippingCost(parsedCheckoutErrors.shipping.currentCost);
            } else if (pendingCorrections.shippingCost !== undefined) {
                const updatedShippingCost = pendingCorrections.correctedCart.estimatedShipping?.cost ?? pendingCorrections.shippingCost;
                setCalculatedShippingCost(updatedShippingCost);
            }

            // Clear errors and close modal
            setShippingCalculationError(null);
            setPendingCorrections(null);
            setParsedCheckoutErrors(null);
            setShowCorrectionModal(false);

            // Show success message via checkoutSuccess state
            // User will need to click "Place Order" again - this is safer than auto-retry
            setCheckoutError(null);
            // Set a temporary success message
            alert('Cart corrections applied successfully. Please review and submit your order again.');
        } catch (acceptError) {
            setCheckoutError(handleApiError(acceptError));
        } finally {
            setIsAcceptingCorrections(false);
        }
    }, [pendingCorrections, parsedCheckoutErrors, refreshCart, removeItem, updateItem, queryClient]);

    /**
     * Reusable function to handle 400 checkout correction errors
     * Extracts nested correction data from error.response.data.data structure
     */
    const handleCheckoutCorrectionError = useCallback((error: unknown): boolean => {
        // Check if this is a 400 error with correction data
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            const responseData = error.response.data;

            // Backend returns: { message: "...", data: { needsUpdate: true, checkoutErrors: {...} } }
            // Extract the nested data object
            const correctionData = responseData?.data;

            if (correctionData && 'needsUpdate' in correctionData && correctionData.needsUpdate) {
                // Cast to CheckoutCorrectionResponse
                const correctionPayload = correctionData as CheckoutCorrectionResponse;

                setPendingCorrections(correctionPayload);
                setCheckoutSuccess(null);

                // Parse checkout errors
                const errors = parseCheckoutErrors(correctionPayload);
                setParsedCheckoutErrors(errors);

                // Update shipping cost
                const updatedShippingCost =
                    correctionPayload.correctedCart.estimatedShipping?.cost ?? correctionPayload.shippingCost;
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

                return true; // Handled as correction
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
                const errors = parseCheckoutErrors(responseData);

                setParsedCheckoutErrors(errors);

                // Update shipping cost
                const updatedShippingCost =
                    responseData.correctedCart.estimatedShipping?.cost ?? responseData.shippingCost;
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

            if (typeof successPayload.order.shippingPrice === 'number') {
                setCalculatedShippingCost(successPayload.order.shippingPrice);
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
    ]);

    // Check if shipping form is complete (only needed for delivery methods)
    const isShippingFormComplete = useMemo(() => {
        if (shippingMethod === 'pickup') return true;

        return (
            shippingForm.firstName.trim() !== '' &&
            shippingForm.lastName.trim() !== '' &&
            shippingForm.email.trim() !== '' &&
            shippingForm.phoneNumber.trim() !== '' &&
            shippingForm.state !== '' &&
            shippingForm.lga.trim() !== '' &&
            shippingForm.city.trim() !== '' &&
            shippingForm.streetAddress.trim() !== '' &&
            shippingForm.country !== '' &&
            shippingForm.postalCode.trim() !== ''
        );
    }, [shippingForm, shippingMethod]);

    const isShippingAddressReady = useMemo(() => {
        if (shippingMethod === 'pickup') return false;

        return (
            shippingForm.state !== '' &&
            shippingForm.lga.trim() !== '' &&
            shippingForm.city.trim() !== '' &&
            shippingForm.streetAddress.trim() !== '' &&
            shippingForm.country !== '' &&
            shippingForm.postalCode.trim() !== ''
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
                city: shippingForm.city || shippingForm.lga,
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

                                {/* Shipping Method Badge - Outside form */}
                                <div className="mt-5 mb-5 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Icon.Truck size={20} weight="duotone" className="text-blue w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs sm:text-sm font-medium text-blue-900">
                                                    Selected Method: <span className="capitalize">{shippingMethod === 'pickup' ? 'Pickup' : shippingMethod === 'normal' ? 'Normal Delivery' : 'Express Delivery'}</span>
                                                </div>
                                                {shippingMethod === 'pickup' && (
                                                    <div className="text-xs text-blue-700 mt-0.5">No shipping address required</div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsChangingShippingMethod(!isChangingShippingMethod)}
                                            className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-medium underline flex items-center gap-1 whitespace-nowrap"
                                        >
                                            Change Method
                                            {isChangingShippingMethod ? (
                                                <Icon.CaretUp size={12} weight="bold" />
                                            ) : (
                                                <Icon.CaretDown size={12} weight="bold" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Shipping Method Options - Show when changing */}
                                    {isChangingShippingMethod && (
                                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-blue-200 space-y-2">
                                            <div className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Choose shipping method:</div>

                                            {/* Pickup Option */}
                                            {shippingMethod !== 'pickup' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChangeShippingMethod('pickup')}
                                                    className="w-full flex items-center justify-between p-2 sm:p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon.Storefront size={16} weight="duotone" className="text-blue" />
                                                        <div>
                                                            <div className="text-sm font-medium text-left">Pickup</div>
                                                            <div className="text-xs text-secondary text-left">Free - Pick up from store</div>
                                                        </div>
                                                    </div>
                                                    <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                                                </button>
                                            )}

                                            {/* Normal Delivery Option */}
                                            {shippingMethod !== 'normal' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChangeShippingMethod('normal')}
                                                    className="w-full flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon.Package size={16} weight="duotone" className="text-blue" />
                                                        <div>
                                                            <div className="text-sm font-medium text-left">Normal Delivery</div>
                                                            <div className="text-xs text-secondary text-left">Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                                                </button>
                                            )}

                                            {/* Express Delivery Option */}
                                            {shippingMethod !== 'express' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChangeShippingMethod('express')}
                                                    className="w-full flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon.Lightning size={16} weight="duotone" className="text-blue" />
                                                        <div>
                                                            <div className="text-sm font-medium text-left">Express Delivery</div>
                                                            <div className="text-xs text-secondary text-left">Fastest - Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="form-checkout">
                                    <form>
                                        {/* Shipping Information - Only for delivery methods */}
                                        {shippingMethod !== 'pickup' && (
                                            <div className="shipping-section border border-line rounded-lg mb-5 overflow-hidden">
                                                <div
                                                    className="flex items-center justify-between p-5 cursor-pointer bg-surface hover:bg-surface-variant1 transition-all"
                                                    onClick={() => setIsShippingExpanded(!isShippingExpanded)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon.Package size={24} weight="duotone" className="text-blue" />
                                                        <div>
                                                            <div className="heading6">Shipping Information *</div>
                                                            <div className="text-secondary caption1 mt-1">
                                                                {isShippingFormComplete ? (
                                                                    <span className="text-green-600 flex items-center gap-1">
                                                                        <Icon.CheckCircle size={14} weight="bold" />
                                                                        Complete
                                                                    </span>
                                                                ) : (
                                                                    'Required for delivery cost calculation'
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isShippingExpanded ? (
                                                        <Icon.CaretUp size={20} weight="bold" />
                                                    ) : (
                                                        <Icon.CaretDown size={20} weight="bold" />
                                                    )}
                                                </div>

                                                {isShippingExpanded && (
                                                    <div className="p-5 pt-0 grid sm:grid-cols-2 gap-4 gap-y-5">
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="firstName">First Name *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="firstName"
                                                                type="text"
                                                                placeholder="First Name"
                                                                value={shippingForm.firstName}
                                                                onChange={(e) => handleShippingFormChange('firstName', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="lastName">Last Name *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="lastName"
                                                                type="text"
                                                                placeholder="Last Name"
                                                                value={shippingForm.lastName}
                                                                onChange={(e) => handleShippingFormChange('lastName', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="email">Email Address *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="email"
                                                                type="email"
                                                                placeholder="Email Address"
                                                                value={shippingForm.email}
                                                                onChange={(e) => handleShippingFormChange('email', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="phoneNumber">Phone Number *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="phoneNumber"
                                                                type="tel"
                                                                placeholder="Phone Number"
                                                                value={shippingForm.phoneNumber}
                                                                onChange={(e) => handleShippingFormChange('phoneNumber', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className='col-span-full'>
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="country">Country *</label>
                                                            <div className="select-block">
                                                                <select
                                                                    className="border border-line px-4 py-3 w-full rounded-lg"
                                                                    id="country"
                                                                    name="country"
                                                                    value={shippingForm.country}
                                                                    onChange={(e) => {
                                                                        const nextCountry = e.target.value;
                                                                        setShippingForm((prev) => ({
                                                                            ...prev,
                                                                            country: nextCountry,
                                                                            state: '',
                                                                            lga: '',
                                                                        }));
                                                                    }}
                                                                >
                                                                    {(shippingConfigs ?? []).map((config) => (
                                                                        <option key={config.countryCode} value={config.countryName}>
                                                                            {config.countryName}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <Icon.CaretDown className='arrow-down' />
                                                                {shippingConfigError && (
                                                                    <p className="text-xs text-red-600 mt-1">{shippingConfigError.message}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="state">State *</label>
                                                            <div className="select-block">
                                                                <select
                                                                    className="border border-line px-4 py-3 w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    id="state"
                                                                    name="state"
                                                                    value={shippingForm.state}
                                                                    onChange={(e) => {
                                                                        const nextState = e.target.value;
                                                                        setShippingForm((prev) => ({
                                                                            ...prev,
                                                                            state: nextState,
                                                                            lga: '',
                                                                        }));
                                                                    }}
                                                                    disabled={isLoadingShippingConfigs || !availableStates?.length}
                                                                >
                                                                    <option value="">
                                                                        {isLoadingShippingConfigs ? 'Loading states...' : 'Choose State'}
                                                                    </option>
                                                                    {availableStates?.map((state) => (
                                                                        <option key={state.name} value={state.name}>
                                                                            {state.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <Icon.CaretDown className='arrow-down' />
                                                            </div>
                                                        </div>
                                                        <div className=''>
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="lga">Local Government Area *</label>
                                                            <div className="select-block">
                                                                <select
                                                                    className="border border-line px-4 py-3 w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    id="lga"
                                                                    name="lga"
                                                                    value={shippingForm.lga}
                                                                    onChange={(e) => handleShippingFormChange('lga', e.target.value)}
                                                                    disabled={!shippingForm.state || (!availableCities.length && !availableLGAs.length)}
                                                                >
                                                                    <option value="">Choose LGA</option>
                                                                    {availableCities.length > 0 && (
                                                                        <optgroup label="Cities">
                                                                            {availableCities.map((city) => (
                                                                                <option key={city.name} value={city.name}>
                                                                                    {city.name}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}
                                                                    {availableLGAs.length > 0 && (
                                                                        <optgroup label="LGAs">
                                                                            {availableLGAs.map((lga) => (
                                                                                <option key={lga.name} value={lga.name}>
                                                                                    {lga.name}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}
                                                                </select>
                                                                <Icon.CaretDown className='arrow-down' />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-full">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="apartment">Street Address *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="apartment"
                                                                type="text"
                                                                placeholder="Street Address"
                                                                value={shippingForm.streetAddress}
                                                                onChange={(e) => handleShippingFormChange('streetAddress', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="city">City *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="city"
                                                                type="text"
                                                                placeholder="City"
                                                                value={shippingForm.city}
                                                                onChange={(e) => handleShippingFormChange('city', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="">
                                                            <label className="text-secondary text-sm mb-2 block" htmlFor="postal">Postal Code *</label>
                                                            <input
                                                                className="border-line px-4 py-3 w-full rounded-lg"
                                                                id="postal"
                                                                type="number"
                                                                placeholder="Postal Code"
                                                                value={shippingForm.postalCode}
                                                                onChange={(e) => handleShippingFormChange('postalCode', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Order Notes - Collapsible */}
                                        <div className="notes-section border border-line rounded-lg mb-5 overflow-hidden">
                                            <div
                                                className="flex items-center justify-between p-5 cursor-pointer bg-surface hover:bg-surface-variant1 transition-all"
                                                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon.Note size={24} weight="duotone" className="text-green" />
                                                    <div>
                                                        <div className="heading6">Order Notes</div>
                                                        <div className="text-secondary caption1 mt-1">Add special instructions</div>
                                                    </div>
                                                </div>
                                                {isNotesExpanded ? (
                                                    <Icon.CaretUp size={20} weight="bold" />
                                                ) : (
                                                    <Icon.CaretDown size={20} weight="bold" />
                                                )}
                                            </div>

                                            {isNotesExpanded && (
                                                <div className="p-5 pt-0">
                                                    <textarea
                                                        className="border border-line px-4 py-3 w-full rounded-lg min-h-[120px]"
                                                        id="note"
                                                        name="note"
                                                        placeholder="Add any special instructions for your order...">
                                                    </textarea>
                                                </div>
                                            )}
                                        </div>

                                        <CheckoutAlerts
                                            pendingCorrections={pendingCorrections}
                                            checkoutError={checkoutError}
                                            checkoutSuccess={checkoutSuccess}
                                        />

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
                                    </form>
                                </div>
                            </div>

                        </div>
                        <div className="right w-full lg:w-5/12">
                            <div className="checkout-block lg:sticky lg:top-[120px] border border-line rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
                                {/* Order Summary Header - Collapsible */}
                                <div
                                    className="flex items-center justify-between cursor-pointer pb-3 md:pb-4 border-b border-line"
                                    onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                                >
                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                        <Icon.ShoppingCart size={24} weight="duotone" className="text-blue w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                                        <div>
                                            <div className="heading5">Your Order</div>
                                            {!isOrdersExpanded && (
                                                <div className="text-secondary text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                                                    <span className="whitespace-nowrap">{cartStats.totalItems} items</span>
                                                    <span className="hidden xs:inline">•</span>
                                                    <span className="whitespace-nowrap">{cartStats.uniqueProducts} products</span>

                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isOrdersExpanded ? (
                                        <Icon.CaretUp size={20} weight="bold" />
                                    ) : (
                                        <Icon.CaretDown size={20} weight="bold" />
                                    )}
                                </div>

                                {/* Order Items - Collapsible */}
                                {isOrdersExpanded && (
                                    <div className="list-product-checkout max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-10">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Icon.CircleNotch size={32} weight="bold" className="animate-spin text-blue" />
                                                    <p className='text-button text-secondary'>Loading cart...</p>
                                                </div>
                                            </div>
                                        ) : items.length === 0 ? (
                                            <div className="flex items-center justify-center py-10">
                                                <div className="flex flex-col items-center gap-3 text-secondary">
                                                    <Icon.ShoppingCartSimple size={32} weight="bold" />
                                                    <p className='text-button'>No product in cart</p>
                                                </div>
                                            </div>
                                        ) : (
                                            items.map((item) => {
                                                // Use ModalCart's exact pricing calculation method
                                                const pricing = calculateCartItemPricing(item);

                                                const itemId = item._id || item.id;
                                                const productName = item.name || 'Product';
                                                const productImagePath =
                                                    item.description_images?.find((img) => img.cover_image)?.url ??
                                                    item.description_images?.[0]?.url;
                                                const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '/images/placeholder.png';

                                                // Check for active sale (not pricing tier discount)
                                                const hasSale = !!pricing.sale;
                                                const salePercentage = hasSale ? Math.round(pricing.saleDiscount) : 0;

                                                // Check for pricing tier
                                                const hasPricingTier = !!pricing.pricingTier;

                                                // Show price slash if there's EITHER a sale OR pricing tier discount
                                                const hasDiscount = hasSale || hasPricingTier;

                                                // Original price before any discounts
                                                const originalPrice = pricing.basePrice;

                                                return (
                                                    <div key={itemId} className="item flex items-start gap-3 md:gap-4 py-3 md:py-4 border-b border-line last:border-b-0">
                                                        {/* Product Image */}
                                                        <div className="bg-img w-[60px] md:w-[70px] aspect-square flex-shrink-0 rounded-lg overflow-hidden border border-line">
                                                            <Image
                                                                src={productImageUrl}
                                                                width={200}
                                                                height={200}
                                                                alt={productName}
                                                                className='w-full h-full object-cover'
                                                            />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            {/* Product Name */}
                                                            <div className="name text-sm font-medium line-clamp-2 mb-2">{productName}</div>

                                                            {/* Quantity */}
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs text-secondary">Qty:</span>
                                                                <span className="text-sm font-semibold">{item.qty}</span>
                                                            </div>

                                                            {/* Badges */}
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {/* Sale Badge */}
                                                                {hasSale && (
                                                                    <span className="inline-block text-[10px] bg-red text-white px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                        SALE {salePercentage}% OFF
                                                                    </span>
                                                                )}

                                                                {/* Bulk/Pricing Tier Badge */}
                                                                {hasPricingTier && (
                                                                    <span className="inline-block text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-semibold uppercase">
                                                                        BULK DEALS
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Pricing */}
                                                            <div className="flex items-center justify-between mt-2">
                                                                {/* Unit Price with slash if discounted */}
                                                                <div className="text-xs">
                                                                    {hasDiscount ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-secondary line-through">
                                                                                ${originalPrice.toFixed(2)}
                                                                            </span>
                                                                            <span className="text-red font-medium">
                                                                                ${pricing.unitPrice.toFixed(2)} each
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-secondary">
                                                                            ${pricing.unitPrice.toFixed(2)} each
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Total Price */}
                                                                <div className="text-base font-bold text-blue">
                                                                    ${pricing.totalPrice.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Order Summary - Always Visible */}
                                <div className="order-summary mt-4 md:mt-5 pt-4 md:pt-5 border-t border-line space-y-2 md:space-y-3">
                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-secondary text-sm md:text-base">Subtotal</span>
                                        <span className="text-sm md:text-base font-medium">{formatToNaira(resolvedSubtotal)}</span>
                                    </div>

                                    {/* Discount */}
                                    {resolvedDiscount > 0 && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span className="flex items-center gap-1 text-sm md:text-base">
                                                <Icon.Tag size={16} weight="duotone" className="w-4 h-4 flex-shrink-0" />
                                                Discount {discountInfo?.couponCode && `(${discountInfo.couponCode})`}
                                            </span>
                                            <span className="font-semibold">-${resolvedDiscount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Shipping */}
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1 text-secondary text-sm md:text-base">
                                            <Icon.Truck size={16} weight="duotone" className="w-4 h-4 flex-shrink-0" />
                                            Shipping
                                        </span>
                                        <span className="text-button">
                                            {shippingMethod === 'pickup' ? (
                                                <span className="text-green-600 font-semibold">Free (Pickup)</span>
                                            ) : isCalculatingShipping ? (
                                                <span className="flex items-center gap-1 text-blue">
                                                    <Icon.CircleNotch size={14} weight="bold" className="animate-spin" />
                                                    Calculating...
                                                </span>
                                            ) : shippingCalculationError ? (
                                                <span className="text-red-600 text-xs">Error</span>
                                            ) : calculatedShippingCost !== null ? (
                                                formatToNaira(calculatedShippingCost)
                                            ) : (
                                                <span className="text-secondary text-xs">Enter address</span>
                                            )}
                                        </span>
                                    </div>

                                    {/* Shipping Calculation Error */}
                                    {shippingCalculationError && (
                                        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                            <Icon.WarningCircle size={14} weight="bold" className="flex-shrink-0 mt-0.5" />
                                            <span>{shippingCalculationError}</span>
                                        </div>
                                    )}

                                    {pendingCorrections && (
                                        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                            <Icon.WarningDiamond size={14} weight="duotone" className="mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium">Cart updated by store</p>
                                                <p className="mt-0.5 leading-snug">
                                                    Accept the updates to keep your totals accurate before completing payment.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-line">
                                        <span className="text-base md:text-lg font-semibold">Total</span>
                                        <span className="text-lg md:text-xl lg:text-2xl font-bold text-blue">
                                            {resolvedTotal !== null ? (
                                                formatToNaira(resolvedTotal)
                                            ) : (
                                                <span className="text-secondary text-sm">Add shipping info</span>
                                            )}
                                        </span>
                                    </div>
                                </div>


                                {/* Trust Badges - Always Visible */}
                                <div className="trust-badges mt-4 md:mt-5 pt-4 md:pt-5 grid grid-cols-2 gap-2 md:gap-3 justify-center">
                                    <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-secondary">
                                        <Icon.ShieldCheck size={16} weight="duotone" className="text-green-600" />
                                        <span>Secure Payment</span>
                                    </div>
                                </div>

                                {/* Inline Alerts for Shipping/Coupon Changes */}
                                {parsedCheckoutErrors && !hasProductIssues(parsedCheckoutErrors) && (
                                    <div className="mt-4 space-y-2">
                                        {/* Shipping Update Alert */}
                                        {parsedCheckoutErrors.shipping && (
                                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                                <Icon.Truck className="text-blue text-xl flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold text-blue-900">Shipping Cost Updated</p>
                                                    <p className="text-blue-700 text-xs mt-1">
                                                        {parsedCheckoutErrors.shipping.reason} (₦
                                                        {parsedCheckoutErrors.shipping.previousCost.toLocaleString()} → ₦
                                                        {parsedCheckoutErrors.shipping.currentCost.toLocaleString()})
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Coupon Rejection Alert */}
                                        {parsedCheckoutErrors.coupons && parsedCheckoutErrors.coupons.length > 0 && (
                                            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                                                <Icon.Warning className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-yellow-900 mb-1">Coupon Issue</p>
                                                    {parsedCheckoutErrors.coupons.map((coupon, idx) => (
                                                        <p key={idx} className="text-yellow-700 text-xs">
                                                            • {coupon.code}: {coupon.reason}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Total-Only Error (Blocking) */}
                                {parsedCheckoutErrors?.total && (
                                    <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                                        <Icon.XCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-red-900">Checkout Error</p>
                                            <p className="text-red-700 text-xs mt-1">{parsedCheckoutErrors.total.message}</p>
                                        </div>
                                    </div>
                                )}
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