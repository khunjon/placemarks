// Global cache for Google Places photo URLs to prevent duplicate API calls
class GooglePhotoCache {
  private cache = new Map<string, { url: string; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  getPhotoUrl(photoReference: string, maxWidth: number = 800): string | null {
    const cacheKey = `${photoReference}-${maxWidth}`;
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if cache entry is still valid (within 24 hours)
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.url;
  }
  
  setPhotoUrl(photoReference: string, url: string, maxWidth: number = 800): void {
    const cacheKey = `${photoReference}-${maxWidth}`;
    this.cache.set(cacheKey, {
      url: url,
      timestamp: Date.now()
    });
  }
  
  // Clear expired entries to prevent memory bloat
  clearExpired(): number {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }
  
  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }
  
  // Get cache stats for debugging
  getCacheStats(): { size: number; validEntries: number; expiredEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      size: this.cache.size,
      validEntries,
      expiredEntries
    };
  }
}

// Export singleton instance
export const googlePhotoCache = new GooglePhotoCache(); 