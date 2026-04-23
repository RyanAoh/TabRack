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
async function saveToReadLater(tabId: number) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const normUrl = normalizeUrl(tab.url);
  const allExisting = await db.readLater.toArray();
  const existing = allExisting.find(e => normalizeUrl(e.url) === normUrl || e.url === tab.url);
  
  if (existing) {
    const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
    const msg = isZh ? '已在稍后阅读中' : 'Already in read later';
    chrome.scripting.executeScript({
      target: { tabId },
      func: (message) => {
        alert(message);
      },
      args: [msg]
    }).catch(e => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon128.png', 
          title: 'TabRack',
          message: msg
        });
    });
    return;
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
    addedAt: Date.now()
  };

  const { readLaterQueue = [] } = await chrome.storage.local.get('readLaterQueue') as { readLaterQueue: any[] };
  
  // Deduplicate in queue before pushing to DB sync
  const existingIndex = readLaterQueue.findIndex(item => item.url === tab.url);
  if (existingIndex >= 0) {
    readLaterQueue[existingIndex] = newItem;
  } else {
    readLaterQueue.push(newItem);
  }

  await chrome.storage.local.set({ readLaterQueue });

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
    saveToReadLater(message.tabId).then(() => sendResponse({ success: true }));
    return true;
  }
});

// Initialize
updateTabTree();
console.log('TabRack Background Service Worker Initialized');
