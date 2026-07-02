import { AlertCircle, Ban, CalendarClock, Mail, MailCheck, Percent, Reply, RotateCcw, Send, Users, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import { useBrokers } from '../hooks/useBrokers';
import { useEmailQueue } from '../hooks/useEmailQueue';
import { processEmailQueueNow } from '../services/emailQueueService';
import { useAuth } from '../state/useAuth';
import { hasMissingClientEmail, isValidEmail } from '../utils/emailValidation';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  loading: boolean;
}

type DashboardTab = 'Overview' | 'Campaigns' | 'Brokers & Missing Emails' | 'Email Queue';

const dashboardTabs: DashboardTab[] = ['Overview', 'Campaigns', 'Brokers & Missing Emails', 'Email Queue'];

export default function DashboardPage() {
  const { isManager } = useAuth();
  const { contacts, loading, error } = useContacts();
  const { brokers, loading: brokersLoading, error: brokersError } = useBrokers();
  const { items: queueItems, loading: queueLoading, error: queueError } = useEmailQueue();
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [processingQueue, setProcessingQueue] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const total = contacts.length;
  const campaignA = contacts.filter((contact) => contact.campaign === 'A').length;
  const campaignB = contacts.filter((contact) => contact.campaign === 'B').length;
  const campaignC = contacts.filter((contact) => contact.campaign === 'C').length;
  const emailsNotSent = contacts.filter((contact) => contact.emailStatus !== 'Sent').length;
  const emailsSent = contacts.filter((contact) => contact.emailStatus === 'Sent').length;
  const repliesReceived = contacts.filter((contact) => contact.replyStatus === 'Replied').length;
  const noReplies = contacts.filter((contact) => contact.replyStatus !== 'Replied').length;
  const responseRate = emailsSent ? Math.round((repliesReceived / emailsSent) * 100) : 0;
  const repliesLogged = contacts.filter((contact) => Boolean(contact.lastReplyAt)).length;
  const dealsReopened = contacts.filter((contact) => contact.dealStatus === 'Reopened').length;
  const dealsLost = contacts.filter((contact) => contact.dealStatus === 'Lost').length;
  const doNotContact = contacts.filter((contact) => contact.dealStatus === 'Do Not Contact').length;
  const followUpsDueToday = contacts.filter((contact) => isFollowUpDueToday(contact.nextFollowUpDate)).length;
  const followUpsOverdue = contacts.filter((contact) => isFollowUpOverdue(contact.nextFollowUpDate)).length;
  const pendingEmails = queueItems.filter((item) => item.status === 'Pending' || item.status === 'Sending').length;
  const sentQueueEmails = queueItems.filter((item) => item.status === 'Sent').length;
  const failedEmails = queueItems.filter((item) => item.status === 'Failed').length;
  const missingEmailContacts = contacts.filter((contact) => contact.dealStatus !== 'Archived' && (contact.contactEmailStatus === 'Missing Email' || hasMissingClientEmail(contact.email)));
  const missingWithBrokerEmail = missingEmailContacts.filter((contact) => isValidEmail(contact.brokerEmail)).length;
  const missingWithoutBrokerEmail = missingEmailContacts.length - missingWithBrokerEmail;
  const brokerRequestsQueued = queueItems.filter((item) => item.template === 'BrokerMissingEmailRequest' && item.status === 'Pending').length;
  const brokerRequestsSent = queueItems.filter((item) => item.template === 'BrokerMissingEmailRequest' && item.status === 'Sent').length;

  const overviewMetrics = [
    { label: 'Total Contacts', value: total, icon: Users },
    { label: 'Emails Sent', value: emailsSent, icon: MailCheck },
    { label: 'Replies Logged', value: repliesLogged, icon: Reply },
    { label: 'Response Rate', value: `${responseRate}%`, icon: Percent },
    { label: 'Follow-ups Due Today', value: followUpsDueToday, icon: CalendarClock },
    { label: 'Follow-ups Overdue', value: followUpsOverdue, icon: AlertCircle },
  ];

  const campaignMetrics = [
    { label: 'Campaign A', value: campaignA, icon: Users },
    { label: 'Campaign B', value: campaignB, icon: Users },
    { label: 'Campaign C', value: campaignC, icon: Users },
    { label: 'Emails Not Sent', value: emailsNotSent, icon: Mail },
    { label: 'Replies Received', value: repliesReceived, icon: Reply },
    { label: 'No Replies', value: noReplies, icon: Mail },
    { label: 'Deals Reopened', value: dealsReopened, icon: RotateCcw },
    { label: 'Deals Lost', value: dealsLost, icon: XCircle },
    { label: 'Do Not Contact', value: doNotContact, icon: Ban },
  ];

  const brokerMetrics = [
    { label: 'Total Brokers', value: brokers.length, icon: Users, loading: brokersLoading },
    { label: 'Active Brokers', value: brokers.filter((broker) => broker.status === 'Active').length, icon: Users, loading: brokersLoading },
    { label: 'Contacts Missing Email', value: missingEmailContacts.length, icon: Mail, loading },
    { label: 'Missing Emails With Broker Email', value: missingWithBrokerEmail, icon: MailCheck, loading },
    { label: 'Missing Emails Without Broker Email', value: missingWithoutBrokerEmail, icon: AlertCircle, loading },
    { label: 'Broker Requests Queued', value: brokerRequestsQueued, icon: Send, loading: queueLoading },
    { label: 'Broker Requests Sent', value: brokerRequestsSent, icon: MailCheck, loading: queueLoading },
  ];

  const queueMetrics = [
    { label: 'Pending Emails', value: pendingEmails, icon: Send, loading: queueLoading },
    { label: 'Sent Queue Emails', value: sentQueueEmails, icon: MailCheck, loading: queueLoading },
    { label: 'Failed Emails', value: failedEmails, icon: AlertCircle, loading: queueLoading },
    { label: 'Broker Requests Queued', value: brokerRequestsQueued, icon: Send, loading: queueLoading },
    { label: 'Broker Requests Sent', value: brokerRequestsSent, icon: MailCheck, loading: queueLoading },
  ];

  async function handleProcessQueueNow() {
    setProcessingQueue(true);
    setActionMessage('');
    setActionError('');

    try {
      const result = await processEmailQueueNow();
      setActionMessage(`Processed ${result.processed} pending records. Sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to process email queue.');
    } finally {
      setProcessingQueue(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Performance snapshot across trade finance recovery campaigns."
        action={
          <Link
            to="/follow-ups"
            className="inline-flex items-center justify-center gap-2 rounded bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            <CalendarClock size={16} />
            View Follow-ups
          </Link>
        }
      />

      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {brokersError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{brokersError}</p> : null}
      {queueError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{queueError}</p> : null}
      {actionError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p> : null}
      {actionMessage ? <p className="mb-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{actionMessage}</p> : null}

      <div className="mb-5 flex flex-wrap gap-2 rounded border border-line bg-white p-2">
        {dashboardTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'rounded px-4 py-2 text-sm font-semibold transition',
              activeTab === tab ? 'bg-navy text-white' : 'text-steel hover:bg-paper hover:text-ink',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <DashboardSection
          title="Overview"
          description="High-level operating snapshot for today."
          metrics={overviewMetrics}
          defaultLoading={loading}
          actions={
            <>
              <QuickAction to="/follow-ups" label="View Follow-ups" />
              <QuickAction to="/import" label="Import Contacts" />
              <QuickAction to="/email-queue" label="View Email Queue" />
            </>
          }
        />
      ) : null}

      {activeTab === 'Campaigns' ? (
        <DashboardSection
          title="Campaigns"
          description="Campaign distribution, outreach status, and reply outcomes."
          metrics={campaignMetrics}
          defaultLoading={loading}
        />
      ) : null}

      {activeTab === 'Brokers & Missing Emails' ? (
        <DashboardSection
          title="Brokers & Missing Emails"
          description="Broker coverage and missing client email resolution."
          metrics={brokerMetrics}
          defaultLoading={loading || brokersLoading || queueLoading}
          actions={
            <>
              <QuickAction to="/brokers" label="View Brokers" />
              <QuickAction to="/missing-emails" label="View Missing Emails" />
              <QuickAction to="/brokers" label="Import Brokers" />
            </>
          }
        />
      ) : null}

      {activeTab === 'Email Queue' ? (
        <DashboardSection
          title="Email Queue"
          description="Queued outbound email work and broker request progress."
          metrics={queueMetrics}
          defaultLoading={queueLoading}
          actions={
            <>
              <QuickAction to="/email-queue" label="View Email Queue" />
              {isManager ? (
                <button
                  type="button"
                  onClick={handleProcessQueueNow}
                  disabled={processingQueue}
                  className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {processingQueue ? 'Processing' : 'Process Queue Now'}
                </button>
              ) : null}
            </>
          }
        />
      ) : null}
    </section>
  );
}

function isFollowUpDueToday(value: { toDate: () => Date } | null | undefined) {
  if (!value) return false;

  return getDateKey(value.toDate()) === getDateKey(new Date());
}

function isFollowUpOverdue(value: { toDate: () => Date } | null | undefined) {
  if (!value) return false;

  const followUp = new Date(value.toDate());
  followUp.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return followUp < today;
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function MetricCard({ label, value, icon: Icon, loading, compact = false }: MetricCardProps & { compact?: boolean }) {
  return (
    <div className="rounded border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-steel">{label}</p>
          <p className={compact ? 'mt-2 text-2xl font-semibold' : 'mt-2 text-3xl font-semibold'}>
            {loading ? '-' : value}
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded bg-paper text-navy">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  description,
  metrics,
  defaultLoading,
  actions,
}: {
  title: string;
  description: string;
  metrics: Array<MetricCardProps & { loading?: boolean }>;
  defaultLoading: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded border border-line bg-white">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} loading={metric.loading ?? defaultLoading} />
        ))}
      </div>
    </div>
  );
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
    >
      {label}
    </Link>
  );
}
