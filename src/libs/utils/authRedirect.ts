const CALLBACK_URL_STORAGE_KEY = "rawura_auth_callback_url";

/**
 * Only same-origin relative paths are accepted (must start with a single "/").
 * Rejects protocol-relative ("//evil.com"), backslash ("/\evil.com"), and
 * absolute URLs to guard against open-redirect after login/register/OTP.
 */
export function isSafeCallbackUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.startsWith("/\\")) return false;
  if (url.includes("://")) return false;
  return true;
}

export function saveCallbackUrl(url: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!isSafeCallbackUrl(url)) return;

  try {
    window.sessionStorage.setItem(CALLBACK_URL_STORAGE_KEY, url);
  } catch {
    // sessionStorage may be unavailable (private mode, disabled storage, etc.)
  }
}

export function peekCallbackUrl(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.sessionStorage.getItem(CALLBACK_URL_STORAGE_KEY);
    return isSafeCallbackUrl(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function clearCallbackUrl(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(CALLBACK_URL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Reads the saved callback URL (or fallback) and clears it so it isn't reused by a later, unrelated auth flow. */
export function consumeCallbackUrl(fallback = "/"): string {
  const url = peekCallbackUrl(fallback);
  clearCallbackUrl();
  return url;
}
