import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Globe, FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { cn } from '@/lib/utils';

interface DashboardColumnCarouselProps {
  className?: string;
}

const ITEMS_PER_PAGE = 3;

const CATEGORY_COLORS: Record<string, string> = {
  general: 'border-blue-500/50 text-blue-400',
  forex: 'border-green-500/50 text-green-400',
  crypto: 'border-purple-500/50 text-purple-400',
  merger: 'border-orange-500/50 text-orange-400',
};

const formatTime = (datetime: string) => {
  const diff = Date.now() - new Date(datetime).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return 'now';
};

export function DashboardColumnCarousel({ className }: DashboardColumnCarouselProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { news, isLoading, setCategory } = useNewsFeed('general');

  const [newsCategory, setNewsCategory] = useState('all');
  const [page, setPage] = useState(0);

  const filteredNews = useMemo(() => {
    if (newsCategory === 'all') return news;
    return news.filter(item => item.category === newsCategory);
  }, [news, newsCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredNews.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleCategoryChange = (cat: string) => {
    setNewsCategory(cat);
    setPage(0);
    if (cat !== 'all') {
      setCategory(cat);
    } else {
      setCategory('general');
    }
  };

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      <Tabs defaultValue="quick-access" className="h-full flex flex-col overflow-hidden">
        <TabsList className="w-full bg-muted/30 shrink-0">
          <TabsTrigger value="quick-access" className="flex-1 text-xs font-semibold">
            {t('dashboard:trading.quickAccess', 'Quick Access')}
          </TabsTrigger>
          <TabsTrigger value="market-intel" className="flex-1 text-xs font-semibold">
            {t('dashboard:news.marketNews', 'Market Intelligence')}
          </TabsTrigger>
        </TabsList>

        {/* Slide 1: Quick Access Nav Cards */}
        <TabsContent value="quick-access" className="flex-1 min-h-0 gap-2 mt-2 overflow-hidden animate-fade-in">
          <Card
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden flex-1 flex flex-col justify-center"
            onClick={() => navigate('/trade-generator')}
            style={{ minHeight: '44px' }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center h-full">
              <div className="gradient-primary p-2 rounded-2xl shadow-glow-primary shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground mb-1">{t('dashboard:trading.aiTradeSetup')}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">
                  {t('dashboard:trading.intelligentTradeSetups')}
                </p>
                <div className="text-primary text-sm font-semibold flex items-center justify-center gap-2">
                  {t('dashboard:getStarted')} <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden flex-1 flex flex-col justify-center"
            onClick={() => navigate('/macro-lab')}
            style={{ minHeight: '44px' }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center h-full">
              <div className="gradient-primary p-2 rounded-2xl shadow-glow-primary shrink-0">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground mb-1">{t('dashboard:trading.macroCommentary')}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">
                  {t('dashboard:trading.inDepthAnalysis')}
                </p>
                <div className="text-primary text-sm font-semibold flex items-center justify-center gap-2">
                  {t('common:actions.explore')} <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden flex-1 flex flex-col justify-center"
            onClick={() => navigate('/reports')}
            style={{ minHeight: '44px' }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center h-full">
              <div className="gradient-primary p-2 rounded-2xl shadow-glow-primary shrink-0">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground mb-1">{t('dashboard:trading.reports')}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">
                  {t('dashboard:trading.comprehensiveReports')}
                </p>
                <div className="text-primary text-sm font-semibold flex items-center justify-center gap-2">
                  {t('common:actions.explore')} <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slide 2: Market Intelligence (paginated) */}
        <TabsContent value="market-intel" className="flex-1 min-h-0 mt-2 overflow-hidden animate-fade-in">
          {/* Category filters */}
          <div className="flex gap-1 mb-2 shrink-0">
            {['all', 'general', 'forex', 'crypto'].map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                  newsCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {cat === 'all' ? t('dashboard:news.all', 'All') : cat}
              </button>
            ))}
          </div>

          {/* News items */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                {t('dashboard:loading')}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                {t('dashboard:noDataAvailable')}
              </div>
            ) : (
              pageItems.map(item => (
                <div
                  key={item.id}
                  className="border border-border/30 rounded-lg p-3 hover:border-primary/30 hover:bg-accent/5 transition-colors cursor-pointer flex-1 min-h-0 overflow-hidden flex flex-col justify-center"
                  onClick={() => item.url && window.open(item.url, '_blank')}
                >
                  <h4 className="text-sm font-semibold line-clamp-2 mb-1">{item.headline}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(item.datetime)}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[item.category])}
                    >
                      {item.category}
                    </Badge>
                    {item.source && <span className="ml-auto truncate max-w-[80px]">{item.source}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={currentPage === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
