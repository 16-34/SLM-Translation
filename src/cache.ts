import { createHash } from "crypto";

interface CacheValue {
    isFinished: boolean;
    content: string;
}

/** Manage the cache of translated content */
export class Cache {
    private cacheData: Map<string, CacheValue>;
    private cacheSize: number;
    private maxCacheSize: number;

    constructor(maxCacheSize: number = 256 * 1024 * 1024) {
        this.cacheData = new Map();
        this.cacheSize = 0;
        this.maxCacheSize = maxCacheSize;
    }
    
    get(key: string): CacheValue | undefined {
        return this.cacheData.get(key);
    }

    set(key: string, value: CacheValue) {
        console.log("set", key, value);
        this.cacheData.set(key, value);
        this.cacheSize += Buffer.byteLength(value.content);
        this.manageCache();
    }

    delete(key: string) {
        console.log("delete", key);
        this.cacheSize -= Buffer.byteLength(
            this.cacheData.get(key)?.content || ""
        );
        this.cacheData.delete(key);
    }

    /** Clean up older records when cache is too large */ 
    private manageCache() {
        if (this.cacheSize > this.maxCacheSize) {
            const keys = Array.from(this.cacheData.keys());
            while (this.cacheSize > this.maxCacheSize && keys.length > 0) {
                const oldestKey = keys.shift();
                if (oldestKey) this.delete(oldestKey);
            }
        }
    }

    calcHashKey(text: string): string {
        return createHash("sha256").update(text).digest("hex");
    }
}
