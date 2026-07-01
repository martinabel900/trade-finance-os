import ContactsTable from '../components/ContactsTable';
import PageHeader from '../components/PageHeader.jsx';
import { useContacts } from '../hooks/useContacts';

export default function ContactsPage() {
  const { contacts, loading, error } = useContacts();

  return (
    <section>
      <PageHeader
        title="Contacts"
        description="Search, filter, update status, capture replies, and maintain notes."
      />
      {error ? <p className="mb-4 rounded border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
      {loading ? <p className="text-sm text-steel">Loading contacts</p> : <ContactsTable contacts={contacts} />}
    </section>
  );
}
