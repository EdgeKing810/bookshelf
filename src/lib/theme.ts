import { useEffect, useState } from 'react';

/** Custom event dispatched whenever the accent hue changes (see ThemeToggle). */
export const ACCENT_EVENT = 'bookshelf:accent';

export const DEFAULT_ACCENT_HUE = 80;

/** Read the current accent hue (the `--accent-hue` custom property on <html>). */
export function getAccentHue(): number {
	try {
		const hue = Number(getComputedStyle(document.documentElement).getPropertyValue('--accent-hue').trim());
		if (Number.isFinite(hue) && hue !== 0) return hue;
	} catch {
		/* ignore */
	}
	return DEFAULT_ACCENT_HUE;
}

/**
 * React hook that tracks the current accent hue and re-renders the component
 * whenever it changes. Used to compute fully-resolved (browser-safe) colors.
 */
export function useAccentHue(): number {
	const [hue, setHue] = useState<number>(() => getAccentHue());
	useEffect(() => {
		const update = () => setHue(getAccentHue());
		window.addEventListener(ACCENT_EVENT, update);
		return () => window.removeEventListener(ACCENT_EVENT, update);
	}, []);
	return hue;
}