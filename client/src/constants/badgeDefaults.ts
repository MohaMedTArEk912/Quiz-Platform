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
    { value: 'track_started', label: 'Roadmap Enrolled' },
    { value: 'track_modules', label: 'Modules Completed' },
    { value: 'clans', label: 'Clan Member' },
    { value: 'clan_contribution', label: 'Clan XP Contribution' },
    { value: 'challenges', label: 'Duels Played' },
    { value: 'challenge_wins', label: 'Duels Won' },
    { value: 'friend_count', label: 'Friend Count' },
    { value: 'manual', label: 'Manual (Admin Only)' }
] as const;

export const BADGE_RARITY_COLORS = {
    mythic: 'from-fuchsia-500 via-rose-500 to-amber-400',
    legendary: 'from-yellow-400 to-orange-500',
    epic: 'from-orange-500 to-red-500',
    rare: 'from-purple-500 to-pink-500',
    common: 'from-blue-500 to-cyan-500',
    default: 'from-blue-500 to-cyan-500'
} as const;

