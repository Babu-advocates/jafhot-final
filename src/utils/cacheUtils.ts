export const CACHE_KEYS = {
    FOOD_ITEMS: 'jafhot_food_items',
    CATEGORIES: 'jafhot_categories',
    CACHE_TIMESTAMP: 'jafhot_cache_time'
};

// Cache duration in milliseconds (e.g., 24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const cacheUtils = {
    get: <T>(key: string): T | null => {
        try {
            const item = localStorage.getItem(key);
            const timestamp = localStorage.getItem(`${key}_timestamp`);

            if (!item || !timestamp) return null;

            // Check if cache is expired
            if (Date.now() - parseInt(timestamp) > CACHE_DURATION) {
                localStorage.removeItem(key);
                localStorage.removeItem(`${key}_timestamp`);
                return null;
            }

            return JSON.parse(item);
        } catch (error) {
            console.error('Error reading from cache:', error);
            return null;
        }
    },

    set: <T>(key: string, data: T) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        } catch (error) {
            console.error('Error writing to cache:', error);
        }
    },

    clear: (key: string) => {
        try {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}_timestamp`);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },

    // Helper to update a specific item in a cached array
    updateItem: <T extends { id: string }>(key: string, item: T) => {
        const data = cacheUtils.get<T[]>(key);
        if (!data) return;

        const index = data.findIndex(i => i.id === item.id);
        if (index >= 0) {
            data[index] = item;
        } else {
            data.unshift(item); // Add new items to the beginning
        }
        cacheUtils.set(key, data);
    },

    // Helper to remove an item from a cached array
    removeItem: <T extends { id: string }>(key: string, id: string) => {
        const data = cacheUtils.get<T[]>(key);
        if (!data) return;

        const newData = data.filter(i => i.id !== id);
        cacheUtils.set(key, newData);
    }
};
