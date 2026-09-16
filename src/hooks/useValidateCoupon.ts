'use client';

import { useMutation } from '@tanstack/react-query';
import { getSession } from 'next-auth/react';
import type { ValidateCouponRequest, ValidateCouponResponse } from '@/types/coupon';

/**
 * Validate a coupon code and calculate discount.
 *
 * Plain fetch rather than apiClient because the response is read whole ({ success, valid, data }),
 * not unwrapped. So the session token is attached here by hand: without it the server can't tell
 * who is shopping, and per-customer rules (one use per customer, first-order only) can't be checked.
 * Guests are identified by the `email` they typed at checkout instead.
 */
export const useValidateCoupon = () => {
  return useMutation<ValidateCouponResponse, Error, ValidateCouponRequest>({
    mutationFn: async (request: ValidateCouponRequest) => {
      const baseURL = process.env.NEXT_PUBLIC_API_URL;
      const session = await getSession();
      const response = await fetch(`${baseURL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.token ? { Authorization: `Bearer ${session.user.token}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request failed with status code 404');
        }
        // For 400 or other errors, try to get the error message
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status code ${response.status}`);
      }

      const result = await response.json();

      return result;
    },
  });
};
