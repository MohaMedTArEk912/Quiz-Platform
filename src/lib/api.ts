const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
    async register(userData: any) {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
        return response.json();
    },

    async login(credentials: any) {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
        return response.json();
    },

    async saveAttempt(attemptData: any) {
        const response = await fetch(`${API_URL}/attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attemptData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save attempt');
        }
        return response.json();
    },

    async getQuizzes() {
        const response = await fetch(`${API_URL}/quizzes`);
        if (!response.ok) {
            throw new Error('Failed to load quizzes');
        }
        return response.json();
    },

    async getData() {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return response.json();
    }
};
