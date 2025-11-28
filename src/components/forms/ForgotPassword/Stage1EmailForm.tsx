"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { useForgotPasswordStore } from "@/store/useForgotPasswordStore";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { FieldInfo } from "@/components/Form/FieldInfo";

export default function Stage1EmailForm() {
  const {
    email,
    setEmail,
    submitError,
    setSubmitError,
    successMessage,
    setSuccessMessage,
    isTransitioning,
    setIsTransitioning,
    setCurrentStage,
    setResendTimer,
  } = useForgotPasswordStore();

  const form = useForm({
    defaultValues: {
      email: email,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setSuccessMessage(null);

      // Validate email
      if (!value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        setSubmitError("Please enter a valid email address");
        return;
      }

      try {
        // Update store
        setEmail(value.email);

        // Request OTP
        await apiClient.post(api.auth.requestResetPasswordCode, {
          email: value.email,
        });

        // Show success message
        setSuccessMessage("Code sent successfully! Check your email.");
        setIsTransitioning(true);

        // Wait 2 seconds before transitioning
        setTimeout(() => {
          setCurrentStage(2);
          setResendTimer(60);
          setIsTransitioning(false);
          setSuccessMessage(null);
        }, 2000);
      } catch (error) {
        console.error("Forgot password error:", error);
        const errorMessage = handleApiError(error);

        // Handle "User does not exist" gracefully for security
        if (errorMessage === "User does not exist") {
          setSuccessMessage(
            "If an account exists with this email, you will receive a code shortly."
          );
          setIsTransitioning(true);

          setTimeout(() => {
            setCurrentStage(2);
            setResendTimer(60);
            setIsTransitioning(false);
            setSuccessMessage(null);
          }, 2000);
          return;
        }

        setSubmitError(errorMessage);
      }
    },
  });

  return (
    <>
      <div className="heading4">Reset your password</div>
      <div className="body1 mt-2">
        We will send you an email to reset your password
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="md:mt-7 mt-4">
        {/* Email */}
        <form.Field name="email">
          {(field) => {
            const hasError =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <div>
                <input
                  className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                    hasError ? "border-red-600" : ""
                  }`}
                  id={field.name}
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

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg mt-5">
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-5">
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="block-button md:mt-7 mt-4">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting || isTransitioning}
                className="button-main w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting
                  ? "Sending..."
                  : isTransitioning
                  ? "Code Sent!"
                  : "Submit"}
              </button>
            )}
          </form.Subscribe>
        </div>

        <div className="mt-4 text-center text-sm text-secondary2">
          Remember your password?{" "}
          <Link href="/login" className="text-black hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </>
  );
}
