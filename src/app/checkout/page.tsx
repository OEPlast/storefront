'use client';

/**
 * Checkout — LAYOUT ONLY.
 *
 * Every piece of state, every effect and every handler lives in
 * `useCheckoutController`. This file may not own state: it reads the controller
 * once and arranges section components. There is deliberately no useState /
 * useEffect / useMemo below — if a value is needed, the controller exposes it.
 *
 * Layout contract:
 *  - Desktop: two columns. Left = the flow, right = a sticky bg-surface summary panel.
 *  - Mobile:  the summary collapses to a bar at the TOP (`mobileSummary` section key)
 *             and the primary action pins to a sticky bottom bar.
 *  - ONE CheckoutButton. The old `span.block lg:hidden` / `span.hidden lg:block`
 *    pair and the `flex-col-reverse lg:flex-row` trick are both gone.
 *  - The <form> wraps ONLY the left column. OrderSummaryBlock renders its own
 *    <form> for the discount code, and nesting forms is invalid HTML.
 */

import React from 'react';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';

import { useCheckoutController } from '@/hooks/useCheckoutController';

import ContactSection from '@/components/Checkout/ContactSection';
import ShippingMethodSelector from '@/components/Checkout/ShippingMethodSelector';
import ShippingInformationForm from '@/components/Checkout/ShippingInformationForm';
import PaymentSection from '@/components/Checkout/PaymentSection';
import BillingAddressSection from '@/components/Checkout/BillingAddressSection';
import OrderNotesSection from '@/components/Checkout/OrderNotesSection';
import CheckoutAlerts from '@/components/Checkout/CheckoutAlerts';
import CheckoutButton from '@/components/Checkout/CheckoutButton';
import CheckoutSuccess from '@/components/Checkout/CheckoutSuccess';
import OrderSummaryBlock, {
    type OrderSummaryBlockProps,
} from '@/components/Checkout/OrderSummaryBlock';
import CorrectionReviewModal from '@/components/Modal/CorrectionReviewModal';


/** Everything both OrderSummaryBlock instances share, so they cannot drift. */
type SharedSummaryProps = Omit<
    OrderSummaryBlockProps,
    'isExpanded' | 'onToggle' | 'showDiscountField' | 'idPrefix'
>;

