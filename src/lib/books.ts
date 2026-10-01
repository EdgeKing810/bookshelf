/**
 * Take an author string like "Stephen King" and produce initials "SK".
 */
export function authorInitials(author: string): string {
	return author
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase();
}

/**
 * Normalize an ISBN for display: strip separators, keep the digits/X.
 */
export function normalizeIsbn(isbn: string): string {
	return isbn.replace(/[-\s]/g, '');
}

/**
 * Truncate a long summary for card previews while keeping whole words.
 */
export function previewText(text: string, max = 180): string {
	const clean = text.trim().replace(/\s+/g, ' ');
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max);
	const lastSpace = cut.lastIndexOf(' ');
	return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/**
 * Nice label for a reading status derived from the read dates.
 */
export function readingStatus(started: string, finished: string): 'unread' | 'reading' | 'finished' {
	if (finished && finished.trim()) return 'finished';
	if (started && started.trim()) return 'reading';
	return 'unread';
}