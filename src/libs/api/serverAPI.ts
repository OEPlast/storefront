import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = undefined> {
  message: string;
  data: T | null;
}

export interface ApiResponseWithMeta<T = undefined, M = undefined> {
  message: string;
  data: T | null;
  meta?: M;
}

// Server-side axios instance (no client-side session handling)
const serverApiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 400,
});

// Request interceptor - Add request ID only (no client session)
serverApiClient.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = crypto.randomUUID();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Server API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('[Server API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
serverApiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Server API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
        }
      );
    }

    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Server API Response Error]', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

// Custom response types
export interface TypedAxiosResponse<T = undefined> {
  data: T | null;
  message: string;
}

export interface TypedAxiosResponseWithMeta<T = undefined, M = undefined> {
  data: T | null;
  message: string;
  meta?: M;
}

// Typed server API client with automatic data unwrapping
export interface ServerApiClient {
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

export const serverAPI: ServerApiClient = {
  get: async <T = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await serverApiClient.get<ApiResponse<T>>(url, config);

    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerAPI] Raw response:', {
        url,
        status: response.status,
        // data: response.data,
      });
    }

    return {
      data: response.data.data,
      message: response.data.message,
    };
  },

  getWithMeta: async <T = undefined, M = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponseWithMeta<T, M>> => {
    const response = await serverApiClient.get<ApiResponseWithMeta<T, M>>(url, config);

    return {
      data: response.data.data,
      message: response.data.message,
      meta: response.data.meta,
    };
  },

  post: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await serverApiClient.post<ApiResponse<T>>(url, data, config);

    return {
      data: response.data.data,
      message: response.data.message,
    };
  },

  put: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await serverApiClient.put<ApiResponse<T>>(url, data, config);

    return {
      data: response.data.data,
      message: response.data.message,
    };
  },

  patch: async <T = undefined>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await serverApiClient.patch<ApiResponse<T>>(url, data, config);

    return {
      data: response.data.data,
      message: response.data.message,
    };
  },

  delete: async <T = undefined>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<TypedAxiosResponse<T>> => {
    const response = await serverApiClient.delete<ApiResponse<T>>(url, config);

    return {
      data: response.data.data,
      message: response.data.message,
    };
  },
};

export default serverAPI;
