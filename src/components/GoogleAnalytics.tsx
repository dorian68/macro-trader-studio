import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = "G-KYJV42E72H";

export function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    window.gtag?.("config", GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}
