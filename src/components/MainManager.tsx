import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeUrl } from '@/lib/utils';
import { useTabs } from '@/src/hooks/useTabs';
import { TabItem } from '@/src/components/TabItem';
import { ReadLaterList } from '@/src/components/ReadLaterList';
// CommandPalette removed
import { ModeToggle } from '@/src/components/ModeToggle';
import { useLanguage } from '@/src/components/LanguageProvider';
import { useTheme } from '@/src/components/ThemeProvider';
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
  Github,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCategories } from '@/src/hooks/useCategories';
import pkg from '@/package.json';

export default function MainManager() {
  const { tabs, closeTab, focusTab, isExtension } = useTabs();
  const { t, language, resolvedLanguage, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewModeState] = useState<'compact' | 'expanded'>('expanded');
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [duplicateTabs, setDuplicateTabs] = useState<typeof tabs>([]);
  const [selectedDedupeIds, setSelectedDedupeIds] = useState<Set<number>>(new Set());
  const [groupMode, setGroupModeState] = useState<'none' | 'base' | 'full'>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig());
  const [aiStatusLabel, setAiStatusLabel] = useState('Checking AI capabilities...');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const { categories, updateCategories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sorting snapshot refs
  const groupOrderRef = useRef<string[]>([]);
  const lastGroupMode = useRef(groupMode);
  const lastSearchQuery = useRef(searchQuery);
  const lastTabCount = useRef(tabs.length); // Use total tabs length to detect additions

  const handleExportData = async () => {
    try {
      const readLaterItems = await db.readLater.toArray();
      const categoriesData = localStorage.getItem('tabrack-categories');
      
      const backupData = {
        readLater: readLaterItems,
        categories: categoriesData ? JSON.parse(categoriesData) : null
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabrack_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      toast.error('Export failed');
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (backupData.readLater && Array.isArray(backupData.readLater)) {
        await db.readLater.clear();
        await db.readLater.bulkAdd(backupData.readLater);
      }
      
      if (backupData.categories && Array.isArray(backupData.categories)) {
        updateCategories(backupData.categories);
      }
      
      toast.success(t('import_success'));
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(t('import_failed'));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('tabrack_view_mode') as 'compact' | 'expanded';
      if (savedViewMode) setViewModeState(savedViewMode);
      
      const savedGroupMode = localStorage.getItem('tabrack_group_mode') as 'none' | 'base' | 'full';
      if (savedGroupMode) setGroupModeState(savedGroupMode);
    }
  }, []);

  // Update AI status label based on config
  useEffect(() => {
    if (aiConfig.provider === 'nano') {
      if (typeof window !== 'undefined' && (window as any).ai?.textModel) {
        setAiStatusLabel('Gemini Nano Ready - Chrome AI enabled');
      } else {
        setAiStatusLabel('Gemini Nano Unavailable - Will fallback to Cloud');
      }
    } else if (aiConfig.provider === 'gemini_cloud') {
      setAiStatusLabel('Google Gemini Cloud (API) enabled');
    } else if (aiConfig.provider === 'custom_cloud') {
      setAiStatusLabel('Custom Cloud API enabled');
    }
  }, [aiConfig.provider]);

  // Check for updates from GitHub Release
  useEffect(() => {
    async function checkUpdate() {
      try {
        const res = await fetch('https://api.github.com/repos/RyanAoh/TabRack/releases/latest', {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          const tag = data.tag_name;
          if (tag) {
            const latestVersionNumber = tag.replace(/^v/, '');
            
            const currentAppVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
              ? chrome.runtime.getManifest().version 
              : pkg.version;

            // Compare semantic versions
            const v1 = latestVersionNumber.split('.').map(Number);
            const v2 = currentAppVersion.split('.').map(Number);
            let isNewer = false;
            
            for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
              const p1 = v1[i] || 0;
              const p2 = v2[i] || 0;
              if (p1 > p2) {
                isNewer = true;
                break;
              }
              if (p1 < p2) {
                break;
              }
            }

            if (isNewer) {
              setHasUpdate(true);
              setLatestVersion(tag);
            }
          }
        }
      } catch (e) {
        console.error('Failed to check for updates', e);
      }
    }
    checkUpdate();
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
        if (!navigator.locks) return;
        await navigator.locks.request('readLaterSync', async () => {
          const result = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue?: any[] };
          const readLaterQueue = result.readLaterQueue || [];
          if (readLaterQueue.length > 0) {
            for (const item of readLaterQueue) {
              const normUrl = normalizeUrl(item.url);
              
              // Look for existing by exact url OR normalized url just to be safe
              const allExisting = await db.readLater.toArray();
              const existing = allExisting.find(e => normalizeUrl(e.url) === normUrl || e.url === item.url);
              
              if (!existing) {
                if (!item.isUpdateOnly) {
                  await db.readLater.add(item);
                }
              } else if (existing.id !== undefined) {
                await db.readLater.update(existing.id, {
                  scrollPercentage: item.scrollPercentage,
                  // Don't modify addedAt for a simple scroll update so it doesn't jump to the top unless explicitly re-added
                  addedAt: item.isUpdateOnly ? existing.addedAt : item.addedAt
                });
              }
            }
            await chrome.storage.local.set({ readLaterQueue: [] });
          }
        });
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
    setSearchQuery('');
    setActiveTab('active');
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

  const handleDiscard = () => {
    setDiscardDialogOpen(true);
  };

  const confirmDiscard = async () => {
    setDiscardDialogOpen(false);
    setSearchQuery('');
    setActiveTab('active');
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
      <header className="h-[64px] shrink-0 border-b border-border bg-card flex items-center justify-between px-3 md:px-6 gap-2">
        <div className="flex items-center gap-2 md:gap-3 text-primary font-bold text-xl shrink-0">
          <Layers className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
          <span className="hidden sm:inline-block md:hidden lg:inline-block xl:inline-block">{t('title')}</span>
        </div>

        <div className="flex-1 flex justify-center px-1 md:px-4 max-w-2xl min-w-0">
          <div className="w-full max-w-[400px] relative group h-9 md:h-10 bg-muted/50 focus-within:bg-card border border-border/50 focus-within:border-border transition-colors rounded-md flex items-center px-2 md:px-3 gap-1.5 md:gap-2">
            <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
            <input 
              placeholder={t('search_placeholder')} 
              className="flex-1 bg-transparent border-0 focus:outline-none text-xs md:text-sm h-full w-full min-w-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-6 shrink-0">
          <div className="hidden sm:flex items-center gap-4 text-right">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-green-500">{tabs.filter(t => t.active || !t.discarded).length}</span>
              <span className="text-[10px] text-muted-foreground">{t('active_tabs')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-primary">{tabs.filter(t => t.discarded).length}</span>
              <span className="text-[10px] text-muted-foreground">{t('slept_tabs')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:ml-4 sm:border-l sm:border-border sm:pl-4">
            <a 
              href="https://github.com/RyanAoh/TabRack" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isExtension && chrome?.tabs?.create) {
                  e.preventDefault();
                  chrome.tabs.create({ url: "https://github.com/RyanAoh/TabRack" });
                }
              }}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Star on GitHub">
                <Github className="h-4 w-4" />
              </Button>
            </a>
            <div className="hidden xs:block">
              <ModeToggle />
            </div>
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
            setSearchQuery('');
            setActiveTab('active');
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
      {searchQuery ? (
        <div className="flex-1 overflow-hidden px-6 pt-4 flex flex-col">
          <ScrollArea className="flex-1 pr-4 pb-4">
            {filteredTabs.length > 0 && (
              <div className="mb-8">
                <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">{t('all_tabs')}</div>
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                  <AnimatePresence mode="popLayout">
                    {filteredTabs.map((tab) => (
                      <TabItem 
                        key={tab.id} 
                        tab={tab} 
                        onClose={closeTab} 
                        onFocus={focusTab}
                        compact={isSidePanel || viewMode === 'compact'} 
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">{t('read_later')}</div>
              <ReadLaterList searchQuery={searchQuery} hideFilters={true} viewMode={isSidePanel ? 'compact' : viewMode} />
            </div>
          </ScrollArea>
        </div>
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-6 pt-4">
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
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {(() => {
                  if (filteredTabs.length === 0) {
                    return (
                      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-full py-8 text-center text-muted-foreground">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">{t('no_tabs')}</p>
                      </motion.div>
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

                  const newDomains = Object.keys(groups);
                  const currentSorted = newDomains.sort((a, b) => groups[b].length - groups[a].length);
                  
                  let order = groupOrderRef.current;
                  if (groupMode !== lastGroupMode.current || searchQuery !== lastSearchQuery.current || tabs.length > lastTabCount.current || order.length === 0) {
                    order = currentSorted;
                    groupOrderRef.current = currentSorted;
                  } else {
                    const missing = currentSorted.filter(d => !order.includes(d));
                    if (missing.length > 0) {
                      order = [...order, ...missing];
                      groupOrderRef.current = order;
                    }
                  }
                  
                  lastGroupMode.current = groupMode;
                  lastSearchQuery.current = searchQuery;
                  lastTabCount.current = tabs.length;

                  return order
                    .filter(domain => groups[domain])
                    .map((domain) => {
                      const groupTabs = groups[domain];
                      return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={domain} 
                        className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm h-fit"
                      >
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
                          <AnimatePresence mode="popLayout">
                            {groupTabs.map(tab => (
                              <TabItem 
                                key={tab.id} 
                                tab={tab} 
                                onClose={closeTab} 
                                onFocus={focusTab}
                                compact={isSidePanel || viewMode === 'compact'} 
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                      );
                    });
                }

                // Default: Group by Window
                const windows: Record<number, typeof filteredTabs> = {};
                filteredTabs.forEach(tab => {
                  if (!windows[tab.windowId]) windows[tab.windowId] = [];
                  windows[tab.windowId].push(tab);
                });

                return Object.entries(windows).map(([windowId, windowTabs], index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={windowId} 
                    className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm h-fit"
                  >
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
                      <AnimatePresence mode="popLayout">
                        {windowTabs.map(tab => (
                          <TabItem 
                            key={tab.id} 
                            tab={tab} 
                            onClose={closeTab} 
                            onFocus={focusTab}
                            compact={isSidePanel || viewMode === 'compact'} 
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ));
              })()}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="reading" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full pr-4 pb-4">
            <ReadLaterList viewMode={isSidePanel ? 'compact' : viewMode} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
      )}

      {/* Footer Info */}
      <footer className="h-10 shrink-0 bg-card border-t border-border px-6 flex items-center justify-between text-xs text-muted-foreground w-full">
        <div className="flex items-center gap-1.5 text-[#7c3aed] font-medium truncate min-w-0 pr-4">
          <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
          <span className="truncate">{aiStatusLabel}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasUpdate && (
            <a 
              href="https://github.com/RyanAoh/TabRack/releases/latest" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:text-green-500 transition-colors font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('update_to').replace('{version}', latestVersion)}</span>
              <span className="sm:hidden">{t('update')}</span>
            </a>
          )}
          <span className="opacity-70">
            v{typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : pkg.version} | {isExtension ? 'Extension Mode' : 'Dev Preview'}
          </span>
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
              {resolvedLanguage === 'zh' ? `${t('close_selected')} (${selectedDedupeIds.size})` : `Close ${selectedDedupeIds.size} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Memory Release Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="max-w-md pt-6 pb-4">
          <DialogHeader className="mb-4">
            <DialogTitle>{t('memory_release_confirm_title') || 'Release Memory?'}</DialogTitle>
            <DialogDescription>
              {t('memory_release_confirm') || 'Are you sure you want to release memory? This will put all inactive tabs to sleep.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>{t('cancel') || 'Cancel'}</Button>
            <Button onClick={confirmDiscard} variant="default">
              {t('memory_release') || 'Memory Release'}
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
            <div key={`lang-${resolvedLanguage}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('language')}</p>
                <p className="text-xs text-muted-foreground">{t('language_desc')}</p>
              </div>
              <Select value={language} onValueChange={(v: 'system' | 'en' | 'zh') => setLanguage(v)}>
                <SelectTrigger className="w-[180px] [&>span]:line-clamp-none [&>span]:truncate-none">
                  <SelectValue>
                    {language === 'zh' ? '中文' : language === 'en' ? 'English' : t('system_default')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('system_default')}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div key={`theme-${resolvedLanguage}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('theme')}</p>
                <p className="text-xs text-muted-foreground">{t('theme_desc')}</p>
              </div>
              <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                <SelectTrigger className="w-[180px] [&>span]:line-clamp-none [&>span]:truncate-none">
                  <SelectValue>
                    {theme === 'light' ? t('theme_light') : theme === 'dark' ? t('theme_dark') : t('system_default')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('system_default')}</SelectItem>
                  <SelectItem value="light">{t('theme_light')}</SelectItem>
                  <SelectItem value="dark">{t('theme_dark')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div key={`viewMode-${resolvedLanguage}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('view_mode')}</p>
                <p className="text-xs text-muted-foreground">{t('view_mode_desc')}</p>
              </div>
              <Select value={viewMode} onValueChange={(v: 'compact' | 'expanded') => setViewMode(v)}>
                <SelectTrigger className="w-[180px] [&>span]:line-clamp-none [&>span]:truncate-none">
                  <SelectValue>
                    {viewMode === 'compact' ? t('compact') : t('expanded')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expanded">{t('expanded')}</SelectItem>
                  <SelectItem value="compact">{t('compact')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div key={`groupMode-${resolvedLanguage}`} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('group_mode')}</p>
                <p className="text-xs text-muted-foreground">{t('group_mode_desc')}</p>
              </div>
              <Select value={groupMode} onValueChange={(v: 'none' | 'base' | 'full') => setGroupMode(v)}>
                <SelectTrigger className="w-[180px] [&>span]:line-clamp-none [&>span]:truncate-none">
                  <SelectValue>
                    {groupMode === 'base' ? t('by_base_domain') : groupMode === 'full' ? t('by_full_domain') : t('system_default')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('system_default')}</SelectItem>
                  <SelectItem value="base">{t('by_base_domain')}</SelectItem>
                  <SelectItem value="full">{t('by_full_domain')}</SelectItem>
                </SelectContent>
              </Select>
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
                <div key={`provider-${resolvedLanguage}`} className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">{t('provider') || 'Provider'}</p>
                  </div>
                  <Select value={aiConfig.provider} onValueChange={(v: AIProvider) => updateAIConfig({ provider: v })}>
                    <SelectTrigger className="w-full [&>span]:line-clamp-none [&>span]:truncate-none">
                      <SelectValue>
                        {aiConfig.provider === 'nano' ? (t('gemini_nano') || 'Google Gemini Nano (Local Chrome)') : aiConfig.provider === 'custom_cloud' ? (t('custom_cloud') || 'Custom Cloud (OpenAI Compatible)') : (t('gemini_cloud') || 'Google Gemini Cloud (API)')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nano">{t('gemini_nano') || 'Google Gemini Nano (Local Chrome)'}</SelectItem>
                      <SelectItem value="gemini_cloud">{t('gemini_cloud') || 'Google Gemini Cloud (API)'}</SelectItem>
                      <SelectItem value="custom_cloud">{t('custom_cloud') || 'Custom Cloud (OpenAI Compatible)'}</SelectItem>
                    </SelectContent>
                  </Select>
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

            <div className="border-t border-border mt-2 pt-4">
              <h4 className="text-sm font-semibold mb-1">{t('data_backup') || 'Data Backup & Restore'}</h4>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t('data_backup_desc')}</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1 text-sm sm:text-xs h-12 sm:h-9 flex items-center justify-center gap-2 bg-background hover:bg-muted" onClick={handleExportData}>
                  <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  {t('export_data') || 'Export Data'}
                </Button>
                
                <Button variant="outline" className="flex-1 text-sm sm:text-xs h-12 sm:h-9 flex items-center justify-center gap-2 bg-background hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  {t('import_data') || 'Import Data'}
                </Button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleImportData} 
                  className="hidden" 
                />
              </div>
            </div>
          </div>
          <DialogFooter className="m-0 sm:justify-end px-6 py-4 shrink-0 border-t bg-muted/50 mt-auto rounded-b-xl">
            <Button variant="default" onClick={() => setSettingsOpen(false)}>{t('done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlays */}

    </div>
  );
}
