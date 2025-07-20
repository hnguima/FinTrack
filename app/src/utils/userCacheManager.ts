import { ApiClient } from "./apiClient";
import {
  saveUserData,
  getUserData,
  saveUserUpdatedAt,
  getUserUpdatedAt,
  saveUserPhotoBlob,
  getUserPhotoBlob,
  clearUserCache,
} from "../capacitorPreferences";

export interface CachedUserData {
  id: number;
  username: string;
  email: string;
  name: string;
  photo?: string;
  provider: string;
  created_at: string;
  updated_at?: string;
  preferences: {
    theme?: "light" | "dark";
    language?: string;
  };
}

export interface UserUpdateStatus {
  shouldUpdate: boolean;
  cachedData: CachedUserData | null;
  serverTimestamp: string | null;
}

export class UserCacheManager {
  private static readonly DEBUG = false; // Disable debug logs - photo update timing issue fixed

  // Check if user data needs to be updated by comparing timestamps
  static async checkUserUpdateStatus(): Promise<UserUpdateStatus> {
    console.log("[UserCache] === checkUserUpdateStatus() called ===");

    try {
      // Get current timestamp from server
      const timestampResponse = await ApiClient.getUserProfileTimestamp();

      if (timestampResponse.status !== 200) {
        console.warn("[UserCache] Failed to get timestamp from server");
        const { userData } = await getUserData();
        return {
          shouldUpdate: false, // Don't update if we can't check
          cachedData: userData as CachedUserData,
          serverTimestamp: null,
        };
      }

      const serverTimestamp = timestampResponse.data.updated_at;
      console.log("[UserCache] Server timestamp:", serverTimestamp);

      // Get cached timestamp
      const cachedTimestamp = await getUserUpdatedAt();
      console.log("[UserCache] Cached timestamp:", cachedTimestamp);

      // Get cached data
      const { userData: cachedData } = await getUserData();
      const hasCachedData = !!cachedData;
      console.log("[UserCache] Has cached data:", hasCachedData);

      let shouldUpdate = false;

      if (!cachedData || !cachedTimestamp) {
        console.log("[UserCache] No cached data or timestamp - need to update");
        shouldUpdate = true;
      } else if (serverTimestamp !== cachedTimestamp) {
        console.log(
          "[UserCache] Timestamp mismatch - server:",
          serverTimestamp,
          "cached:",
          cachedTimestamp
        );
        shouldUpdate = true;
      } else {
        console.log("[UserCache] Timestamps match - using cached data");
      }

      return {
        shouldUpdate,
        cachedData: cachedData as CachedUserData,
        serverTimestamp,
      };
    } catch (error) {
      console.error("[UserCache] Error checking update status:", error);
      // If we can't check, return cached data if available and don't update
      const { userData: cachedData } = await getUserData();
      return {
        shouldUpdate: false,
        cachedData: cachedData as CachedUserData,
        serverTimestamp: null,
      };
    }
  }

  // Get user data with automatic cache validation
  static async getUserDataWithCache(): Promise<CachedUserData | null> {
    console.log("[UserCache] === getUserDataWithCache() called ===");

    try {
      const updateStatus = await this.checkUserUpdateStatus();

      console.log("[UserCache] Update status:", {
        shouldUpdate: updateStatus.shouldUpdate,
        hasCachedData: !!updateStatus.cachedData,
        serverTimestamp: updateStatus.serverTimestamp,
      });

      if (updateStatus.shouldUpdate || !updateStatus.cachedData) {
        console.log("[UserCache] Fetching fresh user data from API");

        // Fetch fresh data from API
        const response = await ApiClient.getUserProfile();

        if (response.status === 200) {
          const freshData = response.data as CachedUserData;
          const timestamp =
            updateStatus.serverTimestamp || new Date().toISOString();

          console.log("[UserCache] Got fresh data, caching it now...");
          // Cache the fresh data (including photo BLOB)
          await this.cacheUserData(freshData, timestamp);

          // Return the processed data with BLOB photo instead of raw fresh data
          return await this.getCachedDataWithPhoto(freshData);
        } else {
          // API failed, return cached data if available
          console.warn("[UserCache] API failed, returning cached data");
          return await this.getCachedDataWithPhoto(updateStatus.cachedData);
        }
      } else {
        console.log(
          "[UserCache] Using cached user data - no photo fetch needed"
        );
        // We have valid cached data and timestamps match - just return cached data with photo
        return await this.getCachedDataWithPhoto(updateStatus.cachedData);
      }
    } catch (error) {
      console.error("[UserCache] Error getting user data:", error);

      // Fallback to cached data
      const { userData } = await getUserData();
      return await this.getCachedDataWithPhoto(userData as CachedUserData);
    }
  }

