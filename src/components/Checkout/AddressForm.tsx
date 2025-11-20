'use client';

import React, { useState, useMemo } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { AddAddressInput } from '@/types/user';
import { useAllShippingConfig } from '@/hooks/useLogisticsLocations';

const emptyAddress: AddAddressInput = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  address1: '',
  address2: '',
  city: '',
  zipCode: '',
  state: '',
  lga: '',
  country: '',
  active: false,
};

interface AddressFormProps {
  onSubmit: (data: AddAddressInput) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ onSubmit, onCancel }: AddressFormProps) {
  const [formData, setFormData] = useState<AddAddressInput>(emptyAddress);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch shipping configurations for logistics dropdowns
  const { data: shippingConfigs, isLoading: isLoadingShippingConfigs } = useAllShippingConfig();

  // Derive available states based on selected country
  const availableStates = useMemo(() => {
    if (!shippingConfigs || !formData.country) return [];
    const selectedCountry = shippingConfigs.find((c) => c.countryName === formData.country);
    return selectedCountry?.states || [];
  }, [shippingConfigs, formData.country]);

  // Derive available LGAs based on selected state
  const availableLGAs = useMemo(() => {
    if (!formData.state) return [];
    const selectedState = availableStates.find((s) => s.name === formData.state);
    return selectedState?.lgas || [];
  }, [availableStates, formData.state]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.address1.trim()) errors.address1 = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
    if (!formData.country) errors.country = 'Country is required';
    if (!formData.state) errors.state = 'State is required';
    if (!formData.lga) errors.lga = 'LGA is required';

    // Validate LGA exists in available options for selected state
    if (formData.lga && formData.state && !availableLGAs?.find((l) => l.name === formData.lga)) {
      errors.lga = 'Selected LGA is not valid for this state';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field: keyof AddAddressInput, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Cascading reset logic for location fields
      if (field === 'country') {
        // Reset state and lga when country changes
        updated.state = '';
        updated.lga = '';
      } else if (field === 'state') {
        // Reset lga when state changes
        updated.lga = '';
      }

      return updated;
    });

    // Clear error for this field when user starts typing
    if (formErrors[field as string]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData(emptyAddress);
      setFormErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 p-6 border-2 border-line rounded-xl bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h6 className="heading6">Add New Address</h6>
        <button
          type="button"
          onClick={onCancel}
          className="text-secondary hover:text-black transition-colors"
        >
          <Icon.X className="text-2xl" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-4 gap-y-5">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="caption1 capitalize">
              First Name <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.firstName ? 'border-red-600' : ''
              }`}
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
            {formErrors.firstName && (
              <div className="text-red text-xs mt-1">{formErrors.firstName}</div>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="caption1 capitalize">
              Last Name <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.lastName ? 'border-red-600' : ''
              }`}
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
            {formErrors.lastName && (
              <div className="text-red text-xs mt-1">{formErrors.lastName}</div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="caption1 capitalize">
              Phone <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.phoneNumber ? 'border-red-600' : ''
              }`}
              id="phone"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            />
            {formErrors.phoneNumber && (
              <div className="text-red text-xs mt-1">{formErrors.phoneNumber}</div>
            )}
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="caption1 capitalize">
              Country / Region <span className="text-red">*</span>
            </label>
            <div className="relative">
              <select
                className={`border-line mt-2 px-4 py-3 w-full rounded-lg appearance-none ${
                  formErrors.country ? 'border-red-600' : ''
                } ${isLoadingShippingConfigs ? 'pr-10' : ''}`}
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={isLoadingShippingConfigs}
              >
                <option value="">Choose Country</option>
                {shippingConfigs?.map((config) => (
                  <option key={config.countryCode} value={config.countryName}>
                    {config.countryName}
                  </option>
                ))}
              </select>
              {isLoadingShippingConfigs && (
                <Icon.CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 text-xl animate-spin text-secondary" />
              )}
            </div>
            {formErrors.country && (
              <div className="text-red text-xs mt-1">{formErrors.country}</div>
            )}
          </div>

          {/* Address 1 */}
          <div className="sm:col-span-2">
            <label htmlFor="address1" className="caption1 capitalize">
              Street Address <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.address1 ? 'border-red-600' : ''
              }`}
              id="address1"
              type="text"
              value={formData.address1}
              onChange={(e) => handleInputChange('address1', e.target.value)}
            />
            {formErrors.address1 && (
              <div className="text-red text-xs mt-1">{formErrors.address1}</div>
            )}
          </div>

          {/* Address 2 */}
          <div className="sm:col-span-2">
            <label htmlFor="address2" className="caption1 capitalize">
              Apartment, suite, etc. (optional)
            </label>
            <input
              className="border-line mt-2 px-4 py-3 w-full rounded-lg"
              id="address2"
              type="text"
              value={formData.address2}
              onChange={(e) => handleInputChange('address2', e.target.value)}
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="caption1 capitalize">
              Town / City <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.city ? 'border-red-600' : ''
              }`}
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
            />
            {formErrors.city && <div className="text-red text-xs mt-1">{formErrors.city}</div>}
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="caption1 capitalize">
              State <span className="text-red">*</span>
            </label>
            <select
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg appearance-none ${
                formErrors.state ? 'border-red-600' : ''
              }`}
              id="state"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              disabled={isLoadingShippingConfigs || !formData.country || !availableStates.length}
            >
              <option value="">Choose State</option>
              {availableStates?.map((state) => (
                <option key={state.name} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
            {formErrors.state && <div className="text-red text-xs mt-1">{formErrors.state}</div>}
          </div>

          {/* LGA */}
          <div>
            <label htmlFor="lga" className="caption1 capitalize">
              LGA <span className="text-red">*</span>
            </label>
            <select
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg appearance-none ${
                formErrors.lga ? 'border-red-600' : ''
              }`}
              id="lga"
              value={formData.lga}
              onChange={(e) => handleInputChange('lga', e.target.value)}
              disabled={!formData.state || !availableLGAs.length}
            >
              <option value="">Choose LGA</option>
              {availableLGAs?.map((lga) => (
                <option key={lga.name} value={lga.name}>
                  {lga.name}
                </option>
              ))}
            </select>
            {formErrors.lga && <div className="text-red text-xs mt-1">{formErrors.lga}</div>}
          </div>

          {/* ZIP Code */}
          <div>
            <label htmlFor="zip" className="caption1 capitalize">
              ZIP Code <span className="text-red">*</span>
            </label>
            <input
              className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                formErrors.zipCode ? 'border-red-600' : ''
              }`}
              id="zip"
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
            />
            {formErrors.zipCode && (
              <div className="text-red text-xs mt-1">{formErrors.zipCode}</div>
            )}
          </div>

          {/* Set as Active */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="caption1">Set as active address</span>
            </label>
          </div>
        </div>

        {/* Form buttons */}
        <div className="flex gap-3 mt-6">
          <button type="submit" className="button-main" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Address'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-line rounded-lg hover:bg-surface transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
