/**
 * TabRack Service Worker
 */
import { db } from './lib/db';
import { normalizeUrl } from '../lib/utils';

// Basic tab state tracking
let tabTree: chrome.tabs.Tab[] = [];

async function updateTabTree() {
  const tabs = await chrome.tabs.query({});
  tabTree = tabs;
  
  // Notify other parts of the extension (Side Panel, New Tab)
  // via storage or message
  chrome.storage.local.set({ tabCount: tabs.length });
}

// Listen for tab events
chrome.tabs.onCreated.addListener(() => updateTabTree());
chrome.tabs.onRemoved.addListener(() => updateTabTree());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateTabTree();
});


// One-click deduplication logic
export async function closeDuplicates() {
  const tabs = await chrome.tabs.query({});
  const seenUrls = new Set<string>();
  const toClose: number[] = [];

  for (const tab of tabs) {
    if (tab.url && tab.id) {
      if (seenUrls.has(tab.url)) {
        toClose.push(tab.id);
      } else {
        seenUrls.add(tab.url);
      }
    }
  }

  if (toClose.length > 0) {
    await chrome.tabs.remove(toClose);
    return toClose.length;
  }
  return 0;
}

// Tab Discarding (Memory release)
export async function discardInactiveTabs(minutes: number = 30) {
  const tabs = await chrome.tabs.query({ active: false, discarded: false });
  for (const tab of tabs) {
    if (tab.id) {
      await chrome.tabs.discard(tab.id);
    }
  }
}

// Read Later Atomic Operation
async function saveToReadLater(tabId: number, category: string = 'uncategorized') {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const normUrl = normalizeUrl(tab.url);
  const allExisting = await db.readLater.toArray();
  const existing = allExisting.find(e => normalizeUrl(e.url) === normUrl || e.url === tab.url);
  
  if (existing) {
    const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
    const msg = isZh ? `该页面已在稍后阅读列表中，分类并进度已更新` : `This page is already saved to your Read Later list, category and progress updated.`;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icon128.png', 
      title: 'TabRack',
      message: msg
    });
  }

  let scrollPercentage = 0;
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_SCROLL' });
    scrollPercentage = response?.scrollPercentage || 0;
  } catch (e) {
    console.warn('Could not get scroll position:', e);
  }

  // Note: background script can't directly use Dexie easily if it's a module in MV3
  // without proper setup, but we'll assume the storage.local sync or a message to sidepanel
  // For simplicity in this demo, we'll use chrome.storage.local as a bridge
  const newItem = {
    url: tab.url,
    title: tab.title,
    faviconUrl: tab.favIconUrl,
    scrollPercentage,
    tags: [category],
    addedAt: Date.now()
  };

  if (navigator.locks) {
    await navigator.locks.request('readLaterSync', async () => {
      const { readLaterQueue = [] } = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue: any[] };
      const existingIndex = readLaterQueue.findIndex(item => item.url === tab.url);
      if (existingIndex >= 0) {
        readLaterQueue[existingIndex] = newItem;
      } else {
        readLaterQueue.push(newItem);
      }
      await chrome.storage.local.set({ readLaterQueue });
    });
  } else {
    const { readLaterQueue = [] } = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue: any[] };
    const existingIndex = readLaterQueue.findIndex(item => item.url === tab.url);
    if (existingIndex >= 0) {
      readLaterQueue[existingIndex] = newItem;
    } else {
      readLaterQueue.push(newItem);
    }
    await chrome.storage.local.set({ readLaterQueue });
  }

  await chrome.tabs.remove(tabId);
}

// Action Click: Save current tab to Read Later and close it
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await saveToReadLater(tab.id);
  }
});

// Listen for messages from UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DEDUP') {
    closeDuplicates().then(count => sendResponse({ count }));
    return true;
  }
  if (message.action === 'SAVE_READ_LATER') {
    saveToReadLater(message.tabId, message.category || 'uncategorized').then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'UPDATE_SCROLL_IF_SAVED') {
    const { url, scrollPercentage } = message;
    if (url) {
      if (navigator.locks) {
        navigator.locks.request('readLaterSync', async () => {
          const { readLaterQueue = [] } = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue: any[] };
          // For update-only, maybe we can push a partial record? 
          // Wait, the syncQueue uses existing url match. So we can just push it with a flag 'isUpdateOnly'
          readLaterQueue.push({
            url,
            scrollPercentage,
            isUpdateOnly: true, // we need to handle this in MainManager
            addedAt: Date.now()
          });
          await chrome.storage.local.set({ readLaterQueue });
        });
      }
    }
    return true;
  }
});

// Configure Context Menus
const DEFAULT_CATEGORIES = ['tech', 'read', 'tool', 'work', 'social', 'uncategorized'];

async function setupContextMenus() {
  chrome.contextMenus.removeAll();
  
  const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');

  chrome.contextMenus.create({
    id: 'save-to-category',
    title: isZh ? '保存并选择分类...' : 'Save to Category...',
    contexts: ['action']
  });

  const { customCategories } = await chrome.storage.local.get('customCategories');
  const categories = Array.isArray(customCategories) ? customCategories : DEFAULT_CATEGORIES;

  const getCategoryTitle = (cat: string) => {
    if (!isZh) return cat;
    const map: Record<string, string> = {
      'tech': '技术与开发',
      'read': '阅读与资讯',
      'tool': '工具与实用程序',
      'work': '工作与文档',
      'social': '社交与媒体',
      'uncategorized': '未分类'
    };
    return map[cat] || cat;
  };

  for (const cat of categories) {
    chrome.contextMenus.create({
      id: `save-cat-${cat}`,
      parentId: 'save-to-category',
      title: getCategoryTitle(cat),
      contexts: ['action']
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.customCategories) {
    setupContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('save-cat-')) {
    const category = info.menuItemId.replace('save-cat-', '');
    if (tab && tab.id) {
      saveToReadLater(tab.id, category);
    }
  }
});

// Initialize
updateTabTree();
setupContextMenus();
console.log('TabRack Background Service Worker Initialized');
