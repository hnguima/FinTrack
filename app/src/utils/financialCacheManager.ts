import { ApiClient } from "./apiClient";
import { Preferences } from "@capacitor/preferences";

export interface CachedFinanceData {
  transactions: any[];
  accounts: any[];
  accountsWithBalances: any[];
  timestamp: string;
  balanceTimestamp?: string;
}

export interface FinanceUpdateStatus {
  shouldUpdate: boolean;
  cachedData: CachedFinanceData | null;
  serverTimestamp: string | null;
}

// Finance-specific cache keys
const FINANCE_DATA_KEY = "fintrack_finance_data";
const FINANCE_TIMESTAMP_KEY = "fintrack_finance_timestamp";

export class FinancialCacheManager {
  private static readonly DEBUG = true;

  // Custom cache functions for finance data
  private static async saveFinanceCache(key: string, data: any): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(data) });
  }

  private static async getFinanceCache(key: string): Promise<any> {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  }

  private static async clearFinanceCache(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  // Save finance data to cache
  static async cacheFinanceData(
    transactions: any[],
    accounts: any[],
    timestamp?: string
  ): Promise<void> {
    try {
      const cacheTimestamp = timestamp || new Date().toISOString();

      const financeData: CachedFinanceData = {
        transactions,
        accounts,
        accountsWithBalances: accounts, // For now, accounts already include balances
        timestamp: cacheTimestamp,
        balanceTimestamp: cacheTimestamp,
      };

      // Save to preferences
      await this.saveFinanceCache(FINANCE_DATA_KEY, financeData);
      await this.saveFinanceCache(FINANCE_TIMESTAMP_KEY, cacheTimestamp);

      if (this.DEBUG) {
        console.log(
          "[FinanceCache] Cached finance data with timestamp:",
          cacheTimestamp
        );
        console.log(
          "[FinanceCache] Cached transactions count:",
          transactions.length
        );
        console.log("[FinanceCache] Cached accounts count:", accounts.length);
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[FinanceCache] Error caching finance data:", error);
      }
    }
  }

  // Get cached finance data
  static async getCachedFinanceData(): Promise<CachedFinanceData | null> {
    try {
      const userData = await this.getFinanceCache(FINANCE_DATA_KEY);

      // Debug: Log what's in the cache
      if (this.DEBUG && userData) {
        console.log("[FinanceCache] Cached data sample:", {
          transactionCount: userData.transactions?.length || 0,
          accountCount: userData.accounts?.length || 0,
          firstAccount: userData.accounts?.[0] || null,
          accountHasBalance: userData.accounts?.[0]?.balance !== undefined,
        });
      }

      return userData as CachedFinanceData;
    } catch (error) {
      if (this.DEBUG) {
        console.error(
          "[FinanceCache] Error getting cached finance data:",
          error
        );
      }
      return null;
    }
  }

  // Check if finance data needs to be updated by comparing timestamps
  static async checkFinanceUpdateStatus(): Promise<FinanceUpdateStatus> {
    if (this.DEBUG) {
      console.log("[FinanceCache] === checkFinanceUpdateStatus() called ===");
    }

    try {
      // Get current timestamp from server
      const timestampResponse = await ApiClient.getFinanceTimestamp();

      if (timestampResponse.status !== 200) {
        console.warn("[FinanceCache] Failed to get timestamp from server");
        const cachedData = await this.getCachedFinanceData();
        return {
          shouldUpdate: false, // Don't update if we can't check
          cachedData,
          serverTimestamp: null,
        };
      }

      const serverTimestamp = timestampResponse.data.last_updated;
      if (this.DEBUG) {
        console.log("[FinanceCache] Server timestamp:", serverTimestamp);
      }

      // Get cached timestamp
      const cachedTimestamp = await this.getFinanceCache(FINANCE_TIMESTAMP_KEY);
      if (this.DEBUG) {
        console.log("[FinanceCache] Cached timestamp:", cachedTimestamp);
      }

      // Get cached data
      const cachedData = await this.getCachedFinanceData();
      const hasCachedData = !!cachedData;
      if (this.DEBUG) {
        console.log("[FinanceCache] Has cached data:", hasCachedData);
      }

      const shouldUpdate = this.determineShouldUpdate(
        cachedData,
        cachedTimestamp,
        serverTimestamp
      );

      return {
        shouldUpdate,
        cachedData,
        serverTimestamp,
      };
    } catch (error) {
      console.error("[FinanceCache] Error checking update status:", error);
      // If we can't check, return cached data if available and don't update
      const cachedData = await this.getCachedFinanceData();
      return {
        shouldUpdate: false,
        cachedData,
        serverTimestamp: null,
      };
    }
  }

  // Helper function to determine if data should be updated
  private static determineShouldUpdate(
    cachedData: CachedFinanceData | null,
    cachedTimestamp: string | null,
    serverTimestamp: string
  ): boolean {
    if (!cachedData || !cachedTimestamp) {
      if (this.DEBUG) {
        console.log(
          "[FinanceCache] No cached data or timestamp - need to update"
        );
      }
      return true;
    }

    // Check if accounts have balance information (data format validation)
    const accountsHaveBalance =
      cachedData.accounts.length === 0 ||
      cachedData.accounts.some((account) => account.balance !== undefined);

    if (!accountsHaveBalance) {
      if (this.DEBUG) {
        console.log(
          "[FinanceCache] Cached accounts missing balance data - need to update"
        );
      }
      return true;
    }

    if (serverTimestamp !== cachedTimestamp) {
      if (this.DEBUG) {
        console.log(
          "[FinanceCache] Timestamp mismatch - server:",
          serverTimestamp,
          "cached:",
          cachedTimestamp
        );
      }
      return true;
    }

    if (this.DEBUG) {
      console.log("[FinanceCache] Timestamps match - using cached data");
    }
    return false;
  }

  // Get finance data with automatic cache validation
  static async getFinanceDataWithCache(): Promise<{
    transactions: any[];
    accounts: any[];
  }> {
    if (this.DEBUG) {
      console.log("[FinanceCache] === getFinanceDataWithCache() called ===");
    }

    try {
      const updateStatus = await this.checkFinanceUpdateStatus();

      if (this.DEBUG) {
        console.log("[FinanceCache] Update status:", {
          shouldUpdate: updateStatus.shouldUpdate,
          hasCachedData: !!updateStatus.cachedData,
          serverTimestamp: updateStatus.serverTimestamp,
        });
      }

      if (updateStatus.shouldUpdate || !updateStatus.cachedData) {
        return await this.fetchAndCacheFinanceData(
          updateStatus.serverTimestamp
        );
      }

      if (this.DEBUG) {
        console.log("[FinanceCache] Using cached finance data");
      }
      // We have valid cached data and timestamps match
      return {
        transactions: updateStatus.cachedData.transactions,
        accounts: updateStatus.cachedData.accounts,
      };
    } catch (error) {
      console.error("[FinanceCache] Error getting finance data:", error);
      return await this.getFallbackFinanceData();
    }
  }

  // Get accounts with smart balance caching
  static async getAccountsWithCachedBalances(): Promise<any[]> {
    if (this.DEBUG) {
      console.log(
        "[FinanceCache] === getAccountsWithCachedBalances() called ==="
      );
    }

    try {
      // First check cache without making any API calls
      const cachedData = await this.getCachedFinanceData();

      // If we have cached accounts with balances, return them immediately
      if (
        cachedData?.accountsWithBalances &&
        cachedData.accountsWithBalances.length > 0
      ) {
        if (this.DEBUG) {
          console.log(
            "[FinanceCache] Using cached accounts with balances (instant load)"
          );
        }

        // Still need to check if data is current, but do it in background
        this.checkFinanceUpdateStatus()
          .then((updateStatus) => {
            if (updateStatus.shouldUpdate) {
              if (this.DEBUG) {
                console.log(
                  "[FinanceCache] Background refresh needed - will update on next call"
                );
              }
              // Silently fetch fresh data for next time
              this.fetchAndCacheFinanceData(updateStatus.serverTimestamp);
            }
          })
          .catch((error) => {
            if (this.DEBUG) {
              console.error(
                "[FinanceCache] Background update check failed:",
                error
              );
            }
          });

        return cachedData.accountsWithBalances;
      }

      // No cached balances, need to fetch fresh data
      if (this.DEBUG) {
        console.log(
          "[FinanceCache] No cached balances found, fetching fresh data"
        );
      }

      const updateStatus = await this.checkFinanceUpdateStatus();

      // Fetch fresh account balances
      const accountsResponse = await ApiClient.getAccountsSummary();
      if (accountsResponse.status === 200) {
        const accountsWithBalances = accountsResponse.data;

        // Update cache with fresh balances
        const transactions = cachedData?.transactions || [];
        await this.cacheFinanceData(
          transactions,
          accountsWithBalances,
          updateStatus.serverTimestamp || undefined
        );

        return accountsWithBalances;
      }

      // Fallback: return what we have
      return cachedData?.accounts || [];
    } catch (error) {
      console.error(
        "[FinanceCache] Error getting accounts with cached balances:",
        error
      );
      const fallbackData = await this.getFallbackFinanceData();
      return fallbackData.accounts;
    }
  }

  // Helper function to fetch and cache finance data
  private static async fetchAndCacheFinanceData(
    serverTimestamp: string | null
  ): Promise<{ transactions: any[]; accounts: any[] }> {
    if (this.DEBUG) {
      console.log("[FinanceCache] Fetching fresh finance data from API");
    }

    // Fetch fresh data from API
    const [transactionsResponse, accountsResponse] = await Promise.all([
      ApiClient.searchTransactions({ limit: 1000 }),
      ApiClient.getAccountsSummary(), // Use summary to get balances
    ]);

    if (
      transactionsResponse.status === 200 &&
      accountsResponse.status === 200
    ) {
      const transactions =
        transactionsResponse.data.transactions || transactionsResponse.data;
      const accounts = accountsResponse.data;
      const timestamp = serverTimestamp || new Date().toISOString();

      if (this.DEBUG) {
        console.log("[FinanceCache] Got fresh data, caching it now...");
        console.log("[FinanceCache] Fresh accounts sample:", {
          accountCount: accounts?.length || 0,
          firstAccount: accounts?.[0] || null,
          accountHasBalance: accounts?.[0]?.balance !== undefined,
        });
      }

      // Cache the fresh data
      await this.cacheFinanceData(transactions, accounts, timestamp);
      return { transactions, accounts };
    }

    // API failed, return fallback data
    console.warn("[FinanceCache] API failed, returning fallback data");
    return await this.getFallbackFinanceData();
  }

  // Helper function to get fallback finance data
  private static async getFallbackFinanceData(): Promise<{
    transactions: any[];
    accounts: any[];
  }> {
    const cachedData = await this.getCachedFinanceData();
    return {
      transactions: cachedData?.transactions || [],
      accounts: cachedData?.accounts || [],
    };
  }

  // Clear all finance cache
  static async clearAllFinanceCache(): Promise<void> {
    try {
      await this.clearFinanceCache(FINANCE_DATA_KEY);
      await this.clearFinanceCache(FINANCE_TIMESTAMP_KEY);

      if (this.DEBUG) {
        console.log("[FinanceCache] Cleared finance cache");
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[FinanceCache] Error clearing finance cache:", error);
      }
    }
  }

  // Debug utility: Clear cache and force refresh (call this from console)
  static async debugClearAndRefresh(): Promise<void> {
    console.log("[FinanceCache] DEBUG: Clearing cache and forcing refresh...");
    await this.clearAllFinanceCache();
    const result = await this.forceRefreshFinanceData();
    console.log("[FinanceCache] DEBUG: Force refresh result:", result);
  }

  // Force refresh finance data
  static async forceRefreshFinanceData(): Promise<{
    transactions: any[];
    accounts: any[];
  } | null> {
    try {
      if (this.DEBUG) {
        console.log("[FinanceCache] Force refreshing finance data");
      }

      const [transactionsResponse, accountsResponse] = await Promise.all([
        ApiClient.searchTransactions({ limit: 1000 }),
        ApiClient.getAccountsSummary(), // Use summary to get balances
      ]);

      if (
        transactionsResponse.status === 200 &&
        accountsResponse.status === 200
      ) {
        const transactions =
          transactionsResponse.data.transactions || transactionsResponse.data;
        const accounts = accountsResponse.data;
        const timestamp = new Date().toISOString();

        await this.cacheFinanceData(transactions, accounts, timestamp);

        return { transactions, accounts };
      }

      return null;
    } catch (error) {
      if (this.DEBUG) {
        console.error(
          "[FinanceCache] Error force refreshing finance data:",
          error
        );
      }
      return null;
    }
  }
}

// Make debug function available in browser console for testing
if (typeof window !== "undefined") {
  (window as any).FinancialCacheManager = FinancialCacheManager;
}
