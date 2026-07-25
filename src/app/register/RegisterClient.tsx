'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RegisterForm from '@/components/forms/RegisterForm';
import GoogleLogin from '@/components/Other/GoogleLogin';
import { signOut } from 'next-auth/react';
import { GetCountries } from 'react-country-state-city';
import { Country } from 'react-country-state-city/dist/esm/types';
import { saveCallbackUrl } from '@/libs/utils/authRedirect';

export default function RegisterClient() {
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    GetCountries().then((result) => {
      setCountriesList(result);
    });
  }, []);

  // Persist the intended destination so it survives the register -> OTP -> home flow.
  useEffect(() => {
    saveCallbackUrl(searchParams.get('callbackUrl'));
  }, [searchParams]);
  return (
    <div className="content-main mx-auto flex max-w-[650px] flex-col gap-y-8 rounded-2xl border p-4 shadow-sm">
      <div className="left w-full">
        <div className="heading4 text-center">Register</div>
        <RegisterForm />
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
