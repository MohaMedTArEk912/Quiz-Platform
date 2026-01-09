import type {
    UserData,
    AttemptData,
    Quiz,
    BadgeDefinition,
    ChallengeData,
    ShopItem,
    SkillTrack,
    Tournament,
    Clan,
    DailyChallengeDef,
    StudyCard,
    BadgeNode,
    BadgeTree,
    BadgeTreeNode
} from '../types';
export type {
    UserData,
    AttemptData,
    Quiz,
    BadgeDefinition,
    ChallengeData,
    ShopItem,
    SkillTrack,
    Tournament,
    Clan,
    DailyChallengeDef,
    StudyCard,
    BadgeNode,
    BadgeTree,
    BadgeTreeNode
};

const stripTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

const resolveApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (envUrl) {
        const normalized = stripTrailingSlash(envUrl);
        // Prevent shipping a localhost URL to production builds
        if (!isLocalhost && normalized.includes('localhost')) {
            return '/api';
        }
        return normalized;
    }

    const localDefault = 'http://localhost:5000/api';
    const hostedDefault = '/api'; // Netlify/Vercel rewrite target

    return isLocalhost ? localDefault : hostedDefault;
};

const API_URL = resolveApiUrl();

const getStoredToken = () => {
    try {
        const session = sessionStorage.getItem('userSession');
        if (!session) return null;
        const parsed = JSON.parse(session);
        return parsed.token ?? null;
    } catch (error) {
        console.warn('Failed to read session token', error);
        return null;
    }
};

