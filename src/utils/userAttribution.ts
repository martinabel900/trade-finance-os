import type { User } from 'firebase/auth';

export interface UserSignature {
  uid: string;
  email: string;
  displayName: string;
  initials: string;
}

export function getUserSignature(user: User | null | undefined): UserSignature {
  const email = user?.email || '';
  const displayName = normalizeDisplayName(user?.displayName || email.split('@')[0] || 'Unknown user');

  return {
    uid: user?.uid || '',
    email,
    displayName,
    initials: getInitials(displayName),
  };
}

export function getAttributionFields(prefix: 'createdBy' | 'updatedBy', user: User | null | undefined) {
  const signature = getUserSignature(user);

  return {
    [`${prefix}Uid`]: signature.uid,
    [`${prefix}Email`]: signature.email,
    [`${prefix}Name`]: signature.displayName,
    [`${prefix}Initials`]: signature.initials,
  };
}

function normalizeDisplayName(value: string): string {
  const words = value
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return 'Unknown user';
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return '?';
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
