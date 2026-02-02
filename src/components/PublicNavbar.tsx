import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  const { t } = useTranslation('common');

  const navigationItems = [
    { name: t('nav.about'), path: "/about" },
    { name: t('nav.features'), path: "/features" },
    { name: t('nav.pricing'), path: "/pricing" },
    { name: t('nav.contact'), path: "/contact" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-white/5 bg-background sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo - Mobile optimized */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group min-w-0"
          >
            <img
              src="/header_logo.png"
              alt="alphaLens.ai"
              className="h-10 sm:h-14 w-auto object-contain"
            />
          </button>

          {/* Mobile hamburger menu */}
          <div className="md:hidden ml-2">
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
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

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Auth buttons */}
          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
                {t('nav.login')}
              </Button>
              <Button onClick={() => navigate("/auth")} className="text-sm px-2 sm:px-4 min-h-[44px]">
                {t('nav.signup')}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-sm px-2 sm:px-4 min-h-[44px]">
              {t('nav.dashboard')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}