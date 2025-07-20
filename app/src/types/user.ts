// User-related type definitions for FinTrack

export interface UserPreferences {
  theme?: "light" | "dark";
  language?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  photo?: string;
  provider: string;
  created_at: string;
  updated_at?: string;
  preferences?: UserPreferences;
}

export interface CachedUserData extends User {
  preferences: UserPreferences;  // Required for cached data
}

export interface UserUpdateStatus {
  shouldUpdate: boolean;
  cachedData: CachedUserData | null;
  serverTimestamp: string | null;
}

export interface PendingUserUpdate {
  data: Partial<User>;
  timestamp: number;
  synced: boolean;
}

export interface UserProfileUpdate extends Partial<User> {
  preferences?: UserPreferences;
}

export interface PhotoUploadResponse {
  photo?: string;
  photoUrl?: string;
  updated_at?: string;
  created_at?: string;
  message?: string;  // Added for error messages
}