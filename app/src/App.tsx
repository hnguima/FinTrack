import "./App.css";
import "./colors.css";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useEffect } from "react";
import { usePersistentConfig } from "./hooks/usePersistentConfig";
import { useChangeLanguage } from "./hooks/useChangeLanguage";
import "./i18n";
import i18n from "i18next";
import Container from "@mui/material/Container";
import DashboardScreen from "./screens/DashboardScreen";
import Header from "./components/Header";
import LoginScreen from "./screens/LoginScreen";
import AuthCallbackScreen from "./screens/AuthCallbackScreen";
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

import { useTranslation } from "react-i18next";
import UserProfileScreen from "./screens/UserProfileScreen";
import { UserCacheManager } from "./utils/userCacheManager";
import { TokenManager, ApiClient } from "./utils/apiClient";
import { BackgroundSync } from "./utils/backgroundSync";

// Patch console methods globally to add prefix
(function patchConsoleMethods() {
  const patch = (method: "log" | "error" | "warn") => {
    const original = console[method];
    console[method] = function (...args: any[]) {
      original.apply(console, ["[FinTrack]", ...args]);
    };
  };
  patch("log");
  patch("error");
  patch("warn");
})();

function getUserFromStorage() {
  try {
    const user = localStorage.getItem("user");
    const parsedUser = user ? JSON.parse(user) : null;

    if (parsedUser) {
      // Migrate old field names to new ones for consistency
      if (parsedUser.display_name && !parsedUser.name) {
        parsedUser.name = parsedUser.display_name;
        delete parsedUser.display_name;
      }
      if (parsedUser.profile_picture && !parsedUser.photo) {
        parsedUser.photo = parsedUser.profile_picture;
        delete parsedUser.profile_picture;
      }

      // Save migrated user back to localStorage
      localStorage.setItem("user", JSON.stringify(parsedUser));

      console.log("User.username:", parsedUser.username);
      console.log("User.email:", parsedUser.email);
      console.log("User.name:", parsedUser.name);
      console.log("User.provider:", parsedUser.provider);
      console.log("User.photo:", parsedUser.photo);
      console.log("User keys:", Object.keys(parsedUser));
    } else {
      console.log("No user found in localStorage");
    }
    return parsedUser;
  } catch (e) {
    console.error("Error parsing user data from localStorage:", e);
    return null;
  }
}

import AccountsScreen from "./screens/AccountsScreen";
import TransactionScreen from "./screens/TransactionScreen";
import SpendingAnalytics from "./components/SpendingAnalytics";
import BottomNav from "./components/BottomNav";

