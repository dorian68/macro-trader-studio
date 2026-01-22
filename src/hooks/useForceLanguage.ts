import { useEffect, useRef } from "react";

import type { SupportedLanguage } from "@/i18n/config";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Forces a language while the caller is mounted, then restores the previous language on unmount.
 * Useful for internal tools (e.g., Forecast Playground) that should always be in English.
 */
export function useForceLanguage(lang: SupportedLanguage) {
  const { language, changeLanguage } = useLanguage();
  const previousLanguageRef = useRef<SupportedLanguage | null>(null);

  useEffect(() => {
    previousLanguageRef.current = language;

    if (language !== lang) {
      void changeLanguage(lang);
    }

    return () => {
      const prev = previousLanguageRef.current;
      if (prev && prev !== lang) {
        void changeLanguage(prev);
      }
    };
    // We intentionally want this to run once per mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
