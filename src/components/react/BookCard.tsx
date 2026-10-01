import { type Book } from '../../context/AppContext';
import { normalizeIsbn, previewText, readingStatus } from '../../lib/books';

const statusStyles = {
  unread: 'border-base-300 bg-base-200 text-base-content/70',
  reading: 'border-primary/40 bg-primary/15 text-primary',
  finished: 'border-success/40 bg-success/15 text-success',
} as const;

const statusLabels = {
  unread: 'Unread',
  reading: 'Reading',
  finished: 'Finished',
} as const;

export default function BookCard({
  book,
  index,
  count,
  onMove,
  onEdit,
  onDelete,
  busy,
}: {
  book: Book;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const status = readingStatus(book.started_date, book.finished_date);

  return (
    <div className="group relative w-40 shrink-0 snap-start sm:w-44">
      {/* Cover */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${book.title}`}
        className="block w-full overflow-hidden rounded-xl border border-base-300 bg-base-200 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={`${book.title} cover`}
            loading="lazy"
            className="aspect-[2/3] w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-base-200 to-base-300 p-3 text-center">
            <span className="font-display text-lg font-semibold leading-tight text-base-content line-clamp-3">
              {book.title}
            </span>
            <span className="text-xs text-base-content/60 line-clamp-1">{book.author || 'Unknown author'}</span>
          </span>
        )}
      </button>

      {/* Meta */}
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium text-base-content" title={book.title}>
          {book.title}
        </p>
        <p className="truncate text-xs text-base-content/60">
          {book.author || 'Unknown author'}
          {book.isbn ? ` · ${normalizeIsbn(book.isbn)}` : ''}
        </p>
        {book.summary && (
          <p className="mt-1 hidden text-xs leading-relaxed text-base-content/50 line-clamp-2 sm:block">
            {previewText(book.summary, 90)}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}>
            {status === 'finished' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : status === 'reading' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                <circle cx="12" cy="12" r="5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-2.5 w-2.5">
                <path d="M6 3v18" />
                <path d="M18 3v18" />
              </svg>
            )}
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={busy || index === 0}
          aria-label="Move book left"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={busy || index === count - 1}
          aria-label="Move book right"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit book details"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition hover:border-secondary/50 hover:text-secondary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete book"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition hover:border-error/50 hover:text-error disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}