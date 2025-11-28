"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { otpSchema, OtpInput } from "@/libs/schemas/otp.schema";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { FieldInfo } from "@/components/Form/FieldInfo";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useSession } from "next-auth/react";
import { CheckCircleIcon } from "@phosphor-icons/react";

export default function VerifyOTPForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();
  const { data: session, update } = useSession();

  // Timer countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setResendSuccess(false);
    }
  }, [resendTimer]);

  const form = useForm({
    defaultValues: {
      otp: "",
    } as OtpInput,
    validators: {
      onSubmit: otpSchema,
    },
    onSubmit: async ({ value }) => {
      // Reset error state on submit
      setSubmitError(null);

      try {
        // Make API call to verify OTP
        const verifyResult = await apiClient.post(api.auth.verifyOtp, {
          code: value.otp,
        });

        if (verifyResult.status === 200) {
          await update({
            ...session,
            user: {
              ...session?.user,
              emailVerified: new Date(),
            },
          });
          // Success - redirect to home
          router.push("/");
        }
      } catch (error) {
        // Handle errors
        const errorMessage = handleApiError(error);
        setSubmitError(errorMessage);
        console.error("OTP verification error:", error);
      }
    },
  });

  const handleResendOTP = async () => {
    // Reset error state
    setSubmitError(null);
    setResendLoading(true);
    setResendSuccess(false);

    try {
      await apiClient.post(api.auth.resendOtp);

      // Success - show check icon and start timer
      setResendSuccess(true);
      setResendTimer(90); // 1 minute countdown
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.log("OTP resend error:", errorMessage);

      setSubmitError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="heading4 mb-2">Verify Your Email</h2>
        <p className="text-secondary">
          {`We've sent a 6-digit code to `}
          <span className="font-semibold text-black">{session?.user?.email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <form.Field name="otp">
        {(field) => {
          const hasError =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="flex flex-col items-center">
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

      {/* Error Message */}
      {submitError && (
        <div className="rounded-md text-red p-2 pt-0 text-center">
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="block-button mb-4">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="button-main w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </button>
          )}
        </form.Subscribe>
      </div>

      {/* Resend OTP */}
      <div className="text-center">
        {resendSuccess ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircleIcon size={16} weight="fill" />
              <span className="font-semibold">OTP sent</span>
            </div>
            {resendTimer > 0 && (
              <p className="text-xs text-secondary">
                Resend available in {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
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
                {`Didn't receive the code? `}<span className="underline font-semibold">Resend OTP</span>
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
