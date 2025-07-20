import { CapacitorHttp } from "@capacitor/core";
import { isNativeMobile } from "./authUtils";
import type { ApiResponse, SessionResponse, HealthCheckResponse, TimestampResponse } from "../types/api";
import type { User, UserProfileUpdate, PhotoUploadResponse } from "../types/user";

const API_BASE_URL = "https://fintrack-api.the-cube-lab.com";

// Token management
export class TokenManager {
  private static readonly TOKEN_KEY = "fintrack_token";

  static setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  static async getValidToken(): Promise<string | null> {
    const token = this.getToken();

    if (!token) {
      console.log("[FinTrack] No token found in storage");
      // Try to get a session token from the server (web only)
      if (!isNativeMobile()) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
            credentials: "include",
          });
          if (response.ok) {
            const data: SessionResponse = await response.json();
            if (data.token) {
              console.log("[FinTrack] Got token from session");
              this.setToken(data.token);
              return data.token;
            }
          }
        } catch (error) {
          console.log("[FinTrack] Could not get session token:", error);
        }
      }
      return null;
    }

    if (this.isTokenExpired(token)) {
      console.log("[FinTrack] Token is expired, clearing");
      this.clearToken();
      return null;
    }

    return token;
  }
}

// API Client with token management
export class ApiClient {
  private static async makeRequest<T = unknown>(url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {}): Promise<ApiResponse<T>> {
    const token = await TokenManager.getValidToken();

    console.log("[FinTrack] API Request:", url);
    console.log("[FinTrack] Token present:", token ? "Yes" : "No");
    if (token) {
      console.log(
        "[FinTrack] Token expired:",
        TokenManager.isTokenExpired(token)
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const requestConfig = {
      url,
      method: options.method || "GET",
      headers,
      data: options.body ? JSON.stringify(options.body) : undefined,
    };

    // Use CapacitorHttp for native mobile, fetch for web
    if (isNativeMobile()) {
      return await CapacitorHttp.request(requestConfig);
    } else {
      const response = await fetch(url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.data,
        credentials: "include",
      });

      const responseData = await response.json();
      return {
        status: response.status,
        data: responseData,
      };
    }
  }

  static async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${API_BASE_URL}${endpoint}`, { method: "GET" });
  }

  static async post<T = unknown>(endpoint: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: data,
    });
  }

  static async put<T = unknown>(endpoint: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      body: data,
    });
  }

  static async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${API_BASE_URL}${endpoint}`, { method: "DELETE" });
  }

  // User profile methods
  static async getUserProfile(): Promise<ApiResponse<User>> {
    return this.get<User>("/api/users/profile");
  }

  static async getUserProfileTimestamp(): Promise<ApiResponse<TimestampResponse>> {
    return this.get<TimestampResponse>("/api/users/profile/timestamp");
  }

  static async updateUserProfile(updates: UserProfileUpdate): Promise<ApiResponse<User>> {
    return this.put<User>("/api/users/profile", updates as Record<string, unknown>);
  }

  static async uploadProfilePhoto(file: File): Promise<ApiResponse<PhotoUploadResponse>> {
    const token = await TokenManager.getValidToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use CapacitorHttp for native mobile, fetch for web
    if (isNativeMobile()) {
      // For mobile, convert file to base64 and use CapacitorHttp
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = fileData.split(",")[1];

      const requestConfig = {
        url: `${API_BASE_URL}/api/users/profile/photo`,
        method: "POST" as const,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          photo: base64Data,
          filename: file.name,
          mimeType: file.type,
        }),
      };

      return await CapacitorHttp.request(requestConfig);
    } else {
      // For web, use standard FormData approach
      const formData = new FormData();
      formData.append("photo", file);

      // Don't set Content-Type for FormData, let browser set it automatically
      const webHeaders: Record<string, string> = {};
      if (token) {
        webHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile/photo`, {
        method: "POST",
        headers: webHeaders,
        body: formData,
        credentials: "include",
      });

      const responseData: PhotoUploadResponse = await response.json();
      return {
        status: response.status,
        data: responseData,
      };
    }
  }

  // Health check
  static async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.get<HealthCheckResponse>("/api/health");
  }
}

export default ApiClient;
