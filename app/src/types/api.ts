// API-related type definitions for FinTrack

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface AuthToken {
  token: string;
  exp?: number;
}

export interface SessionResponse {
  token?: string;
  user?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export interface TimestampResponse {
  updated_at: string;
}