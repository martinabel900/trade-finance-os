import { X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useBrokers } from '../hooks/useBrokers';
import {
  CAMPAIGNS,
  EMAIL_STATUSES,
  REPLY_STATUSES,
  RESPONSE_CATEGORIES,
  createContact,
  emptyContact,
  subscribeToContactActivity,
  updateContact,
  type Contact,
  type ContactActivity,
  type ContactInput,
} from '../services/contactService';
import InitialsBadge from './InitialsBadge';
import { getUserSignature } from '../utils/userAttribution';
import { auth } from '../firebase/firebase';

interface ContactFormModalProps {
  contact: Contact | ContactInput;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}

interface SelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function hasContactId(contact: Contact | ContactInput): contact is Contact {
  return 'id' in contact && Boolean(contact.id);
}

export default function ContactFormModal({ contact, onClose }: ContactFormModalProps) {
  const { brokers, error: brokersError } = useBrokers();
  const [form, setForm] = useState<Contact | ContactInput>(emptyContact);
  const [activity, setActivity] = useState<ContactActivity[]>([]);
  const [activityError, setActivityError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(contact ? { ...emptyContact, ...contact } : emptyContact);
  }, [contact]);

  useEffect(() => {
    if (!hasContactId(contact)) {
      setActivity([]);
      setActivityError('');
      return undefined;
    }

    return subscribeToContactActivity(
      contact.id,
      (nextActivity) => {
        setActivity(nextActivity);
        setActivityError('');
      },
      (err) => {
        setActivityError(err.message);
      },
    );
  }, [contact]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: ContactInput = {
        brokerName: form.brokerName,
        brokerId: form.brokerId,
        brokerEmail: form.brokerEmail,
        brokerPhone: form.brokerPhone,
        brokerCcEnabled: form.brokerCcEnabled,
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        campaign: form.campaign,
        batch: form.batch,
        emailStatus: form.emailStatus,
        replyStatus: form.replyStatus,
        responseCategory: form.responseCategory,
        notes: form.notes,
      };

      if (hasContactId(form)) {
        await updateContact(form.id, payload, getUpdateActivity(contact, payload));
        const brokerActivity = getBrokerChangeActivity(contact, payload);

        if (brokerActivity) {
          await updateContact(form.id, {}, brokerActivity);
        }
      } else {
        await createContact(payload);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save contact.');
    } finally {
      setSaving(false);
    }
  }

  function handleBrokerSelect(brokerId: string) {
    const broker = brokers.find((item) => item.id === brokerId);

    if (!broker) {
      setForm((current) => ({
        ...current,
        brokerId: '',
        brokerName: '',
        brokerEmail: '',
        brokerPhone: '',
        brokerCcEnabled: false,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      brokerId: broker.id,
      brokerName: broker.brokerName,
      brokerEmail: broker.brokerEmail,
      brokerPhone: broker.brokerPhone,
      brokerCcEnabled: current.brokerCcEnabled === null || current.brokerCcEnabled === undefined
        ? broker.ccDefault
        : current.brokerCcEnabled,
    }));
  }

  function updateField(field: keyof ContactInput, value: string | boolean | null) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded bg-white shadow-soft"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{hasContactId(form) ? 'Edit Contact' : 'New Contact'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded border border-line hover:bg-paper"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Company Name" value={form.companyName} onChange={(value) => updateField('companyName', value)} required />
          <Field label="Contact Name" value={form.contactName} onChange={(value) => updateField('contactName', value)} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => updateField('email', value)} />
          <Field label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
          <Select label="Campaign" value={form.campaign} options={CAMPAIGNS} onChange={(value) => updateField('campaign', value)} />
          <Field label="Batch" value={form.batch} onChange={(value) => updateField('batch', value)} />
          <Select label="Email Status" value={form.emailStatus} options={EMAIL_STATUSES} onChange={(value) => updateField('emailStatus', value)} />
          <Select label="Reply Status" value={form.replyStatus} options={REPLY_STATUSES} onChange={(value) => updateField('replyStatus', value)} />
          <Select
            label="Response Category"
            value={form.responseCategory}
            options={RESPONSE_CATEGORIES}
            onChange={(value) => updateField('responseCategory', value)}
          />

          <div className="rounded border border-line bg-paper p-4 sm:col-span-2">
            <h3 className="text-sm font-semibold">Broker Details</h3>
            {brokersError ? <p className="mt-2 text-sm text-rose">{brokersError}</p> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-medium uppercase tracking-wide text-steel">Broker</span>
                <select
                  value={form.brokerId || ''}
                  onChange={(event) => handleBrokerSelect(event.target.value)}
                  className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
                >
                  <option value="">No broker</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.brokerName || broker.brokerEmail || 'Unnamed Broker'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.brokerCcEnabled)}
                  onChange={(event) => updateField('brokerCcEnabled', event.target.checked)}
                />
                Broker CC Enabled
              </label>
              <ReadOnlyField label="Broker Email" value={form.brokerEmail || '-'} />
              <ReadOnlyField label="Broker Phone" value={form.brokerPhone || '-'} />
            </div>
          </div>

          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              rows={4}
              className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        {hasContactId(form) ? (
          <div className="border-t border-line px-5 py-4">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            {activityError ? <p className="mt-2 text-sm text-rose">{activityError}</p> : null}
            <div className="mt-3 space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-3 rounded border border-line bg-paper px-3 py-2 text-sm">
                  <InitialsBadge
                    initials={item.createdByInitials}
                    name={item.createdByName || item.createdBy}
                  />
                  <div>
                    <p className="font-medium text-ink">{item.message}</p>
                    <p className="mt-1 text-xs text-steel">
                      {formatActivityDate(item.createdAt)} by {item.createdByName || item.createdBy || 'Unknown user'}
                    </p>
                  </div>
                </div>
              ))}
              {!activity.length ? (
                <p className="text-sm text-steel">No activity recorded yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className="px-5 text-sm text-rose">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving' : 'Save Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getUpdateActivity(original: Contact | ContactInput, payload: ContactInput) {
  if (hasContactId(original) && brokerChanged(original, payload)) {
    return undefined;
  }

  return {
    type: 'edited',
    message: 'Contact details edited.',
  };
}

function getBrokerChangeActivity(original: Contact | ContactInput, payload: ContactInput) {
  if (!hasContactId(original) || !brokerChanged(original, payload)) {
    return undefined;
  }

  const actor = getUserSignature(auth.currentUser);
  const oldBroker = original.brokerName || 'No broker';
  const newBroker = payload.brokerName || 'No broker';

  return {
    type: 'broker_changed',
    message: payload.brokerName
      ? `Broker changed by ${actor.initials}: ${oldBroker} -> ${newBroker}`
      : `Broker removed by ${actor.initials}`,
  };
}

function brokerChanged(original: Contact, payload: ContactInput): boolean {
  return (
    (original.brokerId || '') !== (payload.brokerId || '') ||
    (original.brokerName || '') !== (payload.brokerName || '') ||
    (original.brokerEmail || '') !== (payload.brokerEmail || '')
  );
}

function formatActivityDate(createdAt: ContactActivity['createdAt']): string {
  if (!createdAt) {
    return 'Just now';
  }

  return createdAt.toDate().toLocaleString();
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <p className="mt-1 min-h-10 rounded border border-line bg-white px-3 py-2 text-sm text-ink">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: FieldProps) {
  return (
    <label>
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        min={type === 'number' ? 1 : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label>
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
