'use client';

import React from 'react';
import { useAccountStore } from '@/store/accountStore';
import { usePasswordStatus } from '@/hooks/queries/usePasswordStatus';
import SetPasswordForm from './SetPasswordForm';
import ChangePasswordForm from './ChangePasswordForm';
import ProfileInformation from './ProfileInformation';
import EmailPreferences from './EmailPreferences';
import AccountDataSection from './AccountDataSection';

export default function Settings() {
  const { activeTab } = useAccountStore();
  const { data: passwordStatus, isLoading: isLoadingPasswordStatus } = usePasswordStatus();

  if (activeTab !== 'setting') return null;

  return (
    <>
      {/* Profile Information Section */}
      <ProfileInformation />

      {/* Divider */}
      <div className="my-5">
        <hr className="border-line" />
      </div>

      {/* Password Management Section */}
      {isLoadingPasswordStatus ? (
        <div className="tab text-content w-full p-7 border border-line rounded-xl">
          <div className="heading5 pb-4">Loading password settings...</div>
        </div>
      ) : passwordStatus?.hasPassword ? (
        <ChangePasswordForm />
      ) : (
        <SetPasswordForm />
      )}

      <div className="my-5">
        <hr className="border-line" />
      </div>

      <EmailPreferences />

      <div className="my-5">
        <hr className="border-line" />
      </div>

      <AccountDataSection />
    </>
  );
}
