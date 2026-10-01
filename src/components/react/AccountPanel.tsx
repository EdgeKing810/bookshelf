import { useCallback, useEffect, useState } from 'react';
import { AppProvider, ApiError, useApp, type User, type UserResponse } from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import EditProfile from './EditProfile';

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 font-display text-xl font-bold text-primary">
      {initials}
    </span>
  );
}

function AccountPanelInner() {
  const { auth, request, logout } = useApp();
  const ready = useMinDelay(450);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; sessionExpired?: boolean } | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await request<UserResponse>(`user/me?id=${encodeURIComponent(auth.id)}`);
      if (res.user) setProfile(res.user);
    } catch (err) {
      setError({
        message: err instanceof ApiError ? err.message : 'Failed to load your profile.',
        sessionExpired: err instanceof ApiError && (err.status === 401 || err.status === 403),
      });
    } finally {
      setLoading(false);
    }
  }, [auth, request]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleSignOut() {
    logout();
    window.location.href = '/';
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-base-300 bg-base-100 p-8">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="mt-6 flex items-start gap-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-base-300 bg-base-100 p-8">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-4 h-11 w-full" />
        </section>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="rounded-3xl border border-base-300 bg-base-100 p-8 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-base-content">Your account</h1>
        <p className="mt-2 text-sm opacity-70">Sign in to view your profile.</p>
        <a href="/login" className="btn btn-primary mt-6">Sign in</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-base-300 bg-base-100 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight text-base-content">Your account</h1>
          <button type="button" onClick={handleSignOut} className="btn btn-outline btn-error btn-sm">
            Sign out
          </button>
        </div>

        {loading && (
          <div className="mt-6 flex items-start gap-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <p>{error.message}</p>
            {error.sessionExpired && (
              <a href="/login" className="btn btn-error btn-sm mt-2">Sign in again</a>
            )}
          </div>
        )}

        {!loading && profile && (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={`${profile.name} avatar`}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <InitialsAvatar name={profile.name} />
            )}

            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold text-base-content">{profile.name}</h2>
              <p className="mt-1 text-sm text-base-content/70">@{profile.username}</p>
              {profile.created_at && (
                <p className="mt-2 text-xs opacity-60">
                  Reader since {new Date(profile.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {profile && <EditProfile profile={profile} onSaved={fetchProfile} />}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-base-300 bg-base-100 p-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-base-content">My library</h2>
          <p className="mt-1 text-sm opacity-70">Organize your books into shelves and track your reading.</p>
        </div>
        <a href="/library" className="btn btn-primary">Open my library</a>
      </section>
    </div>
  );
}

export default function AccountPanel() {
  return (
    <AppProvider>
      <AccountPanelInner />
    </AppProvider>
  );
}