'use client';

import React, { useState } from 'react';
import axios from 'axios';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';

type Source = 'footer' | 'about' | 'account' | 'checkout';

interface NewsletterFormProps {
  source: Source;
  /** 'icon': the footer's input with an arrow button. 'button': a wider "Subscribe" button. */
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Newsletter signup. Posts to `/newsletter/subscribe`, which records consent for a signed-in user
 * on their account and for a guest in the subscriber list; marketing email is only sent to
 * addresses that went through here (or opted in on their account).
 *
 * The server answers the same "subscribed" message whether or not the address was already on the
 * list, so this form can't be used to find out who is a customer.
 */
export default function NewsletterForm({ source, variant = 'icon', className = '' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setMessage('');
    try {
      const response = await apiClient.post(api.newsletter.subscribe, { email: email.trim(), source });
      setStatus('done');
      setMessage(response.message || "You're subscribed. Thanks for joining!");
      setEmail('');
    } catch (error) {
      setStatus('error');
      const serverMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setMessage(
        axios.isAxiosError(error) && error.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : serverMessage || 'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <div className={className}>
      <form className="relative h-[52px] w-full" onSubmit={submit} noValidate={false}>
        <label htmlFor={`newsletter-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-email-${source}`}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== 'sending') setStatus('idle');
          }}
          placeholder="Enter your e-mail"
          className={`caption1 h-full w-full rounded-xl border border-line pl-4 ${variant === 'icon' ? 'pr-14' : 'pr-36'}`}
          required
        />
        {variant === 'icon' ? (
          <button
            type="submit"
            disabled={status === 'sending'}
            aria-label="Subscribe"
            className="absolute right-1 top-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-black disabled:opacity-60"
          >
            {status === 'sending' ? (
              <Icon.CircleNotch size={22} color="#fff" className="animate-spin" />
            ) : (
              <Icon.ArrowRight size={24} color="#fff" />
            )}
          </button>
        ) : (
          <button
            type="submit"
            disabled={status === 'sending'}
            className="button-main absolute bottom-1 right-1 top-1 flex items-center justify-center disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Subscribe'}
          </button>
        )}
      </form>
      <p
        role="status"
        aria-live="polite"
        className={`caption1 mt-2 min-h-[1.25rem] ${status === 'error' ? 'text-red' : 'text-secondary'}`}
      >
        {message}
      </p>
    </div>
  );
}
