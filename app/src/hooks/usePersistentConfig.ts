import { useEffect, useState } from "react";
import { getLightTheme, getDarkTheme } from "../theme";
import {
  saveThemeMode,
  getThemeMode,
  saveLanguage,
  getLanguage,
} from "../capacitorPreferences";

export function usePersistentConfig() {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | null>(null);
  const [theme, setTheme] = useState(getLightTheme());
  const [language, setLanguage] = useState<string | null>(null);

  // On mount, load theme and language from preferences
  useEffect(() => {
    getThemeMode().then((stored) => {
      if (stored === "dark" || stored === "light") {
        setThemeMode(stored);
      } else {
        setThemeMode("light");
      }
    });
    getLanguage().then((stored) => {
      if (stored) {
        setLanguage(stored);
      } else {
        setLanguage("en");
      }
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (language) {
      saveLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (themeMode) {
      setTheme(themeMode === "dark" ? getDarkTheme() : getLightTheme());
      saveThemeMode(themeMode);
    }
  }, [themeMode]);

  return {
    themeMode,
    setThemeMode,
    theme,
    language,
    setLanguage,
  };
}
