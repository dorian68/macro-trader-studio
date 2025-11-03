import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Newspaper, Search, ExternalLink, Loader2 } from 'lucide-react';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  forex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stocks: 'bg-green-500/20 text-green-400 border-green-500/30',
  crypto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  commodities: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function NewsFeedPanel() {
  const { t } = useTranslation('common');
  const { news, isLoading, error } = useNewsFeed();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNews = news.filter((item) => {
    const matchesSearch = item.headline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 top-20 z-50 shadow-lg gradient-card border-primary/20"
        >
          <Newspaper className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            {t('newsFeed.title')}
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('newsFeed.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder={t('newsFeed.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('newsFeed.categories.all')}</SelectItem>
              <SelectItem value="forex">{t('newsFeed.categories.forex')}</SelectItem>
              <SelectItem value="stocks">{t('newsFeed.categories.stocks')}</SelectItem>
              <SelectItem value="crypto">{t('newsFeed.categories.crypto')}</SelectItem>
              <SelectItem value="commodities">{t('newsFeed.categories.commodities')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* News List */}
        <ScrollArea className="h-[calc(100vh-280px)] px-6">
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
      </SheetContent>
    </Sheet>
  );
}
