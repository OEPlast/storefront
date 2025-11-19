const ROUTES = {
  login: '/auth/login',
  providerLogin: '/auth/login/provider',
  register: '/auth/register',

  // Logistics endpoints
  logisticsCountries: '/general/logistics/countries',
  logisticsLocationsTree: '/general/logistics/locations-tree',
  logisticsLocationsByCountry: (country: string) =>
    `/general/logistics/locations/${encodeURIComponent(country)}`,

  // Coupon endpoints
  coupons: '/coupons',
  cartCoupons: '/coupons/cart',
  couponByCode: (code: string) => `/coupons/${encodeURIComponent(code)}`,
  couponValidate: '/coupons/validate',

  // File upload endpoints
  uploadSingleFile: '/files/upload/single',
  uploadMultipleFiles: '/files/upload/multiple',
} as const;

type RoutesMap = typeof ROUTES;
type RouteKey = keyof RoutesMap;

// Helper type to handle both string and function routes
type RouteValue<T> = T extends (...args: any[]) => string
  ? (...args: Parameters<T>) => string
  : string;

type PrefixedRoutes = {
  [K in RouteKey]: RouteValue<RoutesMap[K]>;
};

/**
 * Build a prefixed routes object given a base URL.
 * Example:
 *   const routes = buildPrefixedRoutes('https://api.example.com');
 *   routes.login === 'https://api.example.com/auth/login'
 */
export function buildPrefixedRoutes(baseUrl: string): PrefixedRoutes {
  const obj = {} as any;
  (Object.keys(ROUTES) as RouteKey[]).forEach((key) => {
    const route = ROUTES[key];
    if (typeof route === 'function') {
      obj[key] = (param: string) => `${baseUrl}${(route as (p: string) => string)(param)}`;
    } else {
      obj[key] = `${baseUrl}${route}`;
    }
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
