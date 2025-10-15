"use client";

export const getAuthErrorMessage = (error: string | null): string | null => {
  if (!error) return null;

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration. Please contact support.",
    AccessDenied: "Access denied. Please check your credentials and try again.",
    Verification: "The verification token has expired or has already been used.",
    OAuthSignin: "Error in constructing an authorization URL.",
    OAuthCallback: "Error in handling the response from the OAuth provider.",
    OAuthCreateAccount: "Could not create OAuth provider user in the database.",
    EmailCreateAccount: "Could not create email provider user in the database.",
    Callback: "Error in the OAuth callback handler route.",
    OAuthAccountNotLinked: "Email already used with a different account.",
    SessionRequired: "You must be signed in to access this page.",
    CredentialsSignin: "Invalid email or password. Please try again.",
    Default: "An error occurred during authentication. Please try again.",
  };

  return errorMessages[error] || errorMessages.Default;
};
