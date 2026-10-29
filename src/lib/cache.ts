// Cache versioning system - prevents stale/corrupted localStorage issues
// Bump this version when making breaking changes to cache structure
export const CACHE_VERSION = "2025-10-29-v2";

export const CACHE_PREFIX = "atlas:";
const VERSION_KEY = `${CACHE_PREFIX}version`;

const APP_CACHE_KEYS = [
  "atlas.user",
  "atlas:note-order:",
  "atlas:notifications:",
];

/** Initialize cache system - clears stale caches on version mismatch */
export function initCache(): void {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== CACHE_VERSION) {
      // Version mismatch or first load - clear all app caches
      clearAllAppCaches();
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
    }
  } catch {
    // localStorage unavailable or corrupted - clear everything
    clearAllAppCaches();
    try {
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
    } catch {
      // Ignore if still failing
    }
  }
}

/** Clear all app-specific caches */
export function clearAllAppCaches(): void {
  try {
    // Remove prefixed app caches
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    
    // Remove legacy keys
    APP_CACHE_KEYS.forEach((prefix) => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch {
    // Ignore errors
  }
}

/** Safely get item from localStorage with fallback */
export function safeGetItem<T>(key: string, fallback: T = null as T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Safely set item in localStorage */
export function safeSetItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota exceeded or other errors
  }
}

/** Safely remove item from localStorage */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/** Check if localStorage is available */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}