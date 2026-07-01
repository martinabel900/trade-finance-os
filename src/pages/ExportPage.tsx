import { Download } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import { useEmailQueue } from '../hooks/useEmailQueue';
import { downloadCsv, downloadJson, todayStamp } from '../utils/exportData';

const contactCsvHeaders = [
  'brokerName',
  'companyName',
  'contactName',
  'email',
  'phone',
  'campaign',
  'batch',
  'emailStatus',
  'replyStatus',
  'responseCategory',
  'lastReplyAt',
  'lastReplyByName',
  'lastReplyByInitials',
  'nextAction',
  'nextFollowUpDate',
  'dealStatus',
  'archivedAt',
  'archivedByName',
  'archivedByInitials',
  'notes',
  'createdAt',
  'updatedAt',
  'createdByName',
  'createdByInitials',
  'updatedByName',
  'updatedByInitials',
];

const emailQueueCsvHeaders = [
  'recipientEmail',
  'recipientName',
  'companyName',
  'campaign',
  'status',
  'attempts',
  'lastAttemptAt',
  'lastError',
  'queuedAt',
  'sentAt',
  'createdByName',
  'createdByInitials',
  'updatedByName',
  'updatedByInitials',
];

export default function ExportPage() {
  const { contacts, loading: contactsLoading, error: contactsError } = useContacts();
  const { items: emailQueue, loading: queueLoading, error: queueError } = useEmailQueue();
  const loading = contactsLoading || queueLoading;
  const archivedContacts = contacts.filter((contact) => contact.dealStatus === 'Archived');

  function handleExportContactsCsv() {
    downloadCsv(`trade-finance-os-contacts-${todayStamp()}.csv`, contacts, contactCsvHeaders);
  }

  function handleExportEmailQueueCsv() {
    downloadCsv(`trade-finance-os-email-queue-${todayStamp()}.csv`, emailQueue, emailQueueCsvHeaders);
  }

  function handleExportArchivedContactsCsv() {
    downloadCsv(`trade-finance-os-archived-contacts-${todayStamp()}.csv`, archivedContacts, contactCsvHeaders);
  }

  function handleExportFullBackupJson() {
    downloadJson(`trade-finance-os-backup-${todayStamp()}.json`, {
      contacts,
      emailQueue,
    });
  }

  return (
    <section>
      <PageHeader title="Export" description="Download CRM contacts, email queue records, or a full backup." />

      {contactsError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{contactsError}</p>
      ) : null}
      {queueError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{queueError}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <ExportCard
          title="Contacts CSV"
          detail={`${contacts.length} contacts`}
          buttonLabel="Export Contacts CSV"
          disabled={loading}
          onClick={handleExportContactsCsv}
        />
        <ExportCard
          title="Email Queue CSV"
          detail={`${emailQueue.length} queue records`}
          buttonLabel="Export Email Queue CSV"
          disabled={loading}
          onClick={handleExportEmailQueueCsv}
        />
        <ExportCard
          title="Full Backup JSON"
          detail="Contacts and email queue"
          buttonLabel="Export Full Backup JSON"
          disabled={loading}
          onClick={handleExportFullBackupJson}
        />
      </div>

      <div className="mt-6 rounded border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Archive</h2>
          <p className="mt-1 text-sm text-steel">Export contacts that have been safely archived.</p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <ExportCard
            title="Archived Contacts CSV"
            detail={`${archivedContacts.length} archived contacts`}
            buttonLabel="Export Archived Contacts CSV"
            disabled={loading}
            onClick={handleExportArchivedContactsCsv}
          />
        </div>
      </div>
    </section>
  );
}

interface ExportCardProps {
  title: string;
  detail: string;
  buttonLabel: string;
  disabled: boolean;
  onClick: () => void;
}

function ExportCard({ title, detail, buttonLabel, disabled, onClick }: ExportCardProps) {
  return (
    <div className="rounded border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-steel">{detail}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded border border-line bg-paper text-navy">
          <Download size={18} />
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Download size={16} />
        {buttonLabel}
      </button>
    </div>
  );
}