  // Get cached data with photo BLOB converted to data URL
  private static async getCachedDataWithPhoto(
    cachedData: CachedUserData | null
  ): Promise<CachedUserData | null> {
    console.log("[UserCache] getCachedDataWithPhoto() called");

    if (!cachedData) {
      console.log("[UserCache] No cached data provided");
      return null;
    }

    // If we have a cached photo BLOB, use it instead of the URL
    const cachedPhotoDataUrl = await this.getCachedPhotoDataUrl();
    console.log(
      "[UserCache] Cached photo BLOB available:",
      !!cachedPhotoDataUrl
    );

    if (cachedPhotoDataUrl) {
      console.log("[UserCache] Returning cached data with BLOB photo");
      return {
        ...cachedData,
        photo: cachedPhotoDataUrl,
      };
    }

    console.log("[UserCache] Returning cached data with original photo URL");
    return cachedData;
  }

  // Cache user data and photo BLOB
  static async cacheUserData(userData: CachedUserData, timestamp?: string) {
    try {
      const cacheTimestamp = timestamp || new Date().toISOString();

      // Save user data
      await saveUserData(userData, cacheTimestamp);

      // Check if we need to fetch and cache the photo BLOB
      if (userData.photo) {
        console.log("[UserCache] Photo URL from API:", userData.photo);

        // Use the user's updated_at field to determine if photo needs fetching
        const userUpdatedAt = userData.updated_at || cacheTimestamp;
        const shouldFetchPhoto = await this.shouldFetchPhoto(userUpdatedAt);

        console.log("[UserCache] Should fetch photo:", shouldFetchPhoto);

        if (shouldFetchPhoto) {
          console.log("[UserCache] Fetching photo from:", userData.photo);
          await this.fetchAndCachePhotoBlob(userData.photo, userUpdatedAt);
        } else {
          console.log(
            "[UserCache] Using existing cached photo BLOB, no fetch needed"
          );
        }
      }

      // Save timestamp
      await saveUserUpdatedAt(cacheTimestamp);

      if (this.DEBUG) {
        console.log(
          "[UserCache] Cached user data with timestamp:",
          cacheTimestamp
        );
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error caching user data:", error);
      }
    }
  }

