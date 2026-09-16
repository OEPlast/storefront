'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

interface DeletionStatus {
  scheduledFor: string | null;
  requestedAt: string | null;
  graceDays: number;
  hasPassword: boolean;
  blockers: string[];
}

const STATUS_KEY = ['accountDeletionStatus'];

const errorMessage = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && error.response?.data?.message) || fallback;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * "Your data" in account settings: download a copy of your personal data, and delete the account.
 * Deletion is scheduled, not immediate: the account keeps working for the grace period so it can
 * be cancelled, then the server anonymises it (see Main-server services/users/accountDeletion.ts).
 */
export default function AccountDataSection() {
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data: status } = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => (await apiClient.get<DeletionStatus>(api.user.accountDeletion)).data!,
    staleTime: 60 * 1000,
  });

  const requestDeletion = useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ scheduledFor: string }>(api.user.accountDeletion, { confirmation, password: password || undefined })).data,
    onSuccess: () => {
      toast.success('Account deletion scheduled');
      setShowDelete(false);
      setConfirmation('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not schedule deletion')),
  });

  const cancelDeletion = useMutation({
    mutationFn: async () => apiClient.delete(api.user.accountDeletion),
    onSuccess: () => {
      toast.success('Account deletion cancelled');
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not cancel deletion')),
  });

  const downloadData = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.get<Record<string, unknown>>(api.user.dataExport);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not download your data'));
    } finally {
      setDownloading(false);
    }
  };

  const graceDays = status?.graceDays ?? 7;
  const blockers = status?.blockers ?? [];
  const canSubmit = confirmation.trim().toUpperCase() === 'DELETE' && (!status?.hasPassword || password.length > 0);

  return (
    <div className="tab text-content w-full rounded-xl border border-line p-7">
      <div className="heading5 pb-4">Your data</div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-title">Download your data</div>
          <p className="caption1 mt-1 text-secondary">
            A copy of your profile, addresses, orders, returns, reviews and email preferences, as a JSON file.
          </p>
        </div>
        <button type="button" onClick={downloadData} disabled={downloading} className="button-main shrink-0 disabled:opacity-60">
          {downloading ? 'Preparing…' : 'Download'}
        </button>
      </div>

      <hr className="my-6 border-line" />

      {status?.scheduledFor ? (
        <div className="rounded-xl border border-red bg-red/5 p-5">
          <div className="flex items-start gap-3">
            <Icon.Warning size={24} className="shrink-0 text-red" />
            <div>
              <div className="text-title">Your account will be deleted on {formatDate(status.scheduledFor)}</div>
              <p className="caption1 mt-1 text-secondary">
                After that your personal details are removed for good and you can&apos;t sign in. Changed your mind?
              </p>
              <button
                type="button"
                onClick={() => cancelDeletion.mutate()}
                disabled={cancelDeletion.isPending}
                className="button-main mt-3 disabled:opacity-60"
              >
                {cancelDeletion.isPending ? 'Cancelling…' : 'Keep my account'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-title">Delete your account</div>
          <p className="caption1 mt-1 text-secondary">
            We remove your name, email, phone number and addresses, and you won&apos;t be able to sign in. Records of
            past orders and payments are kept for tax purposes but no longer identify you. You have {graceDays} days to
            change your mind.
          </p>

          {blockers.length > 0 && (
            <p className="caption1 mt-3 rounded-lg bg-surface p-3">
              You can delete your account once nothing is in progress: {blockers.join('; ')}.
            </p>
          )}

          {!showDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              disabled={blockers.length > 0}
              className="mt-4 rounded-lg border border-red px-5 py-2.5 text-sm font-semibold text-red duration-300 hover:bg-red hover:text-white disabled:opacity-40"
            >
              Delete my account
            </button>
          ) : (
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit) requestDeletion.mutate();
              }}
            >
              <div>
                <label htmlFor="delete-confirm" className="mb-1 block text-sm font-medium">
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-line px-4 py-3"
                />
              </div>
              {status?.hasPassword && (
                <div>
                  <label htmlFor="delete-password" className="mb-1 block text-sm font-medium">
                    Your password
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-line px-4 py-3"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit || requestDeletion.isPending}
                  className="rounded-lg bg-red px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {requestDeletion.isPending ? 'Scheduling…' : `Delete my account in ${graceDays} days`}
                </button>
                <button type="button" onClick={() => setShowDelete(false)} className="rounded-lg border border-line px-5 py-2.5 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
