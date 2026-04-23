import React, { useEffect, useState, useMemo } from 'react';
import { cn, normalizeUrl } from '@/lib/utils';
import { useTabs } from '@/src/hooks/useTabs';
import { TabItem } from '@/src/components/TabItem';
import { ReadLaterList } from '@/src/components/ReadLaterList';
import { CommandPalette } from '@/src/components/CommandPalette';
import { ModeToggle } from '@/src/components/ModeToggle';
import { useLanguage } from '@/src/components/LanguageProvider';
import { db } from '@/src/lib/db';
import { getAIConfig, saveAIConfig, AIConfig, AIProvider } from '@/src/lib/ai';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Layers, 
  History, 
  Settings, 
  Zap, 
  Trash2,
  LayoutGrid,
  Menu,
  Scissors,
  X,
  Github
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCategories } from '@/src/hooks/useCategories';

export default function MainManager() {
  const { tabs, closeTab, focusTab, isExtension } = useTabs();
  const { t, language, setLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewModeState] = useState<'compact' | 'expanded'>('expanded');
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [duplicateTabs, setDuplicateTabs] = useState<typeof tabs>([]);
  const [selectedDedupeIds, setSelectedDedupeIds] = useState<Set<number>>(new Set());
  const [groupMode, setGroupModeState] = useState<'none' | 'base' | 'full'>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig());
  const { categories, updateCategories } = useCategories();

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('tabrack_view_mode') as 'compact' | 'expanded';
      if (savedViewMode) setViewModeState(savedViewMode);
      
      const savedGroupMode = localStorage.getItem('tabrack_group_mode') as 'none' | 'base' | 'full';
      if (savedGroupMode) setGroupModeState(savedGroupMode);
    }
  }, []);

  const setViewMode = (mode: 'compact' | 'expanded') => {
    setViewModeState(mode);
    localStorage.setItem('tabrack_view_mode', mode);
  };

  const setGroupMode = (mode: 'none' | 'base' | 'full') => {
    setGroupModeState(mode);
    localStorage.setItem('tabrack_group_mode', mode);
  };

  const updateAIConfig = (updates: Partial<AIConfig>) => {
    const nextConfig = { ...aiConfig, ...updates };
    setAiConfig(nextConfig);
    saveAIConfig(nextConfig);
  };

  // Multi-mode detection (Simplified for now)
  const isSidePanel = typeof window !== 'undefined' && window.innerWidth < 450;

  // Sync Read Later from background via chrome.storage
  useEffect(() => {
    if (isExtension) {
      const syncQueue = async () => {
        const result = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue?: any[] };
        const readLaterQueue = result.readLaterQueue || [];
        if (readLaterQueue.length > 0) {
          for (const item of readLaterQueue) {
            const normUrl = normalizeUrl(item.url);
            
            // Look for existing by exact url OR normalized url just to be safe
            const allExisting = await db.readLater.toArray();
            const existing = allExisting.find(e => normalizeUrl(e.url) === normUrl || e.url === item.url);
            
            if (!existing) {
              await db.readLater.add(item);
            } else if (existing.id !== undefined) {
              await db.readLater.update(existing.id, {
                scrollPercentage: item.scrollPercentage,
                addedAt: item.addedAt
              });
            }
          }
          await chrome.storage.local.set({ readLaterQueue: [] });
        }
      };

      syncQueue();
      const listener = (changes: any) => {
        if (changes.readLaterQueue) syncQueue();
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, [isExtension]);

  const filteredTabs = useMemo(() => {
    return tabs.filter(tab => 
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tabs, searchQuery]);

  const handleDedupe = async () => {
    const urlGroups = new Map<string, typeof tabs>();
    
    tabs.forEach(t => {
      if (!t.url) return;
      const normalized = normalizeUrl(t.url);
      if (!normalized || ((normalized.startsWith('chrome:') || normalized.startsWith('edge:')) && normalized.includes('newtab'))) return;
      
      if (!urlGroups.has(normalized)) {
        urlGroups.set(normalized, []);
      }
      urlGroups.get(normalized)!.push(t);
    });

    const toClose: typeof tabs = [];
    
    urlGroups.forEach((groupTabs) => {
      if (groupTabs.length > 1) {
        // Safe dedupe: Keep the most active/relevant tab alive.
        // Priority: Active > Not Discarded (Awake) > Latest index
        const sorted = [...groupTabs].sort((a, b) => {
          if (a.active && !b.active) return -1;
          if (!a.active && b.active) return 1;
          if (!a.discarded && b.discarded) return -1;
          if (a.discarded && !b.discarded) return 1;
          return b.id - a.id; 
        });
        
        // Push all except the best one into the closure list
        toClose.push(...sorted.slice(1));
      }
    });

    if (toClose.length > 0) {
      setDuplicateTabs(toClose);
      setSelectedDedupeIds(new Set(toClose.map(t => t.id)));
      setDedupeDialogOpen(true);
    } else {
      toast.info(t('no_duplicates'));
    }
  };

  const confirmDedupe = async () => {
    const idsToClose: number[] = Array.from(selectedDedupeIds);
    if (idsToClose.length === 0) return;

    if (isExtension) {
      await chrome.tabs.remove(idsToClose);
      toast.success(t('closed_duplicates').replace('{count}', String(idsToClose.length)));
    } else {
      idsToClose.forEach(id => closeTab(id));
      toast.success(t('closed_duplicates').replace('{count}', String(idsToClose.length)) + t('preview_mode'));
    }
    setDedupeDialogOpen(false);
    setDuplicateTabs([]);
    setSelectedDedupeIds(new Set());
  };

  const handleDiscard = async () => {
    if (isExtension) {
      const inactive = tabs.filter(t => !t.active && !t.discarded);
      for (const t of inactive) {
        await chrome.tabs.discard(t.id);
      }
      const activeCount = tabs.filter(t => t.active).length;
      const sleptCount = tabs.length - activeCount;
      toast.success(t('memory_freed').replace('{active}', String(activeCount)).replace('{slept}', String(sleptCount)));
    } else {
      toast.info('Simulating memory release');
    }
  };

  const handleCloseDomain = async (domainTabs: typeof tabs, domain: string) => {
    const idsToClose = domainTabs.map(t => t.id);
    if (idsToClose.length === 0) return;

    if (isExtension) {
      await chrome.tabs.remove(idsToClose);
      toast.success(t('closed_domain_tabs').replace('{count}', String(idsToClose.length)).replace('{domain}', domain));
    } else {
      idsToClose.forEach(id => closeTab(id));
      toast.success(t('closed_domain_tabs').replace('{count}', String(idsToClose.length)).replace('{domain}', domain) + t('preview_mode'));
    }
  };

  const handleKeepOneDomain = async (domainTabs: typeof tabs, domain: string) => {
    if (domainTabs.length <= 1) return;
    // Sort logic to keep the most relevant tab: active > not discarded > newest
    const sorted = [...domainTabs].sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      if (!a.discarded && b.discarded) return -1;
      if (a.discarded && !b.discarded) return 1;
      return 0;
    });

    const idsToClose = sorted.slice(1).map(t => t.id);

    if (isExtension) {
      await chrome.tabs.remove(idsToClose);
      toast.success(t('kept_one_tab_toast').replace('{count}', String(idsToClose.length)).replace('{domain}', domain));
    } else {
      idsToClose.forEach(id => closeTab(id));
      toast.success(t('kept_one_tab_toast').replace('{count}', String(idsToClose.length)).replace('{domain}', domain) + t('preview_mode'));
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden select-none">
      {/* Header */}
      <header className="h-[64px] shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3 text-primary font-bold text-xl">
          <Layers className="w-6 h-6" />
          <span>{t('title')}</span>
        </div>

        <div className="flex-1 flex justify-center px-4 max-w-2xl">
          <div className="w-full max-w-[400px] relative group h-10 bg-muted/50 focus-within:bg-card border border-border/50 focus-within:border-border transition-colors rounded-md flex items-center px-3 gap-2">
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
            <input 
              placeholder={t('search_placeholder')} 
              className="flex-1 bg-transparent border-0 focus:outline-none text-sm h-full w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <span className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px] font-mono shadow-sm">Alt</span>
              <span className="text-[10px]">+</span>
              <span className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px] font-mono shadow-sm">K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-right">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-green-500">{tabs.filter(t => t.active || !t.discarded).length}</span>
              <span className="text-[10px] text-muted-foreground">{t('active_tabs')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-primary">{tabs.filter(t => t.discarded).length}</span>
              <span className="text-[10px] text-muted-foreground">{t('slept_tabs')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-4 border-l border-border pl-4">
            <a href="https://github.com/RyanAoh/TabRack" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Star on GitHub">
                <Github className="h-4 w-4" />
              </Button>
            </a>
            <ModeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={t('settings')} onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar / Actions */}
      <div className="bg-card border-b border-border px-6 py-2 flex items-center gap-2">
        <Button variant="secondary" size="sm" className="h-7 text-xs flex items-center gap-1 bg-muted hover:bg-muted/80" onClick={handleDedupe}>
          <Trash2 className="w-3 h-3" /> {t('dedupe')}
        </Button>
        <Button variant="secondary" size="sm" className="h-7 text-xs flex items-center gap-1 bg-muted hover:bg-muted/80" onClick={handleDiscard}>
          <Zap className="w-3 h-3" /> {t('memory_release')}
        </Button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <Button 
          variant={groupMode !== 'none' ? "default" : "secondary"} 
          size="sm" 
          className={cn("h-7 text-xs flex items-center gap-1 transition-colors", groupMode !== 'none' ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-muted hover:bg-muted/80")} 
          onClick={() => {
            if (groupMode === 'none') setGroupMode('base');
            else if (groupMode === 'base') setGroupMode('full');
            else setGroupMode('none');
          }}
        >
          <LayoutGrid className="w-3 h-3" /> 
          {groupMode === 'none' && t('by_domain')}
          {groupMode === 'base' && t('by_base_domain')}
          {groupMode === 'full' && t('by_full_domain')}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="flex-1 flex flex-col overflow-hidden px-6 pt-4">
        <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-6 border-b border-border">
          <TabsTrigger 
            value="active" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 pt-2 font-medium text-sm text-muted-foreground data-[state=active]:text-foreground"
          >
            {t('all_tabs')}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {tabs.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="reading" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 pt-2 font-medium text-sm text-muted-foreground data-[state=active]:text-foreground"
          >
            {t('read_later')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full pr-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(() => {
                if (filteredTabs.length === 0) {
                  return (
                    <div className="col-span-full py-8 text-center text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">{t('no_tabs')}</p>
                    </div>
                  );
                }

                if (groupMode !== 'none') {
                  const groups: Record<string, typeof filteredTabs> = {};
                  filteredTabs.forEach(tab => {
                    let domain = 'Other';
                    try {
                      if (tab.url.startsWith('http')) {
                        const urlObj = new URL(tab.url);
                        if (groupMode === 'full') {
                          domain = urlObj.hostname;
                        } else {
                          domain = urlObj.hostname.replace(/^www\./, '');
                          // Simple heuristic for base domain: keep the last 2 parts unless it's a known ccTLD e.g., co.uk
                          const parts = domain.split('.');
                          if (parts.length > 2) {
                            if (parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 2) {
                              domain = parts.slice(-3).join('.');
                            } else {
                              domain = parts.slice(-2).join('.');
                            }
                          }
                        }
                      } else if (tab.url.startsWith('chrome-extension://')) {
                        domain = 'Extensions';
                      } else if (tab.url.startsWith('chrome://')) {
                        domain = 'Chrome Settings';
                      }
                    } catch(e) {}
                    if (!groups[domain]) groups[domain] = [];
                    groups[domain].push(tab);
                  });

                  return Object.entries(groups)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([domain, groupTabs]) => (
                      <div key={domain} className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm h-fit">
                        <div className="px-4 py-3 border-b border-border bg-[#fcfcfd] dark:bg-[#151a23] flex justify-between items-center group">
                          <span className="text-[13px] font-semibold text-foreground truncate pr-2" title={domain}>{domain}</span>
                          <div className="flex items-center gap-2">
                            {groupTabs.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 bg-transparent hover:bg-amber-500/10 hover:text-amber-500 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => handleKeepOneDomain(groupTabs, domain)}
                                title={t('keep_one_tab')}
                              >
                                <Scissors className="w-3 h-3" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 bg-transparent hover:bg-destructive/10 hover:text-destructive text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => handleCloseDomain(groupTabs, domain)}
                              title={t('close_all_tabs')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted hover:bg-muted text-muted-foreground shrink-0">{groupTabs.length} {t('tabs_count')}</Badge>
                          </div>
                        </div>
                        <div className="p-2 flex flex-col gap-[2px]">
                          {groupTabs.map(tab => (
                            <TabItem 
                              key={tab.id} 
                              tab={tab} 
                              onClose={closeTab} 
                              onFocus={focusTab}
                              compact={isSidePanel || viewMode === 'compact'} 
                            />
                          ))}
                        </div>
                      </div>
                    ));
                }

                // Default: Group by Window
                const windows: Record<number, typeof filteredTabs> = {};
                filteredTabs.forEach(tab => {
                  if (!windows[tab.windowId]) windows[tab.windowId] = [];
                  windows[tab.windowId].push(tab);
                });

                return Object.entries(windows).map(([windowId, windowTabs], index) => (
                  <div key={windowId} className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm h-fit">
                    <div className="px-4 py-3 border-b border-border bg-[#fcfcfd] dark:bg-[#151a23] flex justify-between items-center group">
                      <span className="text-[13px] font-semibold text-foreground">{t('window')} {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 bg-transparent hover:bg-destructive/10 hover:text-destructive text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleCloseDomain(windowTabs, `Window ${index + 1}`)}
                          title={t('close_all_tabs')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted hover:bg-muted text-muted-foreground">{windowTabs.length} {t('tabs_count')}</Badge>
                      </div>
                    </div>
                    <div className="p-2 flex flex-col gap-[2px]">
                      {windowTabs.map(tab => (
                        <TabItem 
                          key={tab.id} 
                          tab={tab} 
                          onClose={closeTab} 
                          onFocus={focusTab}
                          compact={isSidePanel || viewMode === 'compact'} 
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="reading" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full pr-4 pb-4">
            <ReadLaterList />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <footer className="h-10 shrink-0 bg-card border-t border-border px-6 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[#7c3aed] font-medium">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Gemini Nano Ready - AI Features enabled</span>
        </div>
        <div>
          Local-First Engine v1.0.4 | {isExtension ? 'Extension Mode' : 'Dev Preview'}
        </div>
      </footer>

      {/* Dialogs */}
      <Dialog open={dedupeDialogOpen} onOpenChange={setDedupeDialogOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col pt-6 pb-4">
          <DialogHeader className="mb-2">
            <DialogTitle>{t('close_duplicate_tabs')}</DialogTitle>
            <DialogDescription>
              {t('we_found')} {duplicateTabs.length} {t('duplicate_tabs_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full bg-muted/30 border border-border rounded-md px-1 py-1 max-h-[350px] overflow-y-auto">
            {duplicateTabs.map(tab => (
              <div key={tab.id} className="flex items-center gap-3 p-2 hover:bg-card rounded-md transition-colors border border-transparent hover:border-border/50">
                <input 
                  type="checkbox" 
                  className="w-[18px] h-[18px] rounded border-primary/50 text-primary cursor-pointer accent-primary shrink-0"
                  checked={selectedDedupeIds.has(tab.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedDedupeIds);
                    if (e.target.checked) newSet.add(tab.id);
                    else newSet.delete(tab.id);
                    setSelectedDedupeIds(newSet);
                  }}
                />
                <img src={tab.favIconUrl || 'https://www.google.com/favicon.ico'} className="w-4 h-4 rounded-sm flex-shrink-0" />
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[13px] text-foreground truncate">{tab.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tab.url}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDedupeDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmDedupe} variant="default" disabled={selectedDedupeIds.size === 0}>
              {language === 'zh' ? `${t('close_selected')} (${selectedDedupeIds.size})` : `Close ${selectedDedupeIds.size} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md bg-card max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{t('settings')}</DialogTitle>
            <DialogDescription>
              {t('settings_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4 px-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('language')}</p>
                <p className="text-xs text-muted-foreground">{t('language_desc')}</p>
              </div>
              <select 
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'system' | 'en' | 'zh')}
              >
                <option value="system">{t('system_default')}</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('view_mode')}</p>
                <p className="text-xs text-muted-foreground">{t('view_mode_desc')}</p>
              </div>
              <select 
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'compact' | 'expanded')}
              >
                <option value="expanded">{t('expanded')}</option>
                <option value="compact">{t('compact')}</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('group_mode')}</p>
                <p className="text-xs text-muted-foreground">{t('group_mode_desc')}</p>
              </div>
              <select 
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                value={groupMode}
                onChange={(e) => setGroupMode(e.target.value as 'none' | 'base' | 'full')}
              >
                <option value="none">{t('system_default')}</option>
                <option value="base">{t('by_base_domain')}</option>
                <option value="full">{t('by_full_domain')}</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('cmd_palette')}</p>
                <p className="text-xs text-muted-foreground">{t('cmd_palette_desc')}</p>
              </div>
              <kbd className="px-2 py-1 bg-muted border border-border text-foreground font-mono rounded text-[11px] shadow-sm">
                Alt + K
              </kbd>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('auto_discard')}</p>
                <p className="text-xs text-muted-foreground">{t('auto_discard_desc')}</p>
              </div>
              <select 
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div className="border-t border-border mt-2 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">{t('edit_categories') || 'Edit Categories'}</h4>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c !== 'uncategorized').map((cat) => (
                    <div key={cat} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                      <span>{t(cat as any)}</span>
                      <button 
                        onClick={() => updateCategories(categories.filter(c => c !== cat))}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input 
                    placeholder={t('new_category') || "New category..."} 
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !categories.includes(val)) {
                          updateCategories([val, ...categories.filter(c => c !== 'uncategorized'), 'uncategorized']);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{t('press_enter_to_add') || 'Press Enter to add.'}</p>
              </div>
            </div>

            <div className="border-t border-border mt-2 pt-4">
              <h4 className="text-sm font-semibold mb-3">{t('ai_engine_config') || 'AI Engine Configuration'}</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('provider') || 'Provider'}</p>
                  </div>
                  <select 
                    className="px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground shadow-sm outline-none focus:ring-1 focus:ring-ring"
                    value={aiConfig.provider}
                    onChange={(e) => updateAIConfig({ provider: e.target.value as AIProvider })}
                  >
                    <option value="nano">{t('gemini_nano') || 'Google Gemini Nano (Local Chrome)'}</option>
                    <option value="gemini_cloud">{t('gemini_cloud') || 'Google Gemini Cloud (API)'}</option>
                    <option value="custom_cloud">{t('custom_cloud') || 'Custom Cloud (OpenAI Compatible)'}</option>
                  </select>
                </div>
                
                {aiConfig.provider === 'gemini_cloud' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t('gemini_api_key_desc') || 'Optional: Enter your own Gemini API Key. If left blank, it will use the platform default if available.'}</p>
                    <Input 
                      type="password" 
                      placeholder="AIzaSy..." 
                      className="text-sm"
                      value={aiConfig.geminiCloudConfig?.apiKey || ''} 
                      onChange={(e) => updateAIConfig({ geminiCloudConfig: { ...aiConfig.geminiCloudConfig, apiKey: e.target.value }})}
                    />
                  </div>
                )}

                {aiConfig.provider === 'custom_cloud' && (
                  <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border mt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t('base_url') || 'Base URL'}</label>
                      <Input 
                        placeholder="https://api.openai.com/v1/chat/completions" 
                        value={aiConfig.customCloudConfig.baseUrl}
                        onChange={(e) => updateAIConfig({ customCloudConfig: { ...aiConfig.customCloudConfig, baseUrl: e.target.value }})}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t('model_name') || 'Model Name'}</label>
                      <Input 
                        placeholder="gpt-4o-mini" 
                        value={aiConfig.customCloudConfig.model}
                        onChange={(e) => updateAIConfig({ customCloudConfig: { ...aiConfig.customCloudConfig, model: e.target.value }})}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t('api_key_auth') || 'API Key / Token'}</label>
                      <Input 
                        type="password" 
                        placeholder="sk-..." 
                        value={aiConfig.customCloudConfig.apiKey}
                        onChange={(e) => updateAIConfig({ customCloudConfig: { ...aiConfig.customCloudConfig, apiKey: e.target.value }})}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="m-0 sm:justify-end px-6 py-4 shrink-0 border-t bg-muted/50 mt-auto rounded-b-xl">
            <Button variant="default" onClick={() => setSettingsOpen(false)}>{t('done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlays */}
      <CommandPalette onDedupeRequest={handleDedupe} />
    </div>
  );
}
