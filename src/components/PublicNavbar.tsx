import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: "About", path: "/about" },
    { name: "Features", path: "/features" },
    { name: "Pricing", path: "/pricing" },
    { name: "Contact", path: "/contact" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-border bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo - Mobile optimized */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 shrink-0 p-1">
              <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
            </div>
            <div className="hidden xs:block min-w-0">
              <img 
                src="/lovable-uploads/Only_text_white_BG_FINAL.png" 
                alt="alphaLens.ai" 
                className="h-[1.66rem] sm:h-8 w-auto"
              />
              <p className="text-xs text-muted-foreground hidden sm:block">AI Trading Intelligence</p>
            </div>
          </button>

          {/* Mobile hamburger menu */}
          <div className="md:hidden ml-2">
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white">
                {navigationItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    className="cursor-pointer"
                  >
                    {item.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Navigation - Desktop */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
          {/* Desktop navigation items */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navigationItems.map((item) => (
              <Button 
                key={item.name}
                variant="ghost" 
                onClick={() => navigate(item.path)} 
                className="text-sm px-2 lg:px-4 min-h-[44px]"
              >
                {item.name}
              </Button>
            ))}
          </div>

          {/* Auth buttons */}
          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
                Login
              </Button>
              <Button onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
                Sign Up
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-sm px-2 sm:px-4 min-h-[44px]">
              Dashboard
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}