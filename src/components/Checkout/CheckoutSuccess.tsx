'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useForgotPasswordStore } from '@/store/useForgotPasswordStore';

interface CheckoutSuccessProps {
    orderId: string;
    /** Placed via guest checkout: there is no account page to link to yet. */
    isGuest?: boolean;
    /** Where the confirmation was sent. Shown to guests, and used to start setting a password. */
    email?: string;
}

const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({ orderId, isGuest = false, email }) => {
    const router = useRouter();
    const startGuestClaim = useForgotPasswordStore((state) => state.startGuestClaim);
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-8">
            <div className="max-w-xl w-full">
                <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-green-100 rounded-full flex items-center justify-center">
                            <Icon.CheckCircle
                                size={56}
                                weight="fill"
                                className="text-green-600 w-12 h-12 md:w-14 md:h-14"
                            />
                        </div>
                    </div>

                    {/* Success Message */}
                    <h1 className="heading3 mb-3 text-green-900">
                        Order Placed Successfully!
                    </h1>
                    <p className="text-secondary text-base mb-6">
                        Thank you for your purchase. Your order has been received and is being processed.
                        {isGuest && email ? (
                            <>
                                {' '}We&apos;ve sent your confirmation to <span className="font-medium text-black">{email}</span>.
                            </>
                        ) : null}
                    </p>

                    {/* Order Details */}
                    <div className="bg-surface rounded-lg p-4 md:p-5 mb-8 space-y-2">

                        <div className="flex justify-between items-center">
                            <span className="text-secondary text-sm">Order ID:</span>
                            <span className="font-mono text-xs md:text-sm font-medium text-blue">{orderId}</span>
                        </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <Link
                            href="/"
                            className="flex-1 border border-line py-3 px-6 rounded-lg font-semibold text-center hover:bg-surface transition-all flex items-center justify-center gap-2"
                        >
                            <Icon.House size={20} weight="duotone" />
                            <span>Return Home</span>
                        </Link>
                        {isGuest && email ? (
                            // The order belongs to a guest record; account pages need a password
                            // first. Setting one goes through the emailed code, which proves the
                            // email is theirs before any order history is shown.
                            <button
                                type="button"
                                onClick={() => {
                                    startGuestClaim(email);
                                    router.push('/forgot-password');
                                }}
                                className="flex-1 button-main bg-blue text-white py-3 px-6 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-2"
                            >
                                <Icon.UserPlus size={20} weight="duotone" />
                                <span>Create an account to track orders</span>
                            </button>
                        ) : (
                            <Link
                                href={`/my-account/orders/${orderId}`}
                                className="flex-1 button-main bg-blue text-white py-3 px-6 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-2"
                            >
                                <Icon.Package size={20} weight="duotone" />
                                <span> Order Details</span>
                            </Link>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 pt-6 border-t border-line">
                        <p className="text-secondary text-xs">
                            Need help? <Link href="/pages/contact" className="text-blue hover:underline font-medium">Contact our support team</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
