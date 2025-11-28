'use client';

import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useSetPassword } from '@/hooks/mutations/usePasswordMutations';
import { z } from 'zod';
import { FieldInfo } from '@/components/Form/FieldInfo';
import PasswordStrengthIndicator from '@/components/common/PasswordStrengthIndicator';

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function SetPasswordForm() {
  const setPasswordMutation = useSetPassword();
  const [successMessage, setSuccessMessage] = useState('');

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: setPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setSuccessMessage('');
      try {
        await setPasswordMutation.mutateAsync({
          newPassword: value.newPassword,
        });
        setSuccessMessage('Password set successfully! You can now use it to login.');
        form.reset();
      } catch (error) {
        // Error handled by mutation
      }
    },
  });

  return (
    <div>
      <div className="heading5 pb-4 lg:mt-10 mt-6">Set Password</div>
      <p className="text-secondary mb-4">
        Set a password to enable email/password login for your account.
      </p>

      {/* Error Banner */}
      {setPasswordMutation.isError && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {setPasswordMutation.error instanceof Error
            ? setPasswordMutation.error.message
            : 'Failed to set password. Please try again.'}
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 mb-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {/* New Password Field */}
        <form.Field name="newPassword">
          {(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="new-pass">
                <label htmlFor="newPassword" className="caption1">
                  New password <span className="text-red">*</span>
                </label>
                <input
                  className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id="newPassword"
                  type="password"
                  autoComplete='new-password'
                  placeholder="New Password *"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={setPasswordMutation.isPending}
                />
                <PasswordStrengthIndicator password={field.state.value} minLength={8} />
                <FieldInfo field={field} />
              </div>
            );
          }}
        </form.Field>

        {/* Confirm Password Field */}
        <form.Field name="confirmPassword">
          {(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="confirm-pass mt-5">
                <label htmlFor="confirmPassword" className="caption1">
                  Confirm new password <span className="text-red">*</span>
                </label>
                <input
                  className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password *"
                    autoComplete='confirm-new-password'
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={setPasswordMutation.isPending}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        </form.Field>

        {/* Submit Button */}
        <div className="block-button lg:mt-10 mt-6">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                className="button-main"
                disabled={!canSubmit || isSubmitting || setPasswordMutation.isPending}
              >
                {setPasswordMutation.isPending ? 'Setting Password...' : 'Set Password'}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
