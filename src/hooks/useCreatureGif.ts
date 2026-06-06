/**
 * Returns the gifUrl as-is for use in <img> src.
 * Actual caching is handled by the browser HTTP cache via CreatureVisualCache.preloadAll.
 */
export function useCreatureGif(gifUrl: string | null): string | null {
    return gifUrl;
}
