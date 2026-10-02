const STAR_COUNT = 5;
const STAR_GOLD = '#f5b301';

/** Rating (1–10) → stars out of 5. A half star = 1 rating point. */
export function ratingToStars(rating: number): number {
  return rating / 2;
}

/** Stars (0.5–5, in 0.5 steps) → rating (1–10, integer). */
export function starsToRating(stars: number): number {
  return Math.max(1, Math.round(stars * 2));
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function Star({ fill, size }: { fill: 'empty' | 'half' | 'full'; size: number }) {
  const empty = (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-none stroke-current" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
  const full = (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
  const filledColor = STAR_GOLD;
  if (fill === 'full') {
    return <span className="leading-none" style={{ color: filledColor }}>{full}</span>;
  }
  if (fill === 'half') {
    return (
      <span className="relative inline-block leading-none">
        <span className="text-base-content/25">{empty}</span>
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: '50%', color: filledColor }}>
          {full}
        </span>
      </span>
    );
  }
  return <span className="text-base-content/25">{empty}</span>;
}

/**
 * 5-star rating control (each star = 2 rating points, so 1–10 maps to 0.5–5
 * stars). Read-only when `onChange` is omitted. Clicking the left half of a
 * star sets a half star; the right half sets a full star.
 */
export default function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  const stars = ratingToStars(value);

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const starValue = i + 1;
        const filled = stars >= starValue;
        const half = !filled && stars >= starValue - 0.5;
        const fill: 'empty' | 'half' | 'full' = filled ? 'full' : half ? 'half' : 'empty';

        if (!onChange) {
          return <Star key={i} fill={fill} size={size} />;
        }

        return (
          <button
            key={i}
            type="button"
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isHalf = e.clientX < rect.left + rect.width / 2;
              onChange(starsToRating(isHalf ? starValue - 0.5 : starValue));
            }}
            className="p-0 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Star fill={fill} size={size} />
          </button>
        );
      })}
    </div>
  );
}