import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MobileNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileNewsModal({ isOpen, onClose, children }: MobileNewsModalProps) {
  const { t } = useTranslation();

  // Keyboard support (ESC to close)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - dimmed for visibility */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden",
          "transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Centered Modal Card */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t('dashboard:news.marketNews')}
      >
        <div 
          className={cn(
            "bg-background w-[90%] h-[85vh] rounded-2xl",
            "shadow-[0_8px_20px_rgba(0,0,0,0.5)]",
            "flex flex-col overflow-hidden",
            "transition-all duration-300 ease-out",
            isOpen 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <h2 className="text-lg font-semibold text-foreground">
              {t('dashboard:news.marketNews')}
            </h2>
            <button 
              onClick={onClose}
              aria-label={t('dashboard:news.closeNews')}
              className={cn(
                "p-2 rounded-md transition-colors touch-manipulation",
                "hover:bg-accent/10 active:scale-95"
              )}
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>
          
          {/* Content - scrollable */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
