export const storage = {
    get: async (key: string, _flag?: boolean) => {
        const value = localStorage.getItem(key);
        if (value === null) throw new Error('Key not found');
        return { value };
    },
    set: async (key: string, value: string, _flag?: boolean) => {
        localStorage.setItem(key, value);
        return true;
    },
    list: async (prefix: string, _flag?: boolean) => {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return { keys };
    }
};
