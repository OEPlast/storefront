'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/forms/LoginForm';
import GoogleLogin from '@/components/Other/GoogleLogin';
import { saveCallbackUrl } from '@/libs/utils/authRedirect';

type LoginClientProps = {
  onLoginSuccess?: () => void;
  redirectPath?: string;
  pageHeader?: string;
};

export default function LoginClient({
  onLoginSuccess,
  redirectPath,
  pageHeader = 'Welcome Back',
}: LoginClientProps) {
  const searchParams = useSearchParams();
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  // Persist the intended destination so it survives an OTP detour and page
  // reloads (e.g. Google OAuth), and takes priority over the hardcoded default.
  useEffect(() => {
    saveCallbackUrl(redirectPath ?? searchParams.get('callbackUrl'));
  }, [redirectPath, searchParams]);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setShowResetSuccess(true);
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowResetSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="content-main flex w-full gap-y-8">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 p-6 shadow-sm">
        {showResetSuccess && (
          <div className="mb-6 rounded-lg border border-green-400 bg-green-100 p-4 text-green-700">
            <p className="text-sm font-semibold">
              ✓ Password reset successful! You can now login with your new password.
            </p>
          </div>
        )}
        <div className="heading4 text-center">{pageHeader}</div>
        <LoginForm onLoginSuccess={onLoginSuccess} redirectPath={redirectPath} />
        <div className="my-4 flex items-center">
          <div className="h-px flex-grow bg-line" />
          <span className="mx-4 font-medium text-secondary">OR</span>
          <div className="h-px flex-grow bg-line" />
        </div>
        <div className="block-button mt-2">
          <GoogleLogin />
        </div>
      </div>
    </div>
  );
}
