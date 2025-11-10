"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/forms/LoginForm";
import GoogleLogin from "@/components/Other/GoogleLogin";

type LoginClientProps = {
  onLoginSuccess?: () => void;
  redirectPath?: string;
  pageHeader?: string;
};

export default function LoginClient({ onLoginSuccess, redirectPath, pageHeader = 'Welcome Back' }: LoginClientProps) {
  const searchParams = useSearchParams();
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setShowResetSuccess(true);
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowResetSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="content-main flex gap-y-8 ">
      <div className="  w-full max-w-xl mx-auto">
        {showResetSuccess && (
          <div className="p-4 mb-6 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <p className="text-sm font-semibold">
              ✓ Password reset successful! You can now login with your new password.
            </p>
          </div>
        )}
        <div className="heading4 text-center">{pageHeader}</div>
        <LoginForm onLoginSuccess={onLoginSuccess} redirectPath={redirectPath} />
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-line" />
          <span className="mx-4 text-secondary font-medium">OR</span>
          <div className="flex-grow h-px bg-line" />
        </div>
        <div className="block-button mt-2">
          <GoogleLogin />
        </div>
      </div>
    </div>
  );
}
