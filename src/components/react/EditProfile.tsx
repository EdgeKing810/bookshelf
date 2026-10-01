import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ApiError, useApp, type User, type UserUpdateResponse } from '../../context/AppContext';
import { isValidPassword, isValidUsername } from '../../lib/validation';
import PasswordInput from './PasswordInput';

const inputClass = 'input input-bordered mt-1 w-full';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-error">{message}</span>;
}

function SaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

const saveButtonClass = 'btn btn-primary btn-outline btn-square shrink-0';

export default function EditProfile({ profile, onSaved }: { profile: User; onSaved: () => void }) {
  const { request, upload, mediaUrl } = useApp();

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [password, setPassword] = useState('');
  const [pictureUrl, setPictureUrl] = useState(profile.profile_picture);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile.name);
    setUsername(profile.username);
    setPictureUrl(profile.profile_picture);
  }, [profile]);

  function setFieldError(field: string, fieldError?: string) {
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[field] = fieldError;
      else delete next[field];
      return next;
    });
  }

  async function save(property: string, value: string) {
    setSaving(property);
    setError(null);
    setMessage(null);
    try {
      const res = await request<UserUpdateResponse>('user/update', {
        method: 'PATCH',
        body: JSON.stringify({ id: profile.id, property, value }),
      });
      setMessage(res.message ?? `${property.replace('_', ' ')} updated.`);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  function handleName() {
    if (!name.trim()) {
      setFieldError('name', 'Your name is required.');
      return;
    }
    setFieldError('name');
    save('name', name.trim());
  }

  function handleUsername() {
    if (!username.trim()) {
      setFieldError('username', 'Username is required.');
      return;
    }
    if (!isValidUsername(username)) {
      setFieldError('username', 'Username must be at least 3 characters.');
      return;
    }
    setFieldError('username');
    save('username', username.trim());
  }

  function handlePassword() {
    if (!password) {
      setFieldError('password', 'Enter a new password.');
      return;
    }
    if (!isValidPassword(password)) {
      setFieldError('password', 'Password needs 1 lowercase, 1 uppercase, 1 number, 1 symbol and 8+ characters.');
      return;
    }
    setFieldError('password');
    save('password', password);
  }

  function handlePictureUrl() {
    if (!pictureUrl.trim()) {
      setFieldError('profile_picture', 'Enter an image URL.');
      return;
    }
    setFieldError('profile_picture');
    save('profile_picture', pictureUrl.trim());
  }

  async function handlePictureFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await upload(file);
      await save('profile_picture', mediaUrl(res.path));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  const busy = (field: string) => saving === field || uploading;

  return (
    <section className="rounded-3xl border border-base-300 bg-base-100 p-8">
      <h2 className="font-display text-lg font-semibold text-base-content">Edit profile</h2>

      {message && (
        <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div className="mt-6 space-y-6">
        {/* Name */}
        <div className="flex items-end gap-3">
          <label className="block flex-1">
            <span className="text-sm font-medium text-base-content">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? `${inputClass} input-error` : inputClass}
            />
            <FieldError message={errors.name} />
          </label>
          <button
            type="button"
            onClick={handleName}
            disabled={busy('name')}
            aria-label="Save name"
            className={saveButtonClass}
          >
            {saving === 'name' ? <Spinner /> : <SaveIcon />}
          </button>
        </div>

        {/* Username */}
        <div className="flex items-end gap-3">
          <label className="block flex-1">
            <span className="text-sm font-medium text-base-content">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={errors.username ? `${inputClass} input-error` : inputClass}
            />
            <FieldError message={errors.username} />
          </label>
          <button
            type="button"
            onClick={handleUsername}
            disabled={busy('username')}
            aria-label="Save username"
            className={saveButtonClass}
          >
            {saving === 'username' ? <Spinner /> : <SaveIcon />}
          </button>
        </div>

        {/* Password */}
        <div className="flex items-end gap-3">
          <label className="block flex-1">
            <span className="text-sm font-medium text-base-content">New password</span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="1 lowercase, 1 uppercase, 1 number, 1 symbol, 8+ characters"
              className={errors.password ? `${inputClass} input-error` : inputClass}
            />
            <FieldError message={errors.password} />
          </label>
          <button
            type="button"
            onClick={handlePassword}
            disabled={busy('password')}
            aria-label="Save password"
            className={saveButtonClass}
          >
            {saving === 'password' ? <Spinner /> : <SaveIcon />}
          </button>
        </div>

        {/* Profile picture */}
        <div>
          <span className="text-sm font-medium text-base-content">Profile picture</span>

          <div className="mt-3 flex items-center gap-4">
            {pictureUrl ? (
              <img src={pictureUrl} alt="Profile" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            )}
          </div>

          <div className="mt-3 flex items-end gap-3">
            <label className="block flex-1">
              <span className="text-xs font-medium uppercase tracking-wide opacity-60">Image URL</span>
              <input
                type="url"
                value={pictureUrl}
                onChange={(e) => setPictureUrl(e.target.value)}
                placeholder="https://… or upload a file"
                className={inputClass}
              />
              <FieldError message={errors.profile_picture} />
            </label>
            <button
              type="button"
              onClick={handlePictureUrl}
              disabled={busy('profile_picture')}
              aria-label="Save image URL"
              className={saveButtonClass}
            >
              {saving === 'profile_picture' && !uploading ? <Spinner /> : <SaveIcon />}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy('profile_picture')}
              className="btn btn-outline btn-secondary"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                  </svg>
                  Uploading…
                </span>
              ) : (
                'Upload image'
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureFile} />
            <span className="text-xs opacity-60">Uploads are hosted and served from Kinesis API.</span>
          </div>
        </div>
      </div>
    </section>
  );
}