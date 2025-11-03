import { Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MobileNewsBadgeProps {
  onClick: () => void;
  hasNewItems?: boolean;
}

export function MobileNewsBadge({ onClick, hasNewItems = false }: MobileNewsBadgeProps) {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onClick}
      aria-label={t('dashboard:news.openNews')}
      className={cn(
        "fixed lg:hidden top-4 right-4 z-40",
        "flex items-center gap-2 px-4 py-3 rounded-lg",
        "bg-gradient-to-br from-primary to-primary/90 border border-accent/30",
        "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
        "hover:scale-105 transition-all duration-200",
        "touch-manipulation"
      )}
    >
      <div className="relative">
        <Newspaper className="h-5 w-5 text-primary-foreground" />
        {hasNewItems && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </div>
      <span className="text-sm font-medium text-primary-foreground hidden xs:inline">
        {t('dashboard:news.newsLabel')}
      </span>
    </button>
  );
}
