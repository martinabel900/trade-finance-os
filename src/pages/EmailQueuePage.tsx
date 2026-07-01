import { RotateCcw, XCircle } from 'lucide-react';
import InitialsBadge from '../components/InitialsBadge';
import PageHeader from '../components/PageHeader.jsx';
import { useEmailQueue } from '../hooks/useEmailQueue';
import {
  EMAIL_QUEUE_STATUSES,
  cancelEmailQueueItem,
  processEmailQueueNow,
  retryEmailQueueItem,
  type EmailQueueItem,
  type EmailQueueStatus,
} from '../services/emailQueueService';
import { useState } from 'react';
import { useAuth } from '../state/useAuth';

export default function EmailQueuePage() {
  const { isManager } = useAuth();
  const { items, loading, error } = useEmailQueue();
  const [status, setStatus] = useState<EmailQueueStatus | 'All'>('All');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const visibleItems = status === 'All' ? items : items.filter((item) => item.status === status);

  async function handleRetry(itemId: string) {
    setActionError('');

    try {
      await retryEmailQueueItem(itemId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to retry email.');
    }
  }

  async function handleProcessQueueNow() {
    setProcessing(true);
    setActionError('');
    setMessage('');

    try {
      const result = await processEmailQueueNow();
      setMessage(
        `Processed ${result.processed} pending records. Sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to process email queue.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel(itemId: string) {
    setActionError('');

    try {
      await cancelEmailQueueItem(itemId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to cancel email.');
    }
  }

  return (
    <section>
      <PageHeader
        title="Email Queue"
        description="Review queued campaign emails, retry failures, and cancel pending jobs."
      />

      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {actionError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p> : null}
      {message ? <p className="mb-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}

      <div className="mb-4 flex flex-col gap-3 rounded border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-steel">{loading ? 'Loading queue' : `${visibleItems.length} queue records`}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isManager ? (
            <button
              type="button"
              onClick={handleProcessQueueNow}
              disabled={processing}
              className="rounded bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {processing ? 'Processing' : 'Process Queue Now'}
            </button>
          ) : null}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as EmailQueueStatus | 'All')}
            className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            {EMAIL_QUEUE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Error</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleItems.map((item) => (
                <QueueRow key={item.id} item={item} canManage={isManager} onRetry={handleRetry} onCancel={handleCancel} />
              ))}
              {!visibleItems.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-steel">
                    No email queue records match this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function QueueRow({
  item,
  canManage,
  onRetry,
  onCancel,
}: {
  item: EmailQueueItem;
  canManage: boolean;
  onRetry: (itemId: string) => void;
  onCancel: (itemId: string) => void;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-ink">{item.recipientName || '-'}</p>
        <p className="text-xs text-steel">{item.recipientEmail}</p>
      </td>
      <td className="px-4 py-3">{item.companyName || '-'}</td>
      <td className="px-4 py-3">Campaign {item.campaign}</td>
      <td className="px-4 py-3">{item.attempts}</td>
      <td className="px-4 py-3">
        <span className={statusClass(item.status)}>{item.status}</span>
      </td>
      <td className="max-w-sm px-4 py-3 text-rose">
        <p className="line-clamp-2">{item.lastError || '-'}</p>
      </td>
      <td className="px-4 py-3">
        <InitialsBadge
          initials={item.updatedByInitials || item.createdByInitials}
          name={item.updatedByName || item.createdByName || item.createdBy}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {canManage && item.status === 'Failed' ? (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="grid h-9 w-9 place-items-center rounded border border-line text-steel hover:bg-paper hover:text-ink"
              title="Retry failed"
              aria-label="Retry failed"
            >
              <RotateCcw size={16} />
            </button>
          ) : null}
          {canManage && item.status === 'Pending' ? (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              className="grid h-9 w-9 place-items-center rounded border border-line text-steel hover:bg-paper hover:text-ink"
              title="Cancel pending"
              aria-label="Cancel pending"
            >
              <XCircle size={16} />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function statusClass(status: EmailQueueStatus) {
  return [
    'inline-flex rounded px-2 py-1 text-xs font-medium',
    status === 'Sent'
      ? 'bg-mint/10 text-mint'
      : status === 'Failed'
        ? 'bg-rose/10 text-rose'
        : status === 'Cancelled'
          ? 'bg-steel/10 text-steel'
          : 'bg-amber/10 text-amber',
  ].join(' ');
}
