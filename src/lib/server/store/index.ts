// Data Store — implements IDataStore interface
// Supports both Vercel KV env vars (KV_REST_API_*) and Upstash direct env vars (UPSTASH_REDIS_REST_*)
import { Redis } from "@upstash/redis";
import { IDataStore, AnalysisSession } from "../types";

// ─── Resolve Redis credentials from either env var naming convention ─────────
function getRedisCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };
  return null;
}

// ─── InMemoryStore (development fallback) ────────────────────────────────────

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

// ─── RedisStore (production — Upstash Redis) ─────────────────────────────────

export class RedisStore implements IDataStore {
  private redis: Redis;
  private TTL_SECONDS = 60 * 60 * 24; // 24 hours
  // Upstash free tier has a 1MB max request size; leave headroom
  private MAX_PAYLOAD_BYTES = 900_000;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  private serialize(session: AnalysisSession): any {
    // Convert Maps to serializable arrays and strip heavy data
    const parsedFilesArr = Array.from(session.parsedFiles.entries());

    const base: any = {
      ...session,
      // Omit raw file contents — they can be re-fetched from GitHub on demand
      files: [],
      parsedFiles: parsedFilesArr,
      createdAt: session.createdAt.toISOString(),
    };

    // Check payload size and truncate if necessary
    const json = JSON.stringify(base);
    if (json.length <= this.MAX_PAYLOAD_BYTES) {
      return base;
    }

    console.warn(
      `⚠️ Session ${session.id} payload is ${(json.length / 1024).toFixed(0)}KB — exceeds safe limit. Trimming graph & parsedFiles.`
    );

    // Trim: keep only critical graph data, limit parsedFiles
    return {
      ...base,
      graph: {
        nodes: session.graph.nodes.slice(0, 200),
        edges: session.graph.edges.slice(0, 500),
      },
      parsedFiles: parsedFilesArr.slice(0, 100),
    };
  }

  private deserialize(data: any): AnalysisSession {
    return {
      ...data,
      files: new Map(), // Will lazy-load from GitHub
      parsedFiles: new Map(data.parsedFiles || []),
      createdAt: new Date(data.createdAt),
    };
  }

  async saveSession(session: AnalysisSession): Promise<void> {
    const serialized = this.serialize(session);
    try {
      await this.redis.set(`session:${session.id}`, serialized, { ex: this.TTL_SECONDS });
      console.log(`✅ Redis: Saved session ${session.id}`);
    } catch (error: any) {
      console.error(`❌ Redis SET error for session ${session.id}:`, error?.message || error);
      throw error;
    }
  }

  async getSession(id: string): Promise<AnalysisSession | null> {
    try {
      const data = await this.redis.get<any>(`session:${id}`);
      if (!data) {
        console.log(`ℹ️ Redis: No session found for id ${id}`);
        return null;
      }
      console.log(`✅ Redis: Retrieved session ${id}`);
      return this.deserialize(data);
    } catch (error: any) {
      console.error(`❌ Redis GET error for session ${id}:`, error?.message || error);
      return null;
    }
  }

  async deleteSession(id: string): Promise<void> {
    await this.redis.del(`session:${id}`);
  }

  async listSessions(): Promise<{ id: string; repoUrl: string; createdAt: Date }[]> {
    try {
      const keys = await this.redis.keys("session:*");
      if (!keys || keys.length === 0) return [];

      const sessions = [];
      for (const key of keys) {
        const data = await this.redis.get<any>(key);
        if (data) {
          sessions.push({
            id: data.id,
            repoUrl: data.repoUrl,
            createdAt: new Date(data.createdAt),
          });
        }
      }
      return sessions;
    } catch (error: any) {
      console.error("❌ Redis KEYS error:", error?.message || error);
      return [];
    }
  }
}

// ─── Singleton initialization ────────────────────────────────────────────────

const globalForStore = globalThis as unknown as { __dataStore?: IDataStore };

if (!globalForStore.__dataStore) {
  const creds = getRedisCredentials();

  if (creds) {
    console.log("🔗 DataStore: Using RedisStore (Upstash Redis)");
    globalForStore.__dataStore = new RedisStore(creds.url, creds.token);
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️ CRITICAL: No Redis credentials found! Looked for KV_REST_API_URL/TOKEN and UPSTASH_REDIS_REST_URL/TOKEN. " +
        "Falling back to InMemoryStore — sessions WILL be lost between serverless invocations!"
      );
    }
    console.log("🔗 DataStore: Using InMemoryStore (development mode)");
    globalForStore.__dataStore = new InMemoryStore();
  }
}

export const dataStore: IDataStore = globalForStore.__dataStore;
