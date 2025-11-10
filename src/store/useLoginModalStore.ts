'use client';

import { create } from 'zustand';

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
      redirectPath: redirectPath ?? null,
    })),
  closeLoginModal: () =>
    set(() => ({
      isOpen: false,
      redirectPath: null,
    })),
  setRedirectPath: (path) => set(() => ({ redirectPath: path })),
}));
