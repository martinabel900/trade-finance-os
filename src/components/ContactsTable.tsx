import { Archive, CheckCircle2, Edit3, Mail, MailCheck, MessageSquareReply, MessageSquareText, Plus, Search } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  CAMPAIGNS,
  DEAL_STATUSES,
  EMAIL_STATUSES,
  REPLY_STATUSES,
  RESPONSE_CATEGORIES,
  archiveContact,
  emptyContact,
  updateContact,
  type Contact,
  type ContactActivityInput,
  type ContactInput,
  type EmailStatus,
  type ReplyStatus,
} from '../services/contactService';
import { enqueueCampaignEmail } from '../services/emailQueueService';
import type { EmailQueueTemplate } from '../services/emailQueueService';
import EmailPreviewModal from './EmailPreviewModal';
import ContactFormModal from './ContactFormModal';
import InitialsBadge from './InitialsBadge';
import LogReplyModal from './LogReplyModal';
import { isValidEmail } from '../utils/emailValidation';

interface ContactsTableProps {
  contacts: Contact[];
  fixedCampaign?: string;
}

type EditingContact = Contact | ContactInput;

export default function ContactsTable({ contacts, fixedCampaign }: ContactsTableProps) {
  const [query, setQuery] = useState('');
  const [campaign, setCampaign] = useState(fixedCampaign || 'All');
  const [batch, setBatch] = useState('All');
  const [emailStatus, setEmailStatus] = useState('All');
  const [replyStatus, setReplyStatus] = useState('All');
  const [dealStatus, setDealStatus] = useState('All');
  const [responseCategory, setResponseCategory] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');
  const [contactMode, setContactMode] = useState('All');
  const [archiveFilter, setArchiveFilter] = useState('Active Only');
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [replyContact, setReplyContact] = useState<Contact | null>(null);
  const [emailPreviewContacts, setEmailPreviewContacts] = useState<Contact[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [actionError, setActionError] = useState('');

  const batchOptions = useMemo(
    () =>
      [...new Set(contacts.map((contact) => contact.batch).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [contacts],
  );

  const visibleContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return contacts.filter((contact) => {
      const campaignMatch = fixedCampaign || campaign === 'All' || contact.campaign === campaign;
      const batchMatch = batch === 'All' || contact.batch === batch;
      const emailStatusMatch = emailStatus === 'All' || contact.emailStatus === emailStatus;
      const replyStatusMatch = replyStatus === 'All' || contact.replyStatus === replyStatus;
      const dealStatusMatch = dealStatus === 'All' || contact.dealStatus === dealStatus;
      const responseCategoryMatch = responseCategory === 'All' || contact.responseCategory === responseCategory;
      const contactModeMatch = contactMode === 'All' || contact.dealStatus === 'Do Not Contact';
      const archiveMatch =
        archiveFilter === 'Show All' ||
        (archiveFilter === 'Show Archived Only' && contact.dealStatus === 'Archived') ||
        (archiveFilter === 'Active Only' && contact.dealStatus !== 'Archived');
      const followUpMatch =
        followUpFilter === 'All' ||
        (followUpFilter === 'Due Today' && isFollowUpDueToday(contact.nextFollowUpDate)) ||
        (followUpFilter === 'Overdue' && isFollowUpOverdue(contact.nextFollowUpDate)) ||
        (followUpFilter === 'Due or Overdue' &&
          (isFollowUpDueToday(contact.nextFollowUpDate) || isFollowUpOverdue(contact.nextFollowUpDate)));
      const searchMatch =
        !needle ||
        [
          contact.brokerName,
          contact.companyName,
          contact.contactName,
          contact.email,
          contact.notes,
          contact.nextAction,
          contact.dealStatus,
          contact.responseCategory,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return (
        campaignMatch &&
        batchMatch &&
        emailStatusMatch &&
        replyStatusMatch &&
        dealStatusMatch &&
        responseCategoryMatch &&
        followUpMatch &&
        contactModeMatch &&
        archiveMatch &&
        searchMatch
      );
    });
  }, [archiveFilter, batch, campaign, contactMode, contacts, dealStatus, emailStatus, fixedCampaign, followUpFilter, query, replyStatus, responseCategory]);

  async function handleQuickUpdate(
    contactId: string,
    updates: { emailStatus?: EmailStatus; replyStatus?: ReplyStatus },
    activity: ContactActivityInput,
  ) {
    setActionError('');

    try {
      await updateContact(contactId, updates, activity);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update contact.');
    }
  }

  async function handleConfirmSendEmail(template: EmailQueueTemplate) {
    const [contact] = emailPreviewContacts;

    if (!contact) {
      return;
    }

    setSendingEmail(true);
    setActionError('');

    try {
      await enqueueCampaignEmail(contact, template);
      setEmailPreviewContacts([]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to send email.');
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleArchiveContact(contact: Contact) {
    setActionError('');

    if (!window.confirm(`Archive ${contact.companyName || contact.contactName || 'this contact'}?`)) {
      return;
    }

    try {
      await archiveContact(contact.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to archive contact.');
    }
  }

  return (
    <div>
      <div className="mb-4 grid w-full gap-2 rounded border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(240px,1.5fr)_repeat(9,minmax(118px,auto))] 2xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts"
            className="focus-ring w-full rounded border border-line py-2 pl-9 pr-3 text-sm"
          />
        </label>

        {!fixedCampaign ? (
          <select
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="All">All Campaigns</option>
            {CAMPAIGNS.map((item) => (
              <option key={item} value={item}>
                Campaign {item}
              </option>
            ))}
          </select>
        ) : null}

        <select
          value={batch}
          onChange={(event) => setBatch(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Batches</option>
          {batchOptions.map((item) => (
            <option key={item} value={item}>
              Batch {item}
            </option>
          ))}
        </select>

        <select
          value={emailStatus}
          onChange={(event) => setEmailStatus(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Statuses</option>
          {EMAIL_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={replyStatus}
          onChange={(event) => setReplyStatus(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Replies</option>
          {REPLY_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={dealStatus}
          onChange={(event) => setDealStatus(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Deal Statuses</option>
          {DEAL_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={responseCategory}
          onChange={(event) => setResponseCategory(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Response Categories</option>
          {RESPONSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={followUpFilter}
          onChange={(event) => setFollowUpFilter(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Follow-ups</option>
          <option value="Due Today">Due Today</option>
          <option value="Overdue">Overdue</option>
          <option value="Due or Overdue">Due or Overdue</option>
        </select>

        <select
          value={contactMode}
          onChange={(event) => setContactMode(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="All">All Contact Modes</option>
          <option value="Do Not Contact">Do Not Contact</option>
        </select>

        <select
          value={archiveFilter}
          onChange={(event) => setArchiveFilter(event.target.value)}
          className="focus-ring w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="Active Only">Show Active Only</option>
          <option value="Show Archived Only">Show Archived Only</option>
          <option value="Show All">Show All</option>
        </select>

        <button
          type="button"
          onClick={() => setEditingContact({ ...emptyContact, campaign: fixedCampaign || 'A' })}
          className="flex items-center justify-center gap-2 rounded bg-navy px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New Contact
        </button>
      </div>

      {actionError ? (
        <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p>
      ) : null}

      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto divide-y divide-line text-sm">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3 whitespace-nowrap">Campaign</th>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Reply</th>
                <th className="px-3 py-3">Deal</th>
                <th className="px-3 py-3">Next Action</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleContacts.map((contact) => (
                <tr key={contact.id} className="align-top">
                  <td className="min-w-[190px] px-3 py-3">
                    <p className="font-medium text-ink">{contact.companyName || 'Untitled Company'}</p>
                    <p className="text-xs text-steel">{contact.brokerName}</p>
                  </td>
                  <td className="min-w-[190px] px-3 py-3">
                    <p>{contact.contactName || '-'}</p>
                    <p className="text-xs text-steel">{contact.email || '-'}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{contact.phone || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">Campaign {contact.campaign}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{contact.batch || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={statusClass(contact.emailStatus)}>{contact.emailStatus}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{contact.replyStatus || 'No Reply'}</td>
                  <td className="min-w-[150px] px-3 py-3">
                    <p>{contact.dealStatus || '-'}</p>
                    <p className="text-xs text-steel">{contact.responseCategory || '-'}</p>
                  </td>
                  <td className="min-w-[170px] px-3 py-3">
                    <p className="max-w-[16rem] truncate">{contact.nextAction || '-'}</p>
                    <p className={followUpDateClass(contact.nextFollowUpDate)}>
                      {formatFollowUpDate(contact.nextFollowUpDate)}
                    </p>
                  </td>
                  <td className="min-w-[180px] max-w-sm px-3 py-3 text-steel">
                    <p className="line-clamp-2">{contact.notes || '-'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <InitialsBadge
                      initials={contact.updatedByInitials || contact.createdByInitials}
                      name={contact.updatedByName || contact.createdByName}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      {isValidEmail(contact.email) ? (
                        <IconButton label="Send email" onClick={() => setEmailPreviewContacts([contact])}>
                          <Mail size={16} />
                        </IconButton>
                      ) : null}
                      <IconButton label="Log reply" onClick={() => setReplyContact(contact)}>
                        <MessageSquareReply size={16} />
                      </IconButton>
                      <IconButton
                        label="Mark email sent"
                        onClick={() =>
                          handleQuickUpdate(contact.id, { emailStatus: 'Sent' }, {
                            type: 'email_sent',
                            message: 'Email marked as sent.',
                          })
                        }
                      >
                        <MailCheck size={16} />
                      </IconButton>
                      <IconButton
                        label="Mark replied"
                        onClick={() =>
                          handleQuickUpdate(contact.id, { replyStatus: 'Replied' }, {
                            type: 'replied',
                            message: 'Contact marked as replied.',
                          })
                        }
                      >
                        <CheckCircle2 size={16} />
                      </IconButton>
                      <IconButton label="Add notes" onClick={() => setEditingContact(contact)}>
                        <MessageSquareText size={16} />
                      </IconButton>
                      <IconButton label="Edit contact" onClick={() => setEditingContact(contact)}>
                        <Edit3 size={16} />
                      </IconButton>
                      {contact.dealStatus !== 'Archived' ? (
                        <IconButton label="Archive contact" onClick={() => handleArchiveContact(contact)}>
                          <Archive size={16} />
                        </IconButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleContacts.length ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-sm text-steel">
                    No contacts match the current view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editingContact ? (
        <ContactFormModal contact={editingContact} onClose={() => setEditingContact(null)} />
      ) : null}
      {replyContact ? (
        <LogReplyModal contact={replyContact} onClose={() => setReplyContact(null)} />
      ) : null}
      {emailPreviewContacts.length ? (
        <EmailPreviewModal
          contacts={emailPreviewContacts}
          sending={sendingEmail}
          onClose={() => setEmailPreviewContacts([])}
          onConfirm={handleConfirmSendEmail}
        />
      ) : null}
    </div>
  );
}

function isFollowUpDueToday(value: Contact['nextFollowUpDate']) {
  if (!value) return false;

  return getDateKey(value.toDate()) === getDateKey(new Date());
}

function isFollowUpOverdue(value: Contact['nextFollowUpDate']) {
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

function formatFollowUpDate(value: Contact['nextFollowUpDate']) {
  if (!value) return 'No follow-up';

  return value.toDate().toLocaleDateString();
}

function followUpDateClass(value: Contact['nextFollowUpDate']) {
  return [
    'text-xs',
    isFollowUpOverdue(value)
      ? 'text-rose'
      : isFollowUpDueToday(value)
        ? 'text-amber'
        : 'text-steel',
  ].join(' ');
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

function statusClass(status: string) {
  return [
    'inline-flex rounded px-2 py-1 text-xs font-medium',
    status === 'Sent' ? 'bg-mint/10 text-mint' : 'bg-amber/10 text-amber',
  ].join(' ');
}
