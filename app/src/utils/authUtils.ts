import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { TokenManager } from "./apiClient";

const API_BASE_URL = "https://fintrack-api.the-cube-lab.com";

export interface AuthResult {
  success: boolean;
  user?: {
    username: string;
    email: string;
    name: string;
    provider: string;
    photo?: string;
  };
  error?: string;
}

export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

export const testConnectivity = async (): Promise<boolean> => {
  try {
    console.log("Testing API connectivity...");
    const response = await CapacitorHttp.get({
      url: `${API_BASE_URL}/api/health`,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Health check response:", response.status, response.data);
    return response.status === 200;
  } catch (error) {
    console.error("Connectivity test failed:", error);
    return false;
  }
};

export const handleOAuthLogin = async (): Promise<AuthResult> => {
  // First test basic connectivity on mobile
  if (isNativeMobile()) {
    const canConnect = await testConnectivity();
    if (!canConnect) {
      console.error("Cannot connect to API server");
      return {
        success: false,
        error:
          "Cannot connect to server. Please check your internet connection.",
      };
    }
    return handleMobileOAuth();
  } else {
    return handleWebOAuth();
  }
};

const handleWebOAuth = async (): Promise<AuthResult> => {
  try {
    // Web OAuth flow - use target_redirect parameter and pass current URL
    const webRedirectUrl = window.location.origin;
    const response = await fetch(
      `${API_BASE_URL}/api/auth/google/url?target_redirect=web&web_redirect_url=${encodeURIComponent(
        webRedirectUrl
      )}`
    );
    const data = await response.json();

    if (data.auth_url) {
      // For web, redirect in the same window
      window.location.href = data.auth_url;
      // This won't return as the page will redirect
      return { success: false, error: "Redirecting..." };
    } else {
      throw new Error("Failed to get OAuth URL");
    }
  } catch (error) {
    return {
      success: false,
      error: "Failed to initiate login. Please try again.",
    };
  }
};

const handleMobileOAuth = async (): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const handleAuth = async () => {
      try {
        console.log("Starting mobile OAuth flow...");
        console.log("Platform:", Capacitor.getPlatform());
        console.log("Native platform:", Capacitor.isNativePlatform());

        // Mobile OAuth flow - use target_redirect parameter
        const url = `${API_BASE_URL}/api/auth/google/url?target_redirect=mobile`;
        console.log("Fetching URL:", url);

        // Use CapacitorHttp for better mobile compatibility
        const response = await CapacitorHttp.get({
          url: url,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (response.status !== 200) {
          console.error(
            "Failed to fetch OAuth URL:",
            response.status,
            response.data
          );
          resolve({
            success: false,
            error: `Server error: ${response.status} - ${response.data}`,
          });
          return;
        }

        const data = response.data;
        console.log("OAuth URL response:", data);

        if (!data.auth_url) {
          console.error("No auth_url in response:", data);
          resolve({
            success: false,
            error: data.error || "Failed to get OAuth URL",
          });
          return;
        }

        console.log("Setting up deep link listener...");

        // Set up deep link listener for the callback
        const listener = await App.addListener("appUrlOpen", async (event) => {
          console.log("Deep link received:", event.url);

          if (event.url.startsWith("fintrack://auth/callback")) {
            // Parse the callback URL
            const url = new URL(event.url);
            const params = new URLSearchParams(url.search);

            console.log(
              "Callback params:",
              Object.fromEntries(params.entries())
            );

            if (params.get("success") === "true") {
              console.log(
                "OAuth success, extracting token and resolving with user data"
              );

              // JWT token should be included in OAuth callback with user-based keypairs
              const token = params.get("token");
              if (token) {
                TokenManager.setToken(token);
                console.log("[FinTrack] JWT token stored from OAuth callback");
              } else {
                console.error(
                  "[FinTrack] No JWT token in OAuth callback - authentication may fail"
                );
              }

              resolve({
                success: true,
                user: {
                  username: params.get("username") || "",
                  email: params.get("email") || "",
                  name: params.get("name") || "",
                  provider: params.get("provider") || "google",
                  photo: params.get("photo") || undefined,
                },
              });
            } else {
              console.log("OAuth failed:", params.get("error"));
              resolve({
                success: false,
                error: params.get("error") || "Authentication failed",
              });
            }

            // Clean up listener
            listener.remove();
            Browser.close();
          }
        });

        console.log("Opening OAuth URL in browser:", data.auth_url);

        // Open the OAuth URL in the system browser
        await Browser.open({
          url: data.auth_url,
          presentationStyle: "popover",
        });

        console.log("Browser opened successfully");
      } catch (error) {
        console.error("Mobile OAuth error:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
        resolve({
          success: false,
          error: `Failed to initiate mobile login: ${errorMessage}`,
        });
      }
    };

    handleAuth();
  });
};
