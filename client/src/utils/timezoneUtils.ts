/**
 * Timezone & Localized Tournament Timing Utilities
 * Automatically converts and formats UTC tournament timestamps to each user's local country & timezone.
 */

export interface UserTimezoneInfo {
    timeZone: string;          // e.g. "Africa/Cairo"
    cityName: string;          // e.g. "Cairo"
    countryOrRegion: string;   // e.g. "Egypt"
    friendlyLabel: string;     // e.g. "Cairo, Egypt (GMT+2)"
    offsetString: string;      // e.g. "GMT+2"
    abbreviation: string;      // e.g. "EET"
}

// Well-known IANA timezone mapping to user-friendly country and city names
const TIMEZONE_FRIENDLY_NAMES: Record<string, { city: string; country: string }> = {
    'Africa/Cairo': { city: 'Cairo', country: 'Egypt' },
    'Africa/Alexandria': { city: 'Alexandria', country: 'Egypt' },
    'Asia/Riyadh': { city: 'Riyadh', country: 'Saudi Arabia' },
    'Asia/Dubai': { city: 'Dubai', country: 'United Arab Emirates' },
    'Asia/Kuwait': { city: 'Kuwait City', country: 'Kuwait' },
    'Asia/Qatar': { city: 'Doha', country: 'Qatar' },
    'Asia/Bahrain': { city: 'Manama', country: 'Bahrain' },
    'Asia/Muscat': { city: 'Muscat', country: 'Oman' },
    'Asia/Amman': { city: 'Amman', country: 'Jordan' },
    'Asia/Beirut': { city: 'Beirut', country: 'Lebanon' },
    'Asia/Baghdad': { city: 'Baghdad', country: 'Iraq' },
    'Asia/Damascus': { city: 'Damascus', country: 'Syria' },
    'Africa/Tripoli': { city: 'Tripoli', country: 'Libya' },
    'Africa/Tunis': { city: 'Tunis', country: 'Tunisia' },
    'Africa/Algiers': { city: 'Algiers', country: 'Algeria' },
    'Africa/Casablanca': { city: 'Casablanca', country: 'Morocco' },
    'Africa/Khartoum': { city: 'Khartoum', country: 'Sudan' },
    'Europe/London': { city: 'London', country: 'United Kingdom' },
    'Europe/Paris': { city: 'Paris', country: 'France' },
    'Europe/Berlin': { city: 'Berlin', country: 'Germany' },
    'Europe/Rome': { city: 'Rome', country: 'Italy' },
    'Europe/Madrid': { city: 'Madrid', country: 'Spain' },
    'Europe/Istanbul': { city: 'Istanbul', country: 'Turkey' },
    'America/New_York': { city: 'New York', country: 'United States (ET)' },
    'America/Chicago': { city: 'Chicago', country: 'United States (CT)' },
    'America/Denver': { city: 'Denver', country: 'United States (MT)' },
    'America/Los_Angeles': { city: 'Los Angeles', country: 'United States (PT)' },
    'America/Toronto': { city: 'Toronto', country: 'Canada' },
    'Asia/Tokyo': { city: 'Tokyo', country: 'Japan' },
    'Asia/Singapore': { city: 'Singapore', country: 'Singapore' },
    'Asia/Kolkata': { city: 'New Delhi / Mumbai', country: 'India' },
    'Australia/Sydney': { city: 'Sydney', country: 'Australia' }
};

/**
 * Returns the current user's local timezone, country/city information, and UTC offset.
 */
export function getUserTimezoneInfo(): UserTimezoneInfo {
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const now = new Date();

        // Calculate GMT offset string (e.g. GMT+2 or GMT-5)
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offsetMin) / 60);
        const mins = Math.abs(offsetMin) % 60;
        const offsetString = `GMT${sign}${hours}${mins > 0 ? `:${mins.toString().padStart(2, '0')}` : ''}`;

        // Get timezone abbreviation (e.g. EET, EST, GMT)
        let abbreviation = '';
        try {
            const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now);
            abbreviation = parts.find(p => p.type === 'timeZoneName')?.value || offsetString;
        } catch {
            abbreviation = offsetString;
        }

        // Friendly City & Country
        let cityName = '';
        let countryOrRegion = '';

        if (TIMEZONE_FRIENDLY_NAMES[timeZone]) {
            cityName = TIMEZONE_FRIENDLY_NAMES[timeZone].city;
            countryOrRegion = TIMEZONE_FRIENDLY_NAMES[timeZone].country;
        } else {
            const segments = timeZone.split('/');
            cityName = (segments[1] || segments[0] || 'Local').replace(/_/g, ' ');
            countryOrRegion = (segments[0] || 'Local').replace(/_/g, ' ');
        }

        const friendlyLabel = countryOrRegion
            ? `${cityName}, ${countryOrRegion} (${offsetString})`
            : `${cityName} (${offsetString})`;

        return {
            timeZone,
            cityName,
            countryOrRegion,
            friendlyLabel,
            offsetString,
            abbreviation
        };
    } catch {
        return {
            timeZone: 'UTC',
            cityName: 'Universal',
            countryOrRegion: 'UTC',
            friendlyLabel: 'UTC (GMT+0)',
            offsetString: 'GMT+0',
            abbreviation: 'UTC'
        };
    }
}

