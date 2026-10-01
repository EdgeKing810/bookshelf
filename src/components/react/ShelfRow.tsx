import { useState } from 'react';
import { type Book, type Shelf } from '../../context/AppContext';
import BookCard from './BookCard';

export default function ShelfRow({
  shelf,
  books,
  shelfIndex,
  shelfCount,
  busy,
  onMoveShelf,
  onUpdateShelf,
  onDeleteShelf,
  onAddBook,
  onMoveBook,
  onEditBook,
  onDeleteBook,
}: {
  shelf: Shelf;
  books: Book[];
  shelfIndex: number;
  shelfCount: number;
  busy: boolean;
  onMoveShelf: (direction: -1 | 1) => void;
  onUpdateShelf: (name: string, description: string) => Promise<void>;
  onDeleteShelf: () => Promise<void>;
  onAddBook: () => void;
  onMoveBook: (bookId: string, direction: -1 | 1) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(shelf.name);
  const [description, setDescription] = useState(shelf.description);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onUpdateShelf(name.trim(), description.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
      {/* Shelf header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide opacity-60">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered input-sm mt-1 w-full"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide opacity-60">Description</span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input input-bordered input-sm mt-1 w-full"
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="btn btn-primary btn-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn btn-outline btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-semibold text-base-content">{shelf.name}</h2>
                <span className="rounded-full border border-base-300 bg-base-200 px-2.5 py-0.5 text-xs font-medium text-base-content/70">
                  {books.length} {books.length === 1 ? 'book' : 'books'}
                </span>
              </div>
              {shelf.description && <p className="mt-1 text-sm text-base-content/60">{shelf.description}</p>}
            </>
          )}
        </div>

        {/* Shelf actions */}
        {!editing && (
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-base-300 p-0.5">
              <button
                type="button"
                onClick={() => onMoveShelf(-1)}
                disabled={busy || shelfIndex === 0}
                aria-label="Move shelf up"
                title="Move shelf up"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base-content/70 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onMoveShelf(1)}
                disabled={busy || shelfIndex === shelfCount - 1}
                aria-label="Move shelf down"
                title="Move shelf down"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base-content/70 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-secondary btn-sm">
              Edit shelf
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onDeleteShelf();
                      setConfirmDelete(false);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="btn btn-error btn-sm"
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={saving} className="btn btn-outline btn-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-outline btn-error btn-sm">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Book strip */}
      <div className="mt-4">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-4 py-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-base-content/40">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <p className="text-sm text-base-content/60">This shelf is empty — add your first book.</p>
            <button type="button" onClick={onAddBook} className="btn btn-primary btn-sm">
              Add a book
            </button>
          </div>
        ) : (
          <div className="flex snap-x gap-4 overflow-x-auto pb-2" style={{ scrollbarGutter: 'stable' }}>
            {books.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                count={books.length}
                busy={busy}
                onMove={(dir) => onMoveBook(book.id, dir)}
                onEdit={() => onEditBook(book)}
                onDelete={() => onDeleteBook(book)}
              />
            ))}
            <button
              type="button"
              onClick={onAddBook}
              className="flex w-36 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-300 text-base-content/50 transition hover:border-primary/60 hover:text-primary sm:w-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              <span className="text-sm font-medium">Add a book</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}