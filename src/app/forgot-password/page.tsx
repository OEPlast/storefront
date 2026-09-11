'use client';
import React from 'react';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import Footer from '@/components/Footer/Footer';
import ForgotPasswordForm from '@/components/forms/ForgotPasswordForm';

const ForgotPassword = () => {
  return (
    <>
      <div id="header" className="relative w-full">
        {/* <MenuEight props="bg-transparent" /> */}
        <br />{' '}
      </div>
      <div className="forgot-pass my-10 mt-32 md:mb-20">
        <div className="container">
          <div className="content-main flex gap-y-8 max-md:flex-col">
            <div className="mx-auto w-full max-w-xl">
              <ForgotPasswordForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
