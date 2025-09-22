import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo - Mobile optimized */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 shrink-0 p-1">
            <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
          </div>
          <div className="hidden xs:block min-w-0">
            <img 
              src="/lovable-uploads/3b568e3e-a3d8-47d3-b8ca-4f500781b5e4.png" 
              alt="alphaLens.ai" 
              className="h-5 sm:h-6 w-auto"
            />
            <p className="text-xs text-muted-foreground hidden sm:block">AI Trading Intelligence</p>
          </div>
        </button>
        
        {/* Navigation - Responsive */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
          {/* Hide some buttons on smaller screens */}
          <Button variant="ghost" onClick={() => navigate("/about")} className="hidden sm:flex text-sm px-2 sm:px-4 min-h-[44px]">
            About
          </Button>
          <Button variant="ghost" onClick={() => navigate("/features")} className="hidden md:flex text-sm px-2 sm:px-4 min-h-[44px]">
            Features
          </Button>
          <Button variant="ghost" onClick={() => navigate("/pricing")} className="hidden md:flex text-sm px-2 sm:px-4 min-h-[44px]">
            Pricing
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