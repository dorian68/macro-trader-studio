import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface SuperUserGuardProps {
  children: ReactNode;
  fallback: ReactNode;
}

export function SuperUserGuard({ children, fallback }: SuperUserGuardProps) {
  const { isSuperUser, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{isSuperUser ? children : fallback}</>;
}
