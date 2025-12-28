import type { UserData, AttemptData, Quiz, BadgeDefinition } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
    async register(userData: Partial<UserData>) {
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

    async login(credentials: { email: string; password: string }) {
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

    async googleLogin(googleData: { email: string; name: string; googleId: string }) {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Google login failed');
        }
        return response.json();
    },

    async updateUser(userId: string, updates: Partial<UserData>) {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user');
        }
        return response.json();
    },

    async deleteUser(userId: string) {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete user');
        }
        return response.json();
    },

    async saveAttempt(attemptData: AttemptData) {
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

    async createQuiz(quizData: Partial<Quiz>) {
        const response = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData),
        });
        if (!response.ok) {
            throw new Error('Failed to create quiz');
        }
        return response.json();
    },

    async importQuizzes(quizData: unknown) {
        const response = await fetch(`${API_URL}/quizzes/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData),
        });
        if (!response.ok) {
            throw new Error('Failed to import quizzes');
        }
        return response.json();
    },

    async updateQuiz(id: string, updates: Partial<Quiz>) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            throw new Error('Failed to update quiz');
        }
        return response.json();
    },

    async deleteQuiz(id: string) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete quiz');
        }
        return response.json();
    },

    async getData() {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return response.json();
    },

    async getBadges() {
        const response = await fetch(`${API_URL}/badges`);
        if (!response.ok) throw new Error('Failed to fetch badges');
        return response.json();
    },

    async createBadge(badgeData: BadgeDefinition) {
        const response = await fetch(`${API_URL}/badges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(badgeData),
        });
        if (!response.ok) throw new Error('Failed to create badge');
        return response.json();
    },

    async deleteBadge(id: string) {
        const response = await fetch(`${API_URL}/badges/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete badge');
        return response.json();
    },

    async getPendingReviews() {
        const response = await fetch(`${API_URL}/reviews/pending`);
        if (!response.ok) throw new Error('Failed to fetch pending reviews');
        return response.json();
    },

    async submitReview(attemptId: string, reviewData: { feedback: Record<string, unknown>; scoreAdjustment: number }) {
        const response = await fetch(`${API_URL}/reviews/${attemptId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData),
        });
        if (!response.ok) throw new Error('Failed to submit review');
        return response.json();
    },

    // Password Management
    async forgotPassword(email: string) {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to verify email');
        }
        return response.json();
    },

    async resetPassword(email: string, newPassword: string) {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reset password');
        }
        return response.json();
    },

    async changePassword(email: string, currentPassword: string, newPassword: string) {
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, currentPassword, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }
        return response.json();
    },

    async adminChangeUserPassword(userId: string, newPassword: string) {
        const response = await fetch(`${API_URL}/admin/change-user-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change user password');
        }
        return response.json();
    }
};
