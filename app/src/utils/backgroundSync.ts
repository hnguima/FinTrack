import { ApiClient } from "./apiClient";
import { UserCacheManager } from "./userCacheManager";
import { saveUserUpdatedAt } from "../capacitorPreferences";

export interface PendingUserUpdate {
  data: any;
  timestamp: number;
  synced: boolean;
}

export class BackgroundSync {
  private static readonly DEBUG = false; // Debug mode disabled
  private static pendingUpdates: PendingUserUpdate[] = [];
  private static isCurrentlySyncing = false;

  // Queue a user data update for background sync
  static queueUserUpdate(userData: any) {
    const update: PendingUserUpdate = {
      data: { ...userData },
      timestamp: Date.now(),
      synced: false,
    };

    // Remove any previous unsynced updates (keep only the latest)
    this.pendingUpdates = this.pendingUpdates.filter((u) => u.synced);
    this.pendingUpdates.push(update);

    if (this.DEBUG) {
      console.log("[BackgroundSync] Queued user update:", update);
    }

    // Don't auto-sync - only sync on screen changes
  }

  // Attempt to sync pending updates
  static async attemptSync(): Promise<boolean> {
    if (!this.shouldAttemptSync()) {
      return false;
    }

    const unsyncedUpdates = this.pendingUpdates.filter((u) => !u.synced);
    if (unsyncedUpdates.length === 0) {
      if (this.DEBUG) {
        console.log("[BackgroundSync] No pending updates to sync");
      }
      return true;
    }

    return await this.performSync(unsyncedUpdates);
  }

  // Check if we should attempt sync based on conditions
  private static shouldAttemptSync(): boolean {
    // Prevent concurrent syncs
    if (this.isCurrentlySyncing) {
      if (this.DEBUG) {
        console.log("[BackgroundSync] Sync already in progress, skipping");
      }
      return false;
    }

    return true;
  }

  // Perform the actual sync operation
  private static async performSync(
    unsyncedUpdates: PendingUserUpdate[]
  ): Promise<boolean> {
    this.isCurrentlySyncing = true;

    try {
      // Get the most recent update
      const latestUpdate = unsyncedUpdates[unsyncedUpdates.length - 1];

      if (this.DEBUG) {
        console.log("[BackgroundSync] Syncing user data to database...");
      }

      // Send update to server
      const response = await ApiClient.updateUserProfile(latestUpdate.data);

      if (response.status === 200) {
        await this.handleSyncSuccess(response.data);
        return true;
      } else {
        if (this.DEBUG) {
          console.warn(
            "[BackgroundSync] ❌ Sync failed with status:",
            response.status
          );
        }
        return false;
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[BackgroundSync] ❌ Sync error:", error);
      }
      return false;
    } finally {
      this.isCurrentlySyncing = false;
    }
  }

  // Handle successful sync response
  private static async handleSyncSuccess(serverData: any) {
    const serverTimestamp = serverData.updated_at || serverData.created_at;

    // Update cache with server response
    await UserCacheManager.cacheUserData(serverData, serverTimestamp);
    await saveUserUpdatedAt(serverTimestamp);

    // Mark all pending updates as synced
    this.pendingUpdates.forEach((update) => {
      update.synced = true;
    });

    if (this.DEBUG) {
      console.log("[BackgroundSync] ✅ User data synced successfully");
    }
  }

  // Force sync now (for screen changes, app pause, etc.)
  static async forceSyncNow(): Promise<boolean> {
    if (this.DEBUG) {
      console.log("[BackgroundSync] Force sync triggered");
    }
    return await this.attemptSync();
  }

  // Sync only if there are pending updates (used after operations like photo upload)
  static async syncIfPending(): Promise<boolean> {
    if (this.hasPendingUpdates()) {
      if (this.DEBUG) {
        console.log("[BackgroundSync] Syncing pending updates immediately");
      }
      return await this.attemptSync();
    } else {
      if (this.DEBUG) {
        console.log("[BackgroundSync] No pending updates to sync");
      }
      return true;
    }
  }

  // Get count of pending updates
  static getPendingUpdateCount(): number {
    return this.pendingUpdates.filter((u) => !u.synced).length;
  }

  // Check if there are pending updates
  static hasPendingUpdates(): boolean {
    return this.pendingUpdates.some((u) => !u.synced);
  }

  // Clear all pending updates (useful for logout)
  static clearPendingUpdates() {
    this.pendingUpdates = [];
    this.isCurrentlySyncing = false;

    if (this.DEBUG) {
      console.log("[BackgroundSync] Cleared all pending updates");
    }
  }

  // Get sync status for debugging
  static getSyncStatus() {
    return {
      pendingUpdates: this.pendingUpdates.length,
      isCurrentlySyncing: this.isCurrentlySyncing,
      hasPendingUpdates: this.hasPendingUpdates(),
    };
  }
}
