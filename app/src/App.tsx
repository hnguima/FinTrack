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
import ConfigScreen from "./screens/ConfigScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import { ApiClient } from "./utils/apiClient";

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

function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<"dashboard" | "config" | "profile">(
    "dashboard"
  );
  const { themeMode, setThemeMode, theme, language, setLanguage } =
    usePersistentConfig();
  const changeLanguage = useChangeLanguage(setLanguage);
  const [user, setUser] = useState<any>(() => getUserFromStorage());
  const [safeAreaTop, setSafeAreaTop] = useState<number>(0);

  // Fetch user preferences from database and sync with local config
  const fetchUserPreferences = async () => {
    if (!user) return;

    try {
      const response = await ApiClient.getUserProfile();

      if (response.status === 200) {
        const serverUser = response.data;

        // Update user data
        setUser(serverUser);
        localStorage.setItem("user", JSON.stringify(serverUser));

        // Sync preferences with local config if they exist and are different
        if (serverUser.preferences) {
          if (serverUser.preferences.theme !== themeMode) {
            setThemeMode(serverUser.preferences.theme);
          }
          if (serverUser.preferences.language !== language) {
            setLanguage(serverUser.preferences.language);
            i18n.changeLanguage(serverUser.preferences.language);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch user preferences:", error);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
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
    if (screen === "config") return t("config");
    return t("userProfile");
  };

  const renderScreen = () => {
    if (screen === "dashboard") return <DashboardScreen />;
    if (screen === "config") {
      return (
        <ConfigScreen
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          language={language}
          setLanguage={changeLanguage}
        />
      );
    }
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
        setScreen={setScreen}
        user={user}
      />
      <Container
        className="App"
        sx={{
          paddingTop: `${safeAreaTop}px`, // Use padding instead of margin for proper header spacing
          minHeight:
            "calc(100vh - env(safe-area-inset-bottom, 0px) - 64px - env(safe-area-inset-top, 0px))", // Full height
          boxSizing: "border-box", // Include padding in height calculation
        }}
      >
        {renderScreen()}
      </Container>
    </ThemeProvider>
  );
}

export default App;
