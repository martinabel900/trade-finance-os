import * as XLSX from 'xlsx';
import { BROKER_STATUSES, emptyBroker, type BrokerInput, type BrokerStatus } from '../services/brokerService';
import { isValidEmail } from './emailValidation';

export interface ParsedBrokerRow {
  rowNumber: number;
  brokerName: string;
  brokerCompany: string;
  brokerEmail: string;
  brokerPhone: string;
  brokerWhatsApp: string;
  country: string;
  status: string;
  ccDefault: string;
  notes: string;
}

export interface ImportBrokerRow {
  rowNumber: number;
  broker: BrokerInput;
}

export interface InvalidBrokerRow extends ParsedBrokerRow {
  errors: string[];
}

export interface BrokerImportPreview {
  validRows: ImportBrokerRow[];
  invalidRows: InvalidBrokerRow[];
}

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

const REQUIRED_COLUMN_GROUPS = [
  { label: 'Broker Name', aliases: ['broker name', 'broker'] },
] as const;

const COLUMN_ALIASES = {
  brokerName: ['broker name', 'broker'],
  brokerCompany: ['broker company', 'company', 'brokerage company'],
  brokerEmail: ['broker email', 'broker e-mail', 'email'],
  brokerPhone: ['broker phone', 'phone', 'broker telephone', 'broker mobile'],
  brokerWhatsApp: ['broker whatsapp', 'whatsapp', 'broker whats app'],
  country: ['country'],
  status: ['status'],
  ccDefault: ['cc default', 'ccdefault', 'cc broker', 'copy broker'],
  notes: ['notes'],
} as const;

export async function parseBrokerFile(file: File): Promise<BrokerImportPreview> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension !== 'csv' && extension !== 'xlsx') {
    throw new Error('Upload a CSV or XLSX file.');
  }

  const workbook =
    extension === 'csv'
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The uploaded file does not contain a worksheet.');
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });

  return buildPreview(rows);
}

function buildPreview(rows: SheetRow[]): BrokerImportPreview {
  const [headerRow, ...bodyRows] = rows;

  if (!headerRow) {
    throw new Error('The uploaded file is empty.');
  }

  const headerMap = getHeaderMap(headerRow);
  const missingColumns = REQUIRED_COLUMN_GROUPS.filter(
    (column) => !column.aliases.some((alias) => headerMap.has(alias)),
  ).map((column) => column.label);

  if (missingColumns.length) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}.`);
  }

  const parsedRows = bodyRows
    .map((row, index) => parseRow(row, headerMap, index + 2))
    .filter((row) => Object.values(row).some(Boolean));
  const validRows: ImportBrokerRow[] = [];
  const invalidRows: InvalidBrokerRow[] = [];

  parsedRows.forEach((row) => {
    const errors = validateRow(row);

    if (errors.length) {
      invalidRows.push({ ...row, errors });
    } else {
      validRows.push({
        rowNumber: row.rowNumber,
        broker: {
          ...emptyBroker,
          brokerName: row.brokerName,
          brokerCompany: row.brokerCompany,
          brokerEmail: row.brokerEmail,
          brokerPhone: row.brokerPhone,
          brokerWhatsApp: row.brokerWhatsApp,
          country: row.country,
          status: normalizeStatus(row.status),
          ccDefault: parseCcDefault(row.ccDefault),
          notes: row.notes,
        },
      });
    }
  });

  return { validRows, invalidRows };
}

function getHeaderMap(headerRow: SheetRow[]): Map<string, number> {
  return headerRow.reduce((map, header, index) => {
    const normalized = normalizeHeader(header);

    if (normalized) {
      map.set(normalized, index);
    }

    return map;
  }, new Map<string, number>());
}

function parseRow(row: SheetRow, headerMap: Map<string, number>, rowNumber: number): ParsedBrokerRow {
  return {
    rowNumber,
    brokerName: getValue(row, headerMap, COLUMN_ALIASES.brokerName),
    brokerCompany: getValue(row, headerMap, COLUMN_ALIASES.brokerCompany),
    brokerEmail: getValue(row, headerMap, COLUMN_ALIASES.brokerEmail),
    brokerPhone: getValue(row, headerMap, COLUMN_ALIASES.brokerPhone),
    brokerWhatsApp: getValue(row, headerMap, COLUMN_ALIASES.brokerWhatsApp),
    country: getValue(row, headerMap, COLUMN_ALIASES.country),
    status: getValue(row, headerMap, COLUMN_ALIASES.status),
    ccDefault: getValue(row, headerMap, COLUMN_ALIASES.ccDefault),
    notes: getValue(row, headerMap, COLUMN_ALIASES.notes),
  };
}

function validateRow(row: ParsedBrokerRow): string[] {
  const errors: string[] = [];

  if (!row.brokerName) {
    errors.push('Broker Name is required.');
  }

  if (row.brokerEmail && !isValidEmail(row.brokerEmail)) {
    errors.push('Broker Email must be valid.');
  }

  if (row.status && !BROKER_STATUSES.includes(normalizeStatus(row.status) as BrokerStatus)) {
    errors.push('Status must be Active, Inactive, or Do Not Use.');
  }

  if (row.ccDefault && !isValidCcDefault(row.ccDefault)) {
    errors.push('CC Default must be true/false, yes/no, y/n, or 1/0.');
  }

  return errors;
}

function getValue(row: SheetRow, headerMap: Map<string, number>, aliases: readonly string[]): string {
  const matchingAlias = aliases.find((alias) => headerMap.has(alias));

  if (!matchingAlias) {
    return '';
  }

  return String(row[headerMap.get(matchingAlias) ?? -1] ?? '').trim();
}

function normalizeHeader(value: CellValue): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return 'Active';
  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  if (normalized === 'do not use') return 'Do Not Use';

  return value.trim();
}

function isValidCcDefault(value: string): boolean {
  return ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'].includes(value.trim().toLowerCase());
}

function parseCcDefault(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return true;
  return ['true', 'yes', 'y', '1'].includes(normalized);
}
