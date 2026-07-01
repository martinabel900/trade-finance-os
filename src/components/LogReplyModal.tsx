import { X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  DEAL_STATUSES,
  RESPONSE_CATEGORIES,
  logContactReply,
  type Contact,
  type ReplyLogInput,
} from '../services/contactService';

interface LogReplyModalProps {
  contact: Contact;
  onClose: () => void;
}

export default function LogReplyModal({ contact, onClose }: LogReplyModalProps) {
  const [form, setForm] = useState<ReplyLogInput>({
    replyDate: toDateInputValue(new Date()),
    responseCategory: contact.responseCategory || 'Still active',
    dealStatus: contact.dealStatus || 'Active',
    nextAction: contact.nextAction || '',
    nextFollowUpDate: timestampToDateInputValue(contact.nextFollowUpDate),
    notes: contact.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await logContactReply(contact.id, form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log reply.');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof ReplyLogInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded bg-white shadow-soft"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Log Reply</h2>
            <p className="text-sm text-steel">{contact.companyName}</p>
          </div>
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
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Reply Date</span>
            <input
              type="date"
              value={form.replyDate}
              onChange={(event) => updateField('replyDate', event.target.value)}
              className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            />
          </label>

          <Select
            label="Response Category"
            value={form.responseCategory}
            options={RESPONSE_CATEGORIES}
            onChange={(value) => updateField('responseCategory', value)}
          />

          <Select
            label="Deal Status"
            value={form.dealStatus}
            options={DEAL_STATUSES}
            onChange={(value) => updateField('dealStatus', value)}
          />

          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Next Follow-up Date</span>
            <input
              type="date"
              value={form.nextFollowUpDate}
              onChange={(event) => updateField('nextFollowUpDate', event.target.value)}
              className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Next Action</span>
            <input
              value={form.nextAction}
              onChange={(event) => updateField('nextAction', event.target.value)}
              className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            />
          </label>

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
            {saving ? 'Saving' : 'Save Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
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

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timestampToDateInputValue(value: Contact['nextFollowUpDate']): string {
  return value ? toDateInputValue(value.toDate()) : '';
}
