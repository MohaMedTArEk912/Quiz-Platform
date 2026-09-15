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
    description: "Complete a quiz in under 60 seconds with high accuracy",
    icon: "⚡",
    rarity: "rare" as const,
    color: "#3B82F6",
    rewards: {
        xp: 150,
        coins: 100,
        powerUps: [
            { type: "time_freeze", quantity: 2 },
            { type: "fifty_fifty", quantity: 1 }
        ]
    },
    unlockCriteria: [
        {
            type: "speed_demon" as const,
            threshold: 60,
            operator: "<=" as const
        }
    ],
    trees: ["general-skills", "speedrun-track"]
};

export const SAMPLE_BADGES = [
    SAMPLE_BADGE,
    {
        name: "Streak Master",
        description: "Maintain a 7-day continuous learning streak",
        icon: "🔥",
        rarity: "epic" as const,
        color: "#F97316",
        rewards: {
            xp: 300,
            coins: 200,
            powerUps: [
                { type: "double_xp", quantity: 2 }
            ]
        },
        unlockCriteria: [
            {
                type: "streak" as const,
                threshold: 7,
                operator: ">=" as const
            }
        ],
        trees: ["consistency-track"]
    },
    {
        name: "Grand Champion",
        description: "Win first place in an official competitive tournament",
        icon: "👑",
        rarity: "legendary" as const,
        color: "#EAB308",
        rewards: {
            xp: 1000,
            coins: 500,
            powerUps: [
                { type: "time_freeze", quantity: 5 },
                { type: "second_chance", quantity: 3 }
            ]
        },
        unlockCriteria: [
            {
                type: "tournament_win" as const,
                threshold: 1,
                operator: ">=" as const
            }
        ],
        trees: ["tournaments"]
    }
];
