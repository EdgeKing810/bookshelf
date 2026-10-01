import { useEffect, useState } from 'react';

export const THEMES = [
	{ id: 'bookshelf-light', label: 'Paper', swatch: 'oklch(0.966 0.008 85)' },
	{ id: 'bookshelf-dark', label: 'Dusk', swatch: 'oklch(0.175 0.014 260)' },
	{ id: 'bookshelf-sepia', label: 'Sepia', swatch: 'oklch(0.9 0.032 82)' },
] as const;

function applyTheme(theme: string) {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem('bookshelf.theme', theme);
	} catch {
		/* ignore */
	}
}

export default function ThemeToggle() {
	const [theme, setTheme] = useState('bookshelf-light');
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
		const current = document.documentElement.getAttribute('data-theme');
		if (current) setTheme(current);
	}, []);

	useEffect(() => {
		function close() {
			setOpen(false);
		}
		if (open) {
			document.addEventListener('click', close);
			return () => document.removeEventListener('click', close);
		}
	}, [open]);

	function select(id: string) {
		setTheme(id);
		applyTheme(id);
		setOpen(false);
	}

	if (!ready) return <span className="h-9 w-9" aria-hidden="true" />;

	return (
		<div className="relative">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
				aria-label="Switch theme"
				aria-expanded={open}
				className="flex h-9 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2.5 text-sm font-medium text-base-content transition hover:border-base-content/40"
			>
				<span className="h-4 w-4 rounded-full border border-base-content/20" style={{ background: THEMES.find((t) => t.id === theme)?.swatch ?? 'transparent' }} />
				<span className="hidden sm:inline">{THEMES.find((t) => t.id === theme)?.label}</span>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl">
					{THEMES.map((option) => (
						<button
							type="button"
							key={option.id}
							onClick={() => select(option.id)}
							className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
								theme === option.id ? 'bg-primary/15 text-primary font-semibold' : 'text-base-content hover:bg-base-200'
							}`}
						>
							<span className="h-4 w-4 rounded-full border border-base-content/20" style={{ background: option.swatch }} />
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}