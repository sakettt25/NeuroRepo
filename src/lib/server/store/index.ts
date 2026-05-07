// In-Memory Data Store — implements IDataStore interface
// Uses globalThis to persist across Next.js hot reloads in dev mode

import { IDataStore, AnalysisSession } from "../types";

export class InMemoryStore implements IDataStore {
  private sessions: Map<string, AnalysisSession> = new Map();
  private maxSessions = 50; // LRU eviction threshold

  async saveSession(session: AnalysisSession): Promise<void> {
    // Evict oldest if at capacity
    if (this.sessions.size >= this.maxSessions && !this.sessions.has(session.id)) {
      const oldest = [...this.sessions.entries()]
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0];
      if (oldest) {
        this.sessions.delete(oldest[0]);
      }
    }
    this.sessions.set(session.id, session);
  }

  async getSession(id: string): Promise<AnalysisSession | null> {
    return this.sessions.get(id) || null;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async listSessions(): Promise<{ id: string; repoUrl: string; createdAt: Date }[]> {
    return [...this.sessions.values()].map((s) => ({
      id: s.id,
      repoUrl: s.repoUrl,
      createdAt: s.createdAt,
    }));
  }
}

// Persist singleton across Next.js hot reloads using globalThis
const globalForStore = globalThis as unknown as { __dataStore?: InMemoryStore };

if (!globalForStore.__dataStore) {
  globalForStore.__dataStore = new InMemoryStore();
}

export const dataStore: InMemoryStore = globalForStore.__dataStore;
