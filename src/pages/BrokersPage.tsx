import { Edit3, Plus, Search, Upload, UserX } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';
import InitialsBadge from '../components/InitialsBadge';
import PageHeader from '../components/PageHeader.jsx';
import { useBrokers } from '../hooks/useBrokers';
import { useContacts } from '../hooks/useContacts';
import {
  BROKER_STATUSES,
  createBroker,
  emptyBroker,
  markInactiveBroker,
  updateBroker,
  type Broker,
  type BrokerInput,
} from '../services/brokerService';
import { hasMissingClientEmail } from '../utils/emailValidation';
import {
  parseBrokerFile,
  type BrokerImportPreview,
  type ImportBrokerRow,
  type InvalidBrokerRow,
} from '../utils/importBrokersFile';

interface DuplicateBrokerRow extends ImportBrokerRow {
  matchedBrokerId: string;
}

export default function BrokersPage() {
  const { brokers, loading, error } = useBrokers();
  const { contacts } = useContacts();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [editingBroker, setEditingBroker] = useState<Broker | BrokerInput | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const visibleBrokers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return brokers.filter((broker) => {
      const statusMatch = status === 'All' || broker.status === status;
      const searchMatch = !needle || [
        broker.brokerName,
        broker.brokerCompany,
        broker.brokerEmail,
        broker.brokerPhone,
        broker.notes,
      ].join(' ').toLowerCase().includes(needle);
      return statusMatch && searchMatch;
    });
  }, [brokers, query, status]);

  async function handleMarkInactive(broker: Broker) {
    setActionError('');
    try {
      await markInactiveBroker(broker.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to mark broker inactive.');
    }
  }

  return (
    <section>
      <PageHeader title="Brokers" description="Manage broker records and linked contact coverage." />
      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {actionError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p> : null}
      {message ? <p className="mb-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}

      <div className="mb-4 grid gap-3 rounded border border-line bg-white p-3 md:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brokers" className="focus-ring w-full rounded border border-line py-2 pl-9 pr-3 text-sm" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm">
          <option value="All">All Statuses</option>
          {BROKER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => setEditingBroker(emptyBroker)} className="flex items-center justify-center gap-2 rounded bg-navy px-4 py-2 text-sm font-semibold text-white">
          <Plus size={16} />
          Add Broker
        </button>
        <button type="button" onClick={() => setImportOpen(true)} className="flex items-center justify-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">
          <Upload size={16} />
          Import Brokers
        </button>
      </div>

      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
                <th className="px-3 py-3">Broker Name</th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone / WhatsApp</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">CC Default</th>
                <th className="px-3 py-3">Linked Contacts</th>
                <th className="px-3 py-3">Missing Email Contacts</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleBrokers.map((broker) => {
                const linkedContacts = contacts.filter((contact) => contact.brokerId === broker.id || contact.brokerName === broker.brokerName);
                const missingEmailContacts = linkedContacts.filter((contact) => contact.contactEmailStatus === 'Missing Email' || hasMissingClientEmail(contact.email));
                return (
                  <tr key={broker.id} className="align-top">
                    <td className="px-3 py-3 font-medium text-ink">{broker.brokerName || '-'}</td>
                    <td className="px-3 py-3">{broker.brokerCompany || '-'}</td>
                    <td className="px-3 py-3">{broker.brokerEmail || '-'}</td>
                    <td className="px-3 py-3">{broker.brokerPhone || '-'}<br /><span className="text-xs text-steel">{broker.brokerWhatsApp || ''}</span></td>
                    <td className="px-3 py-3">{broker.status}</td>
                    <td className="px-3 py-3">{broker.ccDefault ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-3">{linkedContacts.length}</td>
                    <td className="px-3 py-3">{missingEmailContacts.length}</td>
                    <td className="max-w-xs px-3 py-3 text-steel"><p className="line-clamp-2">{broker.notes || '-'}</p></td>
                    <td className="px-3 py-3"><InitialsBadge initials={broker.updatedByInitials || broker.createdByInitials} name={broker.updatedByName || broker.createdByName} /></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" title="Edit broker" onClick={() => setEditingBroker(broker)} className="grid h-9 w-9 place-items-center rounded border border-line text-steel hover:bg-paper"><Edit3 size={16} /></button>
                        <button type="button" title="Mark inactive" onClick={() => handleMarkInactive(broker)} className="grid h-9 w-9 place-items-center rounded border border-line text-steel hover:bg-paper"><UserX size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleBrokers.length ? <tr><td colSpan={11} className="px-3 py-10 text-center text-sm text-steel">{loading ? 'Loading brokers' : 'No brokers match this view.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {editingBroker ? <BrokerModal broker={editingBroker} onClose={() => setEditingBroker(null)} /> : null}
      {importOpen ? (
        <BrokerImportModal
          brokers={brokers}
          onClose={() => setImportOpen(false)}
          onImported={(imported, invalid, duplicates) => {
            setMessage(`Imported ${imported} brokers. Skipped ${invalid} invalid rows and ${duplicates} duplicates.`);
            setImportOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function hasBrokerId(broker: Broker | BrokerInput): broker is Broker {
  return 'id' in broker && Boolean(broker.id);
}

function BrokerModal({ broker, onClose }: { broker: Broker | BrokerInput; onClose: () => void }) {
  const [form, setForm] = useState<BrokerInput>({ ...emptyBroker, ...broker });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (hasBrokerId(broker)) {
        await updateBroker(broker.id, form);
      } else {
        await createBroker(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save broker.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">{hasBrokerId(broker) ? 'Edit Broker' : 'Add Broker'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(['brokerName', 'brokerCompany', 'brokerEmail', 'brokerPhone', 'brokerWhatsApp', 'country'] as const).map((field) => (
            <label key={field}>
              <span className="text-xs font-medium uppercase tracking-wide text-steel">{field}</span>
              <input value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm" />
            </label>
          ))}
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm">
              {BROKER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={form.ccDefault} onChange={(event) => setForm((current) => ({ ...current, ccDefault: event.target.checked }))} />
            CC broker by default
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm" />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm text-rose">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 text-sm font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving' : 'Save Broker'}</button>
        </div>
      </form>
    </div>
  );
}

function BrokerImportModal({
  brokers,
  onClose,
  onImported,
}: {
  brokers: Broker[];
  onClose: () => void;
  onImported: (imported: number, invalid: number, duplicates: number) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BrokerImportPreview | null>(null);
  const [duplicateRows, setDuplicateRows] = useState<DuplicateBrokerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreview(null);
    setDuplicateRows([]);
    setError('');

    if (!selectedFile) return;

    setBusy(true);
    try {
      const parsed = await parseBrokerFile(selectedFile);
      const { validRows, duplicates } = splitDuplicateRows(parsed.validRows, brokers);
      setPreview({ validRows, invalidRows: parsed.invalidRows });
      setDuplicateRows(duplicates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse broker import file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportValidBrokers() {
    if (!preview?.validRows.length) return;

    setBusy(true);
    setError('');
    try {
      const existingKeys = buildBrokerKeys(brokers);
      const rowsToImport: ImportBrokerRow[] = [];
      const duplicates: DuplicateBrokerRow[] = [...duplicateRows];

      preview.validRows.forEach((row) => {
        const duplicateId = findDuplicateBrokerId(row.broker, existingKeys);

        if (duplicateId) {
          duplicates.push({ ...row, matchedBrokerId: duplicateId });
        } else {
          rowsToImport.push(row);
          cacheBrokerKeys(existingKeys, row.broker, `pending-${row.rowNumber}`);
        }
      });

      for (const row of rowsToImport) {
        await createBroker(row.broker);
      }

      setDuplicateRows(duplicates);
      onImported(rowsToImport.length, preview.invalidRows.length, duplicates.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import valid brokers.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Import Brokers</h2>
            <p className="mt-1 text-sm text-steel">Upload CSV or XLSX broker records and review them before importing.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 text-sm font-medium">Close</button>
        </div>

        <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line bg-paper px-4 py-8 text-center">
          <Upload className="text-navy" size={26} />
          <span className="mt-3 text-sm font-medium">{file ? file.name : 'Choose CSV or XLSX file'}</span>
          <input type="file" accept=".csv,.xlsx" className="sr-only" onChange={handleFileChange} />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-steel">Required column: Broker Name. Optional: Broker Company, Broker Email, Broker Phone, Broker WhatsApp, Country, Status, CC Default, Notes.</p>
          <button type="button" disabled={!preview?.validRows.length || busy} onClick={handleImportValidBrokers} className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Working' : 'Import Valid Brokers'}
          </button>
        </div>

        {error ? <p className="mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}

        {preview || duplicateRows.length ? (
          <div className="mt-6 grid gap-6">
            <BrokerRowsTable title="Valid Rows" rows={preview?.validRows ?? []} />
            <InvalidBrokerRowsTable rows={preview?.invalidRows ?? []} />
            <DuplicateBrokerRowsTable rows={duplicateRows} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function splitDuplicateRows(rows: ImportBrokerRow[], brokers: Broker[]) {
  const keys = buildBrokerKeys(brokers);
  const validRows: ImportBrokerRow[] = [];
  const duplicates: DuplicateBrokerRow[] = [];

  rows.forEach((row) => {
    const duplicateId = findDuplicateBrokerId(row.broker, keys);

    if (duplicateId) {
      duplicates.push({ ...row, matchedBrokerId: duplicateId });
    } else {
      validRows.push(row);
      cacheBrokerKeys(keys, row.broker, `pending-${row.rowNumber}`);
    }
  });

  return { validRows, duplicates };
}

function buildBrokerKeys(brokers: Broker[]) {
  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();

  brokers.forEach((broker) => cacheBrokerKeys({ byEmail, byName }, broker, broker.id));
  return { byEmail, byName };
}

function findDuplicateBrokerId(broker: Pick<BrokerInput, 'brokerName' | 'brokerEmail'>, keys: ReturnType<typeof buildBrokerKeys>): string {
  const emailKey = normalizeBrokerKey(broker.brokerEmail);
  const nameKey = normalizeBrokerKey(broker.brokerName);

  return (emailKey ? keys.byEmail.get(emailKey) : '') || keys.byName.get(nameKey) || '';
}

function cacheBrokerKeys(keys: ReturnType<typeof buildBrokerKeys>, broker: Pick<BrokerInput, 'brokerName' | 'brokerEmail'>, id: string) {
  const emailKey = normalizeBrokerKey(broker.brokerEmail);
  const nameKey = normalizeBrokerKey(broker.brokerName);

  if (emailKey) keys.byEmail.set(emailKey, id);
  if (nameKey) keys.byName.set(nameKey, id);
}

function normalizeBrokerKey(value: string): string {
  return value.trim().toLowerCase();
}

function BrokerRowsTable({ title, rows }: { title: string; rows: ImportBrokerRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line">
      <div className="border-b border-line px-4 py-3"><h3 className="text-sm font-semibold">{title} ({rows.length})</h3></div>
      <BrokerTable rows={rows} emptyText="No valid rows to import." />
    </div>
  );
}

function BrokerTable({ rows, emptyText }: { rows: ImportBrokerRow[]; emptyText: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-paper">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
            <th className="px-3 py-3">Row</th><th className="px-3 py-3">Broker</th><th className="px-3 py-3">Company</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">WhatsApp</th><th className="px-3 py-3">Country</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">CC Default</th><th className="px-3 py-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.rowNumber}>
              <td className="px-3 py-3">{row.rowNumber}</td>
              <td className="px-3 py-3 font-medium">{row.broker.brokerName}</td>
              <td className="px-3 py-3">{row.broker.brokerCompany || '-'}</td>
              <td className="px-3 py-3">{row.broker.brokerEmail || '-'}</td>
              <td className="px-3 py-3">{row.broker.brokerPhone || '-'}</td>
              <td className="px-3 py-3">{row.broker.brokerWhatsApp || '-'}</td>
              <td className="px-3 py-3">{row.broker.country || '-'}</td>
              <td className="px-3 py-3">{row.broker.status}</td>
              <td className="px-3 py-3">{row.broker.ccDefault ? 'Yes' : 'No'}</td>
              <td className="px-3 py-3">{row.broker.notes || '-'}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-steel">{emptyText}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function InvalidBrokerRowsTable({ rows }: { rows: InvalidBrokerRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line">
      <div className="border-b border-line px-4 py-3"><h3 className="text-sm font-semibold">Invalid Rows ({rows.length})</h3></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-3 py-3">Row</th><th className="px-3 py-3">Broker</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">CC Default</th><th className="px-3 py-3">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-3 py-3">{row.rowNumber}</td><td className="px-3 py-3">{row.brokerName || '-'}</td><td className="px-3 py-3">{row.brokerEmail || '-'}</td><td className="px-3 py-3">{row.status || '-'}</td><td className="px-3 py-3">{row.ccDefault || '-'}</td><td className="px-3 py-3 text-rose">{row.errors.join(' ')}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-steel">No invalid rows found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DuplicateBrokerRowsTable({ rows }: { rows: DuplicateBrokerRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line">
      <div className="border-b border-line px-4 py-3"><h3 className="text-sm font-semibold">Duplicate Rows ({rows.length})</h3></div>
      <BrokerTable rows={rows} emptyText="No duplicate rows found." />
    </div>
  );
}