  // Check if we need to fetch a new photo BLOB
  private static async shouldFetchPhoto(
    userUpdatedAt: string
  ): Promise<boolean> {
    try {
      const { photoBlob, timestamp: cachedPhotoTimestamp } =
        await getUserPhotoBlob();

      // If no cached photo BLOB, we need to fetch it
      if (!photoBlob) {
        if (this.DEBUG) {
          console.log("[UserCache] No cached photo BLOB found, need to fetch");
        }
        return true;
      }

      // If no cached timestamp, assume we need to fetch
      if (!cachedPhotoTimestamp) {
        if (this.DEBUG) {
          console.log("[UserCache] No cached photo timestamp, need to fetch");
        }
        return true;
      }

      // Compare user's updated_at timestamp with cached photo timestamp
      // If user was updated after the photo was cached, we need to fetch
      const needsUpdate = cachedPhotoTimestamp !== userUpdatedAt;

      if (this.DEBUG) {
        console.log("[UserCache] Photo timestamp comparison:");
        console.log("  Cached photo timestamp:", cachedPhotoTimestamp);
        console.log("  User updated_at:", userUpdatedAt);
        console.log("  Needs update:", needsUpdate);
      }

      return needsUpdate;
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error checking photo cache status:", error);
      }
      // If we can't determine, err on the side of fetching
      return true;
    }
  }

  // Fetch photo BLOB from URL and cache it
  static async fetchAndCachePhotoBlob(
    photoUrl: string,
    timestamp?: string
  ): Promise<void> {
    try {
      console.log(
        "[UserCache] *** fetchAndCachePhotoBlob() called with URL:",
        photoUrl
      );
      console.log(
        "[UserCache] *** fetchAndCachePhotoBlob() timestamp parameter:",
        timestamp
      );
      console.trace("[UserCache] fetchAndCachePhotoBlob call stack:");

      if (this.DEBUG) {
        console.log("[UserCache] Fetching photo BLOB from:", photoUrl);
      }

      const response = await fetch(photoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.status}`);
      }

      const blob = await response.blob();
      const base64Data = await this.blobToBase64(blob);

      console.log("[UserCache] Saving photo BLOB with timestamp:", timestamp);
      await saveUserPhotoBlob(base64Data, timestamp);

      if (this.DEBUG) {
        console.log(
          "[UserCache] Cached photo BLOB successfully with timestamp:",
          timestamp
        );
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error caching photo BLOB:", error);
      }
    }
  }

  // Convert blob to base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          // Remove data URL prefix (data:image/jpeg;base64,)
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Get cached photo BLOB as data URL
  static async getCachedPhotoDataUrl(): Promise<string | null> {
    try {
      const { photoBlob } = await getUserPhotoBlob();

      if (photoBlob) {
        // Convert base64 back to data URL
        const dataUrl = `data:image/jpeg;base64,${photoBlob}`;

        if (this.DEBUG) {
          console.log("[FinTrack] Using cached BLOB photo data");
        }

        return dataUrl;
      }

      return null;
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error getting cached photo BLOB:", error);
      }
      return null;
    }
  }

  // Update cached photo BLOB (for optimistic updates)
  static async updateCachedPhoto(photoUrl: string): Promise<void> {
    try {
      console.log(
        "[UserCache] *** updateCachedPhoto() called with URL:",
        photoUrl
      );
      console.trace("[UserCache] updateCachedPhoto call stack:");

      // For optimistic updates, don't change the timestamp - keep the existing one
      // This prevents timestamp mismatches that break caching
      const { timestamp: existingTimestamp } = await getUserPhotoBlob();
      const timestamp = existingTimestamp || new Date().toISOString();

      // If it's a blob URL or data URL, handle it differently
      if (photoUrl.startsWith("blob:") || photoUrl.startsWith("data:")) {
        console.log(
          "[UserCache] Processing blob/data URL in updateCachedPhoto"
        );
        // For blob/data URLs, fetch and convert to base64
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const base64Data = await this.blobToBase64(blob);

        await saveUserPhotoBlob(base64Data, timestamp);
      } else {
        console.log(
          "[UserCache] Processing server URL in updateCachedPhoto - this will fetch from server!"
        );
        // For regular URLs, fetch from server
        await this.fetchAndCachePhotoBlob(photoUrl, timestamp);
      }

      // Also update the user data cache with new photo, but preserve the timestamp
      const { userData } = await getUserData();
      if (userData) {
        const cachedTimestamp = await getUserUpdatedAt();
        const updatedData = { ...userData, photo: photoUrl };
        await saveUserData(updatedData, cachedTimestamp || timestamp);
      }

      if (this.DEBUG) {
        console.log(
          "[UserCache] Updated cached photo BLOB (preserving timestamp)"
        );
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error updating cached photo:", error);
      }
    }
  }

  // Clear all user cache
  static async clearCache() {
    try {
      await clearUserCache();
      if (this.DEBUG) {
        console.log("[UserCache] Cleared all user cache");
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error clearing cache:", error);
      }
    }
  }

  // Force refresh user data
  static async forceRefreshUserData(): Promise<CachedUserData | null> {
    try {
      if (this.DEBUG) {
        console.log("[UserCache] Force refreshing user data");
      }

      const response = await ApiClient.getUserProfile();

      if (response.status === 200) {
        const freshData = response.data as CachedUserData;
        const serverTimestamp =
          freshData.updated_at ||
          freshData.created_at ||
          new Date().toISOString();

        await this.cacheUserData(freshData, serverTimestamp);
        return await this.getCachedDataWithPhoto(freshData);
      }

      return null;
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error force refreshing user data:", error);
      }
      return null;
    }
  }
}
