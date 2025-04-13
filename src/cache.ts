import { createHash } from "crypto";

interface CacheValue {
    isFinished: boolean;
    content: string;
}

/** Manage the cache of translated content */
export class TranslationCache {
    private _cacheData: Map<string, CacheValue>;
    private _cacheSize: number;
    private _maxCacheSize: number;

    constructor(maxCacheSize: number = 256 * 1024 * 1024) {
        this._cacheData = new Map();
        this._cacheSize = 0;
        this._maxCacheSize = maxCacheSize;
    }

    get(key: string): CacheValue | undefined {
        return this._cacheData.get(key);
    }

    set(key: string, value: CacheValue) {
        this._cacheData.set(key, value);
        this._cacheSize += Buffer.byteLength(value.content);
        this.manageCache();
    }

    delete(key: string) {
        this._cacheSize -= Buffer.byteLength(
            this._cacheData.get(key)?.content || ""
        );
        this._cacheData.delete(key);
    }

    clear() {
        this._cacheData.clear();
        this._cacheSize = 0;
    }

    /** Clean up older records when cache is too large */
    private manageCache() {
        if (this._cacheSize > this._maxCacheSize) {
            const keys = Array.from(this._cacheData.keys());
            while (this._cacheSize > this._maxCacheSize && keys.length > 0) {
                const oldestKey = keys.shift();
                if (oldestKey) this.delete(oldestKey);
            }
        }
    }

    calcHashKey(text: string): string {
        return createHash("sha256").update(text).digest("hex");
    }
}
