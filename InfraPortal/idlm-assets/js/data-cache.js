/**
 * Data Cache Service
 * Provides caching layer to avoid redundant API calls
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const DataCache = {
  cache: new Map(),
  timestamps: new Map(),
  defaultTTL: 5 * 60 * 1000, // 5 minutes default

  // TTL settings for different data types (in milliseconds)
  ttlSettings: {
    users: 5 * 60 * 1000, // 5 minutes
    licenses: 5 * 60 * 1000, // 5 minutes
    security: 5 * 60 * 1000, // 5 minutes
    signInLogs: 2 * 60 * 1000, // 2 minutes (more dynamic)
    directoryRoles: 10 * 60 * 1000, // 10 minutes (rarely changes)
    dashboard: 3 * 60 * 1000, // 3 minutes
  },

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if expired/missing
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const timestamp = this.timestamps.get(key);
    const ttl = this.getTTL(key);

    if (Date.now() - timestamp > ttl) {
      // Cache expired
      this.delete(key);
      return null;
    }

    console.log(`📦 Cache hit: ${key}`);
    return this.cache.get(key);
  },

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional custom TTL
   */
  set(key, value, ttl = null) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    if (ttl) {
      this.ttlSettings[key] = ttl;
    }
    console.log(`📦 Cache set: ${key}`);
  },

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  },

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    console.log("📦 Cache cleared");
  },

  /**
   * Clear cache for a specific category
   * @param {string} prefix - Key prefix to clear
   */
  clearByPrefix(prefix) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.delete(key));
    console.log(`📦 Cache cleared for prefix: ${prefix}`);
  },

  /**
   * Get TTL for a key
   */
  getTTL(key) {
    // Check for exact match first
    if (this.ttlSettings[key]) {
      return this.ttlSettings[key];
    }
    // Check for prefix match
    for (const [prefix, ttl] of Object.entries(this.ttlSettings)) {
      if (key.startsWith(prefix)) {
        return ttl;
      }
    }
    return this.defaultTTL;
  },

  /**
   * Check if cache is valid (not expired)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  isValid(key) {
    if (!this.cache.has(key)) return false;
    const timestamp = this.timestamps.get(key);
    const ttl = this.getTTL(key);
    return Date.now() - timestamp <= ttl;
  },

  /**
   * Get cache age in seconds
   * @param {string} key - Cache key
   * @returns {number} Age in seconds or -1 if not cached
   */
  getAge(key) {
    if (!this.timestamps.has(key)) return -1;
    return Math.floor((Date.now() - this.timestamps.get(key)) / 1000);
  },

  /**
   * Wrap an async function with caching
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute if cache miss
   * @param {boolean} forceRefresh - Force cache refresh
   * @returns {Promise<any>}
   */
  async withCache(key, fn, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }
    }

    const result = await fn();
    this.set(key, result);
    return result;
  },

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      ages: {},
    };

    for (const key of this.cache.keys()) {
      stats.ages[key] = this.getAge(key);
    }

    return stats;
  },
};

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataCache;
}
