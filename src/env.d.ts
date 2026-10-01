/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** Base URL of the Kinesis Bookshelf REST API, e.g. http://localhost:8080/x/bookshelf/ */
	readonly PUBLIC_API_URL: string;
	/** Origin for media URLs (`<origin>/<path>`), the API host without `/x/bookshelf/`. */
	readonly PUBLIC_MEDIA_ORIGIN?: string;
	/** Base for the upload POST (`/upload`, not under the API base). Empty = proxied. */
	readonly PUBLIC_UPLOAD_ORIGIN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}