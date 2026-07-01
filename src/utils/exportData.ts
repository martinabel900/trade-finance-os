import type { Timestamp } from 'firebase/firestore';

type ExportValue = string | number | boolean | null | undefined | Timestamp;
type ExportRecord = Record<string, ExportValue>;

export function downloadCsv(filename: string, rows: ExportRecord[], headers: string[]): void {
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(formatExportValue(row[header]))).join(',')),
  ].join('\n');

  downloadFile(filename, csv, 'text/csv;charset=utf-8');
}

export function downloadJson(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(convertForJson(data), null, 2), 'application/json;charset=utf-8');
}

export function todayStamp(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

export function formatExportValue(value: ExportValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }

  return String(value);
}

function convertForJson(value: unknown): unknown {
  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(convertForJson);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, convertForJson(entry)]),
    );
  }

  return value;
}

function isTimestamp(value: unknown): value is Timestamp {
  return Boolean(value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function');
}
