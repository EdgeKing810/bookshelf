import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

const DEFAULT_API_URL = 'https://api.kinesis.world/x/bookshelf/';
const AUTH_STORAGE_KEY = 'bookshelf.auth';

/** Error thrown by `request` whenever the API response is not successful. */
export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/** The API wraps every response as `{ status, message, ...data }`. */
export interface ApiEnvelope {
	status?: number;
	message?: string;
	[key: string]: unknown;
}

export interface AuthSession {
	id: string;
	jwt: string;
}

/** Response of POST /user/register. */
export interface RegisterResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of POST /user/login and POST /user/login/jwt. */
export interface LoginResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	jwt?: string;
}

/** A platform user as returned by GET /user/me. */
export interface User {
	id: string;
	name: string;
	username: string;
	profile_picture: string;
	created_at?: string;
	updated_at?: string;
}

/** Response of GET /user/me?id={}. */
export interface UserResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	user?: User;
}

/** Response of PATCH /user/update. */
export interface UserUpdateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/**
 * A shelf: an ordered group of books owned by a user. `order` is the vertical
 * position of the shelf within the user's library (0 = top).
 */
export interface Shelf {
	id: string;
	user_id: string;
	name: string;
	description: string;
	order: number;
	created_at?: string;
	updated_at?: string;
}

/** Response of POST /shelf/create, PUT /shelf/update and DELETE /shelf/delete. */
export interface ShelfMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /shelf/fetch. */
export interface ShelfFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	shelves: Shelf[];
	amount: number;
}

/**
 * A book on a shelf. `order` is the horizontal position within its shelf
 * (0 = leftmost). Dates are stored as `YYYY-MM-DD`; empty means not started /
 * not finished.
 */
export interface Book {
	id: string;
	user_id: string;
	shelf_id: string;
	title: string;
	author: string;
	summary: string;
	cover_image: string;
	isbn: string;
	started_date: string;
	finished_date: string;
	order: number;
	created_at?: string;
	updated_at?: string;
}

/** Response of POST /book/create, PUT /book/update and DELETE /book/delete. */
export interface BookMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /book/fetch. */
export interface BookFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	books: Book[];
	amount: number;
}

/** Response of GET /book/search?isbn=… (Google Books auto-fill). */
export interface BookSearchResponse extends ApiEnvelope {
	status: number;
	message: string;
	isbn?: string;
	title?: string;
	author?: string;
	summary?: string;
	cover_image?: string;
}

/** Response of POST /upload (media service, not under the /x/bookshelf/ base). */
export interface UploadResponse extends ApiEnvelope {
	status: number;
	message: string;
	/** Relative media path, e.g. `uploads/abc.png`. Build a full URL with `mediaUrl()`. */
	path: string;
	id: string;
	file_type: string;
	file_size: number;
	security: string;
}

