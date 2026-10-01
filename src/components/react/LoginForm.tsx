import { useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import PasswordInput from './PasswordInput';

function LoginFormInner() {
	const { login, auth } = useApp();
	const ready = useMinDelay(450);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [signedIn, setSignedIn] = useState(false);

	const inputClass = (field: string) =>
		`input input-bordered mt-2 w-full ${errors[field] ? 'input-error' : ''}`;

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const next: Record<string, string> = {};
		if (!username.trim()) next.username = 'Enter your username.';
		if (!password) next.password = 'Enter your password.';
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setServerError(null);
		setSubmitting(true);
		try {
			await login(username.trim(), password);
			setSignedIn(true);
			const params = new URLSearchParams(window.location.search);
			const nextPath = params.get('next');
			const target = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/library';
			setTimeout(() => {
				window.location.href = target;
			}, 900);
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (!ready) {
		return (
			<div className="mt-8 space-y-5">
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-11 w-full rounded-xl" />
			</div>
		);
	}

	if (signedIn) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
				<h2 className="mt-5 font-display text-xl font-bold text-base-content">Signed in</h2>
				<p className="mt-2 text-sm opacity-70">Opening your library…</p>
			</div>
		);
	}

	if (auth) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</div>
				<h2 className="mt-5 font-display text-xl font-bold text-base-content">You're already signed in</h2>
				<p className="mt-2 text-sm opacity-70">Head back to your library to keep organizing.</p>
				<a href="/library" className="btn btn-primary mt-6">Open my library</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
			<label className="block">
				<span className="text-sm font-medium text-base-content">Username</span>
				<input
					type="text"
					name="username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					autoComplete="username"
					placeholder="your username"
					className={inputClass('username')}
				/>
				{errors.username && <span className="mt-1 block text-xs text-error">{errors.username}</span>}
			</label>

			<label className="block">
				<span className="text-sm font-medium text-base-content">Password</span>
				<PasswordInput
					value={password}
					onChange={setPassword}
					autoComplete="current-password"
					placeholder="••••••••"
					className={inputClass('password')}
				/>
				{errors.password && <span className="mt-1 block text-xs text-error">{errors.password}</span>}
			</label>

			{serverError && (
				<p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
					{serverError}
				</p>
			)}

			<button
				type="submit"
				disabled={submitting}
				className="btn btn-primary w-full disabled:opacity-60"
			>
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	);
}

export default function LoginForm() {
	return (
		<AppProvider>
			<LoginFormInner />
		</AppProvider>
	);
}