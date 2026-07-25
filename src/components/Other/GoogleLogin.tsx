"use client";

import { googleAuthenticate } from "@/actions/google-login";
import React, { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { peekCallbackUrl } from "@/libs/utils/authRedirect";

const GoogleLogin = () => {
  const [errorMsgGoogle, dispatchGoogle] = useActionState(googleAuthenticate, undefined);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? peekCallbackUrl("/");

  return (
    <form action={dispatchGoogle}>
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

export default GoogleLogin;
