import { useState } from 'react';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface MarketNewsCollapsibleProps {
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "border-blue-500/50 text-blue-400",
  forex: "border-green-500/50 text-green-400",
  crypto: "border-purple-500/50 text-purple-400",
  merger: "border-orange-500/50 text-orange-400",
};

// Format timestamp (e.g., "3d ago", "14h ago")
const formatTime = (datetime: string) => {
  const now = Date.now();
  const itemTime = new Date(datetime).getTime();
  const diff = now - itemTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

export function MarketNewsCollapsible({ className }: MarketNewsCollapsibleProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { news, isLoading, setCategory } = useNewsFeed('general');

  // Filter by category and search
  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Card className={cn("h-full flex flex-col overflow-hidden", className)}>
      <CardHeader className="pb-1.5 px-3 sm:px-4 pt-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <CardTitle className="text-sm font-semibold">{t('dashboard:news.marketNews')}</CardTitle>
          <div className="relative w-full sm:w-48">
            <Input 
              placeholder={t('dashboard:news.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs pr-7 pl-2"
            />
            <Search className="absolute right-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={(value) => {
          setSelectedCategory(value);
          if (value !== 'all') setCategory(value);
          else setCategory('general');
        }}>
          <TabsList className="flex w-full bg-muted/30 gap-0.5 p-0.5 h-7">
            <TabsTrigger value="all" className="flex-1 min-w-0 text-[10px] h-6 px-1.5">{t('dashboard:news.all')}</TabsTrigger>
            <TabsTrigger value="general" className="flex-1 min-w-0 text-[10px] h-6 px-1.5">{t('dashboard:news.general')}</TabsTrigger>
            <TabsTrigger value="forex" className="flex-1 min-w-0 text-[10px] h-6 px-1.5">{t('dashboard:news.forex')}</TabsTrigger>
            <TabsTrigger value="crypto" className="flex-1 min-w-0 text-[10px] h-6 px-1.5">{t('dashboard:news.crypto')}</TabsTrigger>
            <TabsTrigger value="merger" className="flex-1 min-w-0 text-[10px] h-6 px-1.5">{t('dashboard:news.merger')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 px-3 sm:px-4 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
            {t('dashboard:loading')}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
            {t('dashboard:noDataAvailable')}
          </div>
        ) : (
          <ScrollArea className="h-full flex-1 min-h-0">
            <div className="space-y-px pr-2">
              {filteredNews.map((item) => (
                <div 
                  key={item.id}
                  className="border-b border-border/20 last:border-0 px-1.5 py-1.5 hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <div className="flex gap-2 items-start">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt="" 
                        className="w-10 h-10 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs leading-tight line-clamp-2 mb-0.5">
                        {item.headline}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{formatTime(item.datetime)}</span>
                        <span className="text-border">•</span>
                        <span className={cn("font-medium", CATEGORY_COLORS[item.category]?.split(' ')[1])}>{item.category}</span>
                        {item.source && (
                          <>
                            <span className="text-border">•</span>
                            <span className="truncate max-w-[80px]">{item.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
