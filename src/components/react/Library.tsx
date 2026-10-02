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
import ShelfStrip from './ShelfStrip';
import AddBookModal from './AddBookModal';

const PAGE_SIZE = 100;

function sortByNumber<T>(items: T[], key: (item: T) => number): T[] {
  return [...items].sort((a, b) => key(a) - key(b));
}

function bookPayload(book: Book, position: number): Record<string, unknown> {
  return {
    shelf_id: book.shelf_id,
    title: book.title,
    author: book.author,
    summary: book.summary,
    cover_image: book.cover_image,
    num_pages: book.num_pages,
    genres: book.genres,
    quotes: book.quotes ?? [],
    rating: book.rating,
    isbn: book.isbn,
    google_books_id: book.google_books_id,
    date_started: book.date_started,
    date_ended: book.date_ended,
    position,
    status: book.status,
  };
}

/**
 * Move `movedId` to `newPosition` using the API's remove-and-insert semantics:
 * books strictly between the old and new position shift by one toward the gap.
 * Returns the re-sorted books and the list of books whose position changed.
 */
function applyBookMove(current: Book[], movedId: string, newPosition: number): { books: Book[]; changed: Book[] } {
  const moved = current.find((b) => b.id === movedId);
  if (!moved) return { books: current, changed: [] };
  const oldPosition = moved.position;
  if (oldPosition === newPosition) return { books: current, changed: [] };

  const changed = new Map<string, Book>();
  if (newPosition > oldPosition) {
    current.forEach((b) => {
      if (b.id !== movedId && b.position > oldPosition && b.position <= newPosition) {
        changed.set(b.id, { ...b, position: b.position - 1 });
      }
    });
  } else {
    current.forEach((b) => {
      if (b.id !== movedId && b.position >= newPosition && b.position < oldPosition) {
        changed.set(b.id, { ...b, position: b.position + 1 });
      }
    });
  }
  changed.set(movedId, { ...moved, position: newPosition });

  const books = sortByNumber(current.map((b) => changed.get(b.id) ?? b), (b) => b.position);
  return { books, changed: [...changed.values()] };
}

