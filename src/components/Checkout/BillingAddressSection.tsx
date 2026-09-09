'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import RadioCard, { RadioCardGroup } from '@/components/ui/RadioCard';
import AddressSelector from '@/components/Checkout/AddressSelector';
import AddressFieldset from '@/components/Checkout/AddressFieldset';
import { cn } from '@/libs/utils';
import type { Address } from '@/types/user';
import type { CheckoutAddress, AddressFieldErrors } from '@/libs/schemas/checkout.schema';
import type { CheckoutLocationOptions } from '@/hooks/useCheckoutController';

export interface BillingAddressSectionProps {
    /** Hides the whole section when 'pickup'. */
    deliveryType: 'shipping' | 'pickup' | 'gig';

    billingSameAsShipping: boolean;
    onBillingSameAsShippingChange: (same: boolean) => void;

    /** Controlled billing address. Meaningful only while billingSameAsShipping === false. */
    billingAddress: CheckoutAddress;
    onBillingAddressChange: <K extends keyof CheckoutAddress>(field: K, value: CheckoutAddress[K]) => void;
    /** Whole-object setter, for the saved-address / cascading-reset paths. */
    setBillingAddress: React.Dispatch<React.SetStateAction<CheckoutAddress>>;

    /** Saved-address picker. Hidden when isGuest or the list is empty. */
    addresses?: Address[];
    selectedBillingAddressId: string | null;
    /** null == "Enter new address manually". */
    onSelectSavedAddress: (address: Address | null) => void;
    isGuest: boolean;

    /** Country/state/city/LGA option lists for the BILLING address (not the shipping one). */
    location: CheckoutLocationOptions;
    isLoadingConfigs: boolean;
    configError: Error | null;

    errors?: AddressFieldErrors;
    /** Collapsible card state; feeds CollapsibleSection. */
    isExpanded: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

const BILLING_MODE_NAME = 'billing_address_mode';

/**
 * `.infor` (cart.scss:117-136) clips at max-height:1000px, which a full address form
 * overruns on narrow viewports — the last fields would silently disappear. Raising the
 * ceiling only on the open panel keeps the existing transition and needs no new SCSS.
 */
const TALL_PANEL = '[&.open>.infor]:!max-h-[2400px]';

const BillingAddressSection: React.FC<BillingAddressSectionProps> = ({
    deliveryType,
    billingSameAsShipping,
    onBillingSameAsShippingChange,
    billingAddress,
    onBillingAddressChange,
    setBillingAddress,
    addresses,
    selectedBillingAddressId,
    onSelectSavedAddress,
    isGuest,
    location,
    isLoadingConfigs,
    configError,
    errors,
    isExpanded,
    onToggle,
    disabled = false,
    className,
}) => {
    // Pickup orders carry no shipping address, so "same as shipping" is meaningless and
    // the controller force-sets billingSameAsShipping = true (D-9).
    if (deliveryType === 'pickup') return null;

    const savedAddresses = !isGuest && addresses && addresses.length > 0 ? addresses : null;
    const hasErrors = !!errors && Object.keys(errors).length > 0;

    const enteredSummary = [billingAddress.address1, billingAddress.city, billingAddress.state]
        .filter((part) => part.trim().length > 0)
        .join(', ');

    const summary = billingSameAsShipping
        ? 'Same as shipping address'
        : enteredSummary || 'Using a different billing address';

    return (
        <CollapsibleSection
            id="checkout-billing"
            title="Billing Address"
            description="The address your card statement is billed to"
            summary={
                hasErrors ? (
                    <span className="text-red">Billing address is incomplete</span>
                ) : (
                    summary
                )
            }
            icon={<Icon.Receipt size={24} weight="duotone" className="text-blue-600" />}
            isExpanded={isExpanded}
            onToggle={onToggle}
            disabled={disabled}
            className={className}
        >
            <RadioCardGroup label="Billing address">
                <RadioCard
                    name={BILLING_MODE_NAME}
                    value="same"
                    checked={billingSameAsShipping}
                    onChange={() => onBillingSameAsShippingChange(true)}
                    disabled={disabled}
                    position="first"
                    title="Same as shipping address"
                />

                <RadioCard
                    name={BILLING_MODE_NAME}
                    value="different"
                    checked={!billingSameAsShipping}
                    onChange={() => onBillingSameAsShippingChange(false)}
                    disabled={disabled}
                    position="last"
                    className={cn('border-t-0', TALL_PANEL)}
                    title="Use a different billing address"
                >
                    <div className="px-5 pb-5 pt-1">
                        {savedAddresses && (
                            <div className="mb-6">
                                {/* Saved-address -> form population lives in the controller;
                                    this section only forwards the selection. */}
                                <AddressSelector
                                    addresses={savedAddresses}
                                    selectedId={selectedBillingAddressId}
                                    onSelect={onSelectSavedAddress}
                                    heading="Select Billing Address"
                                    groupName="billing-address"
                                />
                            </div>
                        )}

                        <AddressFieldset
                            idPrefix="billing"
                            value={billingAddress}
                            onFieldChange={onBillingAddressChange}
                            setValue={setBillingAddress}
                            location={location}
                            isLoadingConfigs={isLoadingConfigs}
                            configError={configError}
                            errors={errors}
                            disabled={disabled}
                        />
                    </div>
                </RadioCard>
            </RadioCardGroup>
        </CollapsibleSection>
    );
};

export default BillingAddressSection;
