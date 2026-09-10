'use client';

import { create } from 'zustand';
import { isSafeCallbackUrl } from '@/libs/utils/authRedirect';

interface LoginModalState {
  isOpen: boolean;
  redirectPath: string | null;
  openLoginModal: (redirectPath?: string | null) => void;
  closeLoginModal: () => void;
  setRedirectPath: (path: string | null) => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  redirectPath: null,
  openLoginModal: (redirectPath) =>
    set(() => ({
      isOpen: true,
      // Only same-origin relative paths are kept. No (or an unsafe) path means
      // a quick login: the user stays on the current page after signing in.
      redirectPath: isSafeCallbackUrl(redirectPath) ? redirectPath : null,
    })),
  closeLoginModal: () =>
    set(() => ({
      isOpen: false,
      redirectPath: null,
    })),
  setRedirectPath: (path) => set(() => ({ redirectPath: path })),
}));
