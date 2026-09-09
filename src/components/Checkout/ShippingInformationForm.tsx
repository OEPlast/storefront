'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import AddressSelector from '@/components/Checkout/AddressSelector';
import AddressFieldset from '@/components/Checkout/AddressFieldset';
import type { Address } from '@/types/user';
import type { CheckoutAddress, AddressFieldErrors } from '@/libs/schemas/checkout.schema';
import type { CheckoutLocationOptions } from '@/hooks/useCheckoutController';

export interface ShippingInformationFormProps {
    /**
     * Controlled shipping address. The controller owns the state; this section renders it.
     *
     * Deliberately a `CheckoutAddress` and NOT the old `ShippingFormState`: there is no
     * `email` here (ContactSection owns contact email), and the street/postcode fields are
     * `address1`/`address2`/`zipCode`, matching the wire payload and the billing form.
     */
    value: CheckoutAddress;
    onFieldChange: <K extends keyof CheckoutAddress>(field: K, value: CheckoutAddress[K]) => void;
    /** Whole-object setter. AddressFieldset needs it for the cascading country/state resets. */
    setValue: React.Dispatch<React.SetStateAction<CheckoutAddress>>;

    /** Saved-address picker. Hidden when isGuest or the list is empty. */
    addresses?: Address[];
    selectedAddressId: string | null;
    setSelectedAddressId: (id: string | null) => void;
    /** Controller-owned: normalises a saved address against the logistics configs into `value`. */
    populateFormFromAddress: (address: Address) => void;
    isGuest: boolean;

    /** Country/state/city/LGA option lists for the SHIPPING address (not the billing one). */
    location: CheckoutLocationOptions;
    isLoadingConfigs: boolean;
    configError: Error | null;

    /** Per-field messages, i.e. `fieldErrors.shippingAddress`. Passed straight to the fieldset. */
    errors?: AddressFieldErrors;

    /**
     * Whole-address geocoding failure ("Address not found…"). Not attributable to one field,
     * so it renders above the form rather than inside the fieldset.
     */
    addressValidationError: string | null;
    setAddressValidationError: (error: string | null) => void;

    /** "Save this address to my account". Only offered while entering manually. */
    saveToAccount: boolean;
    onSaveToAccountChange: (save: boolean) => void;

    /** Drives the header's completeness line. */
    isShippingFormComplete: boolean;

    /** Collapsible card state; feeds CollapsibleSection. */
    isExpanded: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

/**
 * The shipping address card.
 *
 * All field rendering is delegated to AddressFieldset, the same body BillingAddressSection
 * uses — so the two forms cannot drift, and the cascading-reset fix (country change clears
 * state/lga/city) applies to shipping for free. This component owns only the card shell,
 * the saved-address picker and the save-to-account checkbox.
 */
const ShippingInformationForm: React.FC<ShippingInformationFormProps> = ({
    value,
    onFieldChange,
    setValue,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    populateFormFromAddress,
    isGuest,
    location,
    isLoadingConfigs,
    configError,
    errors,
    addressValidationError,
    setAddressValidationError,
    saveToAccount,
    onSaveToAccountChange,
    isShippingFormComplete,
    isExpanded,
    onToggle,
    disabled = false,
    className,
}) => {
    const savedAddresses = !isGuest && addresses && addresses.length > 0 ? addresses : null;
    const hasErrors = !!errors && Object.keys(errors).length > 0;

    // Always-visible sub-line: keeps the old header's completeness indicator, which the
    // shopper needs while the card is open too (it gates the delivery-cost quote).
    const description = hasErrors ? (
        <span className="text-red">Please complete the highlighted fields</span>
    ) : isShippingFormComplete ? (
        <span className="text-green-600 inline-flex items-center gap-1">
            <Icon.CheckCircle size={14} weight="bold" />
            Complete
        </span>
    ) : (
        'Required for delivery cost calculation'
    );

    // Collapsed-only recap, so a closed card still shows where the order is going.
    const enteredSummary = [value.address1, value.city, value.state]
        .filter((part) => part.trim().length > 0)
        .join(', ');

    /** null == "Enter new address manually". */
    const handleSelectSavedAddress = (address: Address | null) => {
        setAddressValidationError(null);

        if (address) {
            populateFormFromAddress(address);
            setSelectedAddressId(address._id);
            return;
        }

        setSelectedAddressId(null);
    };

    return (
        <CollapsibleSection
            id="checkout-shipping"
            title="Shipping Information *"
            description={description}
            summary={enteredSummary || undefined}
            icon={<Icon.Package size={24} weight="duotone" className="text-blue-600" />}
            isExpanded={isExpanded}
            onToggle={onToggle}
            disabled={disabled}
            className={className}
        >
            {savedAddresses && (
                <div className="mb-6">
                    {/* groupName must differ from the billing selector's: both are mounted at
                        once, and a shared native radio-group name would make picking a billing
                        address clear the shipping selection. */}
                    <AddressSelector
                        addresses={savedAddresses}
                        selectedId={selectedAddressId}
                        onSelect={handleSelectSavedAddress}
                        heading="Select Shipping Address"
                        groupName="shipping-address"
                    />
                </div>
            )}

            {/* Outside the savedAddresses block on purpose: this is a geocoding failure, which
                happens to guests and manual entries too. Nested inside, it was invisible to
                anyone without a saved address. */}
            {addressValidationError && (
                <div className="mb-4 flex items-start gap-2 text-sm text-red">
                    <Icon.WarningCircle size={16} weight="bold" className="mt-0.5 flex-shrink-0" />
                    <span>{addressValidationError}</span>
                </div>
            )}

            {!isGuest && !selectedAddressId && (
                <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            checked={saveToAccount}
                            onChange={(e) => onSaveToAccountChange(e.target.checked)}
                            disabled={disabled}
                            className="h-4 w-4 cursor-pointer"
                        />
                        <span className="text-secondary">Save this address to my account</span>
                    </label>
                </div>
            )}

            <AddressFieldset
                idPrefix="shipping"
                value={value}
                onFieldChange={onFieldChange}
                setValue={setValue}
                location={location}
                isLoadingConfigs={isLoadingConfigs}
                configError={configError}
                errors={errors}
                disabled={disabled}
            />
        </CollapsibleSection>
    );
};

export default ShippingInformationForm;
