import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  id: number;
  category: string;
  datetime: string;
  headline: string;
  image: string | null;
  source: string;
  summary: string;
  url: string;
  created_at: string;
}

interface NewsCache {
  data: NewsItem[];
  timestamp: number;
}

export function useNewsFeed(initialCategory: string = 'all') {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsCache, setNewsCache] = useState<Map<string, NewsCache>>(new Map());
  const [currentCategory, setCurrentCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (category: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-news-feed', {
        body: { category }
      });
      
      if (error) throw error;
      
      // Update cache Map for this category
      setNewsCache(prev => {
        const newCache = new Map(prev);
        newCache.set(category, {
          data: data?.data || [],
          timestamp: Date.now()
        });
        return newCache;
      });
      
      setNews(data?.data || []);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = newsCache.get(currentCategory);
    
    // If cache exists and is less than 30min old, use it
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`✅ Using cached news for ${currentCategory}`);
      setNews(cached.data);
    } else {
      fetchNews(currentCategory);
    }

    // Realtime subscription for updates
    const channel = supabase
      .channel('news_feed_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'news_feed'
      }, () => {
        console.log('📰 News feed updated');
        fetchNews(currentCategory);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCategory, newsCache, fetchNews]);

  return { 
    news, 
    isLoading, 
    error, 
    refetch: fetchNews,
    setCategory: setCurrentCategory,
    currentCategory
  };
}
