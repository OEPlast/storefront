'use client';

import React, { useEffect, useCallback } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import LoginClient from '@/app/login/LoginClient';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { useSession } from 'next-auth/react';

const ModalLogin = () => {
    const { isOpen, closeLoginModal, redirectPath } = useLoginModalStore();
    const { status } = useSession();
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!isOpen) {
                return;
            }

            if (event.key === 'Escape') {
                closeLoginModal();
            }
        },
        [isOpen, closeLoginModal]
    );

    useEffect(() => {
        if (!isOpen || status === 'authenticated') {
            return;
        }

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-login-block fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4" onClick={closeLoginModal}>
            <div
                className="relative w-full mx-2 md:mx-0 max-w-lg rounded-2xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={closeLoginModal}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-line text-secondary transition-colors hover:bg-black hover:text-white"
                    aria-label="Close login modal"
                >
                    <Icon.X size={18} weight="bold" />
                </button>

                <div className="px-6 pt-10 pb-8 md:px-10 md:pt-12">
                    <LoginClient
                        onLoginSuccess={closeLoginModal}
                        redirectPath={redirectPath ?? undefined}
                        pageHeader='Login to continue'
                    />
                </div>
            </div>
        </div>
    );
};

export default ModalLogin;
