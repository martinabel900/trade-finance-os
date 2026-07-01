import { Archive, Edit3, MessageSquareReply } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import ContactFormModal from '../components/ContactFormModal';
import InitialsBadge from '../components/InitialsBadge';
import LogReplyModal from '../components/LogReplyModal';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import { archiveContact, type Contact, type ContactInput } from '../services/contactService';

interface FollowUpGroup {
  title: string;
  description: string;
  contacts: Contact[];
}

type EditingContact = Contact | ContactInput;

export default function FollowUpsPage() {
  const { contacts, loading, error } = useContacts();
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [replyContact, setReplyContact] = useState<Contact | null>(null);
  const [actionError, setActionError] = useState('');

  const groups = useMemo(() => {
    const actionableContacts = contacts.filter(isActionableContact);

    return [
      {
        title: 'Due Today',
        description: 'Contacts with a follow-up scheduled for today.',
        contacts: actionableContacts.filter((contact) => isDueToday(contact.nextFollowUpDate)),
      },
      {
        title: 'Overdue',
        description: 'Contacts where the next follow-up date has passed.',
        contacts: actionableContacts.filter((contact) => isOverdue(contact.nextFollowUpDate)),
      },
      {
        title: 'Due This Week',
        description: 'Contacts due within the next 7 days.',
        contacts: actionableContacts.filter((contact) => isDueThisWeek(contact.nextFollowUpDate)),
      },
      {
        title: 'No Reply After 7 Days',
        description: 'Sent emails with no reply after 7 days.',
        contacts: actionableContacts.filter((contact) => isNoReplyAfterDays(contact, 7)),
      },
      {
        title: 'No Reply After 14 Days',
        description: 'Sent emails with no reply after 14 days.',
        contacts: actionableContacts.filter((contact) => isNoReplyAfterDays(contact, 14)),
      },
    ];
  }, [contacts]);

  async function handleArchive(contact: Contact) {
    setActionError('');

    if (!window.confirm(`Archive ${contact.companyName || contact.contactName || 'this contact'}?`)) {
      return;
    }

    try {
      await archiveContact(contact.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to archive contact.');
    }
  }

  return (
    <section>
      <PageHeader
        title="Follow-ups"
        description="Contacts needing action today, overdue follow-up, or no-reply review."
      />

      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {actionError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p> : null}

      <div className="grid gap-6">
        {groups.map((group) => (
          <FollowUpSection
            key={group.title}
            group={group}
            loading={loading}
            onLogReply={setReplyContact}
            onEdit={setEditingContact}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {editingContact ? (
        <ContactFormModal contact={editingContact} onClose={() => setEditingContact(null)} />
      ) : null}
      {replyContact ? (
        <LogReplyModal contact={replyContact} onClose={() => setReplyContact(null)} />
      ) : null}
    </section>
  );
}

interface FollowUpSectionProps {
  group: FollowUpGroup;
  loading: boolean;
  onLogReply: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onArchive: (contact: Contact) => void;
}

function FollowUpSection({
  group,
  loading,
  onLogReply,
  onEdit,
  onArchive,
}: FollowUpSectionProps) {
  return (
    <div className="overflow-hidden rounded border border-line bg-white">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{group.title}</h2>
          <p className="text-sm text-steel">{group.description}</p>
        </div>
        <p className="text-sm font-semibold text-steel">{loading ? '-' : group.contacts.length}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Email Sent</th>
              <th className="px-4 py-3">Next Follow-up</th>
              <th className="px-4 py-3">Deal Status</th>
              <th className="px-4 py-3">Response</th>
              <th className="px-4 py-3">Next Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {group.contacts.map((contact) => (
              <tr key={contact.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{contact.companyName || 'Untitled Company'}</p>
                  <p className="text-xs text-steel">{contact.brokerName || '-'}</p>
                </td>
                <td className="px-4 py-3">{contact.contactName || '-'}</td>
                <td className="px-4 py-3">{contact.email || '-'}</td>
                <td className="px-4 py-3">Campaign {contact.campaign || '-'}</td>
                <td className="px-4 py-3">{formatDate(contact.emailSentAt)}</td>
                <td className={followUpClass(contact.nextFollowUpDate)}>
                  {formatDate(contact.nextFollowUpDate)}
                </td>
                <td className="px-4 py-3">{contact.dealStatus || '-'}</td>
                <td className="px-4 py-3">{contact.responseCategory || '-'}</td>
                <td className="max-w-xs px-4 py-3 text-steel">
                  <p className="line-clamp-2">{contact.nextAction || '-'}</p>
                </td>
                <td className="px-4 py-3">
                  <InitialsBadge
                    initials={contact.updatedByInitials || contact.createdByInitials}
                    name={contact.updatedByName || contact.createdByName}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Log reply" onClick={() => onLogReply(contact)}>
                      <MessageSquareReply size={16} />
                    </IconButton>
                    <IconButton label="Edit contact" onClick={() => onEdit(contact)}>
                      <Edit3 size={16} />
                    </IconButton>
                    <IconButton label="Archive contact" onClick={() => onArchive(contact)}>
                      <Archive size={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
            {!group.contacts.length ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-steel">
                  No contacts in this group.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface IconButtonProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
}

function IconButton({ children, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded border border-line text-steel hover:bg-paper hover:text-ink"
    >
      {children}
    </button>
  );
}

function isActionableContact(contact: Contact): boolean {
  return contact.dealStatus !== 'Archived' && contact.dealStatus !== 'Do Not Contact';
}

function isDueToday(value: Contact['nextFollowUpDate']): boolean {
  if (!value) return false;

  return getDateKey(value.toDate()) === getDateKey(new Date());
}

function isOverdue(value: Contact['nextFollowUpDate']): boolean {
  if (!value) return false;

  return startOfDay(value.toDate()).getTime() < startOfDay(new Date()).getTime();
}

function isDueThisWeek(value: Contact['nextFollowUpDate']): boolean {
  if (!value) return false;

  const followUp = startOfDay(value.toDate()).getTime();
  const today = startOfDay(new Date()).getTime();
  const sevenDaysFromNow = addDays(startOfDay(new Date()), 7).getTime();

  return followUp >= today && followUp <= sevenDaysFromNow;
}

function isNoReplyAfterDays(contact: Contact, days: number): boolean {
  if (contact.emailStatus !== 'Sent' || contact.replyStatus === 'Replied' || !contact.emailSentAt) {
    return false;
  }

  return startOfDay(contact.emailSentAt.toDate()).getTime() < addDays(startOfDay(new Date()), -days).getTime();
}

function followUpClass(value: Contact['nextFollowUpDate']): string {
  return [
    'px-4 py-3',
    isOverdue(value) ? 'font-medium text-rose' : isDueToday(value) ? 'font-medium text-amber' : '',
  ].join(' ');
}

function formatDate(value: { toDate: () => Date } | null | undefined): string {
  if (!value) return '-';

  return value.toDate().toLocaleDateString();
}

function getDateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}
