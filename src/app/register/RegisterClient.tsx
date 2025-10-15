"use client";

import React from "react";
import Link from "next/link";
import RegisterForm from "@/components/forms/RegisterForm";
import GoogleLogin from "@/components/Other/GoogleLogin";
import { signOut } from "next-auth/react";

export default function RegisterClient() {
  return (
    <div className="content-main flex gap-y-8 flex-col">
      <div className="left w-full">
        <div className="heading4 text-center">Register</div>
        <RegisterForm />
        <div className="block-button mt-2">
          <GoogleLogin />
          <button
            aria-label="Sign out"
            className="mt-2 border border-line w-full flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-50"
            onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
      <div className="right w-full flex items-center">
        <div className="text-content">
          <div className="heading4">Already have an account?</div>
          <div className="mt-2 text-secondary">
            Welcome back. Sign in to access your personalized experience, saved preferences, and more. We{String.raw`'re`} thrilled to have
            you with us again!
          </div>
          <div className="block-button md:mt-7 mt-4">
            <Link href={"/login"} className="button-main">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
