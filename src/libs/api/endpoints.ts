// API endpoints for use with apiClient (which already has baseURL configured)
// No need to prefix with BASE_URL since axios instance handles that
export const api = {
  // Auth endpoints
  auth: {
    login: '/auth/login',
    providerLogin: '/auth/login/provider',
    register: '/auth/register',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyOtp: '/auth/verifyAccount',
    resendOtp: '/auth/resendVerifyAccountOtp',
    changePassword: '/auth/changePassword',
    requestResetPasswordCode: '/auth/requestResetPasswordCode',
    resetPasswordByCode: '/auth/resetPasswordByCode',
    passwordAndProviderStatus: '/auth/passwordAndProviderStatus',
    setPassword: '/auth/setPassword',
  },

  // Product endpoints
  products: {
    list: '/products/all',
    byId: (id: string) => `/products/by-id/${id}`,
    bySlug: (slug: string) => `/products/by-slug/${slug}`,
    byCategory: (categoryId: string) => `/products/category/${categoryId}`,
    byCategorySlug: (slug: string) => `/products/category/${slug}`,
    search: '/products/search',
    autocomplete: '/products/autocomplete',
    newProducts: '/products/new-products', 
    week: '/products/top-week',
    topSold: '/products/top-sold',
    hotSales: '/products/hot-sales',
    dealsOfTheDay: '/products/deals-of-the-day',
    topCategories: '/products/top-categories',
    recommendations: '/products/recommendation4u',
    recommendationsByProduct: (productId: string) =>
      `/products/recommendation?productId=${productId}`,
  },

  // Cart endpoints
  cart: {
    get: '/cart',
    item: (itemId: string) => `/cart/${itemId}`,
    sync: '/cart/sync',
    clear: '/cart/clear',
  },

  // Order endpoints
  orders: {
    list: '/myOrder/orders',
    byId: (id: string) => `/myOrder/orders/${id}`,
    create: '/myOrder/orders/create',
    cancel: (id: string) => `/myOrder/orders/${id}/cancel`,
    track: (trackingNumber: string) => `/myOrder/orders/track/${trackingNumber}`,
    returns: '/myOrder/orders/returns',
    initiateReturn: (id: string) => `/myOrder/orders/${id}/return`,
  },

  // User endpoints
  user: {
    profile: '/user/profile',
    updateProfile: '/user/profile',
    orders: '/user/orders',
    wishlist: '/user/wishlist',
    changePassword: '/user/password/change',
    // Address endpoints
    addresses: '/user/address/all',
    addAddress: '/user/address',
    updateAddress: (addressId: string) => `/user/address/${addressId}`,
    deleteAddress: (addressId: string) => `/user/address/${addressId}`,
  },

  // Wishlist endpoints
  wishlist: {
    get: '/wishlist',
    add: '/wishlist/add',
    remove: (productId: string) => `/wishlist/remove/${productId}`,
  },

  // Review endpoints
  reviews: {
    byProduct: (productId: string) => `/products/${productId}/reviews`,
    create: '/reviews/create',
    update: (reviewId: string) => `/reviews/${reviewId}`,
    delete: (reviewId: string) => `/reviews/${reviewId}`,
  },

  // Category endpoints
  categories: {
    list: '/categories',
    byId: (id: string) => `/categories/${id}`,
  },

  // Banner endpoints
  banners: {
    list: '/banners',
    byCategory: (category: string) => `/banners?category=${category}`,
    grouped: '/banners/grouped',
  },

  // Blog endpoints
  blog: {
    posts: '/blog',
    bySlug: (slug: string) => `/blog/${slug}`,
    categories: '/blog/categories',
  },

  // Checkout endpoints
  checkout: {
    validateCoupon: '/checkout/coupon/validate',
    calculateShipping: '/checkout/shipping/calculate',
    createPayment: '/checkout/payment/create',
    confirmPayment: '/checkout/payment/confirm',
  },
} as const;

export default api;
