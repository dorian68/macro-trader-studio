import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const { useMemo } = React;

interface ActiveRouteIndicatorProps {
  route: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}

export default function ActiveRouteIndicator({ 
  route, 
  className, 
  activeClassName = "bg-primary/10 text-primary border-primary/20", 
  children 
}: ActiveRouteIndicatorProps) {
  const location = useLocation();
  
  const isActive = useMemo(() => {
    if (route === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname === route;
  }, [location.pathname, route]);

  return (
    <div className={cn(className, isActive && activeClassName)}>
      {children}
    </div>
  );
}