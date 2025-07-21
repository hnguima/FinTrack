import { CapacitorHttp } from "@capacitor/core";
import { isNativeMobile } from "./authUtils";

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
    let token = this.getToken();

    if (!token) {
      console.log("[FinTrack] No token found in storage");
      // Try to get a session token from the server (web only)
      if (!isNativeMobile()) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
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
  private static async makeRequest(url: string, options: any = {}) {
    const token = await TokenManager.getValidToken();

    console.log("[FinTrack] API Request:", url);
    console.log("[FinTrack] Token present:", token ? "Yes" : "No");
    if (token) {
      console.log(
        "[FinTrack] Token expired:",
        TokenManager.isTokenExpired(token)
      );
    }

    const headers = {
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

      return {
        status: response.status,
        data: await response.json(),
      };
    }
  }

  static async get(endpoint: string) {
    return this.makeRequest(`${API_BASE_URL}${endpoint}`, { method: "GET" });
  }

  static async post(endpoint: string, data: any) {
    return this.makeRequest(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: data,
    });
  }

  static async put(endpoint: string, data: any) {
    return this.makeRequest(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      body: data,
    });
  }

  static async delete(endpoint: string) {
    return this.makeRequest(`${API_BASE_URL}${endpoint}`, { method: "DELETE" });
  }

  // User profile methods
  static async getUserProfile() {
    return this.get("/api/users/profile");
  }

  static async getUserProfileTimestamp() {
    return this.get("/api/users/profile/timestamp");
  }

  static async updateUserProfile(updates: any) {
    return this.put("/api/users/profile", updates);
  }

  static async uploadProfilePhoto(file: File) {
    const token = await TokenManager.getValidToken();
    const headers: any = {};

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
      const webHeaders: any = {};
      if (token) {
        webHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile/photo`, {
        method: "POST",
        headers: webHeaders,
        body: formData,
        credentials: "include",
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    }
  }

  // Health check
  static async healthCheck() {
    return this.get("/api/health");
  }

  // --- FINANCE API METHODS ---

  // Accounts
  static async getAccounts() {
    return this.get("/api/accounts");
  }

  static async getAccountsSummary() {
    return this.get("/api/accounts/summary");
  }

  static async getAccount(accountId: number) {
    return this.get(`/api/accounts/${accountId}`);
  }

  static async createAccount(accountData: any) {
    return this.post("/api/accounts", accountData);
  }

  static async updateAccount(accountId: number, accountData: any) {
    return this.put(`/api/accounts/${accountId}`, accountData);
  }

  static async deleteAccount(accountId: number) {
    return this.delete(`/api/accounts/${accountId}`);
  }

  static async getAccountBalance(accountId: number) {
    return this.get(`/api/accounts/${accountId}/balance`);
  }

  static async getAccountBalanceHistory(accountId: number, days: number = 30) {
    return this.get(`/api/accounts/${accountId}/balance/history?days=${days}`);
  }

  // Entries/Transactions
  static async getEntries() {
    return this.get("/api/entries");
  }

  static async createEntry(entryData: any) {
    return this.post("/api/entries", entryData);
  }

  static async updateEntry(entryId: number, entryData: any) {
    return this.put(`/api/entries/${entryId}`, entryData);
  }

  static async deleteEntry(entryId: number) {
    return this.delete(`/api/entries/${entryId}`);
  }

  // Investments
  static async getInvestments() {
    return this.get("/api/investments");
  }

  static async createInvestment(investmentData: any) {
    return this.post("/api/investments", investmentData);
  }

  static async updateInvestment(investmentId: number, investmentData: any) {
    return this.put(`/api/investments/${investmentId}`, investmentData);
  }

  static async deleteInvestment(investmentId: number) {
    return this.delete(`/api/investments/${investmentId}`);
  }

  // Budgets
  static async getBudgets() {
    return this.get("/api/budgets");
  }

  static async createBudget(budgetData: any) {
    return this.post("/api/budgets", budgetData);
  }

  static async updateBudget(budgetId: number, budgetData: any) {
    return this.put(`/api/budgets/${budgetId}`, budgetData);
  }

  static async deleteBudget(budgetId: number) {
    return this.delete(`/api/budgets/${budgetId}`);
  }

  // Tags
  static async getTags() {
    return this.get("/api/tags");
  }

  static async createTag(tagData: any) {
    return this.post("/api/tags", tagData);
  }

  static async updateTag(tagId: number, tagData: any) {
    return this.put(`/api/tags/${tagId}`, tagData);
  }

  static async deleteTag(tagId: number) {
    return this.delete(`/api/tags/${tagId}`);
  }

  static async addTagToTransaction(transactionId: number, tagId: number) {
    return this.post(`/api/entries/${transactionId}/tags`, { tag_id: tagId });
  }

  static async removeTagFromTransaction(transactionId: number, tagId: number) {
    return this.delete(`/api/entries/${transactionId}/tags/${tagId}`);
  }

  // Transaction Management
  static async updateTransaction(transactionId: number, transactionData: any) {
    return this.put(`/api/entries/${transactionId}`, transactionData);
  }

  static async deleteTransaction(transactionId: number) {
    return this.delete(`/api/entries/${transactionId}`);
  }

  // Advanced Transaction Management
  static async searchTransactions(searchParams: any) {
    const queryString = new URLSearchParams(searchParams).toString();
    return this.get(`/api/entries/search?${queryString}`);
  }

  static async getTransactionCategories() {
    return this.get("/api/entries/categories");
  }

  static async bulkCreateTransactions(transactions: any[]) {
    return this.post("/api/entries/bulk", { transactions });
  }

  // Analytics
  static async getSpendingAnalysis(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const queryString = params ? new URLSearchParams(params).toString() : "";
    return this.get(
      `/api/analytics/spending${queryString ? "?" + queryString : ""}`
    );
  }

  // Finance metadata for caching
  static async getFinanceTimestamp() {
    return this.get("/api/finance/timestamp");
  }
}

export default ApiClient;
