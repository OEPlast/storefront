'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import AddressSelector from '@/components/Checkout/AddressSelector';
import { Address } from '@/types/user';
import { LogisticsConfigRecord, LogisticsStateConfig, LogisticsLocationConfig } from '@/hooks/useLogisticsLocations';

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

interface ShippingInformationFormProps {
    isExpanded: boolean;
    onToggle: () => void;
    formState: ShippingFormState;
    onFormChange: <K extends keyof ShippingFormState>(field: K, value: ShippingFormState[K]) => void;
    setFormState: React.Dispatch<React.SetStateAction<ShippingFormState>>;
    
    // Address management (for authenticated users)
    addresses?: Address[];
    selectedAddressId: string | null;
    onAddressSelect: (addr: Address | null) => void;
    setSelectedAddressId: (id: string | null) => void;
    isGuest: boolean;
    
    // Shipping configs
    shippingConfigs: LogisticsConfigRecord[] | undefined;
    isLoadingConfigs: boolean;
    configError: Error | null;
    selectedCountryConfig: LogisticsConfigRecord | undefined;
    selectedStateConfig: LogisticsStateConfig | undefined;
    availableStates: LogisticsStateConfig[];
    availableCities: LogisticsLocationConfig[];
    availableLGAs: LogisticsLocationConfig[];
    
    // Address validation
    addressValidationError: string | null;
    setAddressValidationError: (error: string | null) => void;
    
    // Save address checkbox
    saveToAccount: boolean;
    onSaveToAccountChange: (save: boolean) => void;
    
    // Form completion status
    isShippingFormComplete: boolean;
    
    // Address population function
    populateFormFromAddress: (address: Address) => void;
}

const ShippingInformationForm: React.FC<ShippingInformationFormProps> = ({
    isExpanded,
    onToggle,
    formState,
    onFormChange,
    setFormState,
    addresses,
    selectedAddressId,
    onAddressSelect,
    setSelectedAddressId,
    isGuest,
    shippingConfigs,
    isLoadingConfigs,
    configError,
    availableStates,
    availableCities,
    availableLGAs,
    addressValidationError,
    setAddressValidationError,
    saveToAccount,
    onSaveToAccountChange,
    isShippingFormComplete,
    populateFormFromAddress,
}) => {
    return (
        <div className="shipping-section border border-line rounded-lg mb-5 overflow-hidden">
            <div
                className="flex items-center justify-between p-5 cursor-pointer bg-surface hover:bg-surface-variant1 transition-all"
                onClick={onToggle}
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
                {isExpanded ? (
                    <Icon.CaretUp size={20} weight="bold" />
                ) : (
                    <Icon.CaretDown size={20} weight="bold" />
                )}
            </div>

            {isExpanded && (
                <div className="p-5 pt-0">
                    {/* Address Selector for Authenticated Users */}
                    {!isGuest && addresses && addresses.length > 0 && (
                        <div className="mb-6">
                            <AddressSelector
                                addresses={addresses}
                                selectedId={selectedAddressId}
                                onSelect={(addr) => {
                                    setAddressValidationError(null);
                                    if (addr) {
                                        populateFormFromAddress(addr);
                                        setSelectedAddressId(addr._id);
                                    } else {
                                        setSelectedAddressId(null);
                                    }
                                }}
                            />

                            {addressValidationError && (
                                <div className="mt-2 text-red text-sm flex items-start gap-2">
                                    <Icon.WarningCircle size={16} weight="bold" className="flex-shrink-0 mt-0.5" />
                                    <span>{addressValidationError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save manual address checkbox - only show when entering manually */}
                    {!isGuest && !selectedAddressId && (
                        <div className="mb-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={saveToAccount}
                                    onChange={(e) => onSaveToAccountChange(e.target.checked)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <span className="text-secondary">Save this address to my account</span>
                            </label>
                        </div>
                    )}

                    {/* Shipping Form Fields */}
                    <div className="grid sm:grid-cols-2 gap-4 gap-y-5">
                        <div className="">
                            <label className="text-secondary text-sm mb-2 block" htmlFor="firstName">First Name *</label>
                            <input
                                className="border-line px-4 py-3 w-full rounded-lg"
                                id="firstName"
                                type="text"
                                placeholder="First Name"
                                value={formState.firstName}
                                onChange={(e) => onFormChange('firstName', e.target.value)}
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
                                value={formState.lastName}
                                onChange={(e) => onFormChange('lastName', e.target.value)}
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
                                value={formState.email}
                                onChange={(e) => onFormChange('email', e.target.value)}
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
                                value={formState.phoneNumber}
                                onChange={(e) => onFormChange('phoneNumber', e.target.value)}
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
                                    value={formState.country}
                                    onChange={(e) => {
                                        const nextCountry = e.target.value;
                                        setFormState((prev) => ({
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
                                {configError && (
                                    <p className="text-xs text-red-600 mt-1">{configError.message}</p>
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
                                    value={formState.state}
                                    onChange={(e) => {
                                        const nextState = e.target.value;
                                        setFormState((prev) => ({
                                            ...prev,
                                            state: nextState,
                                            lga: '',
                                        }));
                                    }}
                                    disabled={isLoadingConfigs || !availableStates?.length}
                                >
                                    <option value="">
                                        {isLoadingConfigs ? 'Loading states...' : 'Choose State'}
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
                                    value={formState.lga}
                                    onChange={(e) => onFormChange('lga', e.target.value)}
                                    disabled={!formState.state || (!availableCities.length && !availableLGAs.length)}
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
                                value={formState.streetAddress}
                                onChange={(e) => onFormChange('streetAddress', e.target.value)}
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
                                value={formState.city}
                                onChange={(e) => onFormChange('city', e.target.value)}
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
                                value={formState.postalCode}
                                onChange={(e) => onFormChange('postalCode', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingInformationForm;
