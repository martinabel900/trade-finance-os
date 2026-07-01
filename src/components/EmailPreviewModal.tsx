import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCampaignEmailPreview } from '../services/emailService';
import {
  DEFAULT_EMAIL_SIGNATURE,
  getUserEmailSettings,
} from '../services/userSettingsService';
import type { Contact } from '../services/contactService';
import type { EmailQueueTemplate } from '../services/emailQueueService';
import { isValidEmail } from '../utils/emailValidation';

interface EmailPreviewModalProps {
  contacts: Contact[];
  onClose: () => void;
  onConfirm: (template: EmailQueueTemplate) => void;
  sending: boolean;
}

export default function EmailPreviewModal({
  contacts,
  onClose,
  onConfirm,
  sending,
}: EmailPreviewModalProps) {
  const firstContact = contacts[0];
  const preview = firstContact
    ? getCampaignEmailPreview({
        contactId: firstContact.id,
        to: firstContact.email,
        contactName: firstContact.contactName,
        companyName: firstContact.companyName,
        campaign: firstContact.campaign,
      })
    : null;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState(DEFAULT_EMAIL_SIGNATURE);
  const [settingsError, setSettingsError] = useState('');
  const ccRecipients = contacts
    .map((contact) => (contact.brokerCcEnabled && isValidEmail(contact.brokerEmail) ? contact.brokerEmail : ''))
    .filter(Boolean);
  const uniqueCcRecipients = [...new Set(ccRecipients)];
  const toLabel = contacts.length === 1 ? contacts[0].email : `${contacts.length} client recipients`;

  useEffect(() => {
    setSubject(preview?.subject ?? '');
    setBody(preview?.body ?? '');
  }, [preview?.body, preview?.subject]);

  useEffect(() => {
    let active = true;

    async function loadSignature() {
      try {
        const settings = await getUserEmailSettings();

        if (active) {
          setSignature(settings.signature);
          setSettingsError('');
        }
      } catch (error) {
        if (active) {
          setSettingsError(error instanceof Error ? error.message : 'Unable to load saved signature.');
        }
      }
    }

    loadSignature();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Email Preview</h2>
            <p className="text-sm text-steel">
              {contacts.length === 1 ? contacts[0].email : `${contacts.length} recipients selected`}
            </p>
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

        {preview ? (
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <div className="rounded border border-line bg-paper p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">From</p>
                <p className="mt-1 text-sm">Trade Finance Company International &lt;martin@tfciglobal.com&gt;</p>
                <p className="mt-2 text-sm text-steel">To: {toLabel}</p>
                <p className="mt-1 text-sm text-steel">
                  CC Broker: {uniqueCcRecipients.length ? uniqueCcRecipients.join(', ') : 'No'}
                </p>
              </div>
              <div className="rounded border border-line bg-paper p-4">
                <label htmlFor="email-subject" className="text-xs font-medium uppercase tracking-wide text-steel">
                  Subject
                </label>
                <input
                  id="email-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="focus-ring mt-2 w-full rounded border border-line bg-white px-3 py-2 text-sm font-medium"
                />
              </div>
              <div className="rounded border border-line bg-white p-4">
                <label htmlFor="email-body" className="text-xs font-medium uppercase tracking-wide text-steel">
                  Body
                </label>
                <textarea
                  id="email-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={12}
                  className="focus-ring mt-2 w-full resize-y rounded border border-line bg-white px-3 py-2 font-sans text-sm leading-6 text-ink"
                />
              </div>
              <div className="rounded border border-line bg-white p-4">
                <label htmlFor="email-signature" className="text-xs font-medium uppercase tracking-wide text-steel">
                  Signature
                </label>
                <textarea
                  id="email-signature"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  rows={5}
                  className="focus-ring mt-2 w-full resize-y rounded border border-line bg-white px-3 py-2 font-sans text-sm leading-6 text-ink"
                />
                {settingsError ? <p className="mt-2 text-sm font-medium text-red-700">{settingsError}</p> : null}
              </div>
              {contacts.length > 1 ? (
                <p className="text-sm text-steel">
                  This preview uses the first recipient. Each email will be personalized with the contact and company name.
                </p>
              ) : null}
            </div>

            <div className="rounded border border-line bg-[#f4f6fb] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-steel">Designed preview</p>
              <div className="overflow-hidden rounded-xl border border-[#d8e0eb] bg-white shadow-sm">
                <div className="bg-[#1c3169] px-6 py-7 text-white sm:px-8">
                  <p className="text-2xl font-bold leading-tight sm:text-3xl">
                    Trade Finance Company International
                  </p>
                  <p className="mt-3 text-base font-medium text-white/85">{subject || 'Campaign Email'}</p>
                </div>
                <div className="space-y-5 px-6 py-7 text-[15px] leading-7 text-ink sm:px-8">
                  <FormattedText value={body} />
                  {signature.trim() ? (
                    <div className="border-t border-line pt-5 text-sm leading-6 text-steel">
                      <FormattedText value={signature} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ subject: subject.trim(), body: body.trim(), signature: signature.trim() })}
            disabled={sending || !contacts.length || !subject.trim() || !body.trim()}
            className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? 'Queueing' : 'Confirm Queue'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormattedTextProps {
  value: string;
}

function FormattedText({ value }: FormattedTextProps) {
  const lines = value.split('\n');

  return (
    <>
      {lines.map((line, index) =>
        line.trim() ? (
          <p key={`${line}-${index}`}>{line}</p>
        ) : (
          <div key={`blank-${index}`} className="h-3" />
        ),
      )}
    </>
  );
}
