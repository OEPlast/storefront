'use client';

import React from 'react';
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface CheckoutButtonProps {
    // State flags
    pendingCorrections: boolean;
    isAcceptingCorrections: boolean;
    canProceedToPayment: boolean;
    isCalculatingShipping: boolean;
    isSubmittingCheckout: boolean;
    shippingMethod: string;
    isShippingFormComplete: boolean;

    // Handlers
    handleAcceptCorrections: () => void;
    handleSubmitCheckout: () => void;
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({
    pendingCorrections,
    isAcceptingCorrections,
    canProceedToPayment,
    isCalculatingShipping,
    isSubmittingCheckout,
    shippingMethod,
    isShippingFormComplete,
    handleAcceptCorrections,
    handleSubmitCheckout,
}) => {
    return (
        <div className={`block-button ${pendingCorrections ? 'mt-4' : 'mt-6 md:mt-8 lg:mt-10'}`}>
            <button
                type="button"
                onClick={pendingCorrections ? handleAcceptCorrections : handleSubmitCheckout}
                className={`button-main w-full flex items-center justify-center gap-2 py-3 md:py-4 text-sm md:text-base ${pendingCorrections
                        ? isAcceptingCorrections
                            ? 'opacity-70 cursor-wait'
                            : ''
                        : canProceedToPayment
                            ? ''
                            : 'opacity-50 cursor-not-allowed'
                    }`}
                disabled={
                    pendingCorrections
                        ? isAcceptingCorrections
                        : !canProceedToPayment || isSubmittingCheckout
                }
            >
                {pendingCorrections ? (
                    isAcceptingCorrections ? (
                        <>
                            <Icon.CircleNotch size={20} weight="bold" className="animate-spin" />
                            Applying Updates...
                        </>
                    ) : (
                        <>
                            <Icon.ArrowsClockwise size={20} weight="bold" />
                            Accept Updates
                        </>
                    )
                ) : isCalculatingShipping ? (
                    <>
                        <Icon.CircleNotch size={20} weight="bold" className="animate-spin" />
                        Calculating Shipping...
                    </>
                ) : isSubmittingCheckout ? (
                    <>
                        <Icon.CircleNotch size={20} weight="bold" className="animate-spin" />
                        Securing Checkout...
                    </>
                ) : !canProceedToPayment && shippingMethod !== 'pickup' ? (
                    <>
                        <Icon.Lock size={20} weight="bold" />
                        Complete Shipping Info to Continue
                    </>
                ) : (
                    <>
                        <Icon.CreditCard size={20} weight="bold" />
                        Proceed to Payment
                    </>
                )}
            </button>

            {!canProceedToPayment && shippingMethod !== 'pickup' && (
                <p className="text-xs sm:text-sm text-secondary text-center mt-2">
                    {!isShippingFormComplete ? 'Please fill in all required shipping fields' : 'Calculating shipping cost...'}
                </p>
            )}
        </div>
    );
};

export default CheckoutButton;
