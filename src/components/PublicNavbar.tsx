import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo Section - Clickable and optimized for mobile */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* Icon logo for mobile */}
            <img 
              src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" 
              alt="alphaLens.ai" 
              className="h-8 w-8 sm:h-10 sm:w-10 shrink-0" 
            />
            {/* Text logo and tagline - hidden on very small screens, visible on xs+ */}
            <div className="hidden xs:flex flex-col items-start">
              <img 
                src="/lovable-uploads/3b568e3e-a3d8-47d3-b8ca-4f500781b5e4.png" 
                alt="alphaLens.ai" 
                className="h-6 sm:h-8 w-auto" 
              />
              <span className="text-xs text-muted-foreground font-medium leading-none">
                AI Trading Intelligence
              </span>
            </div>
          </button>
        </div>
        
        {/* Navigation - Responsive */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
          {/* Hide some buttons on smaller screens */}
          <Button variant="ghost" onClick={() => navigate("/about")} className="hidden sm:flex text-sm px-2 sm:px-4 min-h-[44px]">
            About
          </Button>
          <Button variant="ghost" onClick={() => navigate("/features")} className="hidden md:flex text-sm px-2 sm:px-4 min-h-[44px]">
            Features
          </Button>
          <Button variant="ghost" onClick={() => navigate("/contact")} className="hidden lg:flex text-sm px-2 sm:px-4 min-h-[44px]">
            Contact
          </Button>
          {/* Always visible buttons */}
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
            Login
          </Button>
          <Button onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  );
}