import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr);
    if ((u.protocol === 'chrome:' || u.protocol === 'edge:') && u.host === 'newtab') return urlStr;
    
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    paramsToRemove.forEach(p => u.searchParams.delete(p));
    
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    
    return u.origin + path + u.search + u.hash;
  } catch (e) {
    return urlStr;
  }
}
