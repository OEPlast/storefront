import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { getSession } from "next-auth/react";

// Create axios instance with base configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token and request ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get session from NextAuth
    const session = await getSession();

    // Add authorization token if available
    if (session?.user?.token) {
      config.headers.Authorization = `Bearer ${session.user.token}`;
    }

    // Add request ID for tracking (useful for debugging)
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error("[API Response Error]", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // In a production app, you might refresh the token here
        // For now, we'll just redirect to login
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          // Don't redirect if already on login/register pages
          if (currentPath !== "/login" && currentPath !== "/register") {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return Promise.reject(error);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("Access forbidden:", error.response.data);
      // You could redirect to an unauthorized page here
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error("Resource not found:", error.config?.url);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data);
      // You could show a global error notification here
    }

    // Handle network errors (no response from server)
    if (!error.response) {
      console.error("Network error - server unreachable:", error.message);
      // You could show a "Check your internet connection" message here
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors consistently
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Server responded with error
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // Network error
    if (!error.response) {
      return "Network error. Please check your internet connection.";
    }

    // Timeout error
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }

    // Generic error based on status code
    switch (error.response?.status) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Unauthorized. Please log in again.";
      case 403:
        return "Access forbidden. You don't have permission.";
      case 404:
        return "Resource not found.";
      case 500:
        return "Server error. Please try again later.";
      default:
        return "An unexpected error occurred.";
    }
  }

  // Non-axios error
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
};

export default apiClient;
