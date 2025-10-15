// API endpoints for use with apiClient (which already has baseURL configured)
// No need to prefix with BASE_URL since axios instance handles that
export const api = {
  // Auth endpoints
  auth: {
    login: "/auth/login",
    providerLogin: "/auth/login/provider",
    register: "/auth/register",
    logout: "/auth/logout",
    refreshToken: "/auth/refresh",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },

  // Product endpoints
  products: {
    list: "/products",
    byId: (id: string) => `/products/${id}`,
    byCategory: (categoryId: string) => `/products/category/${categoryId}`,
    search: "/products/search",
    featured: "/products/featured",
    newArrivals: "/products/new-arrivals",
  },

  // Cart endpoints
  cart: {
    get: "/cart",
    item: (itemId: string) => `/cart/${itemId}`,
    sync: "/cart/sync",
    clear: "/cart/clear",
  },

  // Order endpoints
  orders: {
    list: "/orders",
    byId: (id: string) => `/orders/${id}`,
    create: "/orders/create",
    cancel: (id: string) => `/orders/${id}/cancel`,
    track: (trackingNumber: string) => `/orders/track/${trackingNumber}`,
  },

  // User endpoints
  user: {
    profile: "/user/profile",
    orders: "/user/orders",
    wishlist: "/user/wishlist",
    addresses: "/user/addresses",
    updateProfile: "/user/profile/update",
    changePassword: "/user/password/change",
  },

  // Wishlist endpoints
  wishlist: {
    get: "/wishlist",
    add: "/wishlist/add",
    remove: (productId: string) => `/wishlist/remove/${productId}`,
  },

  // Review endpoints
  reviews: {
    byProduct: (productId: string) => `/products/${productId}/reviews`,
    create: "/reviews/create",
    update: (reviewId: string) => `/reviews/${reviewId}`,
    delete: (reviewId: string) => `/reviews/${reviewId}`,
  },

  // Category endpoints
  categories: {
    list: "/categories",
    byId: (id: string) => `/categories/${id}`,
  },

  // Blog endpoints
  blog: {
    posts: "/blog",
    bySlug: (slug: string) => `/blog/${slug}`,
    categories: "/blog/categories",
  },

  // Checkout endpoints
  checkout: {
    validateCoupon: "/checkout/coupon/validate",
    calculateShipping: "/checkout/shipping/calculate",
    createPayment: "/checkout/payment/create",
    confirmPayment: "/checkout/payment/confirm",
  },
} as const;

export default api;
