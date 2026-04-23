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

export function ReadLaterList() {
  const items = useLiveQuery(() => db.readLater.orderBy('addedAt').reverse().toArray());
  const { t, resolvedLanguage } = useLanguage();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const { categories: CATEGORIES } = useCategories();

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

  return (
    <div className="flex flex-col gap-8">
      {CATEGORIES.map((category) => {
        const categoryItems = groupedItems[category] || [];
        if (categoryItems.length === 0) return null;

        return (
          <div key={category} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1">
              <Badge variant="secondary" className="text-xs px-2 py-0 border-transparent bg-muted text-muted-foreground">
                {t(category as any)}
              </Badge>
              <span className="text-[11px] text-muted-foreground/60">{categoryItems.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              <AnimatePresence>
                {categoryItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex flex-col justify-between p-4 bg-card border border-border rounded-xl cursor-pointer hover:shadow-md hover:border-primary/20 transition-all relative overflow-hidden"
                    onClick={() => openItem(item.url)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <img
                        src={item.faviconUrl || 'https://www.google.com/favicon.ico'}
                        className="w-5 h-5 rounded flex-shrink-0"
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <Select 
                          value={(item.tags && item.tags.length > 0 && CATEGORIES.includes(item.tags[0])) ? item.tags[0] : 'uncategorized'} 
                          onValueChange={(val) => item.id && updateCategory(item.id, val)}
                        >
                          <SelectTrigger title={t('change_category')} className="h-7 px-2 text-[11px] w-fit min-w-[70px] bg-transparent border-transparent hover:bg-muted font-medium focus:ring-0">
                            <SelectValue>
                              {t(((item.tags && item.tags.length > 0 && CATEGORIES.includes(item.tags[0])) ? item.tags[0] : 'uncategorized') as any)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-[12px]">
                                {t(cat as any)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!item.summary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            title={t('summarize')}
                            onClick={(e) => generateSummary(e, item)}
                            disabled={item.id ? loadingIds.has(item.id) : false}
                          >
                            {item.id && loadingIds.has(item.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('delete')}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.id && removeItem(item.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 pr-2 flex flex-col justify-between">
              <div>
                <p className="text-[14px] font-medium text-foreground leading-snug line-clamp-2">{item.title}</p>
                {item.summary && (
                  <div className="mt-3 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-1.5 text-[11px] font-medium text-primary cursor-pointer w-fit hover:opacity-80 transition-opacity"
                        onClick={(e) => toggleSummary(e, item.id!)}
                      >
                        <Sparkles className="w-3 h-3" />
                        {t('ai_summary')}
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", expandedSummaries.has(item.id!) && "rotate-180")} />
                      </div>
                      
                      <AnimatePresence>
                        {expandedSummaries.has(item.id!) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-muted text-muted-foreground hover:text-foreground"
                              title={t('regenerate')}
                              onClick={(e) => generateSummary(e, item)}
                              disabled={item.id ? loadingIds.has(item.id) : false}
                            >
                              <RefreshCw className={cn("h-3 w-3", item.id && loadingIds.has(item.id) && "animate-spin")} />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence initial={false}>
                      {expandedSummaries.has(item.id!) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 text-[12px] text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/50 leading-relaxed shadow-sm whitespace-pre-wrap">
                            {item.summary}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <p className="text-[11px] text-muted-foreground truncate">
                  {item.url}
                </p>
              </div>
              {item.scrollPercentage > 0 && (
                <div className="w-full bg-muted rounded-full h-1 mt-3">
                  <div className="bg-primary h-1 rounded-full" style={{ width: `${item.scrollPercentage}%` }} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
