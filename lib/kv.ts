import { Redis } from "@upstash/redis";

// KV storage abstraction that can work with different backends
export class KV {
  private redis: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      this.redis = new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      console.warn("Redis not configured, KV operations will fail");
      return null;
    }
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      console.error("KV get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.redis) {
      console.warn("Redis not configured, KV operations will fail");
      return;
    }
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error("KV set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) {
      console.warn("Redis not configured, KV operations will fail");
      return;
    }
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("KV del error:", error);
    }
  }

  async scan(pattern: string, count: number = 100): Promise<string[]> {
    if (!this.redis) {
      console.warn("Redis not configured, KV operations will fail");
      return [];
    }
    try {
      const keys: string[] = [];
      let cursor = "0";
      let iterationCount = 0;
      const maxIterations = 1000; // Safety limit to prevent infinite loops
      
      console.log(`Starting Redis scan with pattern: "${pattern}", count: ${count}`);
      
      do {
        iterationCount++;
        if (iterationCount > maxIterations) {
          console.warn(`Scan stopped after ${maxIterations} iterations to prevent infinite loop`);
          break;
        }
        
        const [nextCursor, batchKeys] = await this.redis.scan(cursor, { 
          match: pattern, 
          count 
        });
        
        cursor = nextCursor;
        keys.push(...batchKeys);
        
        console.log(`Scan iteration ${iterationCount}: cursor=${cursor}, found ${batchKeys.length} keys, total so far: ${keys.length}`);
        
        // Small delay to avoid overwhelming Redis
        if (iterationCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
      } while (cursor !== "0");
      
      console.log(`Scan completed: found ${keys.length} total keys in ${iterationCount} iterations`);
      return keys;
    } catch (error) {
      console.error("KV scan error:", error);
      return [];
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis) {
      console.warn("Redis not configured, KV operations will fail");
      return keys.map(() => null);
    }
    try {
      return await this.redis.mget<T[]>(...keys);
    } catch (error) {
      console.error("KV mget error:", error);
      return keys.map(() => null);
    }
  }

  isConnected(): boolean {
    return this.redis !== null;
  }
}

// Singleton instance
let kvInstance: KV | null = null;

export function getKV(): KV {
  if (!kvInstance) {
    kvInstance = new KV();
  }
  return kvInstance;
}
