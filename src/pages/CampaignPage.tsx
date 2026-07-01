import { Mail } from 'lucide-react';
import { useState } from 'react';
import ContactsTable from '../components/ContactsTable';
import EmailPreviewModal from '../components/EmailPreviewModal';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import type { Contact } from '../services/contactService';
import { enqueueCampaignBatch } from '../services/emailQueueService';
import type { EmailQueueTemplate } from '../services/emailQueueService';
import { isValidEmail } from '../utils/emailValidation';

interface CampaignPageProps {
  campaign: 'A' | 'B' | 'C';
}

export default function CampaignPage({ campaign }: CampaignPageProps) {
  const { contacts, loading, error } = useContacts();
  const [batchPreviewContacts, setBatchPreviewContacts] = useState<Contact[]>([]);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendError, setSendError] = useState('');
  const campaignContacts = contacts.filter((contact) => contact.campaign === campaign);
  const sendableContacts = campaignContacts.filter((contact) => isValidEmail(contact.email));

  async function handleConfirmSendBatch(template: EmailQueueTemplate) {
    if (!batchPreviewContacts.length) {
      return;
    }

    setSendingBatch(true);
    setSendError('');

    try {
      await enqueueCampaignBatch(batchPreviewContacts, template);
      setBatchPreviewContacts([]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Unable to send batch email.');
    } finally {
      setSendingBatch(false);
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={`Campaign ${campaign}`}
          description={`Manage outreach progress for contacts assigned to Campaign ${campaign}.`}
        />
        <button
          type="button"
          disabled={loading || !sendableContacts.length}
          onClick={() => setBatchPreviewContacts(sendableContacts)}
          className="flex items-center justify-center gap-2 rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Mail size={16} />
          Send Batch
        </button>
      </div>
      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {sendError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{sendError}</p> : null}
      <div className="mb-4 rounded border border-line bg-white p-5">
        <p className="text-sm text-steel">Total contacts in Campaign {campaign}</p>
        <p className="mt-2 text-3xl font-semibold">{loading ? '-' : campaignContacts.length}</p>
      </div>
      {loading ? (
        <p className="text-sm text-steel">Loading campaign contacts</p>
      ) : (
        <ContactsTable contacts={campaignContacts} fixedCampaign={campaign} />
      )}
      {batchPreviewContacts.length ? (
        <EmailPreviewModal
          contacts={batchPreviewContacts}
          sending={sendingBatch}
          onClose={() => setBatchPreviewContacts([])}
          onConfirm={handleConfirmSendBatch}
        />
      ) : null}
    </section>
  );
}
