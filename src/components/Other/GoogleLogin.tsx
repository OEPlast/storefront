"use client";

import { googleAuthenticate } from "@/actions/google-login";
import React, { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { clearCallbackUrl, peekCallbackUrl } from "@/libs/utils/authRedirect";

interface GoogleLoginProps {
  /**
   * Explicit post-login destination (e.g. from the login popup). When given it
   * overrides the ?callbackUrl / saved-callback derivation and no search params
   * are read. Omit it to keep the page behaviour.
   */
  callbackUrl?: string;
}

interface GoogleLoginButtonProps {
  callbackUrl: string;
  onSubmit?: () => void;
}

const GoogleLoginButton = ({ callbackUrl, onSubmit }: GoogleLoginButtonProps) => {
  const [errorMsgGoogle, dispatchGoogle] = useActionState(googleAuthenticate, undefined);

  return (
    <form action={dispatchGoogle} onSubmit={onSubmit}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <button
        aria-label="Sign in with Google"
        className="button-main bg-transparent w-full flex items-center justify-center gap-2 text-black border border-gray-300"
        type="submit"
      >
        Continue with Google
        <FcGoogle size={20} />
      </button>
      {errorMsgGoogle && (
        <p className="text-red-500 text-sm mt-2 text-center">{errorMsgGoogle}</p>
      )}
    </form>
  );
};

const GoogleLoginFromSearchParams = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? peekCallbackUrl("/");

  return <GoogleLoginButton callbackUrl={callbackUrl} />;
};

const GoogleLogin = ({ callbackUrl }: GoogleLoginProps) => {
  if (callbackUrl !== undefined) {
    // The explicit destination is authoritative: drop any saved callback from an
    // earlier, abandoned flow so it can't leak into a later, unrelated login.
    return <GoogleLoginButton callbackUrl={callbackUrl} onSubmit={() => clearCallbackUrl()} />;
  }

  return <GoogleLoginFromSearchParams />;
};

export default GoogleLogin;
