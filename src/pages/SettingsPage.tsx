import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { firebaseReady } from '../firebase';
import {
  createAppUser,
  sendAppUserPasswordReset,
  subscribeToUsers,
  updateAppUser,
  USER_ROLES,
  USER_STATUSES,
  type CreateAppUserInput,
  type UpdateAppUserInput,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from '../services/userService';
import {
  DEFAULT_EMAIL_SIGNATURE,
  getUserEmailSettings,
  saveUserEmailSettings,
} from '../services/userSettingsService';
import { useAuth } from '../state/useAuth';

export default function SettingsPage() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [signature, setSignature] = useState(DEFAULT_EMAIL_SIGNATURE);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [signatureError, setSignatureError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSignature() {
      try {
        setLoadingSignature(true);
        const settings = await getUserEmailSettings();

        if (active) {
          setSignature(settings.signature);
          setSignatureError('');
        }
      } catch (error) {
        if (active) {
          setSignatureError(error instanceof Error ? error.message : 'Unable to load signature.');
        }
      } finally {
        if (active) {
          setLoadingSignature(false);
        }
      }
    }

    loadSignature();

    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  async function handleSaveSignature() {
    try {
      setSavingSignature(true);
      setSignatureMessage('');
      setSignatureError('');
      await saveUserEmailSettings({ signature });
      setSignatureMessage('Signature saved.');
    } catch (error) {
      setSignatureError(error instanceof Error ? error.message : 'Unable to save signature.');
    } finally {
      setSavingSignature(false);
    }
  }

  return (
    <section>
      <PageHeader title="Settings" description="Workspace configuration and Firebase status." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Signed in as" value={currentUser?.email || '-'} />
            <Row label="User ID" value={currentUser?.uid || '-'} />
            <Row label="Role" value={userProfile?.role || '-'} />
            <Row label="Status" value={userProfile?.status || '-'} />
          </dl>
        </div>

        <div className="rounded border border-line bg-white p-5">
          <h2 className="text-base font-semibold">Firebase</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Auth" value="Email/password" />
            <Row label="Firestore collection" value="contacts" />
            <Row label="Hosting target" value="dist" />
            <Row label="Config loaded" value={firebaseReady ? 'Yes' : 'No'} />
          </dl>
        </div>
      </div>

      <div className="mt-4 rounded border border-line bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Email Signature</h2>
            <p className="mt-1 text-sm text-steel">Used as the default signature in campaign email previews.</p>
          </div>
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={savingSignature || loadingSignature}
            className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingSignature ? 'Saving' : 'Save Signature'}
          </button>
        </div>

        <textarea
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
          rows={6}
          disabled={loadingSignature}
          className="focus-ring mt-4 w-full resize-y rounded border border-line bg-white px-3 py-2 font-sans text-sm leading-6 text-ink disabled:bg-paper"
        />

        {signatureMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{signatureMessage}</p> : null}
        {signatureError ? <p className="mt-3 text-sm font-medium text-red-700">{signatureError}</p> : null}
      </div>

      {isAdmin ? <UserManagement currentUserId={currentUser?.uid || ''} /> : null}

      {isAdmin ? (
        <div className="mt-4 rounded border border-rose/30 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-rose">Danger Zone</h2>
              <p className="mt-1 text-sm text-steel">Permanent data reset tool for handover preparation.</p>
            </div>
            <Link
              to="/admin-reset"
              className="inline-flex items-center justify-center rounded bg-rose px-4 py-2 text-sm font-semibold text-white hover:bg-rose/90"
            >
              Admin Data Reset
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  async function handleChangeRole(user: UserProfile, role: UserRole) {
    await handleUpdateUser(user, { role });
  }

  async function handleToggleStatus(user: UserProfile) {
    await handleUpdateUser(user, { status: user.status === 'active' ? 'inactive' : 'active' });
  }

  async function handleUpdateUser(user: UserProfile, updates: Partial<Pick<UserProfile, 'role' | 'status'>>) {
    setMessage('');
    setError('');

    if (user.uid === currentUserId && updates.status === 'inactive') {
      setError('You cannot make your own admin account inactive.');
      return;
    }

    setSavingUserId(user.uid);

    try {
      const result = await updateAppUser({
        uid: user.uid,
        displayName: user.displayName,
        initials: user.initials,
        role: updates.role ?? user.role,
        status: updates.status ?? user.status,
      });
      setMessage(result.message || 'User updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user.');
    } finally {
      setSavingUserId('');
    }
  }

  async function handleSendPasswordReset(user: UserProfile) {
    setMessage('');
    setError('');
    setSavingUserId(user.uid);

    try {
      await sendAppUserPasswordReset(user.uid);
      setMessage(
        `Password setup email sent to ${user.email}. The user should check their inbox, click the secure link, create a password, then return to Trade Finance OS and log in.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password setup email.');
    } finally {
      setSavingUserId('');
    }
  }

  return (
    <div className="mt-4 rounded border border-line bg-white">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">User Management</h2>
          <p className="mt-1 text-sm text-steel">Admin-only access control for Trade Finance OS users.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditingUser('new')}
          className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Add User
        </button>
      </div>

      {message ? <p className="mx-5 mt-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}
      {error ? <p className="mx-5 mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Initials</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.uid} className="align-top">
                <td className="px-5 py-3">
                  <p className="font-medium">{user.displayName || user.email || user.uid}</p>
                  <p className="text-xs text-steel">{user.email || user.uid}</p>
                </td>
                <td className="px-5 py-3">{user.initials || '-'}</td>
                <td className="px-5 py-3">
                  <select
                    value={user.role}
                    disabled={savingUserId === user.uid}
                    onChange={(event) => handleChangeRole(user, event.target.value as UserRole)}
                    className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm"
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <span className={user.status === 'active' ? 'text-mint' : 'text-rose'}>{user.status}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={savingUserId === user.uid}
                      onClick={() => setEditingUser(user)}
                      className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={savingUserId === user.uid || (user.uid === currentUserId && user.status === 'active')}
                      onClick={() => handleToggleStatus(user)}
                      className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-60"
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      disabled={savingUserId === user.uid || !user.email}
                      onClick={() => handleSendPasswordReset(user)}
                      className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-60"
                    >
                      Send Password Setup Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-steel">
                  {loading ? 'Loading users' : 'No user profiles found.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingUser ? (
        <UserModal
          user={editingUser}
          currentUserId={currentUserId}
          onClose={() => setEditingUser(null)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            setError('');
            setEditingUser(null);
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

function UserModal({
  user,
  currentUserId,
  onClose,
  onSaved,
  onError,
}: {
  user: UserProfile | 'new';
  currentUserId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const isNew = user === 'new';
  const [form, setForm] = useState<CreateAppUserInput & { uid: string; status: UserStatus }>({
    uid: isNew ? '' : user.uid,
    email: isNew ? '' : user.email,
    displayName: isNew ? '' : user.displayName,
    initials: isNew ? '' : user.initials,
    role: isNew ? 'user' : user.role,
    status: isNew ? 'active' : user.status,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onError('');

    try {
      if (isNew) {
        const result = await createAppUser({
          email: form.email,
          displayName: form.displayName,
          initials: form.initials,
          role: form.role,
        });
        onSaved(result.message || 'User created and password setup email sent.');
      } else {
        if (form.uid === currentUserId && form.status === 'inactive') {
          onError('You cannot make your own admin account inactive.');
          return;
        }

        const result = await updateAppUser(form as UpdateAppUserInput);
        onSaved(result.message || 'User updated.');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">{isNew ? 'Add User' : 'Edit User'}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Email</span>
            <input
              type="email"
              required
              disabled={!isNew}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm disabled:bg-paper"
            />
          </label>

          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Display Name</span>
            <input
              required
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </label>

          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Initials</span>
            <input
              required
              value={form.initials}
              onChange={(event) => setForm((current) => ({ ...current, initials: event.target.value.toUpperCase() }))}
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </label>

          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Role</span>
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          {!isNew ? (
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatus }))}
                className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
              >
                {USER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Saving' : 'Save User'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-steel">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-medium">{value}</dd>
    </div>
  );
}
