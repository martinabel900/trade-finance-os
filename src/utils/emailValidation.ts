const placeholderEmails = new Set(['na', 'n/a', 'none', 'unknown', 'no email', 'noemail', '-', 'null']);

export function isValidEmail(value: string | undefined | null): boolean {
  const email = String(value ?? '').trim();

  if (!email || isPlaceholderEmail(email)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPlaceholderEmail(value: string | undefined | null): boolean {
  return placeholderEmails.has(String(value ?? '').trim().toLowerCase());
}

export function hasMissingClientEmail(value: string | undefined | null): boolean {
  return !isValidEmail(value);
}
