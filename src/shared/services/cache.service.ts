import * as LRU from 'lru-cache';
class CacheService {
    private lruCache: LRU;
    constructor(ttlSeconds: number = 1000) {
        this.lruCache = new LRU({
            max: 1000,
            /* length: function (n, key) {
                return n * 2 + key.length;
            }, */
            maxAge: ttlSeconds * 60
        });
    }

    getKey(body): string {
        return JSON.stringify(body);
    }

    getValue(body) {
        const value = this.lruCache.get(this.getKey(body));
        if (value) {
            return Promise.resolve(value);
        }
    }

    setValue(body, value, maxAge?: number) {
        if (maxAge) {
            this.lruCache.set(this.getKey(body), value, maxAge);
            return;
        }
        this.lruCache.set(this.getKey(body), value);
    }

    deleteKeys(keys) {
        this.lruCache.deleteKeys(keys);
    }

    delStartWith(startStr: string = '') {
        if (!startStr) {
            return;
        }
        const keys = this.lruCache.keys();
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.deleteKeys(key);
            }
        }
    }

    flush() {
        this.lruCache.flushAll();
    }

}

export default CacheService;