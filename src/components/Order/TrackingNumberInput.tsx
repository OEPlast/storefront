'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { FieldInfo } from '@/components/Form/FieldInfo';

// Validation schema
const trackingNumberSchema = z.object({
  trackingNumber: z
    .string()
    .min(3, 'Tracking number must be at least 3 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Tracking number can only contain letters, numbers, and hyphens'),
});

type TrackingFormValues = z.infer<typeof trackingNumberSchema>;

interface TrackingNumberInputProps {
  initialValue?: string;
  onClear?: () => void;
}

export default function TrackingNumberInput({ initialValue = '', onClear }: TrackingNumberInputProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      trackingNumber: initialValue,
    } as TrackingFormValues,
    validators: {
      onSubmit: trackingNumberSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      router.push(`/order-tracking?tracking=${encodeURIComponent(value.trackingNumber.trim())}`);
      // Note: isSubmitting will be reset by parent component when new data loads
    },
  });

  const handleClear = () => {
    form.reset();
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-4">
          <form.Field name="trackingNumber">
            {(field) => {
              const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div className="flex-1">
                  <label htmlFor="trackingNumber" className="text-sm font-medium mb-2 block">
                    Tracking Number
                  </label>
                  <input
                    id="trackingNumber"
                    className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${hasError ? 'border-red-600' : ''
                      }`}
                    type="text"
                    placeholder="Enter tracking number (e.g., ABC123XYZ)"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                  // disabled={isSubmitting}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>

          <div className="flex gap-3">
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  className="button-main flex-1"
                  disabled={!canSubmit || isSubmitting || isSubmitting}
                >
                  {isSubmitting ? 'Tracking...' : 'Track Shipment'}
                </button>
              )}
            </form.Subscribe>

            {/* {initialValue && (
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-3 border border-line rounded-lg hover:bg-surface transition-colors"
                disabled={isSubmitting}
              >
                Clear
              </button>
            )} */}
          </div>
        </div>
      </form>
    </div>
  );
}
