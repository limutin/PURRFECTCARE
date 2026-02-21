/**
 * Formats a date string or Date object to "Month Day, Year" format.
 * Example: "January 1, 2026"
 */
export function formatDate(dateStr: string | Date): string {
    if (!dateStr) return 'N/A';
    try {
        const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return typeof dateStr === 'string' ? dateStr : 'N/A';
    }
}
