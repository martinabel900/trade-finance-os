import { Edit3, Plus, Search, UserX } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
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

export default function BrokersPage() {
  const { brokers, loading, error } = useBrokers();
  const { contacts } = useContacts();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [editingBroker, setEditingBroker] = useState<Broker | BrokerInput | null>(null);
  const [actionError, setActionError] = useState('');

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

      <div className="mb-4 grid gap-3 rounded border border-line bg-white p-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
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
