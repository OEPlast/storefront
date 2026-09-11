"use client";

import React, { useEffect } from "react";
import { useForgotPasswordStore } from "@/store/useForgotPasswordStore";
import Stage1EmailForm from "./ForgotPassword/Stage1EmailForm";
import Stage2OTPForm from "./ForgotPassword/Stage2OTPForm";
import Stage3PasswordForm from "./ForgotPassword/Stage3PasswordForm";

export default function ForgotPasswordForm() {
  const currentStage = useForgotPasswordStore((state) => state.currentStage);
  const resendTimer = useForgotPasswordStore((state) => state.resendTimer);
  const decrementTimer = useForgotPasswordStore((state) => state.decrementTimer);
  const setResendSuccess = useForgotPasswordStore((state) => state.setResendSuccess);

  // The resend countdown runs here rather than inside Stage 2, so it keeps ticking while
  // the shopper is on Stage 3. It used to freeze there and show a stale timer on return.
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

  // The store outlives the page, so leaving mid-flow used to resume on the old stage.
  useEffect(() => {
    return () => useForgotPasswordStore.getState().reset();
  }, []);

  return (
    <div>
      {currentStage === 1 && <Stage1EmailForm />}
      {currentStage === 2 && <Stage2OTPForm />}
      {currentStage === 3 && <Stage3PasswordForm />}
    </div>
  );
}
