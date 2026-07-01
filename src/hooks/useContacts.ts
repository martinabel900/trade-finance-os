import { useEffect, useMemo, useState } from 'react';
import { subscribeToContacts, type Contact } from '../services/contactService';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToContacts(
      (nextContacts) => {
        setContacts(nextContacts);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return useMemo(() => ({ contacts, loading, error }), [contacts, error, loading]);
}
