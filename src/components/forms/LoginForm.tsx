'use client';

import React, { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { loginSchema, LoginInput } from "@/libs/schemas/auth.schema";
import { credentialsLogin } from "@/actions/login";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { FieldInfo } from "@/components/Form/FieldInfo";
import { useSession } from "next-auth/react";
import {
  clearCallbackUrl,
  consumeCallbackUrl,
  isSafeCallbackUrl,
  saveCallbackUrl,
} from '@/libs/utils/authRedirect';
import { resolveLoginDestination } from '@/components/Auth/loginDestination';
import { useForgotPasswordStore } from '@/store/useForgotPasswordStore';
interface LoginFormProps {
  onLoginSuccess?: () => void;
  redirectPath?: string;
  /**
   * "page" (default): the /login page flow, navigates to the saved callback URL.
   * "modal": the login popup. Stays on the current page (quick login) unless a
   * safe redirectPath is given. The register link is hidden because the popup
   * renders its own footer actions; forgot-password goes through onForgotPassword.
   */
  variant?: 'page' | 'modal';
  /** Prefills the email field, e.g. when checkout found an existing account for the typed email. */
  defaultEmail?: string;
  /**
   * Replaces the plain forgot-password link. The popup passes one that saves the page the shopper
   * is on before navigating, so finishing the reset brings them back there.
   */
  onForgotPassword?: () => void;
}

export default function LoginForm({
  onLoginSuccess,
  redirectPath,
  variant = 'page',
  defaultEmail,
  onForgotPassword,
}: LoginFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set when the email belongs to a guest-checkout record with no password: the fix is the
  // emailed-code flow, so the error offers that instead of "try again".
  const [guestClaimEmail, setGuestClaimEmail] = useState<string | null>(null);
  const startGuestClaim = useForgotPasswordStore((state) => state.startGuestClaim);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const queryClient = useQueryClient();
  const isModal = variant === "modal";
  // The popup can render over pages with their own "email"/"password" fields,
  // so its ids are scoped. The page form keeps the plain field names.
  const fieldIdPrefix = useId();
  const fieldId = (name: string) => (isModal ? `${fieldIdPrefix}-${name}` : name);

  const form = useForm({
    defaultValues: {
      email: defaultEmail ?? '',
      password: '',
      rememberMe: false,
    } as LoginInput,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setGuestClaimEmail(null);
      setIsLoading(true);

      // Resolve the popup destination before any await, so closing the popup
      // (which resets the store) can't change it mid-request.
      const modalRedirectPath = isSafeCallbackUrl(redirectPath) ? redirectPath : null;
      const modalDestination = isModal ? resolveLoginDestination(redirectPath) : null;

      try {
        const result = await credentialsLogin(value.email, value.password, value.rememberMe);

        if (result.success) {
          await update();

          if (isModal) {
            if (!result.emailVerified) {
              // VerifyOTPForm consumes this once the OTP step is complete.
              saveCallbackUrl(modalDestination);
              onLoginSuccess?.();
              router.push('/verify-otp');
            } else {
              clearCallbackUrl();
              // router.refresh() only re-renders server components; refetch
              // client-cached data fetched while logged out (e.g. review likes).
              void queryClient.invalidateQueries();
              onLoginSuccess?.();
              if (modalRedirectPath) {
                router.push(modalRedirectPath);
              } else {
                router.refresh();
              }
            }
          } else if (!result.emailVerified) {
            // Leave the saved callback URL in place - VerifyOTPForm will
            // consume it once the OTP step is complete.
            router.push('/verify-otp');
            onLoginSuccess?.();
            router.refresh();
          } else {
            router.replace(consumeCallbackUrl(redirectPath ?? '/'));
            router.refresh();
            onLoginSuccess?.();
          }
          // isLoading stays true on success so the button can't be re-submitted
          // while the navigation / refresh is in flight.
        } else {
          setSubmitError(result.error || 'Invalid credentials. Please try again.');
          setGuestClaimEmail(result.guestAccount ? value.email : null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Login error:', error);
        setSubmitError('Invalid credentials. Please try again.');
        setIsLoading(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mt-4 md:mt-7"
    >
      {/* Email */}
      <form.Field name="email">
        {(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div>
              <input
                className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${hasError ? "border-red-600" : ""
                  }`}
                id={fieldId(field.name)}
                name={field.name}
                type="email"
                placeholder="Email address *"
                autoComplete="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          );
        }}
      </form.Field>

      {/* Password */}
      <form.Field name="password">
        {(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="mt-5">
              <input
                className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${hasError ? "border-red-600" : ""
                  }`}
                id={fieldId(field.name)}
                name={field.name}
                type="password"
                placeholder="Password *"
                autoComplete="current-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          );
        }}
      </form.Field>

      {/* Remember Me & Forgot Password */}
      <div className="mt-5 flex items-center justify-between">
        <form.Field name="rememberMe">
          {(field) => (
            <div className="flex items-center">
              <div className="block-input">
                <input
                  type="checkbox"
                  id={fieldId(field.name)}
                  name={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <Icon.CheckSquare size={16} weight="fill" className="icon-checkbox" />
              </div>
              <label htmlFor={fieldId(field.name)} className="pl-2 cursor-pointer">
                Remember me
              </label>
            </div>
          )}
        </form.Field>
        {onForgotPassword ? (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium hover:underline"
          >
            Forgot Your Password?
          </button>
        ) : (
          <Link href="/forgot-password" className="text-sm font-medium hover:underline">
            Forgot Your Password?
          </Link>
        )}
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mt-5 rounded-lg border border-red-400 bg-red-100 p-4 text-red-700">
          <p className="text-sm">{submitError}</p>
          {guestClaimEmail && (
            <button
              type="button"
              onClick={() => {
                startGuestClaim(guestClaimEmail);
                // A route change also closes the login popup.
                router.push('/forgot-password');
              }}
              className="mt-2 text-sm font-semibold text-black underline"
            >
              Email me a code to set a password
            </button>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="block-button mt-4 md:mt-7">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting || isLoading}
              className="button-main w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting || isLoading ? 'Logging in...' : 'Login'}
            </button>
          )}
        </form.Subscribe>
      </div>
      {!isModal && (
        <div className="mt-2 text-center text-sm text-secondary2">
          {`Don't have an account? `}
          <Link href="/register" className="text-black hover:underline">
            Register
          </Link>
        </div>
      )}
    </form>
  );
}
