import { create } from 'zustand';

interface ReviewFormStore {
  showReviewForm: boolean;
  showEligibilityWarning: boolean;
  openReviewForm: () => void;
  closeReviewForm: () => void;
  showWarning: () => void;
  hideWarning: () => void;
  reset: () => void;
}

export const useReviewFormStore = create<ReviewFormStore>((set) => ({
  showReviewForm: false,
  showEligibilityWarning: false,

  openReviewForm: () => set({ showReviewForm: true, showEligibilityWarning: false }),

  closeReviewForm: () => set({ showReviewForm: false, showEligibilityWarning: false }),

  showWarning: () => {
    set({ showEligibilityWarning: true, showReviewForm: false });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      set({ showEligibilityWarning: false });
    }, 5000);
  },

  hideWarning: () => set({ showEligibilityWarning: false }),

  reset: () => set({ showReviewForm: false, showEligibilityWarning: false }),
}));
