import { useState, useEffect } from "react";
import { Newspaper, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useNewsFeed } from "@/hooks/useNewsFeed";

interface MarketNewsCollapsibleProps {
  className?: string;
  defaultOpen?: boolean;
}

const CATEGORIES = [
  { id: "general", label: "General", color: "bg-blue-500/10 text-blue-500" },
  { id: "forex", label: "Forex", color: "bg-emerald-500/10 text-emerald-500" },
  { id: "crypto", label: "Crypto", color: "bg-purple-500/10 text-purple-500" },
  { id: "merger_and_acquisition", label: "M&A", color: "bg-orange-500/10 text-orange-500" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  forex: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  crypto: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  merger_and_acquisition: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export function MarketNewsCollapsible({ className, defaultOpen = false }: MarketNewsCollapsibleProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const { news, isLoading, setCategory } = useNewsFeed(selectedCategory);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("news_collapsible_open");
    if (saved !== null) {
      setIsOpen(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("news_collapsible_open", isOpen.toString());
  }, [isOpen]);

  // Calculate unread count
  useEffect(() => {
    const lastViewed = localStorage.getItem("news_last_viewed");
    if (!lastViewed || news.length === 0) return;

    const newCount = news.filter(
      (item) => new Date(item.datetime).getTime() > parseInt(lastViewed)
    ).length;

    setUnreadCount(newCount);
  }, [news]);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      localStorage.setItem("news_last_viewed", Date.now().toString());
      setUnreadCount(0);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCategory(categoryId);
  };

  const filteredNews = news.filter((item) =>
    searchQuery
      ? item.headline.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={handleOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 relative">
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard:news.title")}</span>
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="absolute top-full left-0 right-0 mt-2 z-50 px-4 sm:px-0">
          <Card className="w-full sm:max-w-4xl mx-auto shadow-2xl border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                {t("dashboard:news.title")}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Category Tabs */}
              <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  {CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                      {t(`dashboard:news.categories.${cat.id}`, cat.label)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("dashboard:news.searchPlaceholder", "Search news...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* News List */}
                <ScrollArea className="h-[400px] pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : filteredNews.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {t("dashboard:news.noNews", "No news available")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredNews.map((item, index) => (
                        <Card
                          key={`${item.datetime}-${index}`}
                          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                          onClick={() => window.open(item.url, "_blank")}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${CATEGORY_COLORS[item.category]} text-xs shrink-0`}
                                >
                                  {t(`dashboard:news.categories.${item.category}`, item.category)}
                                </Badge>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {new Date(item.datetime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <h3 className="font-semibold text-sm leading-tight">
                                {item.headline}
                              </h3>
                              {item.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {item.summary}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {item.source}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