const getHeaders = (tokenOrOptions?: string | { token?: string; userId?: string }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const options = typeof tokenOrOptions === 'string' ? { userId: tokenOrOptions } : tokenOrOptions ?? {};

    const token = options.token ?? getStoredToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.userId) {
        headers['x-user-id'] = options.userId; // Legacy header kept for backward compatibility
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
            let errorMessage = 'Login failed';
            try {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    errorMessage = error.message || errorMessage;
                } catch {
                    // If JSON parse fails, it's likely an HTML error page or plain text
                    console.error('Non-JSON response received:', text);
                    errorMessage = `Server Error (${response.status}): The server returned an invalid response.`;
                }
            } catch (e) {
                console.error('Failed to read response body:', e);
            }
            throw new Error(errorMessage);
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
            let errorMessage = 'Failed to load quizzes';
            try {
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.message || errorMessage;
                    console.error('SERVER ERROR (getQuizzes):', errorData);
                } catch {
                    console.error('SERVER ERROR (getQuizzes) [Non-JSON]:', text);
                    errorMessage = `Server Error (${response.status})`;
                }
            } catch (e) {
                console.error('Failed to read response body:', e);
            }
            throw new Error(errorMessage);
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
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to import quizzes');
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

    async verifySession(token?: string) {
        const resolvedToken = token || getStoredToken();
        const response = await fetch(`${API_URL}/verify-session`, {
            method: 'POST',
            headers: getHeaders({ token: resolvedToken ?? undefined }),
            body: JSON.stringify({ token: resolvedToken }),
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
        if (!response.ok) throw new Error('Failed to fetch shop items');
        return response.json();
    },

    async addShopItem(item: Omit<ShopItem, 'itemId'>, adminId: string): Promise<ShopItem> {
        const response = await fetch(`${API_URL}/shop/items`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to create shop item');
        return response.json();
    },

    async updateShopItem(itemId: string, item: ShopItem, adminId: string) {
        const response = await fetch(`${API_URL}/shop/items/${itemId}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(item),
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
            body: JSON.stringify({ itemId }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to purchase item');
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
        const response = await fetch(`${API_URL}/shop/powerups/use`, {
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

    async createDailyChallenge(data: Partial<DailyChallengeDef>, adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create daily challenge');
        return response.json();
    },

    async updateDailyChallenge(id: string, data: Partial<DailyChallengeDef>, adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin/${id}`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update daily challenge');
        return response.json();
    },

    async deleteDailyChallenge(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/daily-challenge/admin/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete daily challenge');
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

    async createTournament(data: Partial<Tournament>, adminId: string) {
        const response = await fetch(`${API_URL}/tournaments`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create tournament');
        return response.json();
    },

    async updateTournament(id: string, data: Partial<Tournament>, adminId: string) {
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

    async createStudyCard(card: Partial<StudyCard>, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(card)
        });
        if (!response.ok) throw new Error('Failed to create study card');
        return response.json();
    },

    async updateStudyCard(id: string, card: Partial<StudyCard>, adminId: string) {
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

    async deleteStudyStack(category: string, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards/stack/${encodeURIComponent(category)}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete study stack');
        return response.json();
    },

    async updateStudyStack(oldCategory: string, newCategory: string, adminId: string) {
        const response = await fetch(`${API_URL}/study-cards/stack/rename`, {
            method: 'PUT',
            headers: getHeaders(adminId),
            body: JSON.stringify({ oldCategory, newCategory })
        });
        if (!response.ok) throw new Error('Failed to rename study stack');
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

    async createBadgeNode(badgeData: Partial<BadgeNode>, adminId: string) {
        const response = await fetch(`${API_URL}/badge-nodes`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(badgeData)
        });
        if (!response.ok) throw new Error('Failed to create badge node');
        return response.json();
    },

    async updateBadgeNode(badgeId: string, updates: Partial<BadgeNode>, adminId: string) {
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

    async createBadgeTree(treeData: Partial<BadgeTree>, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(treeData)
        });
        if (!response.ok) throw new Error('Failed to create badge tree');
        return response.json();
    },

    async updateBadgeTree(treeId: string, updates: Partial<BadgeTree>, adminId: string) {
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

    async addNodeToTree(treeId: string, nodeData: Partial<BadgeTreeNode>, adminId: string) {
        const response = await fetch(`${API_URL}/badge-trees/${treeId}/nodes`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(nodeData)
        });
        if (!response.ok) throw new Error('Failed to add node to tree');
        return response.json();
    },

    async updateNodeInTree(treeId: string, badgeId: string, updates: Partial<BadgeTreeNode>, adminId: string) {
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
    },

    // AI Studio & Material Management
    async uploadMaterial(subjectId: string, file: File, type: 'lesson' | 'exam_raw', adminId: string) {
        const formData = new FormData();
        formData.append('subjectId', subjectId);
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch(`${API_URL}/ai-studio/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getStoredToken()}`,
                'x-user-id': adminId // Legacy
            },
            body: formData
        });
        if (!response.ok) throw new Error('Failed to upload material');
        return response.json();
    },

    async processMaterial(subjectId: string, materialId: string, adminId: string) {
        const response = await fetch(`${API_URL}/ai-studio/process`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify({ subjectId, materialId })
        });
        if (!response.ok) throw new Error('Failed to process material');
        return response.json();
    },

    async deleteMaterial(subjectId: string, materialId: string, adminId: string) {
        const response = await fetch(`${API_URL}/ai-studio/material/${subjectId}/${materialId}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete material');
        return response.json();
    },

    async generateQuizFromMaterials(data: { subjectId: string; materialIds: string[]; questionCount: number; difficulty: string }, adminId: string) {
        const response = await fetch(`${API_URL}/ai-studio/generate`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to generate quiz');
        return response.json();
    },

    // Clans

    async createClan(data: { name: string; tag: string; description: string; isPublic: boolean }, userId: string) {
        const response = await fetch(`${API_URL}/clans/create`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create clan');
        }
        return response.json();
    },

    async getClan(clanId: string, userId: string): Promise<Clan> {
        const response = await fetch(`${API_URL}/clans/${clanId}`, {
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to fetch clan');
        return response.json();
    },

    async searchClans(query: string, userId: string): Promise<Clan[]> {
        const response = await fetch(`${API_URL}/clans/search?query=${encodeURIComponent(query)}`, {
            headers: getHeaders(userId)
        });
        if (!response.ok) throw new Error('Failed to search clans');
        return response.json();
    },

    async joinClan(clanId: string, userId: string) {
        const response = await fetch(`${API_URL}/clans/join`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to join clan');
        }
        return response.json();
    },

    async leaveClan(userId: string) {
        const response = await fetch(`${API_URL}/clans/leave`, {
            method: 'POST',
            headers: getHeaders(userId)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to leave clan');
        }
        return response.json();
    },

    async getClanLeaderboard() {
        const response = await fetch(`${API_URL}/clans/leaderboard`);
        if (!response.ok) throw new Error('Failed to fetch clan leaderboard');
        return response.json();
    },

    async updateClan(clanId: string, updates: Partial<Clan>, userId: string) {
        const response = await fetch(`${API_URL}/clans/${clanId}`, {
            method: 'PUT',
            headers: getHeaders(userId),
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update clan');
        }
        return response.json();
    },

    async inviteToClan(clanId: string, targetUserId: string, userId: string) {
        const response = await fetch(`${API_URL}/clans/invite`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId, targetUserId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send invite');
        }
        return response.json();
    },

    async respondToClanInvite(clanId: string, accept: boolean, userId: string) {
        const response = await fetch(`${API_URL}/clans/respond-invite`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId, accept })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to respond to invite');
        }
        return response.json();
    },

    async handleJoinRequest(clanId: string, targetUserId: string, accept: boolean, userId: string) {
        const response = await fetch(`${API_URL}/clans/join-request`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId, targetUserId, accept })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to handle request');
        }
        return response.json();
    },

    async kickMember(clanId: string, targetUserId: string, userId: string) {
        const response = await fetch(`${API_URL}/clans/kick`, {
            method: 'POST',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId, targetUserId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to kick member');
        }
        return response.json();
    },

    async updateMemberRole(clanId: string, targetUserId: string, newRole: 'elder' | 'member', userId: string) {
        const response = await fetch(`${API_URL}/clans/role`, {
            method: 'PUT',
            headers: getHeaders(userId),
            body: JSON.stringify({ clanId, targetUserId, newRole })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update role');
        }
        return response.json();
    },

    async compileCode(sourceCode: string, language: string) {
        const response = await fetch(`${API_URL}/compile`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ sourceCode, language }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Compilation failed');
        }
        return response.json();
    },

    // AI Quiz Generation
    async generateAiQuiz(data: FormData | {
        material: string;
        difficulty: string;
        questionCount: number;
        questionType: string;
        styleExamples?: string;
        mode?: 'generate' | 'extract';
    }, adminId: string) {
        const isFormData = data instanceof FormData;
        const headers = getHeaders(adminId);
        if (isFormData) {
            // Let the browser set Content-Type for FormData
            // @ts-ignore
            delete headers['Content-Type'];
        }

        const response = await fetch(`${API_URL}/ai/generate`, {
            method: 'POST',
            headers: headers,
            body: isFormData ? (data as FormData) : JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate quiz');
        }
        return response.json();
    },

    // Subjects
    async getAllSubjects(adminId: string) {
        const response = await fetch(`${API_URL}/subjects`, {
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return response.json();
    },

    async createSubject(data: FormData, adminId: string) {
        const headers = getHeaders(adminId);
        // @ts-ignore
        delete headers['Content-Type']; // Allow browser to set boundary

        const response = await fetch(`${API_URL}/subjects`, {
            method: 'POST',
            headers: headers,
            body: data
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create subject');
        }
        return response.json();
    },

    async deleteSubject(id: string, adminId: string) {
        const response = await fetch(`${API_URL}/subjects/${id}`, {
            method: 'DELETE',
            headers: getHeaders(adminId)
        });
        if (!response.ok) throw new Error('Failed to delete subject');
        return response.json();
    },

    async updateSubject(id: string, data: FormData, adminId: string) {
        const headers = getHeaders(adminId);
        // @ts-ignore
        delete headers['Content-Type']; // Allow browser to set boundary

        const response = await fetch(`${API_URL}/subjects/${id}`, {
            method: 'PUT',
            headers: headers,
            body: data
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update subject');
        }
        return response.json();
    },

    async generateQuizFromSubject(data: {
        subjectIds: string | string[];
        filters?: Record<string, string[]>;
        questionCount: number;
        difficulty: string;
        mode?: 'generate' | 'extract';
        useOldQuestions?: boolean;
        includeNewQuestions?: boolean;
    }, adminId: string) {
        const response = await fetch(`${API_URL}/subjects/generate-quiz`, {
            method: 'POST',
            headers: getHeaders(adminId),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate quiz');
        }
        return response.json();
    },
};
