import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background mobile-spacing">
      <SEOHead titleKey="seo.notFoundTitle" descriptionKey="seo.notFoundDescription" noIndex />
      <div className="text-center px-4 mobile-fade-in">
        <h1 className="text-6xl sm:text-8xl font-bold mb-4 sm:mb-6 text-primary/80">404</h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 mobile-body">
          Oops! This page doesn't exist
        </p>
        <a 
          href="/" 
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium touch-friendly"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
