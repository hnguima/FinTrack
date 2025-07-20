import { useCallback } from "react";
import i18n from "i18next";

/**
 * Custom hook to change the app language and sync with i18next.
 * @param setLanguage - The setter from persistent config
 */
export function useChangeLanguage(setLanguage: (lang: string) => void) {
  return useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang);
      setLanguage(lang);
    },
    [setLanguage]
  );
}
