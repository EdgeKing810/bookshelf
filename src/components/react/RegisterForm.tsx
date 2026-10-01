import { useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp, type RegisterResponse } from '../../context/AppContext';
import { isValidPassword, isValidUsername } from '../../lib/validation';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import PasswordInput from './PasswordInput';

function RegisterFormInner() {
	const { request, auth } = useApp();
	const ready = useMinDelay(450);
	const [name, setName] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [registered, setRegistered] = useState<{ id: string; message: string } | null>(null);

	const inputClass = (field: string) => `input input-bordered mt-2 w-full ${errors[field] ? 'input-error' : ''}`;

	const passwordHints = [
		{ ok: password.length >= 8, label: 'At least 8 characters' },
		{ ok: /[a-z]/.test(password), label: 'One lowercase letter' },
		{ ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
		{ ok: /\d/.test(password), label: 'One number' },
		{ ok: /[^A-Za-z0-9]/.test(password), label: 'One symbol (!@#$…)' },
	];

	function validate(): boolean {
		const next: Record<string, string> = {};
		if (!name.trim()) next.name = 'Your name is required.';
		if (!username.trim()) next.username = 'Username is required.';
		else if (!isValidUsername(username)) next.username = 'Username must be at least 3 characters.';
		if (!password) next.password = 'Password is required.';
		else if (!isValidPassword(password)) next.password = 'Password needs 8+ characters with 1 lowercase, 1 uppercase, 1 number and 1 symbol.';
		setErrors(next);
		return Object.keys(next).length === 0;
	}

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setServerError(null);
		if (!validate()) return;
		setSubmitting(true);
		try {
			const result = await request<RegisterResponse>('user/register', {
				method: 'POST',
				body: JSON.stringify({
					name: name.trim(),
					username: username.trim(),
					password,
				}),
			});
			setRegistered({ id: result.id, message: result.message });
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (!ready) {
		return (
			<div className="mt-8 space-y-6">
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-[4.25rem] w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-11 w-full rounded-xl" />
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
				<p className="mt-2 text-sm opacity-70">You already have an account — head back to your library.</p>
				<a href="/library" className="btn btn-primary mt-6">Open my library</a>
			</div>
		);
	}

	if (registered) {
		return (
			<div className="py-4 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
				<h2 className="mt-5 font-display text-xl font-bold text-base-content">Welcome to the library</h2>
				<p className="mt-2 text-sm leading-relaxed opacity-70">
					Your account is ready. Sign in to start shelving your books.
				</p>
				{registered.message && <p className="mt-2 text-sm text-success">{registered.message}</p>}
				<a href="/login" className="btn btn-primary mt-6">Go to sign in</a>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
			<label className="block">
				<span className="text-sm font-medium text-base-content">Name</span>
				<input
					type="text"
					name="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					autoComplete="name"
					placeholder="Jane Doe"
					className={inputClass('name')}
				/>
				{errors.name && <span className="mt-1 block text-xs text-error">{errors.name}</span>}
			</label>

			<label className="block">
				<span className="text-sm font-medium text-base-content">Username</span>
				<input
					type="text"
					name="username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					autoComplete="username"
					placeholder="e.g. jane_reader"
					className={inputClass('username')}
				/>
				{errors.username && <span className="mt-1 block text-xs text-error">{errors.username}</span>}
			</label>

			<label className="block">
				<span className="text-sm font-medium text-base-content">Password</span>
				<PasswordInput
					value={password}
					onChange={setPassword}
					autoComplete="new-password"
					placeholder="A strong password"
					className={inputClass('password')}
				/>
				{errors.password && <span className="mt-1 block text-xs text-error">{errors.password}</span>}
				{password && (
					<ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
						{passwordHints.map((hint) => (
							<li key={hint.label} className={`flex items-center gap-1.5 ${hint.ok ? 'text-success' : 'opacity-60'}`}>
								<span>{hint.ok ? '✓' : '○'}</span>
								{hint.label}
							</li>
						))}
					</ul>
				)}
			</label>

			{serverError && (
				<p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
					{serverError}
				</p>
			)}

			<button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
				{submitting ? 'Creating account…' : 'Create account'}
			</button>
		</form>
	);
}

export default function RegisterForm() {
	return (
		<AppProvider>
			<RegisterFormInner />
		</AppProvider>
	);
}