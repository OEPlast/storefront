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
    byCampaignSlug: (slug: string) => `/products/campaign/${slug}`,
    compare: '/products/compare',
    search: '/products/search',
    searchResults: '/products/search-results', // Full product data for search results page
    searchFilters: '/products/search-filters', // Aggregated filters for search results
    autocomplete: '/products/autocomplete',
    newProducts: '/products/new-products',
    newProductsFilters: '/products/new-products/filters',
    week: '/products/top-week',
    weekProductsFilters: '/products/top-week/filters',
    topSold: '/products/top-sold',
    topSoldProductsFilters: '/products/top-sold/filters',
    hotSales: '/products/hot-sales',
    dealsOfTheDay: '/products/deals-of-the-day',
    topCategories: '/products/top-categories',
    recommendations: '/products/recommendation4u',
    recommendationsByProduct: (productId: string) =>
      `/products/recommendation?productId=${productId}`,
    // New endpoints for product detail system
    relatedProducts: (productId: string) => `/products/${productId}/related`,
    popularProducts: '/products/popular',
    reviews: (productId: string) => `/products/${productId}/reviews`,
  },

  // Cart endpoints
  cart: {
    get: '/cart',
    add: '/cart/add',
    item: (itemId: string) => `/cart/item/${itemId}`,
    clear: '/cart/clear',
    validateSales: '/cart/validate-sales',
    coupon: '/cart/coupon',
    removeCoupon: (couponId: string) => `/cart/coupon/${couponId}`,
  },

  // Order endpoints
  orders: {
    list: '/myOrder/orders',
    statistics: '/myOrder/orders/statistics',
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
    list: '/wishlist/all',
    count: '/wishlist/count',
    add: '/wishlist/add',
    remove: (wishlistItemId: string) => `/wishlist/remove/${wishlistItemId}`,
  },

  // Review endpoints
  reviews: {
    byProduct: (productId: string) => `/reviews/product/${productId}`,
    stats: (productId: string) => `/reviews/product/${productId}/stats`,
    create: '/reviews/create',
    update: (reviewId: string) => `/reviews/${reviewId}`,
    delete: (reviewId: string) => `/reviews/${reviewId}`,
    like: (reviewId: string) => `/reviews/${reviewId}/like`,
    unlike: (reviewId: string) => `/reviews/${reviewId}/unlike`,
    isLikedByUser: (reviewId: string) => `/reviews/${reviewId}/isLikedByUser`,
    likeCount: (reviewId: string) => `/reviews/${reviewId}/likeCount`,
    canReview: (productId: string) => `/reviews/can-review/${productId}`,
  },

  // Category endpoints
  categories: {
    list: '/categories',
    byId: (id: string) => `/categories/${id}`,
    bySlug: (slug: string) => `/categories/slug/${slug}`,
    filtersBySlug: (slug: string) => `/categories/slug/${slug}/filters`,
  },

  // Campaign endpoints
  campaigns: {
    list: '/campaigns/all',
    info: (slug: string) => `/campaigns/slug/${slug}`, // Campaign metadata only
    filtersBySlug: (slug: string) => `/campaigns/slug/${slug}/filters`, // Campaign product filters
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
    calculateShipping: '/checkout/calculate-shipping',
    secure: '/checkout/secure',
    createPayment: '/checkout/payment/create',
    confirmPayment: '/checkout/payment/confirm',
  },

  // Logistics endpoints
  logistics: {
    countries: '/logistics/countries',
    allConfigs: '/logistics/configs',
    locationsTree: '/logistics/locations-tree',
    locationsByCountry: (country: string) => `/logistics/locations/${encodeURIComponent(country)}`,
    cartFlatShipping: '/logistics/cart/flat-shipping',
    trackByNumber: (trackingNumber: string) =>
      `/logistics/track/${encodeURIComponent(trackingNumber)}`,
  },

  // Coupon endpoints
  coupons: {
    list: '/coupons',
    cart: '/coupons/cart',
    byCode: (code: string) => `/coupons/${encodeURIComponent(code)}`,
    validate: '/coupons/validate',
  },
} as const;

export default api;
