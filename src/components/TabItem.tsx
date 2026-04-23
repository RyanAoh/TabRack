import React, { useState } from 'react';
import { useTabs, TabData } from '@/src/hooks/useTabs';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Moon, BookmarkPlus, Sparkles, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLanguage } from '@/src/components/LanguageProvider';
import { cn, normalizeUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { db } from '@/src/lib/db';
import { summarizeTab } from '@/src/lib/ai';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCategories } from '@/src/hooks/useCategories';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TabItemProps {
  key?: React.Key;
  tab: TabData;
  onClose: (id: number) => void;
  onFocus: (id: number, windowId: number) => void;
  compact?: boolean;
}

export function TabItem({ tab, onClose, onFocus, compact }: TabItemProps) {
  const { t, resolvedLanguage } = useLanguage();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { categories: CATEGORIES } = useCategories();

  const cachedSummary = useLiveQuery(() => db.urlSummaries.get(tab.url), [tab.url]);

  const saveToReadLater = async (e?: React.MouseEvent, category?: string) => {
    if (e) e.stopPropagation();
    try {
      let pageContent = '';
      if (typeof chrome !== 'undefined' && chrome.scripting && tab.id) {
        const isRestrictedUrl = tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://');
        if (!isRestrictedUrl) {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                return document.body ? document.body.innerText.substring(0, 3000) : '';
              }
            });
            if (results && results[0]?.result) {
              pageContent = results[0].result;
            }
          } catch (e) {
            console.warn('Could not read tab content for', tab.url, e);
          }
        }
      }

      const newItem = {
        url: tab.url,
        title: tab.title,
        faviconUrl: tab.favIconUrl,
        scrollPercentage: 0,
        addedAt: Date.now(),
        content: pageContent,
        summary: cachedSummary?.summary,
        tags: category && category !== 'uncategorized' ? [category] : []
      };

      const normUrl = normalizeUrl(tab.url);
      const allExisting = await db.readLater.toArray();
      const existing = allExisting.find(e => normalizeUrl(e.url) === normUrl || e.url === tab.url);
      
      if (existing) {
        toast.warning(t('already_in_read_later') || 'Already in read later');
        return;
      }
      
      await db.readLater.add(newItem);
      onClose(tab.id);
      toast.success(t('read_later'));
    } catch (e) {
      console.error(e);
      toast.error(t('failed_to_save'));
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onFocus(tab.id, tab.windowId)}
      className={cn(
        "group flex flex-col p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent",
        tab.active && "bg-muted font-medium",
        isExpanded && "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2.5 w-full">
        <img
          src={tab.favIconUrl || 'https://www.google.com/favicon.ico'}
          className={cn("w-4 h-4 rounded-sm flex-shrink-0", tab.discarded && "opacity-50 grayscale")}
          alt=""
          referrerPolicy="no-referrer"
        />
        
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-[13px] text-foreground truncate",
              tab.discarded && "opacity-50"
            )}>
              {tab.discarded && `[${t('slept_tabs')}] `}{tab.title}
            </p>
            {tab.discarded && (
              <Moon className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
          {!compact && (
            <p className="text-[11px] text-muted-foreground truncate">
              {tab.url}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-7 w-7")}
              title={t('read_later')}
            >
              <BookmarkPlus className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              <DropdownMenuItem onClick={(e) => saveToReadLater(e, 'uncategorized')} className="text-xs">
                <BookmarkPlus className="w-3.5 h-3.5 mr-2" />
                {t('uncategorized')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {CATEGORIES.filter(c => c !== 'uncategorized').map(cat => (
                 <DropdownMenuItem key={cat} onClick={(e) => saveToReadLater(e, cat)} className="text-xs">
                   {t(cat as any)}
                 </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 hover:text-primary transition-colors", cachedSummary ? "text-primary opacity-100" : "text-muted-foreground")}
            disabled={isSummarizing}
            onClick={async (e) => {
              e.stopPropagation();
              if (cachedSummary && !isExpanded) {
                setIsExpanded(true);
                return;
              }
              if (isExpanded) {
                setIsExpanded(false);
                return;
              }
              if (isSummarizing) return;

              setIsSummarizing(true);
              try {
                let pageContent = '';
                if (typeof chrome !== 'undefined' && chrome.scripting && tab.id) {
                  const isRestrictedUrl = tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://');
                  if (!isRestrictedUrl) {
                    try {
                      const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => document.body ? document.body.innerText.substring(0, 3000) : ''
                      });
                      if (results && results[0]?.result) {
                        pageContent = results[0].result;
                      }
                    } catch (e) {
                      // ignore
                    }
                  }
                }
                const result = await summarizeTab(tab.title, tab.url, resolvedLanguage, pageContent);
                await db.urlSummaries.put({ url: tab.url, summary: result, updatedAt: Date.now() });
                setIsExpanded(true);
              } finally {
                setIsSummarizing(false);
              }
            }}
            title={t('summarize')}
          >
            {isSummarizing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && cachedSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-2 text-[12px] text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/50 leading-relaxed shadow-sm whitespace-pre-wrap flex justify-between gap-4">
              <div className="flex-1">{cachedSummary.summary}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={isSummarizing}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isSummarizing) return;
                  setIsSummarizing(true);
                  try {
                    let pageContent = '';
                    if (typeof chrome !== 'undefined' && chrome.scripting && tab.id) {
                      const isRestrictedUrl = tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://');
                      if (!isRestrictedUrl) {
                        try {
                          const results = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => document.body ? document.body.innerText.substring(0, 3000) : ''
                          });
                          if (results && results[0]?.result) {
                            pageContent = results[0].result;
                          }
                        } catch (e) {
                          // ignore
                        }
                      }
                    }
                    const result = await summarizeTab(tab.title, tab.url, resolvedLanguage, pageContent);
                    await db.urlSummaries.put({ url: tab.url, summary: result, updatedAt: Date.now() });
                  } finally {
                    setIsSummarizing(false);
                  }
                }}
              >
                <RefreshCw className={cn("h-3 w-3", isSummarizing && "animate-spin")} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