const Checkout = () => {
    const c = useCheckoutController();

    // Guarded on checkoutSuccess as well as paymentSuccess. `paymentSuccess` is
    // flipped inside the Paystack onSuccess callback, so reading
    // `checkoutSuccess!.orderId` off a non-null assertion was a render-time crash
    // waiting for the wrong ordering.
    if (c.paymentSuccess && c.checkoutSuccess) {
        return <CheckoutSuccess orderId={c.checkoutSuccess.orderId} />;
    }

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Mirrors CheckoutButton's own branch so Enter and the button always do
        // the same thing.
        if (c.corrections.payload) {
            if (!c.isAcceptingCorrections) {
                void c.handleAcceptCorrections();
            }
            return;
        }

        if (c.isSubmittingCheckout) {
            return;
        }

        void c.handleSubmitCheckout();
    };

    const summaryProps: SharedSummaryProps = {
        items: c.items,
        isLoading: c.isCartLoading,
        cartStats: c.cartStats,
        resolvedSubtotal: c.resolvedSubtotal,
        resolvedDiscount: c.resolvedDiscount,
        resolvedShippingCost: c.resolvedShippingCost,
        resolvedTotal: c.resolvedTotal,
        totalSavings: c.totalSavings,
        shippingMethod: c.shippingMethod,
        shippingEtaLabel: c.shippingEtaLabel,
        isCalculatingShipping: c.isCalculatingShipping,
        shippingCalculationError: c.shippingCalculationError,
        pendingCorrections: c.corrections.payload,
        parsedCheckoutErrors: c.corrections.errors,
        outOfStockCartItemIds: c.outOfStockCartItemIds,
        couponCodeInput: c.couponCodeInput,
        onCouponCodeInputChange: c.setCouponCodeInput,
        onApplyCoupon: c.applyCoupon,
        onRemoveCoupon: c.removeCoupon,
        appliedCoupon: c.appliedCoupon,
        couponError: c.couponError,
        isValidatingCoupon: c.isValidatingCoupon,
    };

    return (
        <>
            <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                <div className="text-content">
                    <div className="heading2 text-center m4-2">Checkout</div>
                </div>
            </div>

            <div className="cart-block md:py-20 py-10">
                <div className="container">
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

                    {/* MOBILE summary bar. Collapsed by default (the controller seeds
                        mobileSummary:false) so the flow, not the cart, is above the fold.
                        Each instance gets its own `idPrefix`, so both can render the discount
                        field without colliding on element ids — which matters because the cart
                        page no longer collects promo codes at all. */}
                    <div className="order-summary-bar lg:hidden mb-5 border border-line rounded-xl bg-surface p-4">
                        <OrderSummaryBlock
                            {...summaryProps}
                            idPrefix="checkout-mobile"
                            isExpanded={c.sections.mobileSummary}
                            onToggle={() => c.toggleSection('mobileSummary')}
                        />
                    </div>

                    <div className="content-main flex flex-col lg:flex-row justify-between gap-6 lg:gap-8">
                        <div className="left w-full lg:w-1/2">
                            <form className="form-checkout" onSubmit={handleFormSubmit} noValidate>
                                <ContactSection
                                    email={c.contactEmail}
                                    isAuthenticated={c.isAuthenticated}
                                    isSessionLoading={c.isSessionLoading}
                                    userName={c.userName}
                                    onSignInClick={() => c.openLoginModal('/checkout')}
                                    error={c.fieldErrors.email}
                                />

                                {c.availableShippingMethods === null ? (
                                    <div className="my-6 checkout-block">
                                        <div className="heading5">Delivery</div>
                                        <div className="mt-5 h-[60px] animate-pulse rounded-lg bg-gray-100" />
                                    </div>
                                ) : (
                                    <ShippingMethodSelector
                                        currentMethod={c.shippingMethod}
                                        availableMethods={c.availableShippingMethods}
                                        shippingEtaLabel={c.shippingEtaLabel}
                                        onMethodChange={c.handleChangeShippingMethod}
                                    />
                                )}

                                {/* Pickup carries no shipping address. */}
                                {c.shippingMethod !== 'pickup' && (
                                    <ShippingInformationForm
                                        isExpanded={c.sections.shipping}
                                        onToggle={() => c.toggleSection('shipping')}
                                        value={c.shippingAddress}
                                        onFieldChange={c.handleShippingAddressChange}
                                        setValue={c.setShippingAddress}
                                        addresses={c.addresses}
                                        selectedAddressId={c.selectedAddressId}
                                        setSelectedAddressId={c.setSelectedAddressId}
                                        isGuest={c.isGuest}
                                        location={c.shippingLocation}
                                        isLoadingConfigs={c.isLoadingShippingConfigs}
                                        configError={c.shippingConfigError}
                                        errors={c.fieldErrors.shippingAddress}
                                        addressValidationError={c.addressValidationError}
                                        setAddressValidationError={c.setAddressValidationError}
                                        saveToAccount={c.saveShippingAddressToAccount}
                                        onSaveToAccountChange={c.setSaveShippingAddressToAccount}
                                        isShippingFormComplete={c.isShippingFormComplete}
                                        populateFormFromAddress={c.populateFormFromAddress}
                                        disabled={c.isSubmittingCheckout}
                                    />
                                )}

                                <PaymentSection
                                    selectedMethod={c.activePayment}
                                    onMethodChange={c.setActivePayment}
                                    disabled={c.isSubmittingCheckout}
                                />

                                <BillingAddressSection
                                    deliveryType={c.deliveryType}
                                    billingSameAsShipping={c.billingSameAsShipping}
                                    onBillingSameAsShippingChange={c.setBillingSameAsShipping}
                                    billingAddress={c.billingAddress}
                                    onBillingAddressChange={c.handleBillingAddressChange}
                                    setBillingAddress={c.setBillingAddress}
                                    addresses={c.addresses}
                                    selectedBillingAddressId={c.selectedBillingAddressId}
                                    onSelectSavedAddress={c.populateBillingFromAddress}
                                    isGuest={c.isGuest}
                                    location={c.billingLocation}
                                    isLoadingConfigs={c.isLoadingShippingConfigs}
                                    configError={c.shippingConfigError}
                                    errors={c.fieldErrors.billingAddress}
                                    isExpanded={c.sections.billing}
                                    onToggle={() => c.toggleSection('billing')}
                                    disabled={c.isSubmittingCheckout}
                                />

                                <OrderNotesSection
                                    isExpanded={c.sections.notes}
                                    onToggle={() => c.toggleSection('notes')}
                                    notes={c.notes}
                                    setNotes={c.setNotes}
                                />

                                <CheckoutAlerts
                                    pendingCorrections={c.corrections.payload}
                                    checkoutError={c.checkoutError}
                                    checkoutSuccess={c.checkoutSuccess}
                                />

                                {/* Implicit submission needs a submit button in the form:
                                    CheckoutButton is a type="button" onClick, and a form with
                                    more than one text field will not submit on Enter without
                                    one. Hidden, unfocusable and invisible to AT. */}
                                <button
                                    type="submit"
                                    className="hidden"
                                    aria-hidden="true"
                                    tabIndex={-1}
                                >
                                    Place order
                                </button>

                                {/* Mobile: pinned to the bottom of the viewport. Desktop:
                                    back into the left column's flow. Sticky-footer classes
                                    match the repo's one precedent,
                                    CorrectionReviewModal.tsx:423. */}
                                <div className="checkout-actions sticky bottom-0 z-10 bg-white border-t border-line px-6 py-4 lg:static lg:z-auto lg:bg-transparent lg:border-0 lg:px-0 lg:py-0">
                                    <CheckoutButton
                                        pendingCorrections={!!c.corrections.payload}
                                        isAcceptingCorrections={c.isAcceptingCorrections}
                                        canProceedToPayment={c.canProceedToPayment}
                                        isCalculatingShipping={c.isCalculatingShipping}
                                        isSubmittingCheckout={c.isSubmittingCheckout}
                                        shippingMethod={c.shippingMethod}
                                        isShippingFormComplete={c.isShippingFormComplete}
                                        handleAcceptCorrections={c.handleAcceptCorrections}
                                        handleSubmitCheckout={c.handleSubmitCheckout}
                                    />
                                </div>
                            </form>
                        </div>

                        {/* DESKTOP summary. Outside the <form> on purpose — the discount
                            code field is itself a <form>. */}
                        <aside className="right hidden lg:block lg:w-5/12">
                            <div className="checkout-block sticky top-[120px] border border-line rounded-xl md:rounded-2xl p-4 md:p-6 bg-surface shadow-sm">
                                <OrderSummaryBlock
                                    {...summaryProps}
                                    idPrefix="checkout-desktop"
                                    isExpanded={c.sections.summary}
                                    onToggle={() => c.toggleSection('summary')}
                                />
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            {c.corrections.errors && c.corrections.isModalOpen && (
                <CorrectionReviewModal
                    isOpen
                    checkoutErrors={c.corrections.errors}
                    onAcceptAll={c.handleAcceptCorrections}
                    onClose={() => c.setCorrectionModalOpen(false)}
                />
            )}
        </>
    );
};

export default Checkout;
