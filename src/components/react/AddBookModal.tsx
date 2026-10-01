import { useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import {
  ApiError,
  useApp,
  type Book,
  type BookMutationResponse,
  type BookSearchResponse,
  type Shelf,
} from '../../context/AppContext';
import { toApiDate } from '../../lib/dates';
import { isValidIsbn } from '../../lib/validation';

type Tab = 'search' | 'manual';

const inputClass = 'input input-bordered mt-1 w-full';
const labelClass = 'text-sm font-medium text-base-content';

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
  onSaved: () => Promise<void>;
}) {
  const { auth, request, upload, mediaUrl, searchBook } = useApp();

  const [tab, setTab] = useState<Tab>(editing ? 'manual' : 'search');
  const [shelf, setShelf] = useState(editing?.shelf_id ?? shelfId ?? shelves[0]?.id ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [author, setAuthor] = useState(editing?.author ?? '');
  const [summary, setSummary] = useState(editing?.summary ?? '');
  const [coverImage, setCoverImage] = useState(editing?.cover_image ?? '');
  const [isbn, setIsbn] = useState(editing?.isbn ?? '');
  const [started, setStarted] = useState(editing?.started_date ?? '');
  const [finished, setFinished] = useState(editing?.finished_date ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ISBN search state
  const [searchIsbn, setSearchIsbn] = useState(editing?.isbn ?? '');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<BookSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    setSearchError(null);
    setSearchResult(null);
    if (!isValidIsbn(searchIsbn)) {
      setSearchError('Enter a valid ISBN-10 or ISBN-13.');
      return;
    }
    setSearching(true);
    try {
      const result = await searchBook(searchIsbn);
      setSearchResult(result);
      setSearchError(null);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  }

  function useSearchResult() {
    if (!searchResult) return;
    if (searchResult.title) setTitle(searchResult.title);
    if (searchResult.author) setAuthor(searchResult.author);
    if (searchResult.summary) setSummary(searchResult.summary);
    if (searchResult.cover_image) setCoverImage(searchResult.cover_image);
    if (searchResult.isbn) setIsbn(searchResult.isbn);
    setTab('manual');
  }

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
    if (!shelf) next.shelf = 'Choose a shelf.';
    if (!title.trim()) next.title = 'Title is required.';
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
      const shelfBooks = books
        .filter((b) => b.shelf_id === shelf && b.id !== editing?.id)
        .sort((a, b) => a.order - b.order);
      const nextOrder = shelfBooks.length > 0 ? shelfBooks[shelfBooks.length - 1].order + 1 : 0;

      const payload: Record<string, unknown> = {
        shelf_id: shelf,
        title: title.trim(),
        author: author.trim(),
        summary: summary.trim(),
        cover_image: coverImage.trim(),
        isbn: isbn.trim(),
        started_date: toApiDate(started) ?? '',
        finished_date: toApiDate(finished) ?? '',
      };

      if (editing) {
        const res = await request<BookMutationResponse>('book/update', {
          method: 'PUT',
          body: JSON.stringify({ id: auth.id, book_id: editing.id, ...payload }),
        });
        setMessage(res.message ?? 'Book updated.');
      } else {
        payload.order = nextOrder;
        const res = await request<BookMutationResponse>('book/create', {
          method: 'POST',
          body: JSON.stringify({ id: auth.id, ...payload }),
        });
        setMessage(res.message ?? 'Book added to your shelf.');
      }
      await onSaved();
      setTimeout(onClose, 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save book.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
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

        {/* Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-base-300 bg-base-200 p-1" role="tablist">
          {(
            [
              { id: 'search', label: 'Search by ISBN' },
              { id: 'manual', label: 'Fill manually' },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === t.id ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* ISBN search panel */}
          {tab === 'search' && (
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>ISBN</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchIsbn}
                    onChange={(e) => setSearchIsbn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="978-0-…"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="btn btn-primary mt-1"
                  >
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                </div>
              </label>

              {searchError && (
                <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{searchError}</p>
              )}

              {searchResult && searchResult.title && (
                <div className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/50 p-4 sm:flex-row">
                  {searchResult.cover_image ? (
                    <img
                      src={searchResult.cover_image}
                      alt=""
                      className="h-40 w-28 shrink-0 rounded-lg border border-base-300 object-cover"
                    />
                  ) : (
                    <span className="flex h-40 w-28 shrink-0 items-center justify-center rounded-lg bg-base-300 text-base-content/40">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      </svg>
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold text-base-content">{searchResult.title}</h3>
                    <p className="text-sm text-base-content/70">{searchResult.author}</p>
                    <p className="mt-1 text-xs opacity-60">{searchResult.isbn}</p>
                    {searchResult.summary && (
                      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-base-content/70">{searchResult.summary}</p>
                    )}
                    <button type="button" onClick={useSearchResult} className="btn btn-primary btn-sm mt-4">
                      Use these details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual form */}
          {tab === 'manual' && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
                {/* Cover */}
                <div>
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
                  <div className="mt-2 w-32 space-y-2">
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Image URL"
                      className="input input-bordered input-sm w-full"
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-outline btn-secondary btn-sm w-full">
                      {uploading ? 'Uploading…' : 'Upload image'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
                  </div>
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
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Shelf</span>
                    <select
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      className={`select select-bordered mt-1 w-full ${errors.shelf ? 'select-error' : ''}`}
                    >
                      {shelves.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {errors.shelf && <span className="mt-1 block text-xs text-error">{errors.shelf}</span>}
                  </label>
                </div>
              </div>

              <label className="block">
                <span className={labelClass}>Summary</span>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="A short summary or your own notes…"
                  className="textarea textarea-bordered mt-1 w-full"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={labelClass}>ISBN</span>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-0-…"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Started</span>
                  <input type="date" value={started} onChange={(e) => setStarted(e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Finished</span>
                  <input type="date" value={finished} onChange={(e) => setFinished(e.target.value)} className={inputClass} />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add to shelf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}