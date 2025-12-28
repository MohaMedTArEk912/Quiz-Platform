export const storage = {
    get: async (key: string, _flag?: boolean) => {
        const value = sessionStorage.getItem(key);
        if (value === null) throw new Error('Key not found');
        return { value };
    },
    set: async (key: string, value: string, _flag?: boolean) => {
        sessionStorage.setItem(key, value);
        return true;
    },
    list: async (prefix: string, _flag?: boolean) => {
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
