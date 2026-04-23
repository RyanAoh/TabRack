import { useState, useEffect } from 'react';

const DEFAULT_CATEGORIES = ['tech', 'read', 'tool', 'work', 'social', 'uncategorized'];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    // Initial Load
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['customCategories'], (result) => {
        if (result.customCategories && Array.isArray(result.customCategories)) {
          setCategories(result.customCategories);
        }
      });
    } else {
      const local = localStorage.getItem('tabrack-categories');
      if (local) {
        try {
          setCategories(JSON.parse(local));
        } catch (e) {
          // ignore
        }
      }
    }

    // Listeners
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.customCategories) {
        setCategories(changes.customCategories.newValue || DEFAULT_CATEGORIES);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setCategories(customEvent.detail);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('tabrack-categories-updated', handleCustomEvent);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('tabrack-categories-updated', handleCustomEvent);
      }
    };
  }, []);

  const updateCategories = (newCategories: string[]) => {
    // Ensure 'uncategorized' is always at the end or present
    if (!newCategories.includes('uncategorized')) {
      newCategories.push('uncategorized');
    }

    setCategories(newCategories);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ customCategories: newCategories });
    }
    // Also use localStorage and CustomEvent for dev environments or fallback
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tabrack-categories', JSON.stringify(newCategories));
      window.dispatchEvent(new CustomEvent('tabrack-categories-updated', { detail: newCategories }));
    }
  };

  return { categories, updateCategories };
}
