import { Upload } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { useBrokers } from '../hooks/useBrokers';
import { useContacts } from '../hooks/useContacts';
import { createContact, type Contact } from '../services/contactService';
import { createBroker, emptyBroker, type Broker, type BrokerInput } from '../services/brokerService';
import { hasMissingClientEmail } from '../utils/emailValidation';
import {
  parseContactFile,
  type ContactImportPreview,
  type ImportContactRow,
  type InvalidContactRow,
} from '../utils/importFile';

interface DuplicateContactRow extends ImportContactRow {
  matchedContactId: string;
}

export default function ImportPage() {
  const { contacts, error: contactsError } = useContacts();
  const { brokers, error: brokersError } = useBrokers();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ContactImportPreview | null>(null);
  const [duplicateRows, setDuplicateRows] = useState<DuplicateContactRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreview(null);
    setDuplicateRows([]);
    setMessage('');
    setError('');

    if (!selectedFile) {
      return;
    }

    setBusy(true);

    try {
      setPreview(await parseContactFile(selectedFile));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse import file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportValidRows() {
    if (!preview?.validRows.length) {
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');

    try {
      const existingKeys = getExistingContactKeys(contacts);
      const duplicates: DuplicateContactRow[] = [];
      const rowsToImport: ImportContactRow[] = [];

      preview.validRows.forEach((row) => {
        if (hasMissingClientEmail(row.contact.email)) {
          rowsToImport.push(row);
          return;
        }

        const key = getContactKey(row.contact.email, row.contact.campaign);
        const matchedContactId = existingKeys.get(key);

        if (matchedContactId) {
          duplicates.push({ ...row, matchedContactId });
        } else {
          rowsToImport.push(row);
          existingKeys.set(key, `pending-${row.rowNumber}`);
        }
      });

      const brokerCache = buildBrokerCache(brokers);

      for (const row of rowsToImport) {
        const broker = await findOrCreateBrokerForImport(
          {
            brokerName: row.contact.brokerName,
            brokerEmail: row.contact.brokerEmail,
            brokerPhone: row.contact.brokerPhone,
          },
          brokerCache,
        );
        const contact = broker
          ? {
              ...row.contact,
              brokerId: broker.id,
              brokerName: broker.brokerName,
              brokerEmail: broker.brokerEmail,
              brokerPhone: broker.brokerPhone,
              brokerCcEnabled: row.contact.brokerCcEnabled ?? broker.ccDefault,
            }
          : row.contact;

        await createContact(contact, {
          type: 'imported',
          message: 'Contact imported.',
        });
      }
      setDuplicateRows(duplicates);
      setMessage(`${rowsToImport.length} contacts imported. ${duplicates.length} duplicate rows skipped.`);
      setPreview({ validRows: [], invalidRows: preview.invalidRows });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import valid rows.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Import"
        description="Upload contacts from CSV or XLSX, review validation results, and import valid rows."
      />

      <div className="rounded border border-line bg-white p-5">
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line bg-paper px-4 py-8 text-center">
          <Upload className="text-navy" size={28} />
          <span className="mt-3 text-sm font-medium">
            {file ? file.name : 'Choose CSV or XLSX file'}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-steel">
            Expected columns: Broker Name, Broker Email, Broker Phone, Company, Contact Name, Email Address, Campaign.
          </p>
          <button
            type="button"
            disabled={!preview?.validRows.length || busy}
            onClick={handleImportValidRows}
            className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Working' : 'Import Valid Rows'}
          </button>
        </div>

        {message ? <p className="mt-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}
        {error ? <p className="mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
        {contactsError ? <p className="mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{contactsError}</p> : null}
        {brokersError ? <p className="mt-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{brokersError}</p> : null}
      </div>

      {preview || duplicateRows.length ? (
        <div className="mt-6 grid gap-6">
          <PreviewTable rows={preview?.validRows ?? []} />
          <InvalidRowsTable rows={preview?.invalidRows ?? []} />
          <DuplicateRowsTable rows={duplicateRows} />
        </div>
      ) : null}
    </section>
  );
}

function getExistingContactKeys(contacts: Contact[]): Map<string, string> {
  return contacts.reduce((keys, contact) => {
    keys.set(getContactKey(contact.email, contact.campaign), contact.id);
    return keys;
  }, new Map<string, string>());
}

function getContactKey(email: string, campaign: string): string {
  return `${email.trim().toLowerCase()}::${campaign.trim().toUpperCase()}`;
}

interface BrokerCache {
  byName: Map<string, Broker>;
  byEmail: Map<string, Broker>;
}

function buildBrokerCache(brokers: Broker[]): BrokerCache {
  const cache: BrokerCache = {
    byName: new Map(),
    byEmail: new Map(),
  };

  brokers.forEach((broker) => cacheBroker(cache, broker));
  return cache;
}

async function findOrCreateBrokerForImport(
  input: Pick<BrokerInput, 'brokerName' | 'brokerEmail' | 'brokerPhone'>,
  cache: BrokerCache,
): Promise<Broker | null> {
  const nameKey = normalizeBrokerKey(input.brokerName);
  const emailKey = normalizeBrokerKey(input.brokerEmail);
  const existing = (emailKey ? cache.byEmail.get(emailKey) : undefined) ||
    (nameKey ? cache.byName.get(nameKey) : undefined);

  if (existing) {
    return existing;
  }

  if (!input.brokerName && !input.brokerEmail) {
    return null;
  }

  const brokerInput = {
    ...emptyBroker,
    brokerName: input.brokerName,
    brokerEmail: input.brokerEmail,
    brokerPhone: input.brokerPhone,
  };
  const broker: Broker = {
    ...brokerInput,
    id: await createBroker(brokerInput),
  };

  cacheBroker(cache, broker);
  return broker;
}

function cacheBroker(cache: BrokerCache, broker: Broker): void {
  const nameKey = normalizeBrokerKey(broker.brokerName);
  const emailKey = normalizeBrokerKey(broker.brokerEmail);

  if (nameKey) cache.byName.set(nameKey, broker);
  if (emailKey) cache.byEmail.set(emailKey, broker);
}

function normalizeBrokerKey(value: string): string {
  return value.trim().toLowerCase();
}

function PreviewTable({ rows }: { rows: ImportContactRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Valid Rows ({rows.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Broker</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Batch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3">{row.rowNumber}</td>
                <td className="px-4 py-3">{row.contact.brokerName || '-'}</td>
                <td className="px-4 py-3 font-medium text-ink">{row.contact.companyName}</td>
                <td className="px-4 py-3">{row.contact.contactName || '-'}</td>
                <td className="px-4 py-3">{row.contact.email}</td>
                <td className="px-4 py-3">Campaign {row.contact.campaign}</td>
                <td className="px-4 py-3">{row.contact.batch}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-steel">
                  No valid rows to import.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvalidRowsTable({ rows }: { rows: InvalidContactRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Invalid Rows ({rows.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3">{row.rowNumber}</td>
                <td className="px-4 py-3">{row.companyName || '-'}</td>
                <td className="px-4 py-3">{row.email || '-'}</td>
                <td className="px-4 py-3">{row.campaign || '-'}</td>
                <td className="px-4 py-3 text-rose">{row.errors.join(' ')}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-steel">
                  No invalid rows found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DuplicateRowsTable({ rows }: { rows: DuplicateContactRow[] }) {
  return (
    <div className="overflow-hidden rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Duplicate Rows ({rows.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3">{row.rowNumber}</td>
                <td className="px-4 py-3">{row.contact.companyName}</td>
                <td className="px-4 py-3">{row.contact.email}</td>
                <td className="px-4 py-3">Campaign {row.contact.campaign}</td>
                <td className="px-4 py-3 text-amber">Email and campaign already exist.</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-steel">
                  No duplicate rows skipped.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
