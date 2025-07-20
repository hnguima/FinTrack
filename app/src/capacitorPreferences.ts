import { Preferences } from "@capacitor/preferences";

const THEME_KEY = "themeMode";

const LANGUAGE_KEY = "language";
const CAP_PREFS_DEBUG = Boolean(import.meta.env.VITE_DEBUG_MODE);
export async function saveLanguage(language: string) {
  try {
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Saving language:`, language);
    await Preferences.set({ key: LANGUAGE_KEY, value: language });
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Saved language:`, language);
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to save language:`, e);
  }
}

export async function getLanguage(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: LANGUAGE_KEY });
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Retrieved language:`, value);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
    return null;
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to retrieve language:`, e);
    return null;
  }
}

export async function saveThemeMode(mode: "light" | "dark") {
  try {
    await Preferences.set({ key: THEME_KEY, value: mode });
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Saved theme mode:`, mode);
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to save theme mode:`, e);
  }
}

export async function getThemeMode(): Promise<"light" | "dark" | null> {
  try {
    const { value } = await Preferences.get({ key: THEME_KEY });
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Retrieved theme mode:`, value);
    if (value === "light" || value === "dark") return value;
    return null;
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to retrieve theme mode:`, e);
    return null;
  }
}
