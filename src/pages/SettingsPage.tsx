import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { firebaseReady } from '../firebase';
import {
  DEFAULT_EMAIL_SIGNATURE,
  getUserEmailSettings,
  saveUserEmailSettings,
} from '../services/userSettingsService';
import { useAuth } from '../state/useAuth';

export default function SettingsPage() {
  const { currentUser } = useAuth();
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
    </section>
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
