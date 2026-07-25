"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "../../auth";
import { AuthError } from "next-auth";

export async function googleAuthenticate(
  _prevState: string | undefined,
  formData: FormData
) {
  const callbackUrl = formData.get("callbackUrl");
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  try {
    await signIn("google", { redirectTo });
} catch (error) {
    if(isRedirectError(error)) {
        throw error;
    }
    
	if (error instanceof Error) {
			const { type, cause } = error as AuthError;
            
			switch (type) {
				case "CredentialsSignin":
					return "Invalid credentials.";
				case "CallbackRouteError":
					return cause?.err?.toString();
				default:
					return "Something went wrong.";
			}
	}

	return "Something went wrong.";
	}
}