/**
 * Formats an ISO datetime string into the user's localized date and time representation.
 * Example: "Nov 12, 08:00 PM (Cairo Time • GMT+2)"
 */
export function formatLocalizedTournamentDateTime(
    dateString?: string,
    includeTzLabel = true
): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const formattedDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });

    const formattedTime = date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (!includeTzLabel) {
        return `${formattedDate}, ${formattedTime}`;
    }

    const tz = getUserTimezoneInfo();
    const cityLabel = tz.cityName || 'Local';
    return `${formattedDate}, ${formattedTime} (${cityLabel} • ${tz.offsetString})`;
}

/**
 * Formats time only in the user's local timezone (e.g. "08:00 PM").
 */
export function formatLocalizedTimeOnly(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Formats the entire tournament opening window with start time, end time, and user's country timezone.
 * Example: "Nov 12, 08:00 PM → 10:00 PM (Cairo Time • GMT+2)"
 */
export function formatLocalizedTournamentWindow(
    startsAt?: string,
    endsAt?: string
): { mainText: string; tzBadge: string } {
    if (!startsAt || !endsAt) {
        return { mainText: 'Flexible Schedule', tzBadge: 'UTC' };
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { mainText: 'Invalid Schedule', tzBadge: 'UTC' };
    }

    const startFormatted = startDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const endFormatted = endDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const tz = getUserTimezoneInfo();
    const tzBadge = `${tz.cityName || 'Local Time'} (${tz.offsetString})`;

    return {
        mainText: `${startFormatted} → ${endFormatted}`,
        tzBadge
    };
}

/**
 * Calculates live opening window status and precise countdowns.
 */
export interface TournamentTimingState {
    isLive: boolean;
    isUpcoming: boolean;
    isEnded: boolean;
    statusLabel: string;
    countdownLabel: string;
    totalSecondsLeft: number;
}

export function evaluateTournamentLiveTiming(
    startsAt?: string,
    endsAt?: string,
    rawStatus?: string,
    currentTimestamp = Date.now()
): TournamentTimingState {
    const start = startsAt ? new Date(startsAt).getTime() : 0;
    const end = endsAt ? new Date(endsAt).getTime() : 0;
    const statusLower = (rawStatus || '').toLowerCase();

    // If explicit completed
    if (statusLower === 'completed' || (end > 0 && currentTimestamp > end)) {
        return {
            isLive: false,
            isUpcoming: false,
            isEnded: true,
            statusLabel: 'Arena Concluded',
            countdownLabel: 'Event Closed',
            totalSecondsLeft: 0
        };
    }

    // Inside opening window
    if (start > 0 && currentTimestamp >= start && (end === 0 || currentTimestamp <= end)) {
        const remMs = end > 0 ? Math.max(0, end - currentTimestamp) : 0;
        const remSecs = Math.floor(remMs / 1000);
        const remMins = Math.floor(remSecs / 60);
        const remHours = Math.floor(remMins / 60);
        const displayMins = remMins % 60;
        const displaySecs = remSecs % 60;

        let countdownLabel = 'Arena is Open!';
        if (end > 0) {
            if (remHours > 0) {
                countdownLabel = `${remHours}h ${displayMins}m left`;
            } else if (remMins > 0) {
                countdownLabel = `${remMins}m ${displaySecs}s left`;
            } else {
                countdownLabel = `${remSecs}s left`;
            }
        }

        return {
            isLive: true,
            isUpcoming: false,
            isEnded: false,
            statusLabel: `Live Now • ${countdownLabel}`,
            countdownLabel,
            totalSecondsLeft: remSecs
        };
    }

    // Upcoming before opening window
    if (start > 0 && currentTimestamp < start) {
        const diffMs = Math.max(0, start - currentTimestamp);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const displayHours = diffHours % 24;
        const displayMins = diffMins % 60;
        const displaySecs = diffSecs % 60;

        let countdownLabel = '';
        if (diffDays > 0) {
            countdownLabel = `Starts in ${diffDays}d ${displayHours}h`;
        } else if (diffHours > 0) {
            countdownLabel = `Starts in ${diffHours}h ${displayMins}m`;
        } else if (diffMins > 0) {
            countdownLabel = `Starts in ${diffMins}m ${displaySecs}s`;
        } else {
            countdownLabel = `Opens in ${diffSecs}s`;
        }

        return {
            isLive: false,
            isUpcoming: true,
            isEnded: false,
            statusLabel: countdownLabel,
            countdownLabel,
            totalSecondsLeft: diffSecs
        };
    }

    // Fallback if dates are not populated
    const isLiveFallback = ['active', 'live'].includes(statusLower);
    return {
        isLive: isLiveFallback,
        isUpcoming: !isLiveFallback,
        isEnded: false,
        statusLabel: isLiveFallback ? 'Live Now' : 'Scheduled',
        countdownLabel: isLiveFallback ? 'Live' : 'Upcoming',
        totalSecondsLeft: 0
    };
}
