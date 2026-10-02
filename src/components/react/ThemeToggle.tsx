import { useEffect, useState } from 'react';
import { ACCENT_EVENT } from '../../lib/theme';

export const THEMES = [
	{ id: 'bookshelf-light', label: 'Paper', swatch: 'oklch(0.966 0.008 85)' },
	{ id: 'bookshelf-dark', label: 'Dusk', swatch: 'oklch(0.175 0.014 260)' },
	{ id: 'bookshelf-sepia', label: 'Sepia', swatch: 'oklch(0.9 0.032 82)' },
] as const;

/** Predefined accent hues (OKLCH hue degrees). Shown at a vivid mid-lightness. */
export const ACCENTS: { hue: number; label: string }[] = [
	{ hue: 80, label: 'Amber' },
	{ hue: 55, label: 'Cocoa' },
	{ hue: 30, label: 'Ember' },
	{ hue: 0, label: 'Scarlet' },
	{ hue: 340, label: 'Rose' },
	{ hue: 320, label: 'Magenta' },
	{ hue: 300, label: 'Violet' },
	{ hue: 280, label: 'Iris' },
	{ hue: 255, label: 'Blue' },
	{ hue: 220, label: 'Sky' },
	{ hue: 190, label: 'Teal' },
	{ hue: 165, label: 'Emerald' },
	{ hue: 145, label: 'Leaf' },
	{ hue: 120, label: 'Lime' },
];

const DEFAULT_HUE = 80;

function swatchColor(hue: number): string {
	return `oklch(0.7 0.13 ${hue})`;
}

function applyTheme(theme: string) {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem('bookshelf.theme', theme);
	} catch {
		/* ignore */
	}
}

function applyAccent(hue: number) {
	document.documentElement.style.setProperty('--accent-hue', String(hue));
	try {
		localStorage.setItem('bookshelf.accent', String(hue));
	} catch {
		/* ignore */
	}
	// Notify JS-computed colors (book spines) to re-resolve.
	window.dispatchEvent(new CustomEvent(ACCENT_EVENT));
}

export default function ThemeToggle() {
	const [theme, setTheme] = useState('bookshelf-dark');
	const [accent, setAccent] = useState(DEFAULT_HUE);
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
		const root = document.documentElement;
		const currentTheme = root.getAttribute('data-theme');
		if (currentTheme) setTheme(currentTheme);
		const hue = Number(getComputedStyle(root).getPropertyValue('--accent-hue').trim());
		if (Number.isFinite(hue) && hue !== 0) setAccent(hue);
		else setAccent(DEFAULT_HUE);
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

	function selectTheme(id: string) {
		setTheme(id);
		applyTheme(id);
		setOpen(false);
	}

	function selectAccent(hue: number) {
		setAccent(hue);
		applyAccent(hue);
		setOpen(false);
	}

	if (!ready) return <span className="h-9 w-9" aria-hidden="true" />;

	const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? 'Appearance';

	return (
		<div className="relative">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
				aria-label="Customize appearance"
				aria-expanded={open}
				className="flex h-9 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2.5 text-sm font-medium text-base-content transition hover:border-base-content/40"
			>
				<span
					className="h-4 w-4 rounded-full border border-base-content/20"
					style={{ background: swatchColor(accent) }}
				/>
				<span className="hidden sm:inline">{themeLabel}</span>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
					<p className="px-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">Theme</p>
					<div className="mt-1.5 grid grid-cols-3 gap-1">
						{THEMES.map((option) => (
							<button
								type="button"
								key={option.id}
								onClick={() => selectTheme(option.id)}
								className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-xs transition ${
									theme === option.id
										? 'bg-primary/15 font-semibold text-primary'
										: 'text-base-content hover:bg-base-200'
								}`}
							>
								<span
									className="h-6 w-6 rounded-full border border-base-content/20"
									style={{ background: option.swatch }}
								/>
								{option.label}
							</button>
						))}
					</div>

					<div className="my-3 border-t border-base-300" />

					<p className="px-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">Accent colour</p>
					<div className="mt-1.5 grid grid-cols-7 gap-1.5">
						{ACCENTS.map((option) => (
							<button
								type="button"
								key={option.hue}
								onClick={() => selectAccent(option.hue)}
								title={option.label}
								aria-label={`Accent ${option.label}`}
								className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
									accent === option.hue
										? 'border-base-content ring-2 ring-primary/60'
										: 'border-base-content/20 hover:scale-110'
								}`}
								style={{ background: swatchColor(option.hue) }}
							>
								{accent === option.hue && (
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white drop-shadow">
										<path d="M20 6 9 17l-5-5" />
									</svg>
								)}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}