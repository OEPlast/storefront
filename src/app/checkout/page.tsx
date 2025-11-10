'use client';
import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuOne from '@/components/Header/Menu/MenuOne';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import { ProductDetail } from '@/types/product';
import productData from '@/data/Product.json';
import Product from '@/components/Product/Product';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/hooks/useCart';
import type { CartSnapshotPayload } from '@/types/cart';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCdnUrl } from '@/libs/cdn-url';
import { useAllShippingConfig, LogisticsConfigRecord, LogisticsStateConfig, LogisticsLocationConfig } from '@/hooks/useLogisticsLocations';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import CheckoutAlerts from '@/components/Checkout/CheckoutAlerts';
import CheckoutButton from '@/components/Checkout/CheckoutButton';

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

const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

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
    } | null;
};


const Checkout = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    let discount = searchParams.get('discount');
    let ship = searchParams.get('ship');
    const [currentShippingMethod, setCurrentShippingMethod] = React.useState<string>(searchParams.get('method') || 'pickup');
    const shippingMethod = currentShippingMethod; // pickup, normal, express

    const {
        cart: unifiedCart,
        items,
        subtotal,
        total,
        isLoading,
        error,
        isGuest,
        applyCartSnapshot,
        refreshCart,
        serverCartQuery,
    } = useCart();
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
        if (isGuest || !serverCartQuery?.data) {
            return [] as string[];
        }
        return serverCartQuery.data.appliedCoupons?.map((coupon) => coupon.code) ?? [];
    }, [isGuest, serverCartQuery?.data]);

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
    const [calculatedShippingCost, setCalculatedShippingCost] = useState<number | null>(Number(ship) || null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
    const [shippingCalculationError, setShippingCalculationError] = useState<string | null>(null);
    const [pendingCorrections, setPendingCorrections] = useState<CheckoutCorrectionPayload | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isSubmittingCheckout, setIsSubmittingCheckout] = useState<boolean>(false);
    const [isAcceptingCorrections, setIsAcceptingCorrections] = useState<boolean>(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState<SecureCheckoutSuccessResponse | null>(null);

    // Calculate cart statistics
    const cartStats = useMemo(() => {
        const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
        const uniqueProducts = items.length;
        return { totalItems, uniqueProducts };
    }, [items]);

    const serverCartDiscount = !isGuest && serverCartQuery?.data
        ? serverCartQuery.data.totalDiscount ?? serverCartQuery.data.couponDiscount ?? 0
        : 0;

    const unifiedCartDiscount = unifiedCart?.totalDiscount ?? 0;

    const resolvedDiscount = pendingCorrections
        ? pendingCorrections.correctedCart.totalDiscount ?? pendingCorrections.correctedCart.couponDiscount ?? 0
        : serverCartDiscount || unifiedCartDiscount || Number(discount || 0) || 0;

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
            items: items.map((item) => ({
                _id: item._id,
                product: item.product,
                qty: item.qty,
                selectedAttributes: item.selectedAttributes,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                sale: item.sale,
                saleVariantIndex: item.saleVariantIndex,
                appliedDiscount: item.appliedDiscount,
                discountAmount: item.discountAmount,
                productSnapshot: item.productSnapshot,
            })),
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
                        streetAddress: shippingForm.streetAddress,
                        postalCode: shippingForm.postalCode,
                    }
                    : undefined,
            paymentMethod: activePayment,
            couponCodes: appliedCouponCodes,
            taxPrice: 0,
            subtotal,
            total,
            totalDiscount: unifiedCart?.totalDiscount ?? 0,
            estimatedShipping: {
                cost: shippingCostValue,
                days: etaDays,
            },
            deliveryType,
            shippingCost: shippingCostValue,
        };
    }, [shippingMethod, calculatedShippingCost, selectedLocationMeta, items, shippingForm, activePayment, appliedCouponCodes, subtotal, total, unifiedCart?.totalDiscount]);

    const handleAcceptCorrections = useCallback(async () => {
        if (!pendingCorrections) {
            return;
        }

        setIsAcceptingCorrections(true);
        setCheckoutError(null);
        setCheckoutSuccess(null);

        try {
            const snapshot: CartSnapshotPayload = {
                items: pendingCorrections.correctedCart.items.map((item) => ({
                    _id: item._id,
                    product: item.product,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    selectedAttributes: item.selectedAttributes,
                    productSnapshot: item.productSnapshot,
                    sale: item.sale,
                    saleVariantIndex: item.saleVariantIndex,
                    appliedDiscount: item.appliedDiscount,
                    discountAmount: item.discountAmount,
                })),
                subtotal: pendingCorrections.correctedCart.subtotal,
                total: pendingCorrections.correctedCart.total,
                totalDiscount:
                    pendingCorrections.correctedCart.totalDiscount ??
                    pendingCorrections.correctedCart.couponDiscount ??
                    0,
                estimatedShipping: pendingCorrections.correctedCart.estimatedShipping,
            };

            applyCartSnapshot(snapshot);

            if (!isGuest) {
                await refreshCart();
            }

            const updatedShippingCost = pendingCorrections.correctedCart.estimatedShipping?.cost ?? pendingCorrections.shippingCost;
            setCalculatedShippingCost(updatedShippingCost);
            setShippingCalculationError(null);
            setPendingCorrections(null);
        } catch (acceptError) {
            setCheckoutError(handleApiError(acceptError));
        } finally {
            setIsAcceptingCorrections(false);
        }
    }, [pendingCorrections, applyCartSnapshot, isGuest, refreshCart]);

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
            const payload = buildCheckoutPayload();
            const response = await apiClient.post<SecureCheckoutSuccessResponse | CheckoutCorrectionPayload>(
                api.checkout.secure,
                payload
            );

            const responseData = response.data;

            if (!responseData) {
                throw new Error('Unable to complete checkout. Please try again.');
            }

            if ('needsUpdate' in responseData && responseData.needsUpdate) {
                setPendingCorrections(responseData);
                setCheckoutSuccess(null);
                const updatedShippingCost =
                    responseData.correctedCart.estimatedShipping?.cost ?? responseData.shippingCost;
                if (typeof updatedShippingCost === 'number') {
                    setCalculatedShippingCost(updatedShippingCost);
                }
                setShippingCalculationError(null);
                return;
            }

            const successPayload = responseData as SecureCheckoutSuccessResponse;
            setCheckoutSuccess(successPayload);
            setPendingCorrections(null);
            setShippingCalculationError(null);

            if (!isGuest) {
                const refreshResult = refreshCart();
                await Promise.resolve(refreshResult);
            } else {
                applyCartSnapshot({
                    items: [],
                    subtotal: 0,
                    total: 0,
                    totalDiscount: 0,
                    estimatedShipping: { cost: 0, days: 0 },
                });
            }

            if (typeof successPayload.order.shippingPrice === 'number') {
                setCalculatedShippingCost(successPayload.order.shippingPrice);
            }

            if (successPayload.payment?.paymentUrl) {
                if (typeof window !== 'undefined') {
                    window.location.href = successPayload.payment.paymentUrl;
                } else {
                    router.push(successPayload.payment.paymentUrl);
                }
            }
        } catch (submitError) {
            setCheckoutError(handleApiError(submitError));
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
        applyCartSnapshot,
        router,
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

            const cartItemsPayload = items.map((item) => ({
                product: item.product,
                qty: item.qty,
                selectedAttributes: item.selectedAttributes,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice ?? item.unitPrice * item.qty,
            }));

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

        calculateShipping();

        return () => {
            isCancelled = true;
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
        const newShipCost = newMethod === 'pickup' ? 0 : newMethod === 'normal' ? 30 : 40;
        setCurrentShippingMethod(newMethod);
        setCalculatedShippingCost(newMethod === 'pickup' ? 0 : null);
        setIsChangingShippingMethod(false);
        setIsShippingExpanded(newMethod !== 'pickup');

        // Update URL without reload
        router.replace(`/checkout?discount=${discount || 0}&ship=${newShipCost}&method=${newMethod}`, {
            scroll: false
        });
    };

    return (
        <>
            <div id="header" className='relative w-full'>
                <Breadcrumb heading='Shopping cart' subHeading='Shopping cart' />
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
                                            formatCurrency={formatCurrency}
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
                                                    <span className="hidden xs:inline">•</span>
                                                    <span className="font-semibold text-blue whitespace-nowrap">
                                                        {resolvedTotal !== null ? formatCurrency(resolvedTotal) : formatCurrency(resolvedSubtotal)}
                                                    </span>
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
                                        ) : error ? (
                                            <div className="flex items-center justify-center py-10">
                                                <div className="flex flex-col items-center gap-3 text-red-600">
                                                    <Icon.WarningCircle size={32} weight="bold" />
                                                    <p className='text-button'>Error loading cart</p>
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
                                                const productDetails = item.productDetails;
                                                const productSnapshot = item.productSnapshot ?? undefined;
                                                const productName = productDetails?.name ?? productSnapshot?.name ?? 'Product';
                                                const productSku = productDetails?.sku ?? productSnapshot?.sku;
                                                const productImagePath =
                                                    productDetails?.description_images?.find((img) => img.cover_image)?.url ??
                                                    productDetails?.description_images?.[0]?.url ??
                                                    productSnapshot?.image;
                                                const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '/images/placeholder.png';

                                                return (
                                                    <div key={item._id} className="item flex items-start gap-2 sm:gap-3 md:gap-4 py-3 sm:py-4 md:py-5 border-b border-line last:border-b-0">
                                                        <div className="bg-img w-[60px] sm:w-[70px] md:w-[80px] aspect-square flex-shrink-0 rounded-lg overflow-hidden border border-line">
                                                            <Image
                                                                src={productImageUrl}
                                                                width={200}
                                                                height={200}
                                                                alt={productName}
                                                                className='w-full h-full object-cover'
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="name text-sm sm:text-base font-medium line-clamp-2">{productName}</div>

                                                            {/* SKU Badge */}
                                                            {productSku && (
                                                                <div className="mt-2">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface rounded text-xs text-secondary">
                                                                        <Icon.Barcode size={12} />
                                                                        {productSku}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Attributes */}
                                                            {item.selectedAttributes.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                                    {item.selectedAttributes.map((attr, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md capitalize"
                                                                        >
                                                                            {attr.value}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Sale Badge */}
                                                            {item.appliedDiscount && item.appliedDiscount > 0 && (
                                                                <div className="mt-2">
                                                                    <span className="inline-block text-[10px] bg-red text-white px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                        SALE {Math.round(item.appliedDiscount)}% OFF
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Price & Quantity */}
                                                            <div className="flex items-center justify-between mt-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-secondary text-sm">Qty:</span>
                                                                    <span className="text-button">{item.qty}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-button text-blue">${(item.unitPrice * item.qty).toFixed(2)}</div>
                                                                    {item.appliedDiscount && item.appliedDiscount > 0 ? (
                                                                        <div className="text-xs">
                                                                            <span className="text-secondary line-through">
                                                                                ${(item.unitPrice / (1 - item.appliedDiscount / 100)).toFixed(2)}
                                                                            </span>
                                                                            <span className="text-red font-semibold ml-1">
                                                                                ${item.unitPrice.toFixed(2)}
                                                                            </span>
                                                                            {' each'}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-secondary">${item.unitPrice.toFixed(2)} each</div>
                                                                    )}
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
                                        <span className="text-sm md:text-base font-medium">{formatCurrency(resolvedSubtotal)}</span>
                                    </div>

                                    {/* Discount */}
                                    {discount && Number(discount) > 0 && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span className="flex items-center gap-1 text-sm md:text-base">
                                                <Icon.Tag size={16} weight="duotone" className="w-4 h-4 flex-shrink-0" />
                                                Discount
                                            </span>
                                            <span className="font-semibold">-${Number(discount).toFixed(2)}</span>
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
                                                formatCurrency(calculatedShippingCost)
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
                                                formatCurrency(resolvedTotal)
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Checkout;