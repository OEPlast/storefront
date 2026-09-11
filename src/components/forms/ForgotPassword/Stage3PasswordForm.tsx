"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft } from "@phosphor-icons/react";
import {
  RESEND_COOLDOWN_SECONDS,
  useForgotPasswordStore,
} from "@/store/useForgotPasswordStore";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { FieldInfo } from "@/components/Form/FieldInfo";
import PasswordStrengthIndicator from "@/components/common/PasswordStrengthIndicator";

/**
 * Stage 2 never checks the code with the server; Main-server only verifies it when the new
 * password is submitted here, answering "Invalid or expired OTP" or "OTP has expired". So a
 * mistyped or expired code surfaces on this stage, and the shopper needs a way out of it.
 */
const isCodeRejection = (message: string) => /\b(otp|code)\b/i.test(message);

export default function Stage3PasswordForm() {
  const router = useRouter();
  const {
    email,
    code,
    setCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    submitError,
    setSubmitError,
    setCurrentStage,
    resendTimer,
    setResendTimer,
    setResendSuccess,
    resendLoading,
    setResendLoading,
  } = useForgotPasswordStore();

  // Stays set when a follow-up "send a new code" request fails, so the recovery actions
  // don't disappear along with the original error.
  const [codeRejected, setCodeRejected] = useState(false);

  const form = useForm({
    defaultValues: {
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setCodeRejected(false);

      // Validate code (should already be validated, but double-check)
      if (!code || !/^[0-9]{6}$/.test(code)) {
        setSubmitError("Please enter a valid 6-digit code");
        setCodeRejected(true);
        return;
      }

      // Validate password length
      if (!value.newPassword || value.newPassword.length < 8) {
        setSubmitError("Password must be at least 8 characters");
        return;
      }

      // Validate uppercase
      if (!/[A-Z]/.test(value.newPassword)) {
        setSubmitError("Password must contain at least one uppercase letter");
        return;
      }

      // Validate lowercase
      if (!/[a-z]/.test(value.newPassword)) {
        setSubmitError("Password must contain at least one lowercase letter");
        return;
      }

      // Validate number
      if (!/[0-9]/.test(value.newPassword)) {
        setSubmitError("Password must contain at least one number");
        return;
      }

      // Validate passwords match
      if (value.newPassword !== value.confirmPassword) {
        setSubmitError("Passwords don't match");
        return;
      }

      try {
        // Update store
        setNewPassword(value.newPassword);
        setConfirmPassword(value.confirmPassword);

        // Reset password with OTP
        await apiClient.post(api.auth.resetPasswordByCode, {
          email: email,
          code: parseInt(code),
          newPassword: value.newPassword,
        });

        // Success - redirect to login
        router.push("/login?reset=success");
      } catch (error) {
        console.error("Reset password error:", error);
        const errorMessage = handleApiError(error);
        setSubmitError(errorMessage);
        setCodeRejected(isCodeRejection(errorMessage));
      }
    },
  });

  /** Keeps what was typed here, so coming back from Stage 2 doesn't mean retyping it. */
  const keepTypedPasswords = () => {
    setNewPassword(form.state.values.newPassword);
    setConfirmPassword(form.state.values.confirmPassword);
  };

  const handleBackToCode = () => {
    keepTypedPasswords();
    setSubmitError(null);
    setCurrentStage(2);
  };

  const handleSendNewCode = async () => {
    setSubmitError(null);
    setResendLoading(true);

    try {
      await apiClient.post(api.auth.requestResetPasswordCode, {
        email: email,
      });

      keepTypedPasswords();
      // Requesting a code deletes the previous one on the server, so the old digits are useless.
      setCode("");
      setResendSuccess(true);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      setCurrentStage(2);
    } catch (error) {
      setSubmitError(handleApiError(error));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleBackToCode}
        className="flex items-center gap-2 text-secondary hover:text-black transition-colors mb-4">
        <ArrowLeft size={20} />
        <span>Back to code</span>
      </button>

      <div className="heading4">Set New Password</div>
      <div className="body1 mt-2">Enter your new password below</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="md:mt-7 mt-4">
        <div className="space-y-5">
          {/* New Password */}
          <form.Field name="newPassword">
            {(field) => {
              const hasError =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div>
                  <label htmlFor="newPassword" className="caption1 mb-2 block">
                    New Password <span className="text-red">*</span>
                  </label>
                  <input
                    className={`border-line px-4 py-3 w-full rounded-lg ${
                      hasError ? "border-red-600" : ""
                    }`}
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="New Password *"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <PasswordStrengthIndicator
                    password={field.state.value}
                    minLength={8}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>

          {/* Confirm Password */}
          <form.Field name="confirmPassword">
            {(field) => {
              const hasError =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="caption1 mb-2 block">
                    Confirm Password <span className="text-red">*</span>
                  </label>
                  <input
                    className={`border-line px-4 py-3 w-full rounded-lg ${
                      hasError ? "border-red-600" : ""
                    }`}
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password *"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-5">
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {/* Code recovery: re-enter a mistyped code, or replace an expired one */}
        {codeRejected && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            <button
              type="button"
              onClick={handleBackToCode}
              className="text-secondary hover:text-black transition-colors underline">
              Re-enter the code
            </button>
            <button
              type="button"
              onClick={handleSendNewCode}
              disabled={resendLoading || resendTimer > 0}
              className="font-semibold underline hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {resendLoading
                ? "Sending..."
                : resendTimer > 0
                ? `Send a new code in ${Math.floor(resendTimer / 60)}:${String(
                    resendTimer % 60
                  ).padStart(2, "0")}`
                : "Send a new code"}
            </button>
          </div>
        )}

        {/* Reset Password Button */}
        <div className="block-button mt-7">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="button-main w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Resetting Password..." : "Reset Password"}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
  );
}
