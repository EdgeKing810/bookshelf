import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';

function MobileMenuInner() {
	const { auth, logout } = useApp();
	const [ready, setReady] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setReady(true);
	}, []);

	if (!ready) return null;

	function handleSignOut() {
		setOpen(false);
		logout();
		window.location.href = '/';
	}

	const linkClass =
		'block rounded-lg px-3 py-2 text-sm text-base-content transition hover:bg-base-200 hover:text-primary';

	return (
		<div className="relative sm:hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label="Menu"
				aria-expanded={open}
				className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-300 text-base-content transition hover:border-base-content/40"
			>
				{open ? (
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				) : (
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
						<line x1="4" x2="20" y1="7" y2="7" />
						<line x1="4" x2="14" y1="12" y2="12" />
						<line x1="4" x2="20" y1="17" y2="17" />
					</svg>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
					<a href="/library" onClick={() => setOpen(false)} className={linkClass}>
						My library
					</a>
					<a href="/account" onClick={() => setOpen(false)} className={linkClass}>
						Account
					</a>
					<div className="my-2 border-t border-base-300" />
					{auth ? (
						<button type="button" onClick={handleSignOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-error transition hover:bg-error/10">
							Sign out
						</button>
					) : (
						<>
							<a href="/login" onClick={() => setOpen(false)} className="btn btn-outline btn-primary w-full">
								Sign in
							</a>
							<a href="/register" onClick={() => setOpen(false)} className="btn btn-primary mt-2 w-full">
								Get started
							</a>
						</>
					)}
				</div>
			)}
		</div>
	);
}

export default function MobileMenu() {
	return (
		<AppProvider>
			<MobileMenuInner />
		</AppProvider>
	);
}