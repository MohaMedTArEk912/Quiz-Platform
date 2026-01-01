export const BADGE_CRITERIA_TYPES = [
    { value: 'total_attempts', label: 'Total Attempts' },
    { value: 'total_score', label: 'Total Score' },
    { value: 'streak', label: 'Login Streak' },
    { value: 'level', label: 'User Level' },
    { value: 'perfect_score', label: 'Perfect Score' },
    { value: 'speed_demon', label: 'Speed Demon' },
    { value: 'quiz_completion', label: 'Quiz Completion' },
    { value: 'exam_pass', label: 'Exam Pass' },
    { value: 'tournament_win', label: 'Tournament Win' },
    { value: 'track_completion', label: 'Track Completion' },
    { value: 'friend_count', label: 'Friend Count' },
    { value: 'manual', label: 'Manual (Admin Only)' }
] as const;

export const BADGE_RARITY_COLORS = {
    legendary: 'from-yellow-400 to-orange-500',
    epic: 'from-orange-500 to-red-500',
    rare: 'from-purple-500 to-pink-500',
    common: 'from-blue-500 to-cyan-500',
    default: 'from-blue-500 to-cyan-500'
} as const;

export const SAMPLE_BADGE = {
    name: "Speed Demon",
    description: "Complete a quiz in under 60 seconds",
    icon: "⚡",
    rarity: "rare",
    color: "#3B82F6",
    rewards: {
        xp: 100,
        coins: 50,
        powerUps: []
    },
    unlockCriteria: [
        {
            type: "time_limit",
            threshold: 60,
            comparison: "lte"
        }
    ]
};
