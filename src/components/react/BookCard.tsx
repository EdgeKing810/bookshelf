import { useState, type CSSProperties } from 'react';
import { type Book, type Shelf } from '../../context/AppContext';
import {
  authorInitials,
  spineColor,
  spineHeight,
  spineWidth,
} from '../../lib/books';
import { useAccentHue } from '../../lib/theme';
import StarRating from './StarRating';

const ribbonColors: Record<Book['status'], string> = {
  READING: '#e8a33d',
  FINISHED: '#3da35d',
  WANT_TO_READ: '#7d8aa0',
};

/**
 * A single book rendered as a cloth-bound spine standing on the shelf plank.
 * When `compact`, the spine sits at its natural width so books pack together;
 * otherwise the slot is widened to line up with the action row below.
 */
export function BookSpine({
  book,
  onEdit,
  onDropBook,
  compact = false,
}: {
  book: Book;
  onEdit: () => void;
  onDropBook: (draggedId: string, targetId: string) => void;
  compact?: boolean;
}) {
  const accentHue = useAccentHue();
  const color = spineColor(book.id, book.title, accentHue);
  const width = spineWidth(book.id, book.title);
  const height = spineHeight(book.id, book.title);
  const ribbon = ribbonColors[book.status];
  const [over, setOver] = useState(false);

  const style = { '--spine': color, width, height } as CSSProperties;

  return (
    <div className={compact ? 'flex shrink-0' : 'flex w-24 shrink-0 justify-center'}>
      <button
        type="button"
        onClick={onEdit}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', book.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId && draggedId !== book.id) onDropBook(draggedId, book.id);
        }}
        title={`${book.title}${book.author ? ` — ${book.author}` : ''}`}
        aria-label={`Edit ${book.title}`}
        className={`book-spine focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          over ? 'brightness-110 ring-2 ring-primary' : ''
        }`}
        style={style}
      >
        {ribbon && <span className="spine-ribbon" style={{ '--ribbon': ribbon } as CSSProperties} />}
        <span className="spine-title">{book.title}</span>
        <span className="spine-author">{authorInitials(book.author) || '···'}</span>
        {book.rating > 0 && (
          <span className="spine-stars">
            <StarRating value={book.rating} size={5} />
          </span>
        )}
      </button>
    </div>
  );
}

const iconClass =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-base-300 text-base-content/70 transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Per-book controls rendered under the plank, aligned to the spine slot above.
 */
export function BookActions({
  book,
  busy,
  shelves,
  onEdit,
  onDelete,
  onMoveToShelf,
}: {
  book: Book;
  busy: boolean;
  shelves: Shelf[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveToShelf: (shelfId: string) => void;
}) {
  const [moving, setMoving] = useState(false);
  const otherShelves = shelves.filter((s) => s.id !== book.shelf_id);

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${book.title} details`}
          className={`${iconClass} hover:border-secondary/50 hover:text-secondary`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMoving((m) => !m)}
          disabled={busy || otherShelves.length === 0}
          aria-label={`Move ${book.title} to another shelf`}
          title="Move to another shelf"
          className={`${iconClass} ${moving ? 'border-primary/60 text-primary' : ''} hover:border-info/50 hover:text-info`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${book.title}`}
          className={`${iconClass} hover:border-error/50 hover:text-error`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {moving && (
        <select
          className="select select-bordered select-xs mt-0.5 w-full"
          value=""
          autoFocus
          onChange={(e) => {
            setMoving(false);
            if (e.target.value) onMoveToShelf(e.target.value);
          }}
          onBlur={() => setMoving(false)}
          aria-label={`Move ${book.title} to shelf`}
        >
          <option value="">Move to…</option>
          {otherShelves.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}