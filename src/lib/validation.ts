export const USERNAME_MIN_LENGTH = 3;

/**
 * Password policy (per Kinesis Bookshelf spec):
 * at least 8 characters, with 1 lowercase, 1 uppercase, 1 number and 1 symbol.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Basic ISBN-10 / ISBN-13 shape (digits, optional hyphens, optional X). */
export const ISBN_REGEX = /^(?:97[89][- ]?)?(?:\d[- ]?){9}[\dX]$/i;

export function isValidUsername(value: string): boolean {
	return value.trim().length >= USERNAME_MIN_LENGTH;
}

export function isValidPassword(value: string): boolean {
	return PASSWORD_REGEX.test(value);
}

export function isValidIsbn(value: string): boolean {
	return ISBN_REGEX.test(value.trim().replace(/\s+/g, ''));
}