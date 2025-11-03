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

export function useNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-news-feed');
      
      if (error) throw error;
      setNews(data?.data || []);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();

    // Realtime subscription for updates
    const channel = supabase
      .channel('news_feed_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'news_feed'
      }, () => {
        console.log('📰 News feed updated');
        fetchNews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNews]);

  return { news, isLoading, error, refetch: fetchNews };
}
