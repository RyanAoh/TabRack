import Dexie, { Table } from 'dexie';

export interface ReadLaterItem {
  id?: number;
  url: string;
  title: string;
  faviconUrl?: string;
  scrollPercentage: number;
  addedAt: number;
  tags?: string[];
  summary?: string;
  content?: string;
}

export interface TabSnapshot {
  id?: number;
  timestamp: number;
  tabs: {
    url: string;
    title: string;
    favIconUrl?: string;
  }[];
}

export interface UrlSummary {
  url: string;
  summary: string;
  updatedAt: number;
}

export class TabRackDB extends Dexie {
  readLater!: Table<ReadLaterItem>;
  snapshots!: Table<TabSnapshot>;
  urlSummaries!: Table<UrlSummary>;

  constructor() {
    super('TabRackDB');
    this.version(1).stores({
      readLater: '++id, url, title, addedAt, *tags',
      snapshots: '++id, timestamp'
    });
    this.version(2).stores({
      urlSummaries: 'url, updatedAt'
    });
  }
}

export const db = new TabRackDB();

export async function gcUrlSummaries(activeUrls: Set<string>) {
  try {
    const urlSummaries = await db.urlSummaries.toArray();
    const readLaterItems = await db.readLater.toArray();
    const readLaterUrls = new Set(readLaterItems.map(item => item.url));

    for (const summary of urlSummaries) {
      if (!activeUrls.has(summary.url) && !readLaterUrls.has(summary.url)) {
        await db.urlSummaries.delete(summary.url);
      }
    }
  } catch (e) {
    console.error('Failed to run GC on URL summaries', e);
  }
}
