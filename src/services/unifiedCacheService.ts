/**
 * Unified Cache Service
 * 
 * This service provides consistent caching behavior across all devices and platforms.
 * No iOS-specific workarounds or Android-specific logic - everything works the same way.
 */

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  persistent?: boolean; // Whether to persist across sessions
  namespace?: string; // Cache namespace
}

export interface CacheStats {
  totalItems: number;
  totalSize: number; // Approximate size in bytes
  hitRate: number;
  missRate: number;
  oldestItem: number;
  newestItem: number;
}

export class UnifiedCacheService {
  private static instance: UnifiedCacheService;
  private memoryCache = new Map<string, CacheItem>();
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Default TTL values (same for all devices)
  private readonly DEFAULT_TTL = {
    SHORT: 2 * 60 * 1000,      // 2 minutes
    MEDIUM: 5 * 60 * 1000,     // 5 minutes  
    LONG: 30 * 60 * 1000,      // 30 minutes
    PERSISTENT: 24 * 60 * 60 * 1000  // 24 hours
  };

  // Storage prefixes for different cache types
  private readonly STORAGE_PREFIX = {
    PERSISTENT: 'unified_cache_persistent_',
    SESSION: 'unified_cache_session_',
    TEMP: 'unified_cache_temp_'
  };

  public static getInstance(): UnifiedCacheService {
    if (!UnifiedCacheService.instance) {
      UnifiedCacheService.instance = new UnifiedCacheService();
    }
    return UnifiedCacheService.instance;
  }

  constructor() {
    // Initialize cache cleanup on startup
    this.initializeCache();
    this.setupPeriodicCleanup();
  }

