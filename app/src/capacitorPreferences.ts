import { Preferences } from "@capacitor/preferences";

const THEME_KEY = "themeMode";
const LANGUAGE_KEY = "language";
const USER_PHOTO_KEY = "userPhoto";
const USER_DATA_KEY = "userData";
const USER_UPDATED_AT_KEY = "userUpdatedAt";
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

// User photo BLOB caching
export async function saveUserPhotoBlob(photoBlob: string, timestamp?: string) {
  try {
    if (CAP_PREFS_DEBUG)
      console.log(
        `[CapacitorPreferences] Saving user photo BLOB (length: ${photoBlob.length})`
      );
    await Preferences.set({ key: USER_PHOTO_KEY, value: photoBlob });

    if (timestamp) {
      await Preferences.set({
        key: `${USER_PHOTO_KEY}_timestamp`,
        value: timestamp,
      });
    }

    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Saved user photo BLOB`);
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(
        `[CapacitorPreferences] Failed to save user photo BLOB:`,
        e
      );
  }
}

export async function getUserPhotoBlob(): Promise<{
  photoBlob: string | null;
  timestamp: string | null;
}> {
  try {
    const { value: photoBlob } = await Preferences.get({ key: USER_PHOTO_KEY });
    const { value: timestamp } = await Preferences.get({
      key: `${USER_PHOTO_KEY}_timestamp`,
    });

    if (CAP_PREFS_DEBUG)
      console.log(
        `[CapacitorPreferences] Retrieved user photo BLOB:`,
        photoBlob ? `length ${photoBlob.length}` : "null"
      );

    return {
      photoBlob: photoBlob || null,
      timestamp: timestamp || null,
    };
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(
        `[CapacitorPreferences] Failed to retrieve user photo BLOB:`,
        e
      );
    return { photoBlob: null, timestamp: null };
  }
}

// User data caching with timestamp
export async function saveUserData(userData: Record<string, unknown>, timestamp?: string) {
  try {
    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Saving user data:`, userData);

    await Preferences.set({
      key: USER_DATA_KEY,
      value: JSON.stringify(userData),
    });

    if (timestamp) {
      await Preferences.set({ key: USER_UPDATED_AT_KEY, value: timestamp });
    }

    if (CAP_PREFS_DEBUG) console.log(`[CapacitorPreferences] Saved user data`);
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to save user data:`, e);
  }
}

export async function getUserData(): Promise<{
  userData: Record<string, unknown> | null;
  updatedAt: string | null;
}> {
  try {
    const { value: userDataStr } = await Preferences.get({
      key: USER_DATA_KEY,
    });
    const { value: updatedAt } = await Preferences.get({
      key: USER_UPDATED_AT_KEY,
    });

    let userData = null;
    if (userDataStr) {
      try {
        userData = JSON.parse(userDataStr);
      } catch (parseError) {
        if (CAP_PREFS_DEBUG)
          console.error(
            `[CapacitorPreferences] Failed to parse user data:`,
            parseError
          );
      }
    }

    if (CAP_PREFS_DEBUG)
      console.log(
        `[CapacitorPreferences] Retrieved user data`,
        userData ? "found" : "not found"
      );

    return {
      userData,
      updatedAt: updatedAt || null,
    };
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to retrieve user data:`, e);
    return { userData: null, updatedAt: null };
  }
}

// User updated timestamp management
export async function saveUserUpdatedAt(timestamp: string) {
  try {
    if (CAP_PREFS_DEBUG)
      console.log(
        `[CapacitorPreferences] Saving user updated timestamp:`,
        timestamp
      );
    await Preferences.set({ key: USER_UPDATED_AT_KEY, value: timestamp });
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(
        `[CapacitorPreferences] Failed to save user updated timestamp:`,
        e
      );
  }
}

export async function getUserUpdatedAt(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: USER_UPDATED_AT_KEY });
    if (CAP_PREFS_DEBUG)
      console.log(
        `[CapacitorPreferences] Retrieved user updated timestamp:`,
        value
      );
    return value;
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(
        `[CapacitorPreferences] Failed to retrieve user updated timestamp:`,
        e
      );
    return null;
  }
}

// Clear user cache
export async function clearUserCache() {
  try {
    await Preferences.remove({ key: USER_PHOTO_KEY });
    await Preferences.remove({ key: `${USER_PHOTO_KEY}_timestamp` });
    await Preferences.remove({ key: USER_DATA_KEY });
    await Preferences.remove({ key: USER_UPDATED_AT_KEY });

    if (CAP_PREFS_DEBUG)
      console.log(`[CapacitorPreferences] Cleared user cache`);
  } catch (e) {
    if (CAP_PREFS_DEBUG)
      console.error(`[CapacitorPreferences] Failed to clear user cache:`, e);
  }
}
