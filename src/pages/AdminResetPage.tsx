import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { resetAdminData } from '../services/adminResetService';
import { useAuth } from '../state/useAuth';

const confirmationPhrase = 'DELETE ALL DATA';

export default function AdminResetPage() {
  const { isAdmin } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canReset = confirmation === confirmationPhrase && backupConfirmed && !busy;

  async function handleReset() {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const result = await resetAdminData(confirmation, backupConfirmed);
      setMessage(result.message || 'Data reset complete.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset data.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Admin Data Reset"
        description="Temporary handover tool for clearing operational Firestore data."
      />

      {!isAdmin ? (
        <p className="rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">
          Admin Data Reset is available to admins only.
        </p>
      ) : null}

      {isAdmin ? <div className="rounded border border-rose/30 bg-rose/10 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-rose" size={22} />
          <div>
            <h2 className="text-base font-semibold text-rose">Danger Zone</h2>
            <p className="mt-2 text-sm font-medium text-rose">
              This will permanently delete all contacts, brokers, email queue records, and contact activity logs.
            </p>
            <p className="mt-2 text-sm text-ink">
              Firebase Auth users, app settings, Firestore rules, Functions, Hosting, and SMTP environment variables are not deleted.
            </p>
          </div>
        </div>
      </div> : null}

      {isAdmin ? <div className="mt-5 rounded border border-line bg-white p-5">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">
            Type DELETE ALL DATA
          </span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="focus-ring mt-2 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={backupConfirmed}
            onChange={(event) => setBackupConfirmed(event.target.checked)}
          />
          I have exported a backup.
        </label>

        {error ? <p className="mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
        {message ? <p className="mt-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}

        <button
          type="button"
          disabled={!canReset}
          onClick={handleReset}
          className="mt-5 rounded bg-rose px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Resetting Data' : 'Reset Firestore Data'}
        </button>
      </div> : null}
    </section>
  );
}
