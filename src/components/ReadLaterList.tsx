import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ReadLaterItem } from '@/src/lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ExternalLink, Bookmark, Sparkles, Loader2, ChevronDown, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/src/components/LanguageProvider';
import { summarizeTab } from '@/src/lib/ai';
import { cn } from '@/lib/utils';
import { useCategories } from '@/src/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function ReadLaterList({ searchQuery = '', hideFilters = false, viewMode = 'expanded' }: { searchQuery?: string, hideFilters?: boolean, viewMode?: 'compact' | 'expanded' }) {
  const allItems = useLiveQuery(() => db.readLater.orderBy('addedAt').reverse().toArray());
  
  const items = useMemo(() => {
    if (!allItems) return [];
    if (!searchQuery) return allItems;
    const query = searchQuery.toLowerCase();
    return allItems.filter(i => 
      (i.title && i.title.toLowerCase().includes(query)) || 
      (i.url && i.url.toLowerCase().includes(query)) ||
      (i.summary && i.summary.toLowerCase().includes(query))
    );
  }, [allItems, searchQuery]);

  const { t, resolvedLanguage } = useLanguage();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const { categories: CATEGORIES } = useCategories();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const groupedItems = useMemo(() => {
    if (!items) return {};
    const groups: Record<string, ReadLaterItem[]> = {};
    
    // Initialize groups
    CATEGORIES.forEach(cat => { groups[cat] = []; });
    
    items.forEach(item => {
      const tag = (item.tags && item.tags.length > 0 && CATEGORIES.includes(item.tags[0])) 
        ? item.tags[0] 
        : 'uncategorized';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(item);
    });
    
    return groups;
  }, [items, CATEGORIES]);

  const updateCategory = async (id: number, category: string) => {
    const newTags = category === 'uncategorized' ? [] : [category];
    await db.readLater.update(id, { tags: newTags });
  };

  const removeItem = async (id: number) => {
    await db.readLater.delete(id);
  };

  const toggleSummary = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateSummary = async (e: React.MouseEvent, item: ReadLaterItem) => {
    e.stopPropagation();
    if (!item.id || loadingIds.has(item.id)) return;

    setLoadingIds(prev => new Set(prev).add(item.id!));
    try {
      const summaryResult = await summarizeTab(item.title, item.url, resolvedLanguage, item.content);
      await db.readLater.update(item.id, { summary: summaryResult });
      await db.urlSummaries.put({ url: item.url, summary: summaryResult, updatedAt: Date.now() });
      setExpandedSummaries(prev => new Set(prev).add(item.id!)); // Auto-expand upon generation
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id!);
        return newSet;
      });
    }
  };

  const openItem = (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Bookmark className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">{t('reading_list_empty')}</p>
      </div>
    );
  }

  const filteredCategories = activeFilter === 'all' 
    ? CATEGORIES 
    : CATEGORIES.filter(c => c === activeFilter);

  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      {!hideFilters && (
        <div className={cn("flex gap-2 pb-2", viewMode === 'compact' ? "flex-wrap" : "items-center overflow-x-auto scrollbar-none")}>
          <Button
            variant={activeFilter === 'all' ? 'default' : 'secondary'}
            size="sm"
            className={cn("h-8 rounded-full px-4 text-[13px] whitespace-nowrap", viewMode !== 'compact' && "shrink-0")}
            onClick={() => setActiveFilter('all')}
          >
            {resolvedLanguage === 'zh' ? '全部' : 'All'}
            <span className="ml-1.5 opacity-60 text-xs">{items.length}</span>
          </Button>
          {CATEGORIES.map(category => {
            const count = groupedItems[category]?.length || 0;
            if (count === 0 && activeFilter !== category) return null;
            return (
              <Button
                key={category}
                variant={activeFilter === category ? 'default' : 'secondary'}
                size="sm"
                className={cn("h-8 rounded-full px-4 text-[13px] whitespace-nowrap", viewMode !== 'compact' && "shrink-0", activeFilter !== category && "bg-muted/50 hover:bg-muted")}
                onClick={() => setActiveFilter(category)}
              >
                {t(category as any)}
                <span className="ml-1.5 opacity-60 text-xs">{count}</span>
              </Button>
            );
          })}
        </div>
      )}

      <div className={cn(
        activeFilter === 'all' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start"
          : "flex flex-col gap-6"
      )}>
        {filteredCategories.map((category) => {
          const categoryItems = groupedItems[category] || [];
          if (categoryItems.length === 0) return null;

          // When 'all' is selected, wrap in a panel like 'all tabs' page
          const isAllFilter = activeFilter === 'all';

          const content = (
            <div className={cn(
              isAllFilter ? "p-2 flex flex-col gap-1" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
            )}>
              <AnimatePresence>
                {categoryItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group flex flex-col p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent",
                      expandedSummaries.has(item.id!) && "bg-muted/30"
                    )}
                    onClick={() => openItem(item.url)}
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <img
                        src={item.faviconUrl || 'https://www.google.com/favicon.ico'}
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                      
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] text-foreground truncate">
                            {item.title}
                          </p>
                        </div>
                        {viewMode !== 'compact' && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.url}
                            </p>
                            {item.scrollPercentage > 0 && (
                              <div className="w-16 bg-muted rounded-full h-1 ml-2">
                                <div className="bg-primary h-1 rounded-full" style={{ width: `${item.scrollPercentage}%` }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Select 
                          value={(item.tags && item.tags.length > 0 && CATEGORIES.includes(item.tags[0])) ? item.tags[0] : 'uncategorized'} 
                          onValueChange={(val) => item.id && updateCategory(item.id, val)}
                        >
                          <SelectTrigger title={t('change_category')} className="h-7 px-2 text-[11px] w-auto max-w-[100px] bg-transparent border-transparent hover:bg-muted font-medium focus:ring-0 [&>svg]:hidden">
                            <div className="truncate text-left w-full">
                              {t(((item.tags && item.tags.length > 0 && CATEGORIES.includes(item.tags[0])) ? item.tags[0] : 'uncategorized') as any)}
                            </div>
                          </SelectTrigger>
                          <SelectContent align="end">
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-[12px]">
                                {t(cat as any)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-7 w-7 transition-colors", item.summary ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary")}
                          title={t('summarize')}
                          onClick={(e) => {
                            if (item.summary) {
                              toggleSummary(e, item.id!);
                            } else {
                              generateSummary(e, item);
                            }
                          }}
                          disabled={item.id ? loadingIds.has(item.id) : false}
                        >
                          {item.id && loadingIds.has(item.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('delete')}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.id && removeItem(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedSummaries.has(item.id!) && item.summary && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden w-full mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[12px] text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/50 leading-relaxed shadow-sm whitespace-pre-wrap flex justify-between gap-4">
                            <div className="flex-1">{item.summary}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                              title={t('regenerate')}
                              onClick={(e) => generateSummary(e, item)}
                              disabled={item.id ? loadingIds.has(item.id) : false}
                            >
                              <RefreshCw className={cn("h-3 w-3", item.id && loadingIds.has(item.id) && "animate-spin")} />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );

          if (isAllFilter) {
            return (
              <div key={category} className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm h-fit">
                <div className="px-4 py-3 border-b border-border bg-[#fcfcfd] dark:bg-[#151a23] flex justify-between items-center group">
                  <span className="text-[13px] font-semibold text-foreground truncate pr-2">
                    {t(category as any)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground/60">{categoryItems.length}</span>
                  </div>
                </div>
                {content}
              </div>
            );
          }

          return (
            <div key={category} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-1">
                <Badge variant="secondary" className="text-xs px-2 py-0 border-transparent bg-muted text-muted-foreground">
                  {t(category as any)}
                </Badge>
                <span className="text-[11px] text-muted-foreground/60">{categoryItems.length}</span>
              </div>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
