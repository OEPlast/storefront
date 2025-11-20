'use client';

import React from 'react';
import { Address } from '@/types/user';

interface AddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (address: Address | null) => void;
}

export default function AddressSelector({ addresses, selectedId, onSelect }: AddressSelectorProps) {
  return (
    <div className="w-full">
      <div className="heading5 mb-3">Select Shipping Address</div>
      
      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address._id}
            onClick={() => onSelect(address)}
            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-black ${
              selectedId === address._id
                ? 'border-black bg-surface'
                : address.active
                ? 'border-black border-opacity-30'
                : 'border-line'
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="address"
                checked={selectedId === address._id}
                onChange={() => onSelect(address)}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-title">
                    {address.firstName} {address.lastName}
                  </span>
                  {address.active && (
                    <span className="rounded bg-black px-2 py-0.5 text-xs text-white">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-secondary">
                  {address.phoneNumber}
                </div>
                <div className="mt-2 text-sm text-secondary">
                  {address.address1}
                  {address.address2 && `, ${address.address2}`}
                  <br />
                  {address.city}, {address.state}, {address.lga}
                  <br />
                  {address.country} - {address.zipCode}
                </div>
              </div>
            </label>
          </div>
        ))}

        {/* Manual entry option */}
        <div
          onClick={() => onSelect(null)}
          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-black ${
            selectedId === null ? 'border-black bg-surface' : 'border-line'
          }`}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="address"
              checked={selectedId === null}
              onChange={() => onSelect(null)}
              className="h-4 w-4 cursor-pointer"
            />
            <span className="font-semibold text-title">Enter new address manually</span>
          </label>
        </div>
      </div>
    </div>
  );
}
