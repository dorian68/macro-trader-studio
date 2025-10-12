import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const { useMemo } = React;

interface NavigationBreadcrumbProps {
  className?: string;
}

export default function NavigationBreadcrumb({ className }: NavigationBreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbInfo = useMemo(() => {
    const path = location.pathname;
    
    // Define route information
    const routes: Record<string, { title: string; parent?: string; parentTitle?: string }> = {
      '/dashboard': { title: 'Trading Dashboard' },
      '/history': { title: 'History', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/macro-analysis': { title: 'Macro Analysis', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/reports': { title: 'Reports', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/portfolio': { title: 'Portfolio', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/admin': { title: 'Admin Panel', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/ai-setup': { title: 'AI Setup', parent: '/dashboard', parentTitle: 'Dashboard' },
    '/alphalens-labs': { title: 'AlphaLens Labs', parent: '/dashboard', parentTitle: 'Dashboard' },
    '/portfolio-analytics': { title: 'Portfolio Analytics Suite', parent: '/alphalens-labs', parentTitle: 'AlphaLens Labs' },
      '/about': { title: 'About', parent: '/dashboard', parentTitle: 'Dashboard' },
      '/asset-detail': { title: 'Asset Details', parent: '/dashboard', parentTitle: 'Dashboard' },
    };

    const current = routes[path];
    if (!current) return null;

    return current;
  }, [location.pathname]);

  if (!breadcrumbInfo || location.pathname === '/dashboard') {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4 mr-1" />
        Dashboard
      </Button>
      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">
        {breadcrumbInfo.title}
      </span>
    </div>
  );
}