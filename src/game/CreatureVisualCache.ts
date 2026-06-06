/**
 * Preloads creature GIFs by injecting hidden <img> elements.
 * The browser caches the responses via its HTTP cache (no CORS issues),
 * so subsequent loads — including after going offline — hit the cache.
 */
export const CreatureVisualCache = {
    preloadAll(gifUrls: (string | null)[]): void {
        for (const url of gifUrls) {
            if (!url) continue;
            const img = new Image();
            img.src = url;
        }
    },
};
