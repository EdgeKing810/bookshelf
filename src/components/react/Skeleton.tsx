export default function Skeleton({ className = '' }: { className?: string }) {
	return <div aria-hidden="true" className={`animate-pulse rounded bg-base-300/60 ${className}`} />;
}