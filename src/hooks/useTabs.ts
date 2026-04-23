import { useState, useEffect } from 'react';
import { gcUrlSummaries } from '@/src/lib/db';

export interface TabData {
  id: number;
  url: string;
  title: string;
  favIconUrl: string;
  windowId: number;
  active: boolean;
  discarded: boolean;
}

export function useTabs() {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    const checkExtension = typeof chrome !== 'undefined' && !!chrome.tabs;
    setIsExtension(checkExtension);

    if (checkExtension) {
      const fetchTabs = async () => {
        const chromeTabs = await chrome.tabs.query({});
        const mappedTabs = chromeTabs.map(t => ({
          id: t.id || 0,
          url: t.url || '',
          title: t.title || 'Unknown',
          favIconUrl: t.favIconUrl || '',
          windowId: t.windowId,
          active: t.active,
          discarded: t.discarded || false
        }));
        setTabs(mappedTabs);
        return mappedTabs;
      };

      fetchTabs();

      const generalHandler = () => fetchTabs();
      
      const removalHandler = async () => {
        const activeTabs = await fetchTabs();
        const activeUrls = new Set(activeTabs.map(t => t.url).filter(Boolean));
        // Call Garbage Collection after a tab is closed to remove invalid summaries
        gcUrlSummaries(activeUrls);
      };

      chrome.tabs.onCreated.addListener(generalHandler);
      chrome.tabs.onUpdated.addListener(generalHandler);
      chrome.tabs.onRemoved.addListener(removalHandler);

      return () => {
        chrome.tabs.onCreated.removeListener(generalHandler);
        chrome.tabs.onUpdated.removeListener(generalHandler);
        chrome.tabs.onRemoved.removeListener(removalHandler);
      };
    } else {
      // Mock data for dev environment
      setTabs([
        { id: 1, url: 'https://google.com', title: 'Google', favIconUrl: 'https://www.google.com/favicon.ico', windowId: 1, active: true, discarded: false },
        { id: 101, url: 'https://google.com/search?q=tab+manager', title: 'Google Search - tab manager', favIconUrl: 'https://www.google.com/favicon.ico', windowId: 1, active: false, discarded: false },
        { id: 102, url: 'https://google.com', title: 'Google', favIconUrl: 'https://www.google.com/favicon.ico', windowId: 2, active: false, discarded: true },
        
        { id: 2, url: 'https://github.com', title: 'GitHub', favIconUrl: 'https://github.com/favicon.ico', windowId: 1, active: false, discarded: false },
        { id: 201, url: 'https://github.com/facebook/react', title: 'facebook/react', favIconUrl: 'https://github.com/favicon.ico', windowId: 1, active: false, discarded: false },
        { id: 202, url: 'https://github.com', title: 'GitHub - Let\'s build from here', favIconUrl: 'https://github.com/favicon.ico', windowId: 3, active: true, discarded: false },
        
        { id: 3, url: 'https://react.dev', title: 'React', favIconUrl: 'https://react.dev/favicon.ico', windowId: 1, active: false, discarded: true },
        { id: 301, url: 'https://react.dev/reference/react', title: 'React Reference', favIconUrl: 'https://react.dev/favicon.ico', windowId: 2, active: false, discarded: false },
        
        { id: 4, url: 'https://tailwindcss.com', title: 'Tailwind CSS', favIconUrl: 'https://tailwindcss.com/favicon.ico', windowId: 2, active: true, discarded: false },
        { id: 5, url: 'https://twitter.com', title: 'X (formerly Twitter)', favIconUrl: 'https://abs.twimg.com/favicons/twitter.3.ico', windowId: 3, active: false, discarded: false },
      ]);
    }
  }, []);

  const closeTab = (id: number) => {
    if (isExtension) {
      chrome.tabs.remove(id);
    } else {
      setTabs(prev => prev.filter(t => t.id !== id));
    }
  };

  const focusTab = (id: number, windowId: number) => {
    if (isExtension) {
      chrome.windows.update(windowId, { focused: true });
      chrome.tabs.update(id, { active: true });
    } else {
      setTabs(prev => prev.map(t => ({ ...t, active: t.id === id })));
    }
  };

  return { tabs, closeTab, focusTab, isExtension };
}
