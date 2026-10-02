import { type Book, type Shelf } from '../../context/AppContext';
import { BookSpine, BookActions } from './BookCard';

/**
 * The body of a bookshelf: a wooden frame with a wall backdrop, books standing
 * on a plank (horizontal overflow scroll), and per-book controls aligned under
 * each spine. Shared by the shelf rows and the "Unshelved" row.
 */
export default function ShelfStrip({
  books,
  shelves,
  emptyLabel,
  busy,
  controls,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onMoveBookToShelf,
  onDropBook,
}: {
  books: Book[];
  shelves: Shelf[];
  emptyLabel: string;
  busy: boolean;
  controls: boolean;
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onMoveBookToShelf: (book: Book, shelfId: string) => void;
  onDropBook: (draggedId: string, targetId: string) => void;
}) {
  return (
    <div className="shelf-frame mt-4">
      <div className="shelf-back overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <div className="min-w-max px-3 pb-2 pt-5">
            {/* Books standing on the plank */}
            <div className="flex items-end gap-1">
              {books.map((book) => (
                <BookSpine
                  key={book.id}
                  book={book}
                  onEdit={() => onEditBook(book)}
                  onDropBook={onDropBook}
                  compact={!controls}
                />
              ))}
              {books.length === 0 && (
                <p className="w-44 py-8 text-sm text-base-content/50">{emptyLabel}</p>
              )}
              {/* Add a book — a dashed spine waiting on the shelf */}
              <button
                type="button"
                onClick={onAddBook}
                aria-label="Add a book to this shelf"
                title="Add a book"
                className={`group flex shrink-0 justify-center ${controls ? 'w-24' : 'w-12'}`}
              >
                <span
                  className="flex w-10 flex-col items-center justify-center gap-1 rounded-[3px_4px_4px_3px] border-2 border-dashed border-base-content/30 text-base-content/40 transition group-hover:border-primary/70 group-hover:text-primary"
                  style={{ height: 150 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  <span className="text-[9px] font-semibold uppercase tracking-wide">Add</span>
                </span>
              </button>
            </div>

            {/* Wooden plank the books stand on */}
            <div className="shelf-wood mt-0 h-3.5 w-full rounded-md" />

            {/* Per-book controls, aligned under each spine */}
            {controls && books.length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {books.map((book) => (
                  <BookActions
                    key={book.id}
                    book={book}
                    busy={busy}
                    shelves={shelves}
                    onEdit={() => onEditBook(book)}
                    onDelete={() => onDeleteBook(book)}
                    onMoveToShelf={(shelfId) => onMoveBookToShelf(book, shelfId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}