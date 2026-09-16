'use client';

import { create } from 'zustand';
import { isSafeCallbackUrl } from '@/libs/utils/authRedirect';

export interface LoginModalOptions {
  /** Prefills the email field. */
  email?: string | null;
  /** Shown above the form, e.g. why checkout is asking the shopper to sign in. */
  message?: string | null;
}

interface LoginModalState {
  isOpen: boolean;
  redirectPath: string | null;
  prefillEmail: string | null;
  message: string | null;
  openLoginModal: (redirectPath?: string | null, options?: LoginModalOptions) => void;
  closeLoginModal: () => void;
  setRedirectPath: (path: string | null) => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  redirectPath: null,
  prefillEmail: null,
  message: null,
  openLoginModal: (redirectPath, options) =>
    set(() => ({
      isOpen: true,
      // Only same-origin relative paths are kept. No (or an unsafe) path means
      // a quick login: the user stays on the current page after signing in.
      redirectPath: isSafeCallbackUrl(redirectPath) ? redirectPath : null,
      prefillEmail: options?.email?.trim() || null,
      message: options?.message?.trim() || null,
    })),
  closeLoginModal: () =>
    set(() => ({
      isOpen: false,
      redirectPath: null,
      prefillEmail: null,
      message: null,
    })),
  setRedirectPath: (path) => set(() => ({ redirectPath: path })),
}));
