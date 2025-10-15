const ROUTES = {
  login: "/auth/login",
  providerLogin: "/auth/login/provider",
  register: "/auth/register",
} as const;

type RoutesMap = typeof ROUTES;
type RouteKey = keyof RoutesMap;

/**
 * Build a prefixed routes object given a base URL.
 * Example:
 *   const routes = buildPrefixedRoutes('https://api.example.com');
 *   routes.login === 'https://api.example.com/auth/login'
 */
export function buildPrefixedRoutes(baseUrl: string) {
  const obj = {} as Record<RouteKey, string>;
  (Object.keys(ROUTES) as RouteKey[]).forEach((key) => {
    obj[key] = `${baseUrl}${ROUTES[key]}`;
  });
  return obj;
}

const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_URL as string;

export const APIRoutes = buildPrefixedRoutes(DEFAULT_BASE);

/**
 * Convenience function to get prefixed routes with any base (useful in tests / runtime).
 * Example: getApiRoutes('http://localhost:4000').login
 */
export const getApiRoutes = (baseUrl?: string) => buildPrefixedRoutes(baseUrl ?? DEFAULT_BASE);

export default APIRoutes;
