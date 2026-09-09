'use client';

import React from 'react';
import Select, { type SelectOption } from '@/components/ui/Select';
import { cn } from '@/libs/utils';
import type { CheckoutAddress, AddressFieldErrors } from '@/libs/schemas/checkout.schema';
import type { CheckoutLocationOptions } from '@/hooks/useCheckoutController';

export interface AddressFieldsetProps {
    /**
     * Namespaces DOM ids/labels: `${idPrefix}-firstName`. Must be unique per instance
     * ('shipping' | 'billing') — two fieldsets on one page otherwise collide.
     */
    idPrefix: string;
    value: CheckoutAddress;
    onFieldChange: <K extends keyof CheckoutAddress>(field: K, value: CheckoutAddress[K]) => void;
    /** Required for the cascading country/state/city resets. */
    setValue: React.Dispatch<React.SetStateAction<CheckoutAddress>>;
    location: CheckoutLocationOptions;
    isLoadingConfigs: boolean;
    configError: Error | null;
    errors?: AddressFieldErrors;
    disabled?: boolean;
    className?: string;
}

const INPUT_CLASS = 'border border-line px-4 py-3 w-full rounded-lg';
const LABEL_CLASS = 'text-secondary text-sm mb-2 block';

const toOptions = (names: Array<{ name: string }>): SelectOption[] =>
    names.map((entry) => ({ value: entry.name, label: entry.name }));

/**
 * The single address form body, shared by the shipping and billing sections so the two can
 * never drift apart.
 *
 * Deliberately excludes email — contact details live in ContactSection now, which is what
 * lets a pickup order collect them even though it renders no address form.
 */
const AddressFieldset: React.FC<AddressFieldsetProps> = ({
    idPrefix,
    value,
    onFieldChange,
    setValue,
    location,
    isLoadingConfigs,
    configError,
    errors,
    disabled = false,
    className,
}) => {
    const id = (field: string) => `${idPrefix}-${field}`;
    const err = (field: keyof CheckoutAddress) => errors?.[field] ?? null;

    /**
     * Country/state changes clear everything downstream — including `city`.
     *
     * The form this replaces cleared only country/state/lga and left `city` stale, which then
     * fed the shipping-rate lookup and the courier's receiverCity with a city belonging to the
     * previously-selected state.
     */
    const handleCountryChange = (country: string) => {
        setValue((prev) => ({ ...prev, country, state: '', lga: '', city: '' }));
    };

    const handleStateChange = (state: string) => {
        setValue((prev) => ({ ...prev, state, lga: '', city: '' }));
    };

    const textField = (
        field: 'firstName' | 'lastName' | 'phoneNumber' | 'address1' | 'address2' | 'city' | 'zipCode',
        label: string,
        opts: { type?: string; placeholder?: string; required?: boolean; spanFull?: boolean } = {}
    ) => {
        const fieldError = err(field);
        return (
            <div className={opts.spanFull ? 'col-span-full' : undefined}>
                <label className={LABEL_CLASS} htmlFor={id(field)}>
                    {label}
                    {opts.required && <span className="text-red ml-0.5">*</span>}
                </label>
                <input
                    id={id(field)}
                    name={id(field)}
                    type={opts.type ?? 'text'}
                    className={cn(INPUT_CLASS, fieldError && 'border-red-600')}
                    value={value[field] ?? ''}
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    placeholder={opts.placeholder}
                    disabled={disabled}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? `${id(field)}-error` : undefined}
                />
                {fieldError && (
                    <em id={`${id(field)}-error`} className="mt-1 block text-sm text-red">
                        {fieldError}
                    </em>
                )}
            </div>
        );
    };

    return (
        <div className={cn('grid sm:grid-cols-2 gap-4 gap-y-5', className)}>
            {textField('firstName', 'First Name', { required: true })}
            {textField('lastName', 'Last Name', { required: true })}
            {textField('phoneNumber', 'Phone Number', { type: 'tel', required: true })}

            <Select
                containerClassName="col-span-full"
                id={id('country')}
                name={id('country')}
                label="Country/Region"
                required
                value={value.country ?? ''}
                onChange={handleCountryChange}
                options={toOptions(location.countries.map((c) => ({ name: c.countryName })))}
                placeholder={isLoadingConfigs ? 'Loading countries…' : 'Choose Country/Region'}
                disabled={disabled || isLoadingConfigs || location.countries.length === 0}
                error={err('country')}
                hint={configError ? 'Could not load delivery locations. Please refresh.' : undefined}
            />

            <Select
                id={id('state')}
                name={id('state')}
                label="State"
                required
                value={value.state ?? ''}
                onChange={handleStateChange}
                options={toOptions(location.states)}
                placeholder={location.states.length === 0 ? 'Choose a country first' : 'Choose State'}
                disabled={disabled || isLoadingConfigs || location.states.length === 0}
                error={err('state')}
            />

            {/* Cities and LGAs are two optgroups feeding one `lga` field — that conflation is
                pre-existing and matches what the rate lookup expects. */}
            <Select
                id={id('lga')}
                name={id('lga')}
                label="City / LGA"
                required
                value={value.lga ?? ''}
                onChange={(next) => onFieldChange('lga', next)}
                groups={[
                    { label: 'Cities', options: toOptions(location.cities) },
                    { label: 'LGAs', options: toOptions(location.lgas) },
                ]}
                placeholder={!value.state ? 'Choose a state first' : 'Choose City / LGA'}
                disabled={disabled || !value.state || (location.cities.length === 0 && location.lgas.length === 0)}
                error={err('lga')}
            />

            {textField('address1', 'Street Address', { required: true, spanFull: true })}
            {textField('address2', 'Apartment, suite, etc. (optional)', { spanFull: true })}
            {textField('city', 'City', { required: true })}
            {/* type="text", not "number": the state is a string, and postcodes are not numbers. */}
            {textField('zipCode', 'Postal Code', { required: true })}
        </div>
    );
};

export default AddressFieldset;
