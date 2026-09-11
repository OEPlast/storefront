import { isSafeCallbackUrl } from "@/libs/utils/authRedirect";

/** Page-based auth flow routes: the login popup never stacks on top of these. */
export const AUTH_PAGE_PATHS = ["/login", "/register", "/forgot-password", "/verify-otp"];

export function isAuthPagePath(pathname: string | null | undefined): boolean {
  return AUTH_PAGE_PATHS.includes(pathname ?? "");
}

/**
 * The page the user is on right now (pathname + search), read from
 * window.location so callers in the root layout don't need useSearchParams.
 * Only call it in the browser (event handlers, effects, client-only renders).
 */
export function getCurrentPath(): string {
  if (typeof window === "undefined") return "/";

  const path = `${window.location.pathname}${window.location.search}`;
  return isSafeCallbackUrl(path) ? path : "/";
}

/**
 * Where a login started from the popup should end up: the requested
 * redirectPath when it is safe, otherwise the current page (quick login).
 */
export function resolveLoginDestination(redirectPath?: string | null): string {
  return isSafeCallbackUrl(redirectPath) ? redirectPath : getCurrentPath();
}
