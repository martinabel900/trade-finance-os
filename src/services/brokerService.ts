import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { getAttributionFields } from '../utils/userAttribution';

export const BROKERS_COLLECTION = 'brokers';
export const BROKER_STATUSES = ['Active', 'Inactive', 'Do Not Use'] as const;

export type BrokerStatus = (typeof BROKER_STATUSES)[number];

export interface Broker {
  id: string;
  brokerName: string;
  brokerCompany: string;
  brokerEmail: string;
  brokerPhone: string;
  brokerWhatsApp: string;
  country: string;
  status: string;
  ccDefault: boolean;
  notes: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdByUid?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByInitials?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  updatedByName?: string;
  updatedByInitials?: string;
}

export type BrokerInput = Omit<Broker, 'id' | 'createdAt' | 'updatedAt' | 'createdByUid' | 'createdByEmail' | 'createdByName' | 'createdByInitials' | 'updatedByUid' | 'updatedByEmail' | 'updatedByName' | 'updatedByInitials'>;

export const emptyBroker: BrokerInput = {
  brokerName: '',
  brokerCompany: '',
  brokerEmail: '',
  brokerPhone: '',
  brokerWhatsApp: '',
  country: '',
  status: 'Active',
  ccDefault: true,
  notes: '',
};

const brokersRef = collection(db, BROKERS_COLLECTION);

export async function createBroker(input: BrokerInput): Promise<string> {
  const docRef = await addDoc(brokersRef, {
    ...cleanBroker(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...getAttributionFields('createdBy', auth.currentUser),
    ...getAttributionFields('updatedBy', auth.currentUser),
  });

  return docRef.id;
}

export async function getBrokers(): Promise<Broker[]> {
  const snapshot = await getDocs(brokersRef);
  return sortBrokers(snapshot.docs.map(brokerFromSnapshot));
}

export async function updateBroker(brokerId: string, updates: Partial<BrokerInput>): Promise<void> {
  await updateDoc(doc(db, BROKERS_COLLECTION, brokerId), {
    ...cleanBrokerUpdate(updates),
    updatedAt: serverTimestamp(),
    ...getAttributionFields('updatedBy', auth.currentUser),
  });
}

export function markInactiveBroker(brokerId: string): Promise<void> {
  return updateBroker(brokerId, { status: 'Inactive' });
}

export const archiveBroker = markInactiveBroker;

export async function findBrokerByName(brokerName: string): Promise<Broker | null> {
  const normalized = normalizeMatch(brokerName);
  if (!normalized) return null;
  return (await getBrokers()).find((broker) => normalizeMatch(broker.brokerName) === normalized) ?? null;
}

export async function findBrokerByEmail(brokerEmail: string): Promise<Broker | null> {
  const normalized = normalizeMatch(brokerEmail);
  if (!normalized) return null;
  return (await getBrokers()).find((broker) => normalizeMatch(broker.brokerEmail) === normalized) ?? null;
}

export function subscribeToBrokers(
  onBrokersChanged: (brokers: Broker[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    query(brokersRef, orderBy('brokerName')),
    (snapshot) => onBrokersChanged(sortBrokers(snapshot.docs.map(brokerFromSnapshot))),
    onError,
  );
}

export async function findOrCreateBroker(input: Partial<BrokerInput>): Promise<Broker | null> {
  const brokers = await getBrokers();
  const email = normalizeMatch(input.brokerEmail ?? '');
  const name = normalizeMatch(input.brokerName ?? '');
  const existing = brokers.find((broker) =>
    (email && normalizeMatch(broker.brokerEmail) === email) ||
    (name && normalizeMatch(broker.brokerName) === name)
  );

  if (existing) return existing;
  if (!input.brokerName && !input.brokerEmail) return null;

  const brokerId = await createBroker({
    ...emptyBroker,
    brokerName: input.brokerName ?? '',
    brokerEmail: input.brokerEmail ?? '',
    brokerPhone: input.brokerPhone ?? '',
  });

  return {
    ...emptyBroker,
    id: brokerId,
    brokerName: input.brokerName ?? '',
    brokerEmail: input.brokerEmail ?? '',
    brokerPhone: input.brokerPhone ?? '',
  };
}

function brokerFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): Broker {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    brokerName: String(data.brokerName ?? ''),
    brokerCompany: String(data.brokerCompany ?? ''),
    brokerEmail: String(data.brokerEmail ?? ''),
    brokerPhone: String(data.brokerPhone ?? ''),
    brokerWhatsApp: String(data.brokerWhatsApp ?? ''),
    country: String(data.country ?? ''),
    status: String(data.status ?? 'Active'),
    ccDefault: Boolean(data.ccDefault ?? true),
    notes: String(data.notes ?? ''),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdByUid: String(data.createdByUid ?? ''),
    createdByEmail: String(data.createdByEmail ?? ''),
    createdByName: String(data.createdByName ?? ''),
    createdByInitials: String(data.createdByInitials ?? ''),
    updatedByUid: String(data.updatedByUid ?? ''),
    updatedByEmail: String(data.updatedByEmail ?? ''),
    updatedByName: String(data.updatedByName ?? ''),
    updatedByInitials: String(data.updatedByInitials ?? ''),
  };
}

function cleanBroker(input: BrokerInput): BrokerInput {
  return {
    brokerName: input.brokerName.trim(),
    brokerCompany: input.brokerCompany.trim(),
    brokerEmail: input.brokerEmail.trim(),
    brokerPhone: input.brokerPhone.trim(),
    brokerWhatsApp: input.brokerWhatsApp.trim(),
    country: input.country.trim(),
    status: BROKER_STATUSES.includes(input.status as BrokerStatus) ? input.status : 'Active',
    ccDefault: Boolean(input.ccDefault),
    notes: input.notes.trim(),
  };
}

function cleanBrokerUpdate(updates: Partial<BrokerInput>): Partial<BrokerInput> {
  const payload: Partial<BrokerInput> = {};
  if (updates.brokerName !== undefined) payload.brokerName = updates.brokerName.trim();
  if (updates.brokerCompany !== undefined) payload.brokerCompany = updates.brokerCompany.trim();
  if (updates.brokerEmail !== undefined) payload.brokerEmail = updates.brokerEmail.trim();
  if (updates.brokerPhone !== undefined) payload.brokerPhone = updates.brokerPhone.trim();
  if (updates.brokerWhatsApp !== undefined) payload.brokerWhatsApp = updates.brokerWhatsApp.trim();
  if (updates.country !== undefined) payload.country = updates.country.trim();
  if (updates.status !== undefined) payload.status = BROKER_STATUSES.includes(updates.status as BrokerStatus) ? updates.status : 'Active';
  if (updates.ccDefault !== undefined) payload.ccDefault = Boolean(updates.ccDefault);
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();
  return payload;
}

function sortBrokers(brokers: Broker[]): Broker[] {
  return [...brokers].sort((a, b) => a.brokerName.localeCompare(b.brokerName));
}

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase();
}
