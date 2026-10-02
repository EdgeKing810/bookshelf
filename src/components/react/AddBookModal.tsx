import { useCallback, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import {
  ApiError,
  useApp,
  type Book,
  type BookFetchResponse,
  type BookMutationResponse,
  type BookStatus,
  type Shelf,
} from '../../context/AppContext';
import { toApiDate } from '../../lib/dates';
import { normalizeIsbn } from '../../lib/books';
import BarcodeScanner from './BarcodeScanner';
import ErrorBoundary from './ErrorBoundary';
import StarRating, { ratingToStars } from './StarRating';

const inputClass = 'input input-bordered mt-1 w-full';
const labelClass = 'text-sm font-medium text-base-content';

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'WANT_TO_READ', label: 'Want to read' },
  { value: 'READING', label: 'Currently reading' },
  { value: 'FINISHED', label: 'Finished' },
];

type Tab = 'isbn' | 'title' | 'manual';

export default function AddBookModal({
  shelfId,
  shelves,
  books,
  editing,
  onClose,
  onSaved,
}: {
  shelfId: string | null;
  shelves: Shelf[];
  books: Book[];
  editing: Book | null;
  onClose: () => void;
  /** Called with the newly created/updated book so the parent can update local
   * state without refetching everything. `isNew` is true for creates. */
  onSaved: (book: Book, isNew: boolean) => void;
}) {
  const { auth, request, upload, mediaUrl } = useApp();

  const [shelf, setShelf] = useState(editing?.shelf_id ?? shelfId ?? shelves[0]?.id ?? '');
  const [tab, setTab] = useState<Tab>(editing ? 'manual' : 'isbn');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [author, setAuthor] = useState(editing?.author ?? '');
  const [summary, setSummary] = useState(editing?.summary ?? '');
  const [coverImage, setCoverImage] = useState(editing?.cover_image ?? '');
  const [numPages, setNumPages] = useState(editing?.num_pages ? String(editing.num_pages) : '');
  const [genres, setGenres] = useState(editing?.genres?.join(', ') ?? '');
  const [quotes, setQuotes] = useState(editing?.quotes?.join('\n') ?? '');
  const [rating, setRating] = useState(editing?.rating ? String(editing.rating) : '5');
  const [isbn, setIsbn] = useState(editing?.isbn ?? '');
  const [googleBooksId, setGoogleBooksId] = useState(editing?.google_books_id ?? '');
  const [dateStarted, setDateStarted] = useState(editing?.date_started ?? '');
  const [dateEnded, setDateEnded] = useState(editing?.date_ended ?? '');
  const [status, setStatus] = useState<BookStatus>(editing?.status ?? 'WANT_TO_READ');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creatingByIsbn, setCreatingByIsbn] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [searchTitle, setSearchTitle] = useState('');
  const [creatingByTitle, setCreatingByTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  async function handleCreateByTitle(value?: string) {
    if (!auth) return;
    const trimmed = (value ?? searchTitle).trim();
    if (!trimmed) {
      setTitleError('Enter a title to look up.');
      return;
    }
    setError(null);
    setMessage(null);
    setTitleError(null);
    setCreatingByTitle(true);
    try {
      // The new book lands at the end of the chosen shelf (or the library).
      const candidates = shelf.trim() ? books.filter((b) => b.shelf_id === shelf.trim()) : books;
      const last = candidates.reduce<number>((max, b) => Math.max(max, b.position), -1);
      const res = await request<BookMutationResponse>('book/create/title', {
        method: 'POST',
        body: JSON.stringify({
          id: auth.id,
          shelf_id: shelf.trim(),
          title: trimmed,
          position: last + 1,
        }),
      });
      // Grab the created book back by id and hand it to the parent for a local update.
      const fetched = await request<BookFetchResponse>(
        `book/fetch?id=${encodeURIComponent(auth.id)}&book_id=${encodeURIComponent(res.id)}&limit=1&offset=0`,
      );
      const created = fetched.books?.[0];
      if (created) onSaved(created, true);
      setMessage(res.message ?? 'Book added from title.');
      onClose();
    } catch (err) {
      setTitleError(err instanceof ApiError ? err.message : 'Failed to look up that title.');
    } finally {
      setCreatingByTitle(false);
    }
  }

  async function handleCreateByIsbn(value?: string) {
    if (!auth) return;
    const trimmed = (value ?? isbn).trim();
    if (!trimmed) {
      setIsbnError('Enter an ISBN to look up.');
      return;
    }
    setError(null);
    setMessage(null);
    setIsbnError(null);
    setCreatingByIsbn(true);
    try {
      // The new book lands at the end of the chosen shelf (or the library).
      const candidates = shelf.trim() ? books.filter((b) => b.shelf_id === shelf.trim()) : books;
      const last = candidates.reduce<number>((max, b) => Math.max(max, b.position), -1);
      const res = await request<BookMutationResponse>('book/create/isbn', {
        method: 'POST',
        body: JSON.stringify({
          id: auth.id,
          shelf_id: shelf.trim(),
          isbn: trimmed,
          position: last + 1,
        }),
      });
      // The route pulls details from OpenLibrary, so grab the created book
      // back by id and hand it to the parent for a local update.
      const fetched = await request<BookFetchResponse>(
        `book/fetch?id=${encodeURIComponent(auth.id)}&book_id=${encodeURIComponent(res.id)}&limit=1&offset=0`,
      );
      const created = fetched.books?.[0];
      if (created) onSaved(created, true);
      setMessage(res.message ?? 'Book added from ISBN.');
      onClose();
    } catch (err) {
      setIsbnError(err instanceof ApiError ? err.message : 'Failed to look up that ISBN.');
    } finally {
      setCreatingByIsbn(false);
    }
  }

  const handleScanned = useCallback(
    (rawValue: string) => {
      setScanning(false);
      const cleaned = normalizeIsbn(rawValue);
      if (!cleaned) return;
      setIsbn(cleaned);
      void handleCreateByIsbn(cleaned);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, isbn, shelf, books, onSaved, onClose],
  );

  async function handleCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await upload(file);
      setCoverImage(mediaUrl(res.path));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!author.trim()) next.author = 'Author is required.';
    if (!summary.trim()) next.summary = 'A short summary is required.';
    if (!numPages) next.numPages = 'Number of pages is required.';
    else if (Number(numPages) < 1 || !Number.isFinite(Number(numPages))) {
      next.numPages = 'Pages must be 1 or more.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    setError(null);
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const parsedGenres = genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
      const parsedQuotes = quotes
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        shelf_id: shelf.trim(),
        title: title.trim(),
        author: author.trim(),
        summary: summary.trim(),
        cover_image: coverImage.trim(),
        num_pages: numPages ? Number(numPages) : 0,
        genres: parsedGenres,
        quotes: parsedQuotes,
        rating: Number(rating) || 0,
        isbn: isbn.trim(),
        google_books_id: googleBooksId.trim(),
        date_started: toApiDate(dateStarted) ?? '',
        date_ended: toApiDate(dateEnded) ?? '',
        status,
      };

      if (editing) {
        payload.position = editing.position;
        const res = await request<BookMutationResponse>('book/update', {
          method: 'PUT',
          body: JSON.stringify({ id: auth.id, book_id: editing.id, ...payload }),
        });
        setMessage(res.message ?? 'Book updated.');
        onSaved({ ...editing, ...(payload as unknown as Partial<Book>), id: editing.id }, false);
      } else {
        // A new book lands at the end of its shelf (or the end of the library
        // when no shelf is chosen).
        const candidates = shelf.trim() ? books.filter((b) => b.shelf_id === shelf.trim()) : books;
        const last = candidates.reduce<number>((max, b) => Math.max(max, b.position), -1);
        payload.position = last + 1;
        const res = await request<BookMutationResponse>('book/create', {
          method: 'POST',
          body: JSON.stringify({ id: auth.id, ...payload }),
        });
        setMessage(res.message ?? 'Book added to your shelf.');
        onSaved(
          {
            id: res.id,
            owner_id: auth.id,
            ...(payload as unknown as Partial<Book>),
            position: payload.position as number,
          } as Book,
          true,
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save book.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={editing ? 'Edit book' : 'Add a book'}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-base-300 bg-base-100 p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-base-content">
            {editing ? 'Edit book' : 'Add a book'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-sm btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Shared shelf selector */}
          <label className="block">
            <span className={labelClass}>Shelf <span className="opacity-60">(optional)</span></span>
            <select value={shelf} onChange={(e) => setShelf(e.target.value)} className="select select-bordered mt-1 w-full">
              <option value="">No shelf</option>
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          {/* Tabs */}
          {!editing && (
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-base-300 bg-base-200 p-1" role="tablist">
              {(
                [
                  { id: 'isbn', label: 'By ISBN' },
                  { id: 'title', label: 'By title' },
                  { id: 'manual', label: 'Manual' },
                ] as { id: Tab; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-2 py-2 text-sm font-medium transition ${
                    tab === t.id ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ISBN lookup panel */}
          {tab === 'isbn' && (
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>ISBN</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateByIsbn();
                      }
                    }}
                    placeholder="e.g. 9780810993136"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setScanning(true)}
                    className="btn btn-outline btn-secondary mt-1 shrink-0"
                    aria-label="Scan a barcode"
                    title="Scan a barcode"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                      <path d="M3 5v14" />
                      <path d="M8 5v14" />
                      <path d="M12 5v14" />
                      <path d="M17 5v14" />
                      <path d="M21 5v14" />
                    </svg>
                    <span className="hidden sm:inline">Scan</span>
                  </button>
                </div>
              </label>
              <p className="rounded-xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm opacity-70">
                We'll look the book up on OpenLibrary by ISBN and add it for you — cover, title, author, pages and
                genres included.
              </p>
              {isbnError && (
                <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{isbnError}</p>
              )}
            </div>
          )}

          {/* Title lookup panel */}
          {tab === 'title' && (
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateByTitle();
                    }
                  }}
                  placeholder="e.g. The Name of the Wind"
                  className={inputClass}
                />
              </label>
              <p className="rounded-xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm opacity-70">
                We'll look the book up on OpenLibrary by title and add it for you — cover, title, author, pages and
                genres included.
              </p>
              {titleError && (
                <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{titleError}</p>
              )}
            </div>
          )}

          {/* Manual form */}
          {tab === 'manual' && (
            <>
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            {/* Cover */}
            <div className="flex flex-col items-start">
              <span className={labelClass}>Cover</span>
              <div className="mt-1">
                {coverImage ? (
                  <img src={coverImage} alt="Cover preview" className="h-44 w-32 rounded-xl border border-base-300 object-cover" />
                ) : (
                  <span className="flex h-44 w-32 items-center justify-center rounded-xl border-2 border-dashed border-base-300 text-base-content/40">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </span>
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-outline btn-secondary btn-sm mt-2 w-32">
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
            </div>

            <div className="min-w-0 space-y-4">
              <label className="block">
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Name of the Wind"
                  className={errors.title ? `${inputClass} input-error` : inputClass}
                />
                {errors.title && <span className="mt-1 block text-xs text-error">{errors.title}</span>}
              </label>

              <label className="block">
                <span className={labelClass}>Author</span>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Patrick Rothfuss"
                  className={errors.author ? `${inputClass} input-error` : inputClass}
                />
                {errors.author && <span className="mt-1 block text-xs text-error">{errors.author}</span>}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)} className="select select-bordered mt-1 w-full">
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Cover image URL</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://… or upload a file"
                    className="input input-bordered mt-1 w-full"
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="block">
            <span className={labelClass}>Summary</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              placeholder="A short summary or your own notes…"
              className={`textarea textarea-bordered mt-1 w-full ${errors.summary ? 'textarea-error' : ''}`}
            />
            {errors.summary && <span className="mt-1 block text-xs text-error">{errors.summary}</span>}
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Genres <span className="opacity-60">(comma-separated)</span></span>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Fantasy, Adventure"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Rating</span>
              <div className="mt-1.5 flex items-center gap-2">
                <StarRating value={Number(rating) || 0} onChange={(r) => setRating(String(r))} size={22} />
                <span className="text-sm tabular-nums opacity-60">
                  {ratingToStars(Number(rating) || 0).toFixed(1)} / 5
                </span>
              </div>
            </label>
            <label className="block">
              <span className={labelClass}>Pages</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                autoComplete="off"
                value={numPages}
                onChange={(e) => setNumPages(e.target.value)}
                placeholder="e.g. 400"
                className={errors.numPages ? `${inputClass} input-error` : inputClass}
              />
              {errors.numPages && <span className="mt-1 block text-xs text-error">{errors.numPages}</span>}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>ISBN</span>
              <input
                type="text"
                autoComplete="off"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-0-…"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Started</span>
              <input type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Finished</span>
              <input type="date" value={dateEnded} onChange={(e) => setDateEnded(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Quotes <span className="opacity-60">(one per line)</span></span>
            <textarea
              value={quotes}
              onChange={(e) => setQuotes(e.target.value)}
              rows={3}
              placeholder={"\"Fear is the mind-killer.\"\n\"The mystery of life isn't a problem to solve…\""}
              className="textarea textarea-bordered mt-1 w-full"
            />
          </label>

          <label className="block">
            <span className={labelClass}>
              Google Books ID <span className="opacity-60">(optional)</span>
            </span>
            <input
              type="text"
              value={googleBooksId}
              onChange={(e) => setGoogleBooksId(e.target.value)}
              placeholder="e.g. UxT-CAAAQBAJ"
              className={inputClass}
            />
          </label>
          </>)}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || creatingByIsbn || creatingByTitle}
              className="btn btn-outline"
            >
              Cancel
            </button>
            {tab === 'isbn' ? (
              <button type="button" onClick={() => handleCreateByIsbn()} disabled={creatingByIsbn} className="btn btn-primary">
                {creatingByIsbn ? 'Looking up…' : 'Add by ISBN'}
              </button>
            ) : tab === 'title' ? (
              <button type="button" onClick={() => handleCreateByTitle()} disabled={creatingByTitle} className="btn btn-primary">
                {creatingByTitle ? 'Looking up…' : 'Add by title'}
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add to shelf'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
    {scanning && (
      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
            <p className="text-sm text-white/90">The barcode scanner couldn't be opened on this device.</p>
            <button type="button" onClick={() => setScanning(false)} className="btn btn-primary">
              Close
            </button>
          </div>
        }
      >
        <BarcodeScanner onDetected={handleScanned} onClose={() => setScanning(false)} />
      </ErrorBoundary>
    )}
    </>
  );
}