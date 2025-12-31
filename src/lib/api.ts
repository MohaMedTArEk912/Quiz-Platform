import type { UserData, AttemptData, Quiz, BadgeDefinition, ChallengeData, ShopItem, SkillTrack, Tournament } from '../types';
export type { UserData, AttemptData, Quiz, BadgeDefinition, ChallengeData, ShopItem, SkillTrack, Tournament };

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (userId?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userId) {
        headers['x-user-id'] = userId;
    }
    return headers;
};

export const api = {
    async register(userData: Partial<UserData>) {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: getHeaders(),
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
            headers: getHeaders(),
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
            headers: getHeaders(),
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
            headers: getHeaders(),
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user');
        }
        return response.json();
    },

    async deleteUser(userId: string, adminId: string) {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
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
            headers: getHeaders(),
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

    async createQuiz(quizData: Partial<Quiz>, adminId: string) {
        const response = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(quizData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create quiz');
        }
        return response.json();
    },

    async importQuizzes(quizData: unknown, adminId: string) {
        const response = await fetch(`${API_URL}/quizzes/import`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(quizData),
        });
        if (!response.ok) {
            throw new Error('Failed to import quizzes');
        }
        return response.json();
    },

    async updateQuiz(id: string, updates: Partial<Quiz>, adminId: string) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update quiz');
        }
        return response.json();
    },

    async deleteQuiz(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete quiz');
        }
        return response.json();
    },

    async getData(adminId: string) {
        const response = await fetch(`${API_URL}/data`, {
            headers: getHeaders(adminId)
        });
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return response.json();
    },

    async getUserData(userId: string) {
        const response = await fetch(`${API_URL}/user/data`, {
            headers: getHeaders(userId)
        });
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

    async createBadge(badgeData: BadgeDefinition, adminId: string) {
        const response = await fetch(`${API_URL}/badges`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(badgeData),
        });
        if (!response.ok) throw new Error('Failed to create badge');
        return response.json();
    },

    async deleteBadge(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/badges/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete badge');
        return response.json();
    },

    async getPendingReviews() {
        const response = await fetch(`${API_URL}/reviews/pending`);
        if (!response.ok) throw new Error('Failed to fetch pending reviews');
        return response.json();
    },

    async submitReview(attemptId: string, reviewData: { feedback: Record<string, unknown>; scoreAdjustment: number }, adminId: string) {
        const response = await fetch(`${API_URL}/reviews/${attemptId}`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(reviewData),
        });
        if (!response.ok) throw new Error('Failed to submit review');
        return response.json();
    },

    // Password Management
    async forgotPassword(email: string) {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: getHeaders(),
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
            headers: getHeaders(),
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
            headers: getHeaders(),
            body: JSON.stringify({ email, currentPassword, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }
        return response.json();
    },

    async adminChangeUserPassword(userId: string, newPassword: string, adminId: string) {
        const response = await fetch(`${API_URL}/admin/change-user-password`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify({ userId, newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change user password');
        }
        return response.json();
    },

    async verifySession(userId: string) {
        const response = await fetch(`${API_URL}/verify-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Session verification failed');
        }
        return response.json();
    },

    // Social & Multiplayer
    async sendFriendRequest(targetUserId: string) {
        const response = await fetch(`${API_URL}/friends/request`, {
            method: 'POST',
            headers: getHeaders(sessionStorage.getItem('userSession') ? JSON.parse(sessionStorage.getItem('userSession')!).user.userId : undefined),
            body: JSON.stringify({ targetUserId }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send request');
        }
        return response.json();
    },

    async respondToFriendRequest(fromUserId: string, action: 'accept' | 'reject') {
        const response = await fetch(`${API_URL}/friends/respond`, {
            method: 'POST',
            headers: getHeaders(sessionStorage.getItem('userSession') ? JSON.parse(sessionStorage.getItem('userSession')!).user.userId : undefined),
            body: JSON.stringify({ fromUserId, action }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to respond');
        }
        return response.json();
    },

    async searchUsers(query: string) {
        const params = new URLSearchParams({ query });
        const response = await fetch(`${API_URL}/users/search?${params}`, {
            headers: getHeaders(sessionStorage.getItem('userSession') ? JSON.parse(sessionStorage.getItem('userSession')!).user.userId : undefined)
        });
        if (!response.ok) {
            throw new Error('Search failed');
        }
        return response.json();
    },

    // Async Challenges
    async createChallenge(toId: string, quizId: string, userId: string) {
        const response = await fetch(`${API_URL}/challenges`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ toId, quizId }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create challenge');
        }
        return response.json();
    },

    async getChallenge(token: string) {
        const response = await fetch(`${API_URL}/challenges/${token}`);
        if (!response.ok) {
            throw new Error('Challenge not found');
        }
        return response.json();
    },

    async submitChallengeResult(token: string, result: { score: number; percentage: number; timeTaken: number }, userId: string) {
        const response = await fetch(`${API_URL}/challenges/${token}/submit`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify(result),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to submit challenge result');
        }
        return response.json();
    },

    async listChallenges(userId: string) {
        const response = await fetch(`${API_URL}/challenges`, {
            headers: getHeaders(userId),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch challenges');
        }
        return response.json();
    },

    // Shop & Economy
    async getShopItems(): Promise<ShopItem[]> {
        const response = await fetch(`${API_URL}/shop/items`);
        if (!response.ok) throw new Error('Failed to load shop items');
        return response.json();
    },

    async createShopItem(item: ShopItem, adminId: string) {
        const response = await fetch(`${API_URL}/shop/items`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(item)
        });
        if (!response.ok) throw new Error('Failed to create shop item');
        return response.json();
    },

    async updateShopItem(itemId: string, item: ShopItem, adminId: string) {
        const response = await fetch(`${API_URL}/shop/items/${itemId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(item)
        });
        if (!response.ok) throw new Error('Failed to update shop item');
        return response.json();
    },

    async deleteShopItem(itemId: string, adminId: string) {
        const response = await fetch(`${API_URL}/shop/items/${itemId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete shop item');
        return response.json();
    },

    async purchaseItem(itemId: string, userId: string) {
        const response = await fetch(`${API_URL}/shop/purchase`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ itemId })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Purchase failed');
        }
        return response.json();
    },

    // Daily Challenge
    async getDailyChallenge(userId: string) {
        const response = await fetch(`${API_URL}/daily-challenge`, {
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to load daily challenge');
        return response.json();
    },

    async usePowerUp(type: string, userId: string) {
        const response = await fetch(`${API_URL}/powerups/use`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ type })
        });
        if (!response.ok) throw new Error('Failed to use power-up');
        return response.json();
    },

    async completeDailyChallenge(userId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/complete`, {
            method: 'POST',
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to complete daily challenge');
        return response.json();
    },

    // Daily Challenge Admin
    async getDailyChallengesAdmin(adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin/all`, {
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to fetch challenges');
        return response.json();
    },

    async createDailyChallenge(data: any, adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create daily challenge');
        return response.json();
    },

    async updateDailyChallenge(date: string, data: any, adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin/${date}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update daily challenge');
        return response.json();
    },

    // Skill Tracks
    async getSkillTracks(): Promise<SkillTrack[]> {
        const response = await fetch(`${API_URL}/skill-tracks`);
        if (!response.ok) throw new Error('Failed to load skill tracks');
        return response.json();
    },

    async completeSkillModule(trackId: string, moduleId: string, userId: string) {
        const response = await fetch(`${API_URL}/skill-tracks/${trackId}/complete`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ moduleId })
        });
        if (!response.ok) throw new Error('Failed to update skill track');
        return response.json();
    },

    async createSkillTrack(track: SkillTrack, adminId: string) {
        const response = await fetch(`${API_URL}/skill-tracks`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(track)
        });
        if (!response.ok) throw new Error('Failed to create skill track');
        return response.json();
    },

    async updateSkillTrack(trackId: string, track: SkillTrack, adminId: string) {
        const response = await fetch(`${API_URL}/skill-tracks/${trackId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(track)
        });
        if (!response.ok) throw new Error('Failed to update skill track');
        return response.json();
    },

    async deleteSkillTrack(trackId: string, adminId: string) {
        const response = await fetch(`${API_URL}/skill-tracks/${trackId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete skill track');
        return response.json();
    },

    // Tournaments
    async getTournaments(): Promise<Tournament[]> {
        const response = await fetch(`${API_URL}/tournaments`);
        if (!response.ok) throw new Error('Failed to load tournaments');
        return response.json();
    },

    async createTournament(data: any, adminId: string) {
        const response = await fetch(`${API_URL}/tournaments`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create tournament');
        return response.json();
    },

    async updateTournament(id: string, data: any, adminId: string) {
        const response = await fetch(`${API_URL}/tournaments/${id}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update tournament');
        return response.json();
    },

    async deleteTournament(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/tournaments/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete tournament');
        return response.json();
    },

    async joinTournament(tournamentId: string, userId: string) {
        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/join`, {
            method: 'POST',
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to join tournament');
        return response.json();
    },

    // Analytics
    async getAnalyticsSummary(userId: string) {
        const response = await fetch(`${API_URL}/analytics/summary`, {
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to load analytics');
        return response.json();
    },

    // Study Cards
    async getStudyCards() {
        const response = await fetch(`${API_URL}/study-cards`);
        if (!response.ok) throw new Error('Failed to load study cards');
        return response.json();
    },

    async createStudyCard(card: any, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(card)
        });
        if (!response.ok) throw new Error('Failed to create study card');
        return response.json();
    },

    async updateStudyCard(id: string, card: any, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards/${id}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(card)
        });
        if (!response.ok) throw new Error('Failed to update study card');
        return response.json();
    },

    async deleteStudyCard(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete study card');
        return response.json();
    },

    // Badge Tree System
    // Badge Nodes
    async getBadgeNodes() {
        const response = await fetch(`${API_URL}/badge-nodes`);
        if (!response.ok) throw new Error('Failed to load badge nodes');
        return response.json();
    },

    async getBadgeNode(badgeId: string) {
        const response = await fetch(`${API_URL}/badge-nodes/${badgeId}`);
        if (!response.ok) throw new Error('Failed to load badge node');
        return response.json();
    },

    async createBadgeNode(badgeData: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-nodes`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(badgeData)
        });
        if (!response.ok) throw new Error('Failed to create badge node');
        return response.json();
    },

    async updateBadgeNode(badgeId: string, updates: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-nodes/${badgeId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update badge node');
        return response.json();
    },

    async deleteBadgeNode(badgeId: string, adminId: string) {
        const response = await fetch(`${API_URL}/badge-nodes/${badgeId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete badge node');
        return response.json();
    },

    async checkBadgeUnlock(userId: string, badgeId: string) {
        const response = await fetch(`${API_URL}/badge-nodes/check/${userId}/${badgeId}`);
        if (!response.ok) throw new Error('Failed to check badge unlock');
        return response.json();
    },

    async manuallyUnlockBadge(userId: string, badgeId: string, adminId: string) {
        const response = await fetch(`${API_URL}/badge-nodes/unlock/${userId}/${badgeId}`, {
            method: 'POST',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to unlock badge');
        return response.json();
    },

    // Badge Trees
    async getBadgeTrees(filters?: { type?: string; isActive?: boolean }) {
        const params = new URLSearchParams();
        if (filters?.type) params.append('type', filters.type);
        if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

        const url = params.toString() ? `${API_URL}/badge-trees?${params}` : `${API_URL}/badge-trees`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load badge trees');
        return response.json();
    },

    async getBadgeTree(treeId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}`);
        if (!response.ok) throw new Error('Failed to load badge tree');
        return response.json();
    },

    async createBadgeTree(treeData: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(treeData)
        });
        if (!response.ok) throw new Error('Failed to create badge tree');
        return response.json();
    },

    async updateBadgeTree(treeId: string, updates: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update badge tree');
        return response.json();
    },

    async deleteBadgeTree(treeId: string, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete badge tree');
        return response.json();
    },

    async addNodeToTree(treeId: string, nodeData: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}/nodes`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(nodeData)
        });
        if (!response.ok) throw new Error('Failed to add node to tree');
        return response.json();
    },

    async updateNodeInTree(treeId: string, badgeId: string, updates: any, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}/nodes/${badgeId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update node');
        return response.json();
    },

    async removeNodeFromTree(treeId: string, badgeId: string, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}/nodes/${badgeId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to remove node from tree');
        return response.json();
    },

    async getUserBadgeProgress(userId: string) {
        const response = await fetch(`${API_URL}/badge-trees/progress/${userId}`);
        if (!response.ok) throw new Error('Failed to load badge progress');
        return response.json();
    },

    async getUserTreeProgress(userId: string, treeId: string) {
        const response = await fetch(`${API_URL}/badge-trees/progress/${userId}/${treeId}`);
        if (!response.ok) throw new Error('Failed to load tree progress');
        return response.json();
    }
};
