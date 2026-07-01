import { Archive, Edit3, Link2, Mail, Search, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import ContactFormModal from '../components/ContactFormModal';
import InitialsBadge from '../components/InitialsBadge';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';
import {
  archiveContact,
  createContactActivity,
  updateContact,
  type Contact,
  type ContactInput,
} from '../services/contactService';
import { enqueueBrokerMissingEmailRequest } from '../services/emailQueueService';
import { getUserSignature } from '../utils/userAttribution';
import { auth } from '../firebase/firebase';
import { hasMissingClientEmail, isValidEmail } from '../utils/emailValidation';
import { useAuth } from '../state/useAuth';

type EditingContact = Contact | ContactInput;

export default function MissingEmailsPage() {
  const { isManager } = useAuth();
  const { contacts, loading, error } = useContacts();
  const [query, setQuery] = useState('');
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const missingContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const missing = contact.contactEmailStatus === 'Missing Email' || hasMissingClientEmail(contact.email);
      const active = contact.dealStatus !== 'Archived';
      const searchMatch = !needle || [contact.companyName, contact.contactName, contact.brokerName, contact.brokerEmail, contact.notes].join(' ').toLowerCase().includes(needle);
      return missing && active && searchMatch;
    });
  }, [contacts, query]);

  async function handleEmailBroker(contact: Contact) {
    setActionError('');
    setMessage('');
    if (!isValidEmail(contact.brokerEmail)) {
      setActionError('Broker email is missing or invalid.');
      return;
    }
    const preview = [
      'Subject: Missing Client Contact Details',
      '',
      `To: ${contact.brokerEmail}`,
      '',
      `Dear ${contact.brokerName || 'Broker'},`,
      '',
      'I hope you are well.',
      '',
      `For the transaction involving ${contact.companyName}, we do not appear to have a valid client email address on file.`,
      '',
      'Could you please confirm the correct email address and current contact person?',
    ].join('\n');

    if (!window.confirm(`${preview}\n\nQueue this email to the broker?`)) {
      return;
    }

    try {
      await enqueueBrokerMissingEmailRequest(contact);
      const actor = getUserSignature(auth.currentUser);
      await createContactActivity(contact.id, {
        type: 'broker_missing_email_request_queued',
        message: `Broker emailed for missing client email by ${actor.initials}`,
      });
      setMessage('Broker request queued.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to queue broker email.');
    }
  }

  async function quickUpdate(contact: Contact, updates: Partial<Contact>) {
    setActionError('');
    try {
      await updateContact(contact.id, updates, { type: 'missing_email_update', message: 'Missing email workflow updated.' });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update contact.');
    }
  }

  async function handleArchive(contact: Contact) {
    if (!window.confirm(`Archive ${contact.companyName || 'this contact'}?`)) return;
    await archiveContact(contact.id);
  }

  return (
    <section>
      <PageHeader title="Missing Emails" description="Resolve contacts that need a valid client email address." />
      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {actionError ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{actionError}</p> : null}
      {message ? <p className="mb-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}
      <div className="mb-4 rounded border border-line bg-white p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search missing emails" className="focus-ring w-full rounded border border-line py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>
      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-steel">
                <th className="px-3 py-3">Company</th><th className="px-3 py-3">Contact Name</th><th className="px-3 py-3">Broker Name</th><th className="px-3 py-3">Broker Email</th><th className="px-3 py-3">Broker Phone</th><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Deal Status</th><th className="px-3 py-3">Next Action</th><th className="px-3 py-3">Notes</th><th className="px-3 py-3">User</th><th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {missingContacts.map((contact) => (
                <tr key={contact.id} className="align-top">
                  <td className="px-3 py-3 font-medium">{contact.companyName}</td>
                  <td className="px-3 py-3">{contact.contactName || '-'}</td>
                  <td className="px-3 py-3">{contact.brokerName || '-'}</td>
                  <td className="px-3 py-3">{contact.brokerEmail || '-'}</td>
                  <td className="px-3 py-3">{contact.brokerPhone || '-'}</td>
                  <td className="px-3 py-3">Campaign {contact.campaign}</td>
                  <td className="px-3 py-3">{contact.dealStatus || '-'}</td>
                  <td className="px-3 py-3">{contact.nextAction || '-'}</td>
                  <td className="max-w-xs px-3 py-3 text-steel"><p className="line-clamp-2">{contact.notes || '-'}</p></td>
                  <td className="px-3 py-3"><InitialsBadge initials={contact.updatedByInitials || contact.createdByInitials} name={contact.updatedByName || contact.createdByName} /></td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1.5">
                    <button title="Edit Contact" onClick={() => setEditingContact(contact)} className="grid h-9 w-9 place-items-center rounded border border-line"><Edit3 size={16} /></button>
                    <button title="Link / Change Broker" onClick={() => setEditingContact(contact)} className="grid h-9 w-9 place-items-center rounded border border-line"><Link2 size={16} /></button>
                    {isManager ? (
                      <>
                        <button title="Email Broker" onClick={() => handleEmailBroker(contact)} className="grid h-9 w-9 place-items-center rounded border border-line"><Mail size={16} /></button>
                        <button title="Mark Broker Contacted" onClick={() => quickUpdate(contact, { nextAction: 'Broker contacted for client email' })} className="grid h-9 w-9 place-items-center rounded border border-line"><Mail size={16} /></button>
                        <button title="Mark Research Needed" onClick={() => quickUpdate(contact, { nextAction: 'Research needed for client email' })} className="grid h-9 w-9 place-items-center rounded border border-line"><Search size={16} /></button>
                        <button title="Mark Do Not Contact" onClick={() => quickUpdate(contact, { dealStatus: 'Do Not Contact' })} className="grid h-9 w-9 place-items-center rounded border border-line"><UserX size={16} /></button>
                        <button title="Archive" onClick={() => handleArchive(contact)} className="grid h-9 w-9 place-items-center rounded border border-line"><Archive size={16} /></button>
                      </>
                    ) : null}
                  </div></td>
                </tr>
              ))}
              {!missingContacts.length ? <tr><td colSpan={11} className="px-3 py-10 text-center text-sm text-steel">{loading ? 'Loading contacts' : 'No missing email contacts.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      {editingContact ? <ContactFormModal contact={editingContact} onClose={() => setEditingContact(null)} /> : null}
    </section>
  );
}
