import { useEffect, useMemo, useState } from 'react';
import { subscribeToBrokers, type Broker } from '../services/brokerService';

export function useBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToBrokers(
      (nextBrokers) => {
        setBrokers(nextBrokers);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return useMemo(() => ({ brokers, loading, error }), [brokers, error, loading]);
}
