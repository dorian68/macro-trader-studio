import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Globe, FileText, ArrowRight, ChevronLeft, ChevronRight, List, LayoutGrid, Image as ImageIcon, Newspaper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useNewsFeed } from '@/hooks/useNewsFeed';
import { cn } from '@/lib/utils';

interface DashboardColumnCarouselProps {
  className?: string;
}

type ViewMode = 'list' | 'compact' | 'large';

const ITEMS_MAP: Record<ViewMode, number> = { list: 5, compact: 3, large: 2 };

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

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('bg-muted/40 flex items-center justify-center', className)}>
      <Newspaper className="h-5 w-5 text-muted-foreground/50" />
    </div>
  );
}

export function DashboardColumnCarousel({ className }: DashboardColumnCarouselProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { news, isLoading, setCategory } = useNewsFeed('general');

  const [newsCategory, setNewsCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [page, setPage] = useState(0);

  const itemsPerPage = ITEMS_MAP[viewMode];

  const filteredNews = useMemo(() => {
    if (newsCategory === 'all') return news;
    return news.filter(item => item.category === newsCategory);
  }, [news, newsCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredNews.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleCategoryChange = (cat: string) => {
    setNewsCategory(cat);
    setPage(0);
    setCategory(cat !== 'all' ? cat : 'general');
  };

  const handleViewModeChange = (val: string) => {
    if (val) {
      setViewMode(val as ViewMode);
      setPage(0);
    }
  };

  const renderNewsItem = (item: typeof news[0]) => {
    const openUrl = () => item.url && window.open(item.url, '_blank');

    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          className="border border-border/30 rounded-lg px-3 py-2 hover:border-primary/30 hover:bg-accent/5 transition-colors cursor-pointer flex items-center gap-2 flex-1 min-h-0"
          onClick={openUrl}
        >
          <h4 className="text-xs font-semibold line-clamp-1 flex-1 min-w-0">{item.headline}</h4>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', CATEGORY_COLORS[item.category])}>
            {item.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(item.datetime)}</span>
        </div>
      );
    }

    if (viewMode === 'large') {
      return (
        <div
          key={item.id}
          className="border border-border/30 rounded-lg hover:border-primary/30 hover:bg-accent/5 transition-colors cursor-pointer flex-1 min-h-0 overflow-hidden flex flex-col"
          onClick={openUrl}
        >
          {item.image ? (
            <img src={item.image} alt="" className="w-full h-24 object-cover rounded-t-lg" loading="lazy" />
          ) : (
            <ImagePlaceholder className="w-full h-24 rounded-t-lg" />
          )}
          <div className="p-2.5 flex flex-col gap-1 flex-1 min-h-0">
            <h4 className="text-sm font-semibold line-clamp-2">{item.headline}</h4>
            {item.summary && <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
              <span>{formatTime(item.datetime)}</span>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[item.category])}>
                {item.category}
              </Badge>
              {item.source && <span className="ml-auto truncate max-w-[80px]">{item.source}</span>}
            </div>
          </div>
        </div>
      );
    }

    // compact (default)
    return (
      <div
        key={item.id}
        className="border border-border/30 rounded-lg p-2.5 hover:border-primary/30 hover:bg-accent/5 transition-colors cursor-pointer flex-1 min-h-0 overflow-hidden flex items-start gap-2.5"
        onClick={openUrl}
      >
        {item.image ? (
          <img src={item.image} alt="" className="w-10 h-10 object-cover rounded shrink-0" loading="lazy" />
        ) : (
          <ImagePlaceholder className="w-10 h-10 rounded shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-sm font-semibold line-clamp-2 mb-1">{item.headline}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(item.datetime)}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[item.category])}>
              {item.category}
            </Badge>
            {item.source && <span className="ml-auto truncate max-w-[80px]">{item.source}</span>}
          </div>
        </div>
      </div>
    );
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

        {/* Quick Access */}
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
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">{t('dashboard:trading.intelligentTradeSetups')}</p>
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
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">{t('dashboard:trading.inDepthAnalysis')}</p>
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
                <p className="text-sm text-muted-foreground line-clamp-2 px-2 mb-2">{t('dashboard:trading.comprehensiveReports')}</p>
                <div className="text-primary text-sm font-semibold flex items-center justify-center gap-2">
                  {t('common:actions.explore')} <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Intelligence */}
        <TabsContent value="market-intel" className="flex-1 min-h-0 mt-2 overflow-hidden animate-fade-in">
          {/* Category filters + View mode toggle */}
          <div className="flex items-center gap-1 mb-2 shrink-0">
            <div className="flex gap-1 flex-1 min-w-0">
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
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="shrink-0">
              <ToggleGroupItem value="list" aria-label="List view" className="h-7 w-7 p-0">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="compact" aria-label="Compact view" className="h-7 w-7 p-0">
                <LayoutGrid className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="large" aria-label="Large view" className="h-7 w-7 p-0">
                <ImageIcon className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
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
              pageItems.map(renderNewsItem)
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">{currentPage + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={currentPage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
