import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return options?.addSuffix ? 'just now' : 'now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        const suffix = options?.addSuffix ? ' ago' : '';
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}${suffix}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        const suffix = options?.addSuffix ? ' ago' : '';
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}${suffix}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        const suffix = options?.addSuffix ? ' ago' : '';
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''}${suffix}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        const suffix = options?.addSuffix ? ' ago' : '';
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''}${suffix}`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    const suffix = options?.addSuffix ? ' ago' : '';
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''}${suffix}`;
}

/**
 * Format a date string to avoid timezone issues
 * Extracts just the date part (YYYY-MM-DD) from datetime strings and creates date in local timezone
 */
export function formatDate(dateString: string): string {
    // Extract just the date part (YYYY-MM-DD) from datetime strings
    const dateOnly = dateString.split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Create date object in local timezone
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format a datetime string (keeps timezone behavior for timestamps)
 */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
