import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SideDrawer } from '@/components/ui/side-drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Newspaper, Search, ExternalLink, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'bg-primary/20' },
  { id: 'general', label: 'General', color: 'bg-gray-500/20' },
  { id: 'forex', label: 'Forex', color: 'bg-blue-500/20' },
  { id: 'crypto', label: 'Crypto', color: 'bg-purple-500/20' },
  { id: 'merger', label: 'M&A', color: 'bg-green-500/20' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  all: 'bg-primary/20 text-primary border-primary/30',
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  forex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  crypto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  merger: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function NewsFeedPanel() {
  const { t } = useTranslation('common');
  
  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('news_panel_collapsed');
    return saved === 'true';
  });
  
  // Get preferred category from localStorage
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return localStorage.getItem('news_preferred_category') || 'all';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNewItems, setHasNewItems] = useState(false);
  
  // Pass category to hook
  const { news, isLoading, error, setCategory, currentCategory } = useNewsFeed(selectedCategory);

  // Filter only by search (category filtering handled by backend)
  const filteredNews = news.filter((item) => 
    item.headline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle category change with persistence
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCategory(category);
    localStorage.setItem('news_preferred_category', category);
    setHasNewItems(false);
  };

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('news_panel_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Keyboard shortcut "N" to toggle collapsed state
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === 'n' && 
        !e.ctrlKey && 
        !e.metaKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setIsCollapsed(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Check for new items indicator
  useEffect(() => {
    const lastViewed = localStorage.getItem('news_last_viewed');
    if (!lastViewed) return;

    const hasNew = news.some(item => 
      new Date(item.datetime).getTime() > parseInt(lastViewed)
    );
    setHasNewItems(hasNew);
  }, [news]);

  // Mark news as viewed when expanded
  const handleToggle = () => {
    if (isCollapsed) {
      localStorage.setItem('news_last_viewed', Date.now().toString());
      setHasNewItems(false);
    }
    setIsCollapsed(prev => !prev);
  };

  return (
    <aside 
      className={cn(
        "fixed right-0 top-16 h-[calc(100vh-4rem)] bg-background/95 backdrop-blur-xl border-l shadow-2xl z-50 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-[48px]" : "w-[340px]"
      )}
    >
      {/* Toggle Button */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={handleToggle}
        className="absolute -left-10 top-4 bg-background border shadow-md hover:bg-accent z-10"
        title={isCollapsed ? "Expand News Panel (N)" : "Collapse News Panel (N)"}
      >
        {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Collapsed state icon */}
      {isCollapsed && (
        <div className="flex flex-col items-center justify-start pt-20 gap-6">
          <Newspaper className="h-6 w-6 text-primary" />
          {hasNewItems && (
            <span 
              className="w-3 h-3 bg-destructive rounded-full animate-pulse" 
              aria-label="New items available"
            />
          )}
          <div className="writing-mode-vertical text-xs text-muted-foreground transform rotate-180">
            {t('newsFeed.title')}
          </div>
        </div>
      )}

      {/* Content (hidden when collapsed) */}
      <div className={cn("h-full overflow-hidden flex flex-col", isCollapsed && "hidden")}>
        {/* Header */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t('newsFeed.title')}</h2>
            </div>
          </div>

          {/* Category Tabs (horizontal) */}
          <Tabs value={currentCategory} onValueChange={handleCategoryChange}>
            <TabsList className="grid w-full grid-cols-5 h-7">
              {CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="text-[10px] h-6 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  {t(`newsFeed.categories.${cat.id}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-1.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('newsFeed.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 text-xs"
            />
          </div>
        </div>

        {/* News List */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-destructive text-xs">
              {error}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              {t('newsFeed.noNews')}
            </div>
          ) : (
            <div className="space-y-px pb-2">
              {filteredNews.map((item) => (
                <Card
                  key={item.id}
                  className="group overflow-hidden transition-smooth hover:shadow-glow-primary cursor-pointer border-0 border-b border-border/20 last:border-0 rounded-none shadow-none"
                  onClick={() => window.open(item.url, '_blank')}
                >
                  <div className="flex items-start gap-2 px-1.5 py-1.5">
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.headline}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span>{format(new Date(item.datetime), 'HH:mm')}</span>
                        <span className="text-border">•</span>
                        <span className="font-medium">{item.category}</span>
                        <span className="text-border">•</span>
                        <span className="truncate max-w-[100px]">{item.source}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="px-4 py-1.5 border-t text-[10px] text-muted-foreground text-center shrink-0">
          {t('newsFeed.keyboardHint')}
        </div>
      </div>
    </aside>
  );
}
