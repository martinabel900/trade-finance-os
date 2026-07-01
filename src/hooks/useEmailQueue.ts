import { useEffect, useMemo, useState } from 'react';
import { subscribeToEmailQueue, type EmailQueueItem } from '../services/emailQueueService';

export function useEmailQueue() {
  const [items, setItems] = useState<EmailQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToEmailQueue(
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return useMemo(() => ({ items, loading, error }), [error, items, loading]);
}
