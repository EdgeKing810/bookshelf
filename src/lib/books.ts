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
 * Deterministic hash from a string, used to pick a stable spine color/size.
 */
export function hashString(value: string): number {
	let hash = 0;
	const input = value || 'unknown';
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
	}
	return hash;
}

/** Cloth-binding tones for book spines — derived from the accent hue so the
 * whole shelf stays cohesive, with per-book lightness/chroma/offset variety. */
const SPINE_OFFSETS = [-75, -40, -10, 15, 45, 75, 110, 150] as const;
const SPINE_LIGHTS = [0.5, 0.56, 0.62, 0.46, 0.54, 0.6] as const;
const SPINE_CHROMAS = [0.11, 0.09, 0.12, 0.08, 0.1, 0.13] as const;

/**
 * Cloth-binding color for a book's spine (stable across renders, follows the
 * user's chosen accent hue). Returns a fully-resolved `oklch(...)` string so
 * it works in every browser that supports the theme itself.
 */
export function spineColor(bookId: string, title: string, accentHue: number): string {
	const h = hashString(`${bookId}:${title}`);
	const offset = SPINE_OFFSETS[h % SPINE_OFFSETS.length];
	const light = SPINE_LIGHTS[(h >> 3) % SPINE_LIGHTS.length];
	const chroma = SPINE_CHROMAS[(h >> 5) % SPINE_CHROMAS.length];
	const hue = (((accentHue + offset) % 360) + 360) % 360;
	return `oklch(${light} ${chroma} ${hue})`;
}

/** Spine width in px — books vary slightly, like a real shelf. */
export function spineWidth(bookId: string, title: string): number {
	return 32 + (hashString(`${bookId}#${title}`) % 4) * 4; // 32–44px
}

/** Spine height in px — a bit of variety, all books still stand on the plank. */
export function spineHeight(bookId: string, title: string): number {
	return 132 + (hashString(`${bookId}${title}@`) % 5) * 10; // 132–172px
}