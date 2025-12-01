import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

interface PaymentStore {
  reference: string | null;
  add: (reference: string) => void;
  clear: () => void;
  verify: () => Promise<{ success: boolean; message?: string }>;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      reference: null,

      add: (reference: string) => {
        set({ reference });
      },

      clear: () => {
        set({ reference: null });
      },

      verify: async () => {
        const { reference } = get();

        if (!reference) {
          return { success: false, message: 'No payment reference to verify' };
        }

        try {
          // Use payments/verify endpoint
          const response = await apiClient.get(`/payments/verify/${reference}`);

          // Clear reference after successful verification
          set({ reference: null });

          return {
            success: true,
            message: (response.data as any)?.message || 'Payment verified successfully',
          };
        } catch (error) {
          // Clear reference even on error to prevent retry loops
          set({ reference: null });

          return {
            success: false,
            message: error instanceof Error ? error.message : 'Payment verification failed',
          };
        }
      },
    }),
    {
      name: 'payment-storage-Rawura', // localStorage key
    }
  )
);
