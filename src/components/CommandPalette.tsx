import React, { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useTabs } from '@/src/hooks/useTabs';
import { useLanguage } from '@/src/components/LanguageProvider';
import { Search, Trash2, Zap, Save, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface CommandPaletteProps {
  onDedupeRequest?: () => void;
}

export function CommandPalette({ onDedupeRequest }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { tabs, closeTab, focusTab, isExtension } = useTabs();
  const { t } = useLanguage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey || e.altKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleAction = async (action: string) => {
    setOpen(false);
    if (action === 'close-dupes') {
      if (onDedupeRequest) {
        onDedupeRequest();
      } else {
        toast.info(t('dedupe_requested'));
      }
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('search_placeholder')} />
      <CommandList>
        <CommandEmpty>{t('no_tabs')}</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleAction('close-dupes')}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>/close-dupes ({t('dedupe')})</span>
          </CommandItem>
          <CommandItem onSelect={() => toast.info(t('saving_session'))}>
            <Save className="mr-2 h-4 w-4" />
            <span>/save-session</span>
          </CommandItem>
          <CommandItem onSelect={() => toast.info(t('discarding_tabs'))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>/discard-memory ({t('memory_release')})</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tabs">
          {tabs.map((tab) => (
            <CommandItem
              key={tab.id}
              onSelect={() => {
                focusTab(tab.id, tab.windowId);
                setOpen(false);
              }}
            >
              <img src={tab.favIconUrl || 'https://www.google.com/favicon.ico'} className="mr-2 h-4 w-4" referrerPolicy="no-referrer" />
              <span className="truncate">{tab.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
