import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const CONTACTS_COLLECTION = 'contacts';

export function contactsCollection(): CollectionReference<DocumentData> {
  return collection(db, CONTACTS_COLLECTION);
}

export function contactDocument(contactId?: string) {
  return contactId ? doc(db, CONTACTS_COLLECTION, contactId) : doc(contactsCollection());
}

export async function testFirestoreConnection(): Promise<boolean> {
  await getDocs(query(contactsCollection(), limit(1)));
  return true;
}

export { db };
