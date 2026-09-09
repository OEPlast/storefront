'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/libs/utils';
import RadioCard, { RadioCardGroup } from '@/components/ui/RadioCard';

export interface PaymentSectionProps {
    /** Value written to the payload's `paymentMethod`. Today always 'credit-card'. */
    selectedMethod: string;
    /** Present for a future multi-method picker. Omit for the single-method case. */
    onMethodChange?: (method: string) => void;
    /** Disables the card while a submit is in flight. */
    disabled?: boolean;
    className?: string;
}

/**
 * Purely presentational. Paystack is the only method, so the card is permanently
 * selected; `onMethodChange` exists only so a future multi-method picker can drop in
 * without changing this component's contract. No credential field is ever rendered —
 * card number / CVV are collected by Paystack in its own popup.
 */
const PaymentSection: React.FC<PaymentSectionProps> = ({
    selectedMethod,
    onMethodChange,
    disabled = false,
    className,
}) => {
    // Controlled radio: React requires an onChange even when selection can't change.
    const handleChange = React.useCallback(
        (value: string) => {
            onMethodChange?.(value);
        },
        [onMethodChange]
    );

    return (
        <section className={cn('payment-section mb-5', className)}>
            <div className="flex items-center gap-3 mb-4">
                <Icon.CreditCard size={24} weight="duotone" className="text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                    <div className="heading6">Payment</div>
                    <div className="text-secondary caption1 mt-1">
                        All transactions are secure and encrypted
                    </div>
                </div>
            </div>

            <RadioCardGroup label="Payment method">
                <RadioCard
                    name="payment_method"
                    id="payment-method-paystack"
                    value={selectedMethod}
                    checked
                    onChange={handleChange}
                    disabled={disabled}
                    position="only"
                    title="Paystack"
                    description="Card, bank transfer, USSD"
                    right={
                        <Icon.ShieldCheck size={20} weight="duotone" className="text-green-600" />
                    }
                >
                    {/* Inside `children` so the copy inherits the .infor open animation. */}
                    <div className="px-5 pb-4">
                        <div className="bg-surface rounded-lg px-4 py-3 flex items-start gap-2">
                            <Icon.ArrowSquareOut
                                size={18}
                                weight="duotone"
                                className="mt-0.5 flex-shrink-0 text-secondary"
                            />
                            <p className="caption1 text-secondary">
                                You&apos;ll be redirected to Paystack to complete your purchase.
                            </p>
                        </div>
                    </div>
                </RadioCard>
            </RadioCardGroup>
        </section>
    );
};

export default PaymentSection;
