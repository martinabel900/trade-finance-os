import { Download } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import { useBrokers } from '../hooks/useBrokers';
import { useEmailQueue } from '../hooks/useEmailQueue';
import { hasMissingClientEmail } from '../utils/emailValidation';
import { downloadCsv, downloadJson, todayStamp } from '../utils/exportData';
import { useAuth } from '../state/useAuth';

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

const brokerCsvHeaders = [
  'brokerName',
  'brokerCompany',
  'brokerEmail',
  'brokerPhone',
  'brokerWhatsApp',
  'country',
  'status',
  'ccDefault',
  'notes',
  'createdAt',
  'updatedAt',
  'createdByName',
  'createdByInitials',
  'updatedByName',
  'updatedByInitials',
];

export default function ExportPage() {
  const { isAdmin, isManager } = useAuth();
  const { contacts, loading: contactsLoading, error: contactsError } = useContacts();
  const { brokers, loading: brokersLoading, error: brokersError } = useBrokers();
  const { items: emailQueue, loading: queueLoading, error: queueError } = useEmailQueue();
  const loading = contactsLoading || queueLoading || brokersLoading;
  const archivedContacts = contacts.filter((contact) => contact.dealStatus === 'Archived');
  const missingEmailContacts = contacts.filter((contact) => contact.contactEmailStatus === 'Missing Email' || hasMissingClientEmail(contact.email));

  function handleExportContactsCsv() {
    downloadCsv(`trade-finance-os-contacts-${todayStamp()}.csv`, contacts, contactCsvHeaders);
  }

  function handleExportEmailQueueCsv() {
    downloadCsv(`trade-finance-os-email-queue-${todayStamp()}.csv`, emailQueue, emailQueueCsvHeaders);
  }

  function handleExportArchivedContactsCsv() {
    downloadCsv(`trade-finance-os-archived-contacts-${todayStamp()}.csv`, archivedContacts, contactCsvHeaders);
  }

  function handleExportBrokersCsv() {
    downloadCsv(`trade-finance-os-brokers-${todayStamp()}.csv`, brokers, brokerCsvHeaders);
  }

  function handleExportMissingEmailsCsv() {
    downloadCsv(`trade-finance-os-missing-emails-${todayStamp()}.csv`, missingEmailContacts, contactCsvHeaders);
  }

  function handleExportFullBackupJson() {
    downloadJson(`trade-finance-os-backup-${todayStamp()}.json`, {
      contacts,
      brokers,
      emailQueue,
    });
  }

  return (
    <section>
      <PageHeader title="Export" description="Download CRM contacts, email queue records, or a full backup." />

      {!isManager ? (
        <p className="mb-4 rounded border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
          Export tools are available to admins and managers only.
        </p>
      ) : null}

      {contactsError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{contactsError}</p>
      ) : null}
      {queueError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{queueError}</p>
      ) : null}
      {brokersError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{brokersError}</p>
      ) : null}

      {isManager ? (
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
          {isAdmin ? (
            <ExportCard
              title="Full Backup JSON"
              detail="Contacts, brokers, and email queue"
              buttonLabel="Export Full Backup JSON"
              disabled={loading}
              onClick={handleExportFullBackupJson}
            />
          ) : null}
        </div>
      ) : null}

      {isManager ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ExportCard
            title="Brokers CSV"
            detail={`${brokers.length} brokers`}
            buttonLabel="Export Brokers CSV"
            disabled={loading}
            onClick={handleExportBrokersCsv}
          />
          <ExportCard
            title="Missing Emails CSV"
            detail={`${missingEmailContacts.length} missing email contacts`}
            buttonLabel="Export Missing Emails CSV"
            disabled={loading}
            onClick={handleExportMissingEmailsCsv}
          />
        </div>
      ) : null}

      {isManager ? (
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
      ) : null}
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