function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<
    "dashboard" | "accounts" | "transactions" | "analytics" | "profile"
  >("dashboard");

  // Check if server data has been updated and sync local state
  const checkAndSyncServerUpdates = async () => {
    if (!user) return;

    try {
      const updateStatus = await UserCacheManager.checkUserUpdateStatus();
      if (updateStatus.shouldUpdate) {
        console.log(
          "[FinTrack] Server data updated from another source, refreshing..."
        );

        // Fetch fresh data from server and update local state
        const freshData = await UserCacheManager.getUserDataWithCache();
        if (freshData) {
          await updateUserFromServerData(freshData);
        }
      }
    } catch (error) {
      console.error("[FinTrack] Error checking for server updates:", error);
    }
  };

  // Update local user state from server data if it changed
  const updateUserFromServerData = async (freshData: any) => {
    // Only update if data actually changed to prevent unnecessary re-renders
    const currentUserStr = JSON.stringify(user);
    const freshUserStr = JSON.stringify(freshData);

    if (currentUserStr !== freshUserStr) {
      setUser(freshData);
      localStorage.setItem("user", JSON.stringify(freshData));

      // Update app-level preferences if they changed
      if (freshData.preferences) {
        if (
          freshData.preferences.theme &&
          freshData.preferences.theme !== themeMode
        ) {
          setThemeMode(freshData.preferences.theme);
        }
        if (
          freshData.preferences.language &&
          freshData.preferences.language !== language
        ) {
          setLanguage(freshData.preferences.language);
          i18n.changeLanguage(freshData.preferences.language);
        }
      }
    }
  };

  // Wrapper function to trigger background sync when changing screens
  const navigateToScreen = (
    newScreen: "dashboard" | "accounts" | "transactions" | "analytics" | "profile"
  ) => {
    // Navigate immediately for seamless UX
    setScreen(newScreen);

    // Run sync operations in background without blocking UI
    performBackgroundSync();
  };

  // Perform sync operations in background after screen change
  const performBackgroundSync = async () => {
    try {
      // First, sync any pending local changes to the database
      const pendingCount = BackgroundSync.getPendingUpdateCount();
      if (pendingCount > 0) {
        console.log(
          `[FinTrack] Syncing ${pendingCount} pending update(s) to server...`
        );
        await BackgroundSync.forceSyncNow();
      }

      // Always check for external updates (from other devices, web interface, etc.)
      // This is crucial for multi-device consistency
      await checkAndSyncServerUpdates();
    } catch (error) {
      console.error("[FinTrack] Error during background sync:", error);
    }
  };
  const { themeMode, setThemeMode, theme, language, setLanguage } =
    usePersistentConfig();
  const changeLanguage = useChangeLanguage(setLanguage);
  const [user, setUser] = useState<any>(() => getUserFromStorage());
  const [safeAreaTop, setSafeAreaTop] = useState<number>(0);

  // Fetch user preferences from database and sync with local config
  const fetchUserPreferences = async () => {
    if (!user) return;

    try {
      // Use UserCacheManager for intelligent caching
      const cachedUserData = await UserCacheManager.getUserDataWithCache();

      if (cachedUserData) {
        // Only update user if the data has actually changed to prevent infinite loops
        const currentUserStr = JSON.stringify(user);
        const cachedUserStr = JSON.stringify(cachedUserData);

        if (currentUserStr !== cachedUserStr) {
          // Update user data
          setUser(cachedUserData);
          localStorage.setItem("user", JSON.stringify(cachedUserData));
        }

        // Sync preferences with local config if they exist and are different
        if (cachedUserData.preferences) {
          if (
            cachedUserData.preferences.theme &&
            cachedUserData.preferences.theme !== themeMode
          ) {
            setThemeMode(cachedUserData.preferences.theme);
          }
          if (
            cachedUserData.preferences.language &&
            cachedUserData.preferences.language !== language
          ) {
            setLanguage(cachedUserData.preferences.language);
            i18n.changeLanguage(cachedUserData.preferences.language);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch user preferences:", error);
    }
  };

  // Request JWT token if user is authenticated but doesn't have one
  const ensureJWTToken = async () => {
    if (!user) return;

    try {
      // Check if we already have a token
      const existingToken = TokenManager.getToken();
      if (existingToken) {
        console.log("[FinTrack] JWT token already exists");
        return;
      }

      // Request token from server for authenticated users
      console.log("[FinTrack] Requesting JWT token for authenticated user");
      const response = await ApiClient.post("/api/auth/token", {});

      if (response.status === 200 && response.data.token) {
        TokenManager.setToken(response.data.token);
        console.log("[FinTrack] JWT token obtained and stored");
      } else {
        console.warn("[FinTrack] Failed to get JWT token:", response.status);
      }
    } catch (error) {
      console.error("[FinTrack] Error requesting JWT token:", error);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);

    // Queue the user update for background sync to database
    BackgroundSync.queueUserUpdate(updatedUser);

    // Sync preferences if they changed
    if (updatedUser.preferences) {
      if (updatedUser.preferences.theme !== themeMode) {
        setThemeMode(updatedUser.preferences.theme);
      }
      if (updatedUser.preferences.language !== language) {
        setLanguage(updatedUser.preferences.language);
        i18n.changeLanguage(updatedUser.preferences.language);
      }
    }
  };

  // Fetch user preferences on app load and when user changes
  useEffect(() => {
    if (user) {
      fetchUserPreferences();
      ensureJWTToken();
    }
  }, [user?.username]); // Only re-run if username changes

  // Sync i18n language with persistent config
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Get safe area information on mobile platforms
  useEffect(() => {
    const getSafeAreaInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.getInfo();
          // On mobile, we need to account for status bar + typical header height
          // Status bar is typically 24-44px, app bar is typically 56-64px
          setSafeAreaTop(56 + 24); // App bar height + typical status bar
        } catch (error) {
          console.log("Could not get status bar info:", error);
          // Fallback to typical mobile header heights
          setSafeAreaTop(80); // App bar + status bar fallback
        }
      } else {
        // Web platform - only account for app bar
        setSafeAreaTop(64);
      }
    };

    getSafeAreaInfo();
  }, []);

  // Listen for user login changes (e.g., after OAuth redirect)
  useEffect(() => {
    const handleStorage = () => {
      const updatedUser = getUserFromStorage();
      setUser(updatedUser);
    };

    window.addEventListener("storage", handleStorage);

    // Check for OAuth success in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("oauth_success") === "true") {
      const userDataParam = urlParams.get("user_data");

      if (userDataParam) {
        try {
          const userData = JSON.parse(userDataParam);
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);

          // Debug: log the user object and photo URL after login
          console.log("OAuth userData.username:", userData?.username);
          console.log("OAuth userData.email:", userData?.email);
          console.log("OAuth userData.name:", userData?.name);
          console.log("OAuth userData.provider:", userData?.provider);
          console.log("OAuth userData.photo:", userData?.photo);
          console.log("OAuth userData keys:", Object.keys(userData || {}));

          // Don't request JWT token separately since it should be included in OAuth callback
          // The mobile OAuth callback now includes the JWT token directly
          console.log(
            "Authentication setup complete - token should be included in OAuth callback"
          );

          // Clean up URL parameters
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch (e) {
          console.error("App: error parsing user data from URL:", e);
        }
      }
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!themeMode || !language) return null; // or a loading spinner

  // Check if this is an OAuth callback
  const isAuthCallback =
    window.location.pathname === "/auth/callback" ||
    window.location.search.includes("code=");

  if (isAuthCallback) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container className="App">
          <AuthCallbackScreen />
        </Container>
      </ThemeProvider>
    );
  }

  const getScreenTitle = () => {
    if (screen === "dashboard") return t("title");
    if (screen === "accounts") return t("accounts", "Accounts");
    if (screen === "transactions") return t("transactions", "Transactions");
    if (screen === "analytics") return t("analytics", "Analytics");
    return t("profile", "Profile");
  };

  const renderScreen = () => {
    if (screen === "dashboard") return <DashboardScreen />;
    if (screen === "accounts") return <AccountsScreen user={user} />;
    if (screen === "transactions") return <TransactionScreen />;
    if (screen === "analytics") return <SpendingAnalytics />;
    return (
      <UserProfileScreen
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        language={language}
        setLanguage={changeLanguage}
        user={user}
        onUserUpdate={handleUserUpdate}
      />
    );
  };

  // If not logged in, show login screen
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container className="App">
          <LoginScreen />
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header
        title={getScreenTitle()}
        screen={screen}
        setScreen={navigateToScreen}
        user={user}
      />
      <Container
        className="App"
        sx={{
          paddingTop: `${safeAreaTop}px`, // Use padding instead of margin for proper header spacing
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Bottom navigation height + safe area
          minHeight:
            "calc(100vh - env(safe-area-inset-bottom, 0px) - 64px - env(safe-area-inset-top, 0px))", // Full height
          boxSizing: "border-box", // Include padding in height calculation
        }}
      >
        {renderScreen()}
      </Container>
      <BottomNav screen={screen} setScreen={navigateToScreen} />
    </ThemeProvider>
  );
}

export default App;
