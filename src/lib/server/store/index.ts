// Data Store — implements IDataStore interface
import { kv } from "@vercel/kv";
import { IDataStore, AnalysisSession } from "../types";

export class InMemoryStore implements IDataStore {
  private sessions: Map<string, AnalysisSession> = new Map();
  private maxSessions = 50; // LRU eviction threshold

  async saveSession(session: AnalysisSession): Promise<void> {
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

export class KVStore implements IDataStore {
  // 24 hour TTL for sessions
  private TTL_SECONDS = 60 * 60 * 24;

  private serialize(session: AnalysisSession): any {
    return {
      ...session,
      // Omit 'files' to prevent exceeding Vercel KV's 1MB payload limit for large repositories.
      // The API route will fetch files directly from GitHub when needed.
      files: [], 
      parsedFiles: Array.from(session.parsedFiles.entries()),
      createdAt: session.createdAt.toISOString()
    };
  }

  private deserialize(data: any): AnalysisSession {
    return {
      ...data,
      files: new Map(), // Initialize empty map, will lazy load from GitHub
      parsedFiles: new Map(data.parsedFiles),
      createdAt: new Date(data.createdAt)
    };
  }

  async saveSession(session: AnalysisSession): Promise<void> {
    const serialized = this.serialize(session);
    try {
      await kv.set(`session:${session.id}`, serialized, { ex: this.TTL_SECONDS });
    } catch (error) {
      console.error(`KV Set Error for session ${session.id}:`, error);
      throw error;
    }
  }

  async getSession(id: string): Promise<AnalysisSession | null> {
    const data = await kv.get<any>(`session:${id}`);
    if (!data) return null;
    return this.deserialize(data);
  }

  async deleteSession(id: string): Promise<void> {
    await kv.del(`session:${id}`);
  }

  async listSessions(): Promise<{ id: string; repoUrl: string; createdAt: Date }[]> {
    const keys = await kv.keys("session:*");
    if (!keys || keys.length === 0) return [];
    
    const sessions = [];
    for (const key of keys) {
      const data = await kv.get<any>(key);
      if (data) {
        sessions.push({
          id: data.id,
          repoUrl: data.repoUrl,
          createdAt: new Date(data.createdAt)
        });
      }
    }
    return sessions;
  }
}

// Persist singleton across Next.js hot reloads using globalThis
const globalForStore = globalThis as unknown as { __dataStore?: IDataStore };

if (!globalForStore.__dataStore) {
  // Use Vercel KV if configured, otherwise fallback to InMemoryStore
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    globalForStore.__dataStore = new KVStore();
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("⚠️ CRITICAL WARNING: Vercel KV environment variables are missing! Using InMemoryStore in production. Serverless routes WILL lose session data!");
    }
    globalForStore.__dataStore = new InMemoryStore();
  }
}

export const dataStore: IDataStore = globalForStore.__dataStore;
