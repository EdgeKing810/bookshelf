import { useState } from 'react';
import { type Book, type Shelf } from '../../context/AppContext';
import ShelfStrip from './ShelfStrip';

export default function ShelfRow({
  shelf,
  books,
  shelves,
  shelfIndex,
  shelfCount,
  busy,
  controls,
  onMoveShelf,
  onUpdateShelf,
  onDeleteShelf,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onMoveBookToShelf,
  onDropBook,
}: {
  shelf: Shelf;
  books: Book[];
  shelves: Shelf[];
  shelfIndex: number;
  shelfCount: number;
  busy: boolean;
  controls: boolean;
  onMoveShelf: (direction: -1 | 1) => void;
  onUpdateShelf: (name: string, description: string) => Promise<void>;
  onDeleteShelf: () => Promise<void>;
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onMoveBookToShelf: (book: Book, shelfId: string) => void;
  onDropBook: (draggedId: string, targetId: string) => void;
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
      <div className="space-y-3">
        <div className="min-w-0">
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
        {!editing && controls && (
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

      {/* Bookshelf body */}
      <ShelfStrip
        books={books}
        shelves={shelves}
        emptyLabel="This shelf is empty — add your first book."
        busy={busy}
        controls={controls}
        onAddBook={onAddBook}
        onEditBook={onEditBook}
        onDeleteBook={onDeleteBook}
        onMoveBookToShelf={onMoveBookToShelf}
        onDropBook={onDropBook}
      />
    </section>
  );
}