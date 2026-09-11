import { create } from 'zustand';

/**
 * Seconds before another code can be requested. Mirrors Main-server's OTP_Limiter (one
 * request per 1.5 minutes): the old 60-second countdown re-enabled "Resend" while the
 * server was still rejecting it with 429.
 */
export const RESEND_COOLDOWN_SECONDS = 90;

type Stage = 1 | 2 | 3;

interface ForgotPasswordState {
  // Stage management
  currentStage: Stage;
  setCurrentStage: (stage: Stage) => void;
  
  // Form data
  email: string;
  setEmail: (email: string) => void;
  code: string;
  setCode: (code: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  
  // UI state
  submitError: string | null;
  setSubmitError: (error: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  
  // OTP resend state
  resendTimer: number;
  setResendTimer: (seconds: number) => void;
  decrementTimer: () => void;
  resendSuccess: boolean;
  setResendSuccess: (success: boolean) => void;
  resendLoading: boolean;
  setResendLoading: (loading: boolean) => void;
  
  // Reset all state
  reset: () => void;
}

const initialState = {
  currentStage: 1 as Stage,
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
  submitError: null,
  successMessage: null,
  isTransitioning: false,
  resendTimer: 0,
  resendSuccess: false,
  resendLoading: false,
};

export const useForgotPasswordStore = create<ForgotPasswordState>((set) => ({
  ...initialState,
  
  setCurrentStage: (stage) => set({ currentStage: stage }),
  setEmail: (email) => set({ email }),
  setCode: (code) => set({ code }),
  setNewPassword: (password) => set({ newPassword: password }),
  setConfirmPassword: (password) => set({ confirmPassword: password }),
  setSubmitError: (error) => set({ submitError: error }),
  setSuccessMessage: (message) => set({ successMessage: message }),
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
  setResendTimer: (seconds) => set({ resendTimer: seconds }),
  decrementTimer: () => set((state) => ({ resendTimer: Math.max(0, state.resendTimer - 1) })),
  setResendSuccess: (success) => set({ resendSuccess: success }),
  setResendLoading: (loading) => set({ resendLoading: loading }),
  reset: () => set(initialState),
}));
