"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useForgotPasswordStore } from "@/store/useForgotPasswordStore";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { FieldInfo } from "@/components/Form/FieldInfo";
import PasswordStrengthIndicator from "@/components/common/PasswordStrengthIndicator";

export default function Stage3PasswordForm() {
  const router = useRouter();
  const {
    email,
    code,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    submitError,
    setSubmitError,
  } = useForgotPasswordStore();

  const form = useForm({
    defaultValues: {
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      // Validate code (should already be validated, but double-check)
      if (!code || !/^[0-9]{6}$/.test(code)) {
        setSubmitError("Please enter a valid 6-digit code");
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
      }
    },
  });

  return (
    <>
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
