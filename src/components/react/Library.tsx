import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
  AppProvider,
  ApiError,
  useApp,
  type Book,
  type BookMutationResponse,
  type BookFetchResponse,
  type Shelf,
  type ShelfFetchResponse,
  type ShelfMutationResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import ShelfRow from './ShelfRow';
import AddBookModal from './AddBookModal';

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function LibraryInner() {
  const { auth, request } = useApp();
  const ready = useMinDelay(450);

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New shelf form
  const [showNewShelf, setShowNewShelf] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Add / edit book modal
  const [modal, setModal] = useState<{ shelfId: string | null; editing: Book | null } | null>(null);

  // Book delete confirmation
  const [confirmBook, setConfirmBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState(false);

  const loadData = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const [shelfRes, bookRes] = await Promise.all([
        request<ShelfFetchResponse>(`shelf/fetch?id=${encodeURIComponent(auth.id)}`),
        request<BookFetchResponse>(`book/fetch?id=${encodeURIComponent(auth.id)}`),
      ]);
      setShelves(sortByOrder(shelfRes.shelves ?? []));
      setBooks(sortByOrder(bookRes.books ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your library.');
    } finally {
      setLoading(false);
    }
  }, [auth, request]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const booksForShelf = useCallback(
    (shelfId: string) => sortByOrder(books.filter((b) => b.shelf_id === shelfId)),
    [books],
  );

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function handleCreateShelf(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !newName.trim()) return;
    clearFeedback();
    setCreating(true);
    try {
      const res = await request<ShelfMutationResponse>('shelf/create', {
        method: 'POST',
        body: JSON.stringify({
          id: auth.id,
          name: newName.trim(),
          description: newDescription.trim(),
          order: shelves.length,
        }),
      });
      setMessage(res.message ?? 'Shelf created.');
      setNewName('');
      setNewDescription('');
      setShowNewShelf(false);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create shelf.');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateShelf(shelfId: string, name: string, description: string) {
    if (!auth) return;
    clearFeedback();
    try {
      const res = await request<ShelfMutationResponse>('shelf/update', {
        method: 'PUT',
        body: JSON.stringify({ id: auth.id, shelf_id: shelfId, name, description }),
      });
      setMessage(res.message ?? 'Shelf updated.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update shelf.');
    }
  }

  async function handleDeleteShelf(shelfId: string) {
    if (!auth) return;
    clearFeedback();
    setBusy(true);
    try {
      const res = await request<ShelfMutationResponse>(
        `shelf/delete?id=${encodeURIComponent(auth.id)}&shelf_id=${encodeURIComponent(shelfId)}`,
        { method: 'DELETE' },
      );
      setMessage(res.message ?? 'Shelf deleted.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete shelf.');
    } finally {
      setBusy(false);
    }
  }

  async function moveShelf(index: number, direction: -1 | 1) {
    if (!auth) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= shelves.length) return;
    clearFeedback();
    setBusy(true);
    const previous = [...shelves];
    const next = [...shelves];
    const a = next[index];
    const b = next[nextIndex];
    next[index] = { ...b, order: a.order };
    next[nextIndex] = { ...a, order: b.order };
    setShelves(next);
    try {
      await Promise.all([
        request<ShelfMutationResponse>('shelf/update', {
          method: 'PUT',
          body: JSON.stringify({ id: auth?.id, shelf_id: next[index].id, order: next[index].order }),
        }),
        request<ShelfMutationResponse>('shelf/update', {
          method: 'PUT',
          body: JSON.stringify({ id: auth?.id, shelf_id: next[nextIndex].id, order: next[nextIndex].order }),
        }),
      ]);
    } catch (err) {
      setShelves(previous);
      setError(err instanceof ApiError ? err.message : 'Failed to reorder shelves.');
    } finally {
      setBusy(false);
    }
  }

  async function moveBook(bookId: string, direction: -1 | 1) {
    if (!auth) return;
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    const shelfBooks = sortByOrder(books.filter((b) => b.shelf_id === book.shelf_id));
    const index = shelfBooks.findIndex((b) => b.id === bookId);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= shelfBooks.length) return;

    clearFeedback();
    setBusy(true);
    const previous = books;
    const a = shelfBooks[index];
    const b = shelfBooks[nextIndex];
    const updated: Book[] = [
      { ...b, order: a.order },
      { ...a, order: b.order },
    ];
    setBooks((cur) => cur.map((item) => updated.find((u) => u.id === item.id) ?? item));
    try {
      await Promise.all(
        updated.map((item) =>
          request<BookMutationResponse>('book/update', {
            method: 'PUT',
            body: JSON.stringify({ id: auth?.id, book_id: item.id, order: item.order }),
          }),
        ),
      );
    } catch (err) {
      setBooks(previous);
      setError(err instanceof ApiError ? err.message : 'Failed to reorder books.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBook() {
    if (!auth || !confirmBook) return;
    clearFeedback();
    setDeletingBook(true);
    try {
      const res = await request<BookMutationResponse>(
        `book/delete?id=${encodeURIComponent(auth.id)}&book_id=${encodeURIComponent(confirmBook.id)}`,
        { method: 'DELETE' },
      );
      setMessage(res.message ?? 'Book removed.');
      setConfirmBook(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove book.');
    } finally {
      setDeletingBook(false);
    }
  }

  if (ready && !loading && !auth) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-md rounded-3xl border border-base-300 bg-base-100 p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-base-content">My library</h1>
          <p className="mt-2 text-sm opacity-70">Sign in to open your personal bookshelves.</p>
          <a href="/login" className="btn btn-primary mt-6">Sign in</a>
        </div>
      </div>
    );
  }

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="mt-8 space-y-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">My library</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-base-content">
            Your bookshelves
          </h1>
          <p className="mt-1 text-sm opacity-70">
            {shelves.length} {shelves.length === 1 ? 'shelf' : 'shelves'} · {books.length} {books.length === 1 ? 'book' : 'books'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="btn btn-outline btn-sm disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setModal({ shelfId: null, editing: null })}
            disabled={shelves.length === 0}
            className="btn btn-primary btn-sm disabled:opacity-60"
            title={shelves.length === 0 ? 'Create a shelf first' : undefined}
          >
            Add a book
          </button>
          <button type="button" onClick={() => setShowNewShelf((s) => !s)} className="btn btn-outline btn-secondary btn-sm">
            {showNewShelf ? 'Cancel' : 'New shelf'}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-6 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="mt-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      {/* New shelf form */}
      {showNewShelf && (
        <form onSubmit={handleCreateShelf} className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5">
          <h2 className="font-display text-lg font-semibold text-base-content">New shelf</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label className="block">
              <span className="text-sm font-medium text-base-content">Name</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Favourites, To read, 2026…"
                className="input input-bordered mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-base-content">Description <span className="opacity-60">(optional)</span></span>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="A note about this shelf"
                className="input input-bordered mt-1 w-full"
              />
            </label>
            <button type="submit" disabled={creating || !newName.trim()} className="btn btn-primary">
              {creating ? 'Creating…' : 'Create shelf'}
            </button>
          </div>
        </form>
      )}

      {/* Shelves */}
      <div className="mt-8 space-y-6">
        {shelves.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-base-content">Your library is waiting</h2>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-70">
              Create your first shelf to start organizing your collection. You can reorder shelves and the books
              within them at any time.
            </p>
            <button type="button" onClick={() => setShowNewShelf(true)} className="btn btn-primary mt-6">
              Create your first shelf
            </button>
          </div>
        ) : (
          shelves.map((shelf, index) => (
            <ShelfRow
              key={shelf.id}
              shelf={shelf}
              books={booksForShelf(shelf.id)}
              shelfIndex={index}
              shelfCount={shelves.length}
              busy={busy}
              onMoveShelf={(dir) => moveShelf(index, dir)}
              onUpdateShelf={(name, description) => handleUpdateShelf(shelf.id, name, description)}
              onDeleteShelf={() => handleDeleteShelf(shelf.id)}
              onAddBook={() => setModal({ shelfId: shelf.id, editing: null })}
              onMoveBook={(bookId, dir) => moveBook(bookId, dir)}
              onEditBook={(book) => setModal({ shelfId: book.shelf_id, editing: book })}
              onDeleteBook={(book) => setConfirmBook(book)}
            />
          ))
        )}
      </div>

      {/* Add / edit book modal */}
      {modal && (
        <AddBookModal
          shelfId={modal.shelfId}
          shelves={shelves}
          books={books}
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={loadData}
        />
      )}

      {/* Book delete confirmation */}
      {confirmBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Remove book">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deletingBook && setConfirmBook(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-base-300 bg-base-100 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/15 text-error">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-base-content">Remove this book?</h2>
            <p className="mt-1 text-sm opacity-70">
              “{confirmBook.title}” will be removed from “{shelves.find((s) => s.id === confirmBook.shelf_id)?.name ?? 'your shelf'}”.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmBook(null)} disabled={deletingBook} className="btn btn-outline">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteBook} disabled={deletingBook} className="btn btn-error">
                {deletingBook ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Library() {
  return (
    <AppProvider>
      <LibraryInner />
    </AppProvider>
  );
}