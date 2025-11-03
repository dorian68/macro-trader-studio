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
    <Card className={cn("border border-border/50 rounded-lg h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg font-semibold">{t('dashboard:news.marketNews')}</CardTitle>
          
          {/* Search bar */}
          <div className="relative w-64">
            <Input 
              placeholder={t('dashboard:news.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pr-8"
            />
            <Search className="absolute right-2 top-2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Category tabs inline */}
        <Tabs value={selectedCategory} onValueChange={(value) => {
          setSelectedCategory(value);
          // Trigger API fetch for specific category
          if (value !== 'all') {
            setCategory(value);
          } else {
            // For 'all', load general and let frontend filtering handle the rest
            setCategory('general');
          }
        }}>
          <TabsList className="grid w-full grid-cols-5 bg-muted/30">
            <TabsTrigger value="all">{t('dashboard:news.all')}</TabsTrigger>
            <TabsTrigger value="general">{t('dashboard:news.general')}</TabsTrigger>
            <TabsTrigger value="forex">{t('dashboard:news.forex')}</TabsTrigger>
            <TabsTrigger value="crypto">{t('dashboard:news.crypto')}</TabsTrigger>
            <TabsTrigger value="merger">{t('dashboard:news.merger')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t('dashboard:loading')}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t('dashboard:noDataAvailable')}
          </div>
        ) : (
          <ScrollArea className="h-full flex-1 min-h-0">
            <div className="space-y-3 pr-4">
              {filteredNews.map((item) => (
                <div 
                  key={item.id}
                  className="border border-border/30 rounded-lg p-4 hover:border-primary/30 hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <div className="flex gap-3">
                    {/* Image thumbnail (if available) */}
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt="" 
                        className="w-20 h-20 object-cover rounded-md shrink-0"
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {item.headline}
                      </h3>

                      {/* Meta: Time + Category */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>{formatTime(item.datetime)}</span>
                        <span>•</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", CATEGORY_COLORS[item.category])}
                        >
                          {item.category}
                        </Badge>
                      </div>

                      {/* Summary */}
                      {item.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {item.summary}
                        </p>
                      )}

                      {/* Source */}
                      {item.source && (
                        <div className="text-xs text-muted-foreground">
                          Source: <span className="font-medium">{item.source}</span>
                        </div>
                      )}
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
