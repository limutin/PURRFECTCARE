/**
 * Parses a date value. Plain "YYYY-MM-DD" strings are treated as local dates
 * (not UTC) so they never shift a day depending on the timezone.
 */
function toDate(dateStr: string | Date): Date {
    if (dateStr instanceof Date) return dateStr;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(dateStr);
}

/**
 * Formats a date string or Date object to "Month Day, Year" format.
 * Example: "January 1, 2026"
 */
export function formatDate(dateStr: string | Date): string {
    if (!dateStr) return 'N/A';
    try {
        const date = toDate(dateStr);
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

/** Today's date as "YYYY-MM-DD" in the device's local timezone (not UTC). */
export function todayLocal(date: Date = new Date()): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
}
