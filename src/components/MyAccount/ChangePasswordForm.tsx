'use client';

import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useChangePassword } from '@/hooks/mutations/usePasswordMutations';
import { z } from 'zod';
import { FieldInfo } from '@/components/Form/FieldInfo';
import PasswordStrengthIndicator from '@/components/common/PasswordStrengthIndicator';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
});

export default function ChangePasswordForm() {
  const changePasswordMutation = useChangePassword();
  const [successMessage, setSuccessMessage] = useState('');

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: changePasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setSuccessMessage('');
      try {
        await changePasswordMutation.mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });
        setSuccessMessage('Password changed successfully!');
        form.reset();
      } catch (error) {
        // Error handled by mutation
      }
    },
  });

  return (
    <div>
      <div className="heading5 pb-4 lg:mt-10 mt-6">Change Password</div>

      {/* Error Banner */}
      {changePasswordMutation.isError && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {changePasswordMutation.error instanceof Error
            ? changePasswordMutation.error.message
            : 'Failed to change password. Please try again.'}
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
        {/* Current Password Field */}
        <form.Field name="currentPassword">
          {(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="pass">
                <label htmlFor="currentPassword" className="caption1">
                  Current password <span className="text-red">*</span>
                </label>
                <input
                  className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id="currentPassword"
                  type="password"
                  placeholder="Current Password *"
                  autoComplete='current-password'
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={changePasswordMutation.isPending}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        </form.Field>

        {/* New Password Field */}
        <form.Field name="newPassword">
          {(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="new-pass mt-5">
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
                  disabled={changePasswordMutation.isPending}
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
                  disabled={changePasswordMutation.isPending}
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
                disabled={!canSubmit || isSubmitting || changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Changing Password...' : 'Submit'}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
