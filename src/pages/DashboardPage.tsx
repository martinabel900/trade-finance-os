import { AlertCircle, Ban, CalendarClock, Mail, MailCheck, Percent, Reply, RotateCcw, Send, Users, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import { useEmailQueue } from '../hooks/useEmailQueue';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  loading: boolean;
}

export default function DashboardPage() {
  const { contacts, loading, error } = useContacts();
  const { items: queueItems, loading: queueLoading, error: queueError } = useEmailQueue();
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

  const primaryMetrics = [
    { label: 'Total Contacts', value: total, icon: Users },
    { label: 'Emails Not Sent', value: emailsNotSent, icon: Mail },
    { label: 'Emails Sent', value: emailsSent, icon: MailCheck },
    { label: 'Replies Received', value: repliesReceived, icon: Reply },
    { label: 'Replies Logged', value: repliesLogged, icon: Reply },
    { label: 'No Replies', value: noReplies, icon: Mail },
    { label: 'Response Rate', value: `${responseRate}%`, icon: Percent },
    { label: 'Deals Reopened', value: dealsReopened, icon: RotateCcw },
    { label: 'Deals Lost', value: dealsLost, icon: XCircle },
    { label: 'Do Not Contact', value: doNotContact, icon: Ban },
    { label: 'Follow-ups Due Today', value: followUpsDueToday, icon: CalendarClock },
    { label: 'Follow-ups Overdue', value: followUpsOverdue, icon: AlertCircle },
    { label: 'Pending Emails', value: pendingEmails, icon: Send, loading: queueLoading },
    { label: 'Sent Queue Emails', value: sentQueueEmails, icon: MailCheck, loading: queueLoading },
    { label: 'Failed Emails', value: failedEmails, icon: AlertCircle, loading: queueLoading },
  ];

  const campaignMetrics = [
    { label: 'Campaign A', value: campaignA, icon: Users },
    { label: 'Campaign B', value: campaignB, icon: Users },
    { label: 'Campaign C', value: campaignC, icon: Users },
  ];

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
      {queueError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{queueError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {primaryMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} loading={metric.loading ?? loading} />
        ))}
      </div>

      <div className="mt-6 rounded border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Campaign Distribution</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {campaignMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} loading={loading} compact />
          ))}
        </div>
      </div>
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
