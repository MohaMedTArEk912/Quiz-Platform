export const storage = {
    get: async (key: string) => {
        const value = sessionStorage.getItem(key);
        if (value === null) throw new Error('Key not found');
        return { value };
    },
    set: async (key: string, value: string) => {
        sessionStorage.setItem(key, value);
        return true;
    },
    list: async (prefix: string) => {
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return { keys };
    }
};