function LibraryInner() {
  const { auth, request } = useApp();
  const ready = useMinDelay(450);

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelfAmount, setShelfAmount] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookAmount, setBookAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMoreShelves, setLoadingMoreShelves] = useState(false);
  const [loadingMoreBooks, setLoadingMoreBooks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Whether the edit/delete action buttons are shown (persisted per user).
  const [controls, setControls] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bookshelf.controls') !== '0';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bookshelf.controls', controls ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [controls]);

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
        request<ShelfFetchResponse>(
          `shelf/fetch?id=${encodeURIComponent(auth.id)}&limit=${PAGE_SIZE}&offset=0`,
        ),
        request<BookFetchResponse>(
          `book/fetch?id=${encodeURIComponent(auth.id)}&limit=${PAGE_SIZE}&offset=0`,
        ),
      ]);
      setShelves(sortByNumber(shelfRes.shelves ?? [], (s) => s.position));
      setShelfAmount(shelfRes.amount ?? shelfRes.shelves?.length ?? 0);
      setBooks(sortByNumber(bookRes.books ?? [], (b) => b.position));
      setBookAmount(bookRes.amount ?? bookRes.books?.length ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your library.');
    } finally {
      setLoading(false);
    }
  }, [auth, request]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMoreShelves = useCallback(async () => {
    if (!auth) return;
    setLoadingMoreShelves(true);
    setError(null);
    try {
      // `offset` is a 0-based page number: the API skips `offset * limit` items.
      const page = Math.floor(shelves.length / PAGE_SIZE);
      const res = await request<ShelfFetchResponse>(
        `shelf/fetch?id=${encodeURIComponent(auth.id)}&limit=${PAGE_SIZE}&offset=${page}`,
      );
      setShelfAmount(res.amount ?? res.shelves?.length ?? shelves.length);
      setShelves((cur) => {
        const seen = new Set(cur.map((s) => s.id));
        return sortByNumber([...cur, ...(res.shelves ?? []).filter((s) => !seen.has(s.id))], (s) => s.position);
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load more shelves.');
    } finally {
      setLoadingMoreShelves(false);
    }
  }, [auth, request, shelves.length]);

  const loadMoreBooks = useCallback(async () => {
    if (!auth) return;
    setLoadingMoreBooks(true);
    setError(null);
    try {
      // `offset` is a 0-based page number: the API skips `offset * limit` items.
      const page = Math.floor(books.length / PAGE_SIZE);
      const res = await request<BookFetchResponse>(
        `book/fetch?id=${encodeURIComponent(auth.id)}&limit=${PAGE_SIZE}&offset=${page}`,
      );
      setBookAmount(res.amount ?? res.books?.length ?? books.length);
      setBooks((cur) => {
        const seen = new Set(cur.map((b) => b.id));
        return sortByNumber([...cur, ...(res.books ?? []).filter((b) => !seen.has(b.id))], (b) => b.position);
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load more books.');
    } finally {
      setLoadingMoreBooks(false);
    }
  }, [auth, request, books.length]);

  const booksForShelf = useCallback(
    (shelfId: string) => sortByNumber(books.filter((b) => b.shelf_id === shelfId), (b) => b.position),
    [books],
  );

  const unshelvedBooks = sortByNumber(books.filter((b) => !b.shelf_id), (b) => b.position);

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
      // A new shelf goes at the bottom: after the current maximum position.
      const position = shelves.reduce((max, s) => Math.max(max, s.position), -1) + 1;
      const res = await request<ShelfMutationResponse>('shelf/create', {
        method: 'POST',
        body: JSON.stringify({
          id: auth.id,
          name: newName.trim(),
          description: newDescription.trim(),
          position,
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
    const shelf = shelves.find((s) => s.id === shelfId);
    if (!shelf) return;
    clearFeedback();
    try {
      const res = await request<ShelfMutationResponse>('shelf/update', {
        method: 'PUT',
        body: JSON.stringify({ id: auth.id, shelf_id: shelfId, name, description, position: shelf.position }),
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
    const shelf = shelves[index];
    const neighbor = shelves[nextIndex];
    try {
      // Setting the position to the neighbour's position swaps them in the
      // vertical order; the API shifts the shelves in between.
      await request<ShelfMutationResponse>('shelf/update', {
        method: 'PUT',
        body: JSON.stringify({
          id: auth.id,
          shelf_id: shelf.id,
          name: shelf.name,
          description: shelf.description,
          position: neighbor.position,
        }),
      });
      setMessage('Shelf reordered.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reorder shelves.');
    } finally {
      setBusy(false);
    }
  }

  async function reorderBook(bookId: string, newPosition: number) {
    if (!auth) return;
    const { books: nextBooks, changed } = applyBookMove(books, bookId, newPosition);
    const moved = changed.find((c) => c.id === bookId);
    if (!moved) return;
    clearFeedback();
    setBusy(true);
    setBooks(nextBooks); // optimistic local move — no refetch
    try {
      // Only the moved book is written; the API shifts the books in between,
      // which is exactly what applyBookMove mirrored locally.
      await request<BookMutationResponse>('book/update', {
        method: 'PUT',
        body: JSON.stringify({ id: auth.id, book_id: moved.id, ...bookPayload(moved, moved.position) }),
      });
    } catch (err) {
      setBooks(books);
      setError(err instanceof ApiError ? err.message : 'Failed to reorder books.');
    } finally {
      setBusy(false);
    }
  }

  async function dropBook(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const target = books.find((b) => b.id === targetId);
    if (!target) return;
    await reorderBook(draggedId, target.position);
  }

  /** Local-only update after creating/editing a book — no refetch, no flash. */
  function handleBookSaved(book: Book, isNew: boolean) {
    setBooks((cur) => {
      if (isNew) {
        // create shifts books at or after the new position forward by one
        const shifted = cur.map((b) => (b.position >= book.position ? { ...b, position: b.position + 1 } : b));
        return sortByNumber([...shifted, book], (b) => b.position);
      }
      return sortByNumber(cur.map((b) => (b.id === book.id ? { ...b, ...book } : b)), (b) => b.position);
    });
    if (isNew) setBookAmount((a) => a + 1);
  }

  async function moveBookToShelf(book: Book, targetShelfId: string) {
    if (!auth || book.shelf_id === targetShelfId) return;
    clearFeedback();
    setBusy(true);
    try {
      // The book lands at the end of the target shelf.
      const targetMax = books
        .filter((b) => b.shelf_id === targetShelfId && b.id !== book.id)
        .reduce((max, b) => Math.max(max, b.position), -1);
      const payload = bookPayload(book, targetMax + 1);
      payload.shelf_id = targetShelfId;
      await request<BookMutationResponse>('book/update', {
        method: 'PUT',
        body: JSON.stringify({ id: auth.id, book_id: book.id, ...payload }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to move book.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBook() {
    if (!auth || !confirmBook) return;
    clearFeedback();
    setDeletingBook(true);
    const deleted = confirmBook;
    try {
      const res = await request<BookMutationResponse>(
        `book/delete?id=${encodeURIComponent(auth.id)}&book_id=${encodeURIComponent(deleted.id)}`,
        { method: 'DELETE' },
      );
      // Local delete: drop the book and compact positions above it.
      setBooks((cur) =>
        sortByNumber(
          cur
            .filter((b) => b.id !== deleted.id)
            .map((b) => (b.position > deleted.position ? { ...b, position: b.position - 1 } : b)),
          (b) => b.position,
        ),
      );
      setBookAmount((a) => Math.max(0, a - 1));
      setMessage(res.message ?? 'Book removed.');
      setConfirmBook(null);
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
    <div className="library-room">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">My library</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-base-content">
              Your bookshelves
            </h1>
            <p className="mt-1 text-sm opacity-70">
              {shelfAmount} {shelfAmount === 1 ? 'shelf' : 'shelves'} · {bookAmount}{' '}
              {bookAmount === 1 ? 'book' : 'books'}
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
              className="btn btn-primary btn-sm"
            >
              Add a book
            </button>
            <button type="button" onClick={() => setShowNewShelf((s) => !s)} className="btn btn-outline btn-secondary btn-sm">
              {showNewShelf ? 'Cancel' : 'New shelf'}
            </button>
            <button
              type="button"
              onClick={() => setControls((c) => !c)}
              aria-pressed={controls}
              className={`btn btn-sm ${controls ? 'btn-info' : 'btn-outline btn-info'}`}
              title={controls ? 'Hide the edit/delete buttons' : 'Show the edit/delete buttons'}
            >
              {controls ? 'Done editing' : 'Edit library'}
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
        <div className="mt-8 space-y-8">
          {shelves.length === 0 && !showNewShelf && (
            <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-base-content">Your library is waiting</h2>
              <p className="mx-auto mt-2 max-w-md text-sm opacity-70">
                Create your first shelf to start organizing your collection. You can reorder shelves and the
                books within them at any time.
              </p>
              <button type="button" onClick={() => setShowNewShelf(true)} className="btn btn-primary mt-6">
                Create your first shelf
              </button>
            </div>
          )}
          {shelves.length > 0 && (
            <>
              {shelves.map((shelf, index) => (
                <ShelfRow
                  key={shelf.id}
                  shelf={shelf}
                  books={booksForShelf(shelf.id)}
                  shelves={shelves}
                  shelfIndex={index}
                  shelfCount={shelves.length}
                  busy={busy}
                  onMoveShelf={(dir) => moveShelf(index, dir)}
                  onUpdateShelf={(name, description) => handleUpdateShelf(shelf.id, name, description)}
                  onDeleteShelf={() => handleDeleteShelf(shelf.id)}
                  onAddBook={() => setModal({ shelfId: shelf.id, editing: null })}
                  onEditBook={(book) => setModal({ shelfId: book.shelf_id, editing: book })}
                  onDeleteBook={(book) => setConfirmBook(book)}
                  onMoveBookToShelf={(book, targetId) => moveBookToShelf(book, targetId)}
                  onDropBook={(draggedId, targetId) => dropBook(draggedId, targetId)}
                  controls={controls}
                />
              ))}

              {/* Books without a shelf (e.g. from a deleted shelf) */}
              {unshelvedBooks.length > 0 && (
                <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-base-content">Unshelved</h2>
                      <p className="mt-1 text-sm text-base-content/60">
                        {unshelvedBooks.length} {unshelvedBooks.length === 1 ? 'book' : 'books'} not on any shelf.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal({ shelfId: '', editing: null })}
                      className="btn btn-outline btn-secondary btn-sm"
                    >
                      Add a book
                    </button>
                  </div>
                  <ShelfStrip
                    books={unshelvedBooks}
                    shelves={shelves}
                    emptyLabel="Nothing here."
                    busy={busy}
                    onAddBook={() => setModal({ shelfId: '', editing: null })}
                    onEditBook={(book) => setModal({ shelfId: book.shelf_id, editing: book })}
                    onDeleteBook={(book) => setConfirmBook(book)}
                    onMoveBookToShelf={(book, targetId) => moveBookToShelf(book, targetId)}
                    onDropBook={(draggedId, targetId) => dropBook(draggedId, targetId)}
                    controls={controls}
                  />
                </section>
              )}

              {/* Pagination */}
              {(shelfAmount > shelves.length || bookAmount > books.length) && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {shelfAmount > shelves.length && (
                    <button
                      type="button"
                      onClick={loadMoreShelves}
                      disabled={loadingMoreShelves}
                      className="btn btn-outline btn-sm disabled:opacity-60"
                    >
                      {loadingMoreShelves ? 'Loading…' : `Load more shelves (${shelves.length}/${shelfAmount})`}
                    </button>
                  )}
                  {bookAmount > books.length && (
                    <button
                      type="button"
                      onClick={loadMoreBooks}
                      disabled={loadingMoreBooks}
                      className="btn btn-outline btn-sm disabled:opacity-60"
                    >
                      {loadingMoreBooks ? 'Loading…' : `Load more books (${books.length}/${bookAmount})`}
                    </button>
                  )}
                </div>
              )}
            </>
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
            onSaved={handleBookSaved}
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
                “{confirmBook.title}” will be removed from your library.
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