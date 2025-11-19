import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosRequestConfig,
} from 'axios';
import { getSession, signOut } from 'next-auth/react';

export interface ApiResponse<T = undefined> {
  message: string;
  data: T | null;
}

export interface ApiResponseWithMeta<T = undefined, M = undefined> {
  message: string;
  data: T | [];
  meta?: M;
}

// Create axios instance with base configuration
export const baseApiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 400,
});

// Request interceptor - Add auth token and request ID
baseApiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const session = await getSession();

    if (session?.user?.token) {
      config.headers.Authorization = `Bearer ${session.user.token}`;
    }

    config.headers['X-Request-ID'] = crypto.randomUUID();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
baseApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
        }
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Safely inspect response.data which is typed as unknown
    if (error.response?.status === 401) {
      const respData = error.response.data as Record<string, unknown> | undefined;
      if (
        respData &&
        typeof respData.message === 'string' &&
        respData.message === 'Invalid token'
      ) {
        console.error('[Unauthenticaed]');
        // signOut();
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Response Error]', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register') {
            // window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url);
    }

    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    if (!error.response) {
      console.error('Network error - server unreachable:', error.message);
    }

    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
    }

    return Promise.reject(error);
  }
);

// Custom AxiosResponse that remaps response.data to the nested data property
export interface TypedAxiosResponse<T = undefined> extends Omit<AxiosResponse, 'data'> {
  data: T | null; // This is the nested data.data from backend
  message: string; // Hoisted from response.data.message
  code: number; // Hoisted from response.data.code
}

export interface TypedAxiosResponseWithMeta<T = undefined, M = undefined>
  extends Omit<AxiosResponse, 'data'> {
  data: T | null;
  message: string;

  meta?: M;
}

// Custom Typed API client with automatic data unwrapping
export interface ApiClient {
  get<T = undefined>(url: string, config?: AxiosRequestConfig): Promise<TypedAxiosResponse<T>>;
  getWithMeta<T = undefined, M = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponseWithMeta<T, M>>;
  post<T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>>;
  put<T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>>;
  patch<T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>>;
  delete<T = undefined>(url: string, config?: AxiosRequestConfig): Promise<TypedAxiosResponse<T>>;
}

export const apiClient: ApiClient = {
  get: async <T = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await baseApiClient.get<ApiResponse<T>>(url, config);

    // Remap: response.data.data → response.data
    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
    } as TypedAxiosResponse<T>;
  },

  getWithMeta: async <T = undefined, M = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponseWithMeta<T, M>> => {
    const response = await baseApiClient.get<ApiResponseWithMeta<T, M>>(url, config);

    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
      meta: response.data.meta,
    } as TypedAxiosResponseWithMeta<T, M>;
  },

  post: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await baseApiClient.post<ApiResponse<T>>(url, data, config);

    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
    } as TypedAxiosResponse<T>;
  },

  put: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await baseApiClient.put<ApiResponse<T>>(url, data, config);

    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
    } as TypedAxiosResponse<T>;
  },

  patch: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await baseApiClient.patch<ApiResponse<T>>(url, data, config);

    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
    } as TypedAxiosResponse<T>;
  },

  delete: async <T = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await baseApiClient.delete<ApiResponse<T>>(url, config);

    return {
      ...response,
      data: response.data.data,
      message: response.data.message,
    } as TypedAxiosResponse<T>;
  },
};

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (!error.response) {
      return 'Network error. Please check your internet connection.';
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return "Access forbidden. You don't have permission.";
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred.';
};

export default apiClient;