function normalizeBaseUrl(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function resolveApiUrl(): string {
	const raw = import.meta.env.PUBLIC_API_URL;
	return raw && raw.trim() ? normalizeBaseUrl(raw) : DEFAULT_API_URL;
}

/**
 * Origin of the media service — the API host WITHOUT the `/x/bookshelf/` path
 * (media URLs are `<origin>/<path>`). Prefer PUBLIC_MEDIA_ORIGIN, then derive
 * from an absolute API URL, then the page origin.
 */
function resolveMediaOrigin(): string {
	const raw = import.meta.env.PUBLIC_MEDIA_ORIGIN;
	if (raw && raw.trim()) return raw.trim().replace(/\/+$/, '');
	try {
		return new URL(resolveApiUrl()).origin;
	} catch {
		try {
			return window.location.origin;
		} catch {
			return '';
		}
	}
}

/**
 * Origin for the upload POST (lives at `/upload`, not under the API base).
 * PUBLIC_UPLOAD_ORIGIN overrides; an empty value means "relative" (dev, where
 * `/upload` is proxied to the API host to avoid CORS). Falls back to the
 * media origin when not configured.
 */
function resolveUploadOrigin(): string {
	const raw = import.meta.env.PUBLIC_UPLOAD_ORIGIN;
	if (raw === undefined || raw === null) return resolveMediaOrigin();
	return raw.trim().replace(/\/+$/, '');
}

/** Parse an API envelope, honoring the body `status` over the HTTP status. */
async function parseEnvelope<T extends ApiEnvelope>(response: Response): Promise<T> {
	let body: T;
	try {
		body = (await response.json()) as T;
	} catch {
		throw new ApiError(response.status, `Unexpected response (${response.status} ${response.statusText})`);
	}
	// The API may return HTTP 200 with a non-2xx `status` field in the JSON
	// body, so the body `status` takes precedence when present.
	const status = typeof body?.status === 'number' ? body.status : response.status;
	const ok = response.ok && status >= 200 && status < 300;
	if (!ok) {
		throw new ApiError(status, body?.message ?? `Request failed (${status})`);
	}
	return body;
}

export interface AppContextValue {
	/** Normalized base URL of the Kinesis Bookshelf REST API (from PUBLIC_API_URL). */
	apiUrl: string;
	/** Build an absolute URL for a relative API path, e.g. `api('shelf/fetch')`. */
	api: (path: string) => string;
	/**
	 * JSON request helper against the API base URL.
	 * Attaches `Authorization: Bearer <jwt>` when a session exists and throws an
	 * `ApiError` (carrying the API `message`) on any non-successful response.
	 */
	request: <T extends ApiEnvelope>(path: string, init?: RequestInit) => Promise<T>;
	/** The authenticated session (id + jwt), persisted to localStorage. */
	auth: AuthSession | null;
	/** Sign in via POST /user/login. */
	login: (username: string, password: string) => Promise<LoginResponse>;
	/** Reauthenticate via POST /user/login/jwt using the stored session. */
	reauthenticate: () => Promise<LoginResponse>;
	/** Clear the stored session. */
	logout: () => void;
	/** Upload a file to the media service (always PUBLIC on Bookshelf). */
	upload: (file: File) => Promise<UploadResponse>;
	/** Build a public URL for an uploaded media `path`. */
	mediaUrl: (path: string) => string;
	/** Auto-fill book details from Google Books via ISBN (GET /book/search). */
	searchBook: (isbn: string) => Promise<BookSearchResponse>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const apiUrl = useMemo(() => resolveApiUrl(), []);

	const [auth, setAuth] = useState<AuthSession | null>(() => {
		try {
			const raw = localStorage.getItem(AUTH_STORAGE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as AuthSession;
			return parsed && typeof parsed.id === 'string' && typeof parsed.jwt === 'string' ? parsed : null;
		} catch {
			return null;
		}
	});

	useEffect(() => {
		try {
			if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
			else localStorage.removeItem(AUTH_STORAGE_KEY);
		} catch {
			// Ignore storage errors (private mode, etc.).
		}
	}, [auth]);

	const api = useCallback((path: string) => `${apiUrl}${path.replace(/^\/+/, '')}`, [apiUrl]);

	const mediaOrigin = useMemo(() => resolveMediaOrigin(), []);
	const uploadOrigin = useMemo(() => resolveUploadOrigin(), []);

	const mediaUrl = useCallback(
		(path: string) => `${mediaOrigin}/${path.replace(/^\/+/, '')}`,
		[mediaOrigin],
	);

	const request = useCallback(
		async <T extends ApiEnvelope,>(path: string, init: RequestInit = {}): Promise<T> => {
			const headers = new Headers(init.headers);
			// The API expects `Content-Type: application/json` on requests (e.g.
			// DELETE), even when there is no body.
			if (!headers.has('Content-Type')) {
				headers.set('Content-Type', 'application/json');
			}
			if (auth?.jwt) {
				headers.set('Authorization', `Bearer ${auth.jwt}`);
			}

			const response = await fetch(api(path), { ...init, headers });
			return parseEnvelope<T>(response);
		},
		[api, auth?.jwt],
	);

	const upload = useCallback(
		async (file: File): Promise<UploadResponse> => {
			const formData = new FormData();
			formData.append('file', file);

			const headers = new Headers();
			if (auth?.jwt) {
				headers.set('Authorization', `Bearer ${auth.jwt}`);
			}

			// All Bookshelf media is public — no stream / private endpoint.
			const response = await fetch(
				`${uploadOrigin}/upload?security=PUBLIC&project_id=bookshelf`,
				{
					method: 'POST',
					headers,
					body: formData,
				},
			);
			return parseEnvelope<UploadResponse>(response);
		},
		[uploadOrigin, auth?.jwt],
	);

	const login = useCallback(
		async (username: string, password: string) => {
			const result = await request<LoginResponse>('user/login', {
				method: 'POST',
				body: JSON.stringify({ username, password }),
			});
			if (result.id && result.jwt) {
				setAuth({ id: result.id, jwt: result.jwt });
			}
			return result;
		},
		[request],
	);

	const reauthenticate = useCallback(async () => {
		if (!auth) throw new ApiError(401, 'No active session.');
		const result = await request<LoginResponse>('user/login/jwt', {
			method: 'POST',
			body: JSON.stringify({ id: auth.id }),
		});
		if (result.id && result.jwt) {
			setAuth({ id: result.id, jwt: result.jwt });
		}
		return result;
	}, [auth, request]);

	const logout = useCallback(() => setAuth(null), []);

	const searchBook = useCallback(
		async (isbn: string) => request<BookSearchResponse>(`book/search?isbn=${encodeURIComponent(isbn.trim())}`),
		[request],
	);

	const value = useMemo<AppContextValue>(
		() => ({
			apiUrl,
			api,
			request,
			auth,
			login,
			reauthenticate,
			logout,
			upload,
			mediaUrl,
			searchBook,
		}),
		[apiUrl, api, request, auth, login, reauthenticate, logout, upload, mediaUrl, searchBook],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error('useApp must be used within an <AppProvider>.');
	}
	return context;
}