  /**
   * Set cache item
   * Consistent behavior across all devices
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = this.DEFAULT_TTL.MEDIUM,
      persistent = false,
      namespace = 'default'
    } = options;

    const fullKey = this.buildKey(namespace, key);
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiry: now + ttl,
      key: fullKey
    };

    // Store in memory cache
    this.memoryCache.set(fullKey, cacheItem);

    // Store persistently if requested (same way for all devices)
    if (persistent) {
      this.setPersistentCache(fullKey, cacheItem);
    } else {
      this.setSessionCache(fullKey, cacheItem);
    }

    console.log(`💾 Cache set: ${fullKey} (TTL: ${ttl}ms, Persistent: ${persistent})`);
  }

  /**
   * Get cache item
   * Same behavior for all devices
   */
  get<T>(key: string, namespace: string = 'default'): T | null {
    const fullKey = this.buildKey(namespace, key);
    const now = Date.now();

    // Check memory cache first
    let cacheItem = this.memoryCache.get(fullKey);

    // If not in memory, try storage
    if (!cacheItem) {
      cacheItem = this.getFromStorage(fullKey);
      
      // Add back to memory cache if found and valid
      if (cacheItem && cacheItem.expiry > now) {
        this.memoryCache.set(fullKey, cacheItem);
      }
    }

    // Check if item exists and is not expired
    if (cacheItem && cacheItem.expiry > now) {
      this.cacheHits++;
      console.log(`✅ Cache hit: ${fullKey}`);
      return cacheItem.data as T;
    }

    // Item is expired or doesn't exist
    if (cacheItem) {
      console.log(`⏰ Cache expired: ${fullKey}`);
      this.delete(key, namespace);
    } else {
      console.log(`❌ Cache miss: ${fullKey}`);
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Check if cache item exists and is valid
   */
  has(key: string, namespace: string = 'default'): boolean {
    const fullKey = this.buildKey(namespace, key);
    const now = Date.now();

    const cacheItem = this.memoryCache.get(fullKey) || this.getFromStorage(fullKey);
    return cacheItem ? cacheItem.expiry > now : false;
  }

  /**
   * Delete cache item
   * Same behavior for all devices
   */
  delete(key: string, namespace: string = 'default'): void {
    const fullKey = this.buildKey(namespace, key);

    // Remove from memory
    this.memoryCache.delete(fullKey);

    // Remove from storage
    this.removeFromStorage(fullKey);

    console.log(`🗑️ Cache deleted: ${fullKey}`);
  }

  /**
   * Clear all cache items in a namespace
   */
  clearNamespace(namespace: string = 'default'): void {
    const prefix = this.buildKey(namespace, '');

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from storage
    this.clearStorageByPrefix(prefix);

    console.log(`🧹 Cache namespace cleared: ${namespace}`);
  }

  /**
   * Clear all cache data
   * Emergency function - same for all devices
   */
  clearAll(): void {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear all storage
    this.clearAllStorage();

    // Reset stats
    this.cacheHits = 0;
    this.cacheMisses = 0;

    console.log('🧹 All cache data cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const items = Array.from(this.memoryCache.values());
    const now = Date.now();
    const validItems = items.filter(item => item.expiry > now);

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.cacheMisses / totalRequests) * 100 : 0;

    const timestamps = validItems.map(item => item.timestamp);
    const oldestItem = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestItem = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    // Estimate total size
    const totalSize = validItems.reduce((size, item) => {
      return size + JSON.stringify(item).length;
    }, 0);

    return {
      totalItems: validItems.length,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      oldestItem,
      newestItem
    };
  }

  /**
   * Preload commonly used data
   * Same behavior for all devices
   */
  async preloadData(dataMap: Record<string, () => Promise<any>>, options: CacheOptions = {}): Promise<void> {
    console.log('🚀 Preloading cache data...');

    const promises = Object.entries(dataMap).map(async ([key, dataLoader]) => {
      try {
        // Only load if not already cached
        if (!this.has(key, options.namespace)) {
          const data = await dataLoader();
          this.set(key, data, options);
        }
      } catch (error) {
        console.error(`❌ Failed to preload ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('✅ Cache preloading completed');
  }

  /**
   * Cache decorator for functions
   * Same caching logic for all devices
   */
  cached<T extends (...args: any[]) => any>(
    fn: T,
    options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
  ): T {
    const {
      keyGenerator = (...args) => JSON.stringify(args),
      ...cacheOptions
    } = options;

    return ((...args: Parameters<T>) => {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache first
      const cached = this.get(cacheKey, cacheOptions.namespace);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.then(value => {
          this.set(cacheKey, value, cacheOptions);
          return value;
        });
      } else {
        this.set(cacheKey, result, cacheOptions);
        return result;
      }
    }) as T;
  }

  /**
   * Initialize cache system
   */
  private initializeCache(): void {
    console.log('🔧 Initializing unified cache service');

    // Restore persistent cache items to memory
    this.restorePersistentCache();

    // Clean up expired items
    this.cleanupExpired();

    console.log('✅ Cache service initialized');
  }

  /**
   * Setup periodic cleanup
   * Same interval for all devices
   */
  private setupPeriodicCleanup(): void {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);

    // Log cache stats every 10 minutes in development
    if (import.meta.env.DEV) {
      setInterval(() => {
        const stats = this.getStats();
        console.log('📊 Cache Stats:', stats);
      }, 10 * 60 * 1000);
    }
  }

  /**
   * Clean up expired cache items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean storage cache
    this.cleanupExpiredStorage();

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache items`);
    }
  }

  /**
   * Build full cache key
   */
  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Set persistent cache item
   * Uses localStorage consistently across all devices
   */
  private setPersistentCache(key: string, item: CacheItem): void {
    try {
      const storageKey = this.STORAGE_PREFIX.PERSISTENT + key;
      localStorage.setItem(storageKey, JSON.stringify(item));
    } catch (error) {
      console.warn('⚠️ Failed to set persistent cache:', error);
    }
  }

  /**
   * Set session cache item
   * Uses sessionStorage consistently across all devices
   */
  private setSessionCache(key: string, item: CacheItem): void {
    try {
      const storageKey = this.STORAGE_PREFIX.SESSION + key;
      sessionStorage.setItem(storageKey, JSON.stringify(item));
    } catch (error) {
      console.warn('⚠️ Failed to set session cache:', error);
    }
  }

  /**
   * Get cache item from storage
   */
  private getFromStorage(key: string): CacheItem | null {
    // Try persistent storage first
    const persistentKey = this.STORAGE_PREFIX.PERSISTENT + key;
    const persistent = this.getStorageItem(localStorage, persistentKey);
    if (persistent) return persistent;

    // Try session storage
    const sessionKey = this.STORAGE_PREFIX.SESSION + key;
    const session = this.getStorageItem(sessionStorage, sessionKey);
    if (session) return session;

    return null;
  }

  /**
   * Get item from specific storage
   */
  private getStorageItem(storage: Storage, key: string): CacheItem | null {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('⚠️ Failed to parse cache item:', error);
      return null;
    }
  }

  /**
   * Remove cache item from storage
   */
  private removeFromStorage(key: string): void {
    const persistentKey = this.STORAGE_PREFIX.PERSISTENT + key;
    const sessionKey = this.STORAGE_PREFIX.SESSION + key;

    localStorage.removeItem(persistentKey);
    sessionStorage.removeItem(sessionKey);
  }

  /**
   * Clear storage by prefix
   */
  private clearStorageByPrefix(prefix: string): void {
    const storages = [localStorage, sessionStorage];
    const prefixes = [this.STORAGE_PREFIX.PERSISTENT, this.STORAGE_PREFIX.SESSION];

    for (const storage of storages) {
      for (const storagePrefix of prefixes) {
        const fullPrefix = storagePrefix + prefix;
        const keysToRemove: string[] = [];

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(fullPrefix)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => storage.removeItem(key));
      }
    }
  }

  /**
   * Clear all cache storage
   */
  private clearAllStorage(): void {
    const storages = [localStorage, sessionStorage];
    const prefixes = Object.values(this.STORAGE_PREFIX);

    for (const storage of storages) {
      const keysToRemove: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    }
  }

  /**
   * Restore persistent cache items to memory
   */
  private restorePersistentCache(): void {
    const prefix = this.STORAGE_PREFIX.PERSISTENT;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const cacheKey = key.substring(prefix.length);
        const item = this.getStorageItem(localStorage, key);
        
        if (item && item.expiry > Date.now()) {
          this.memoryCache.set(cacheKey, item);
        }
      }
    }
  }

  /**
   * Clean up expired items from storage
   */
  private cleanupExpiredStorage(): void {
    const now = Date.now();
    const storages = [localStorage, sessionStorage];
    const prefixes = Object.values(this.STORAGE_PREFIX);

    for (const storage of storages) {
      const keysToRemove: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
          const item = this.getStorageItem(storage, key);
          if (item && item.expiry <= now) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    }
  }
}

// Predefined cache namespaces
export const CACHE_NAMESPACES = {
  AUTH: 'auth',
  USER: 'user',
  API: 'api',
  MAPS: 'maps',
  SERVICES: 'services',
  BOOKINGS: 'bookings',
  ADDRESSES: 'addresses',
  UI: 'ui'
} as const;

// Predefined TTL values
export const CACHE_TTL = {
  IMMEDIATE: 0,
  SHORT: 2 * 60 * 1000,        // 2 minutes
  MEDIUM: 5 * 60 * 1000,       // 5 minutes
  LONG: 30 * 60 * 1000,        // 30 minutes
  HOUR: 60 * 60 * 1000,        // 1 hour
  DAY: 24 * 60 * 60 * 1000,    // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000 // 7 days
} as const;

export default UnifiedCacheService;
