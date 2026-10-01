/**
 * Convert a `date` input value ("YYYY-MM-DD") into the API's date format,
 * e.g. "2026-09-27". Returns `null` if the input is empty or invalid.
 */
export function toApiDate(value: string): string | null {
	const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const [, y, mo, d] = m;
	const year = parseInt(y, 10);
	const month = parseInt(mo, 10);
	const day = parseInt(d, 10);
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	const date = new Date(Date.UTC(year, month - 1, day));
	if (Number.isNaN(date.getTime())) return null;
	return `${y}-${mo}-${d}`;
}

/** Human-friendly formatting of an ISO date, e.g. "Sep 27, 2026". */
export function formatDate(value?: string | null): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** True when the book has been read (a finished date is set). */
export function isFinished(value?: string | null): boolean {
	return Boolean(value && value.trim().length > 0);
}