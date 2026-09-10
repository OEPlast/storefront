'use client';

import React, { useEffect, useId, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useSession } from 'next-auth/react';
import LoginForm from '@/components/forms/LoginForm';
import GoogleLogin from '@/components/Other/GoogleLogin';
import { resolveLoginDestination } from '@/components/Auth/loginDestination';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { isSafeCallbackUrl, saveCallbackUrl } from '@/libs/utils/authRedirect';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Popup-first login. openLoginModal() = quick login (stay on the current page);
 * openLoginModal('/path') = go to '/path' after signing in.
 */
const ModalLogin = () => {
    const isOpen = useLoginModalStore((state) => state.isOpen);
    const redirectPath = useLoginModalStore((state) => state.redirectPath);
    const closeLoginModal = useLoginModalStore((state) => state.closeLoginModal);
    const { status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const pressStartedOnOverlayRef = useRef(false);
    const wasOpenRef = useRef(false);
    const lastPathnameRef = useRef(pathname);

    const safeRedirectPath = isSafeCallbackUrl(redirectPath) ? redirectPath : undefined;
    const isVisible = isOpen && status !== 'authenticated';

    // Never show the popup to a signed-in user. If it was requested while already
    // authenticated with a destination, honour the destination. When the session
    // becomes authenticated while it is open (a login from the popup), just close:
    // LoginForm owns the post-login navigation.
    useEffect(() => {
        const justOpened = isOpen && !wasOpenRef.current;
        wasOpenRef.current = isOpen;

        if (!isOpen || status !== 'authenticated') {
            return;
        }

        if (justOpened && safeRedirectPath) {
            router.push(safeRedirectPath);
        }
        closeLoginModal();
    }, [isOpen, status, safeRedirectPath, router, closeLoginModal]);

    // Close on route change.
    useEffect(() => {
        if (lastPathnameRef.current === pathname) {
            return;
        }
        lastPathnameRef.current = pathname;

        if (isOpen) {
            closeLoginModal();
        }
    }, [pathname, isOpen, closeLoginModal]);

    // Scroll lock, Escape, focus trap and focus restore while the dialog is shown.
    // The cleanup runs on every close path (overlay, button, Escape, login,
    // route change) and on unmount.
    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const { body } = document;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        const dialog = dialogRef.current;
        const emailInput = dialog?.querySelector<HTMLInputElement>('input[name="email"]');
        (emailInput ?? dialog)?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeLoginModal();
                return;
            }

            if (event.key !== 'Tab' || !dialogRef.current) {
                return;
            }

            const container = dialogRef.current;
            const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (element) => element.getClientRects().length > 0
            );

            if (focusable.length === 0) {
                event.preventDefault();
                container.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            const focusIsOutside = !active || active === container || !container.contains(active);

            if (event.shiftKey) {
                if (focusIsOutside || active === first) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (focusIsOutside || active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            body.style.overflow = previousOverflow;
            if (previouslyFocused && previouslyFocused.isConnected) {
                previouslyFocused.focus({ preventScroll: true });
            }
        };
    }, [isVisible, closeLoginModal]);

    if (!isVisible) {
        return null;
    }

    // Client-only render (the popup is never open during SSR), so reading
    // window.location here is safe and avoids useSearchParams in the root layout.
    const destination = resolveLoginDestination(safeRedirectPath);

    const handleCreateAccount = () => {
        const target = resolveLoginDestination(safeRedirectPath);
        saveCallbackUrl(target);
        closeLoginModal();
        router.push(`/register?callbackUrl=${encodeURIComponent(target)}`);
    };

    const handleForgotPassword = () => {
        saveCallbackUrl(resolveLoginDestination(safeRedirectPath));
        closeLoginModal();
        router.push('/forgot-password');
    };

    return (
        <div
            className="modal-login-block fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4"
            onMouseDown={(event) => {
                pressStartedOnOverlayRef.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
                // Only a press that starts and ends on the overlay closes the popup,
                // so a text selection dragged out of the dialog doesn't.
                if (event.target === event.currentTarget && pressStartedOnOverlayRef.current) {
                    closeLoginModal();
                }
                pressStartedOnOverlayRef.current = false;
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="relative w-full mx-2 md:mx-0 max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl outline-none"
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
                    <h2 id={titleId} className="heading4 text-center">
                        Log in to your account
                    </h2>
                    <p id={descriptionId} className="mt-2 text-center text-secondary">
                        Welcome back. Sign in to pick up where you left off.
                    </p>

                    <LoginForm
                        variant="modal"
                        onLoginSuccess={closeLoginModal}
                        redirectPath={safeRedirectPath}
                    />

                    <div className="my-4 flex items-center">
                        <div className="h-px flex-grow bg-line" />
                        <span className="mx-4 font-medium text-secondary">OR</span>
                        <div className="h-px flex-grow bg-line" />
                    </div>
                    <div className="block-button mt-2">
                        <GoogleLogin callbackUrl={destination} />
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-5 text-sm sm:flex-row sm:justify-between">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="font-semibold hover:underline"
                        >
                            Forgot your password?
                        </button>
                        <p className="text-secondary">
                            New here?{' '}
                            <button
                                type="button"
                                onClick={handleCreateAccount}
                                className="font-semibold text-black hover:underline"
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalLogin;
