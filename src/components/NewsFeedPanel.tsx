import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SideDrawer } from '@/components/ui/side-drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Newspaper, Search, ExternalLink, Loader2, X } from 'lucide-react';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'general', label: 'General', color: 'bg-gray-500/20' },
  { id: 'forex', label: 'Forex', color: 'bg-blue-500/20' },
  { id: 'crypto', label: 'Crypto', color: 'bg-purple-500/20' },
  { id: 'merger', label: 'M&A', color: 'bg-green-500/20' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  forex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  crypto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  merger: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function NewsFeedPanel() {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  
  // Get preferred category from localStorage
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return localStorage.getItem('news_preferred_category') || 'general';
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

  // Keyboard shortcut "N"
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === 'n' && 
        !e.ctrlKey && 
        !e.metaKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setIsOpen(prev => !prev);
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

  const handleOpen = () => {
    setIsOpen(true);
    localStorage.setItem('news_last_viewed', Date.now().toString());
    setHasNewItems(false);
  };

  return (
    <>
      {/* Trigger Button with new items indicator */}
      <Button
        variant="outline"
        size="icon"
        className="fixed right-4 top-24 z-[60] shadow-lg gradient-card border-primary/20 relative"
        onClick={handleOpen}
      >
        <Newspaper className="h-5 w-5" />
        {hasNewItems && (
          <span 
            className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" 
            aria-label="New items available"
          />
        )}
      </Button>

      {/* Side Drawer (NO OVERLAY DIMMING) */}
      <SideDrawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('newsFeed.title')}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Category Tabs (horizontal) */}
            <Tabs value={currentCategory} onValueChange={handleCategoryChange}>
              <TabsList className="grid w-full grid-cols-4">
                {CATEGORIES.map(cat => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id}
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    {t(`newsFeed.categories.${cat.id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('newsFeed.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* News List */}
          <ScrollArea className="flex-1 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                {error}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('newsFeed.noNews')}
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {filteredNews.map((item) => (
                  <Card
                    key={item.id}
                    className="group overflow-hidden transition-smooth hover:shadow-glow-primary hover:scale-[1.02] cursor-pointer"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <div className="relative">
                      {item.image && (
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.headline}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                        </div>
                      )}
                      
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className={cn('text-xs', CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general)}>
                            {item.category.toUpperCase()}
                          </Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>

                        <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                          {item.headline}
                        </h4>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                          <span className="font-medium">{item.source}</span>
                          <span>{format(new Date(item.datetime), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer hint */}
          <div className="p-4 border-t text-xs text-muted-foreground text-center">
            {t('newsFeed.keyboardHint')}
          </div>
        </div>
      </SideDrawer>
    </>
  );
}
