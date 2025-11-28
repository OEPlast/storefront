"use client";

import React, { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useForgotPasswordStore } from "@/store/useForgotPasswordStore";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { FieldInfo } from "@/components/Form/FieldInfo";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { CheckCircleIcon, ArrowLeft } from "@phosphor-icons/react";

export default function Stage2OTPForm() {
  const {
    email,
    code,
    setCode,
    submitError,
    setSubmitError,
    setCurrentStage,
    resendTimer,
    setResendTimer,
    decrementTimer,
    resendSuccess,
    setResendSuccess,
    resendLoading,
    setResendLoading,
  } = useForgotPasswordStore();

  // Timer countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        decrementTimer();
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setResendSuccess(false);
    }
  }, [resendTimer, decrementTimer, setResendSuccess]);

  const form = useForm({
    defaultValues: {
      code: code,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      // Validate code format
      if (!value.code || !/^[0-9]{6}$/.test(value.code)) {
        setSubmitError("Please enter a valid 6-digit code");
        return;
      }

      // Update store and move to Stage 3
      setCode(value.code);
      setCurrentStage(3);
    },
  });

  const handleResendOTP = async () => {
    setSubmitError(null);
    setResendLoading(true);
    setResendSuccess(false);

    try {
      await apiClient.post(api.auth.requestResetPasswordCode, {
        email: email,
      });

      setResendSuccess(true);
      setResendTimer(60);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSubmitError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setCurrentStage(1);
    setSubmitError(null);
    setCode("");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleBackToEmail}
        className="flex items-center gap-2 text-secondary hover:text-black transition-colors mb-4">
        <ArrowLeft size={20} />
        <span>Change email</span>
      </button>

      <div className="heading4">Verify Code</div>
      <div className="body1 mt-2">
        {`We've sent a 6-digit code to `}
        <span className="font-semibold text-black">{email}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="md:mt-7 mt-4">
        {/* OTP Input */}
        <form.Field name="code">
          {(field) => {
            const hasError =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <div className="flex flex-col items-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}>
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot inputMode="numeric" index={0} />
                    <InputOTPSlot inputMode="numeric" index={1} />
                    <InputOTPSlot inputMode="numeric" index={2} />
                    <InputOTPSlot inputMode="numeric" index={3} />
                    <InputOTPSlot inputMode="numeric" index={4} />
                    <InputOTPSlot inputMode="numeric" index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="mt-3">
                  <FieldInfo field={field} />
                </div>
              </div>
            );
          }}
        </form.Field>

        {/* Resend OTP */}
        <div className="text-center mb-6">
          {resendSuccess ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircleIcon size={16} weight="fill" />
                <span className="font-semibold">Code sent</span>
              </div>
              {resendTimer > 0 && (
                <p className="text-xs text-secondary">
                  Resend available in {Math.floor(resendTimer / 60)}:
                  {String(resendTimer % 60).padStart(2, "0")}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading || resendTimer > 0}
              className="text-sm text-secondary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {resendLoading ? (
                "Sending..."
              ) : (
                <>
                  {`Didn't receive the code? `}
                  <span className="underline font-semibold">Resend Code</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-5">
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {/* Next Button */}
        <div className="block-button">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="button-main w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Verifying..." : "Continue"}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
  );
}
