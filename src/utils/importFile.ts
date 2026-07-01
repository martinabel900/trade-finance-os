import * as XLSX from 'xlsx';
import {
  CAMPAIGNS,
  type Campaign,
  type ContactInput,
} from '../services/contactService';
import { hasMissingClientEmail } from './emailValidation';

export interface ParsedContactRow {
  rowNumber: number;
  brokerName: string;
  brokerEmail: string;
  brokerPhone: string;
  companyName: string;
  contactName: string;
  email: string;
  campaign: string;
}

export interface ImportContactRow {
  rowNumber: number;
  contact: ContactInput;
}

export interface InvalidContactRow extends ParsedContactRow {
  errors: string[];
}

export interface ContactImportPreview {
  validRows: ImportContactRow[];
  invalidRows: InvalidContactRow[];
}

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

const REQUIRED_COLUMN_GROUPS = [
  { label: 'Broker Name', aliases: ['broker name', 'broker'] },
  { label: 'Company', aliases: ['company', 'company name'] },
  { label: 'Contact Name', aliases: ['contact name', 'name', 'contact'] },
  { label: 'Campaign', aliases: ['campaign'] },
] as const;

const COLUMN_ALIASES = {
  brokerName: ['broker name', 'broker'],
  brokerEmail: ['broker email', 'broker e-mail'],
  brokerPhone: ['broker phone', 'broker telephone', 'broker mobile'],
  companyName: ['company', 'company name'],
  contactName: ['contact name', 'name', 'contact'],
  email: ['email address', 'email', 'e-mail'],
  campaign: ['campaign'],
} as const;

export async function parseContactFile(file: File): Promise<ContactImportPreview> {
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

function buildPreview(rows: SheetRow[]): ContactImportPreview {
  const [headerRow, ...bodyRows] = rows;

  if (!headerRow) {
    throw new Error('The uploaded file is empty.');
  }

  const headerMap = getHeaderMap(headerRow);
  const missingColumns = REQUIRED_COLUMN_GROUPS.filter(
    (column) => !column.aliases.some((alias) => headerMap.has(alias)),
  ).map(
    (column) => column.label,
  );

  if (missingColumns.length) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}.`);
  }

  const parsedRows = bodyRows
    .map((row, index) => parseRow(row, headerMap, index + 2))
    .filter((row) =>
      [row.brokerName, row.companyName, row.contactName, row.email, row.campaign].some(Boolean),
    );
  const invalidRows: InvalidContactRow[] = [];
  const validParsedRows: ParsedContactRow[] = [];

  parsedRows.forEach((row) => {
    const errors = validateRow(row);

    if (errors.length) {
      invalidRows.push({ ...row, errors });
    } else {
      validParsedRows.push(row);
    }
  });

  return {
    validRows: assignBatches(validParsedRows),
    invalidRows,
  };
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

function parseRow(row: SheetRow, headerMap: Map<string, number>, rowNumber: number): ParsedContactRow {
  return {
    rowNumber,
    brokerName: getValue(row, headerMap, COLUMN_ALIASES.brokerName),
    brokerEmail: getValue(row, headerMap, COLUMN_ALIASES.brokerEmail),
    brokerPhone: getValue(row, headerMap, COLUMN_ALIASES.brokerPhone),
    companyName: getValue(row, headerMap, COLUMN_ALIASES.companyName),
    contactName: getValue(row, headerMap, COLUMN_ALIASES.contactName),
    email: getValue(row, headerMap, COLUMN_ALIASES.email),
    campaign: normalizeCampaign(getValue(row, headerMap, COLUMN_ALIASES.campaign)),
  };
}

function getValue(
  row: SheetRow,
  headerMap: Map<string, number>,
  aliases: readonly string[],
): string {
  const matchingAlias = aliases.find((alias) => headerMap.has(alias));

  if (!matchingAlias) {
    return '';
  }

  return String(row[headerMap.get(matchingAlias) ?? -1] ?? '').trim();
}

function validateRow(row: ParsedContactRow): string[] {
  const errors: string[] = [];

  if (!row.companyName) {
    errors.push('Company is required.');
  }

  if (!CAMPAIGNS.includes(row.campaign as Campaign)) {
    errors.push('Campaign must be A, B, or C.');
  }

  return errors;
}

function assignBatches(rows: ParsedContactRow[]): ImportContactRow[] {
  const campaignCounts = new Map<string, number>();

  return rows.map((row) => {
    const currentCount = campaignCounts.get(row.campaign) ?? 0;
    campaignCounts.set(row.campaign, currentCount + 1);

    return {
      rowNumber: row.rowNumber,
      contact: {
        brokerName: row.brokerName,
        brokerEmail: row.brokerEmail,
        brokerPhone: row.brokerPhone,
        brokerCcEnabled: null,
        companyName: row.companyName,
        contactName: row.contactName,
        email: hasMissingClientEmail(row.email) ? '' : row.email,
        phone: '',
        campaign: row.campaign,
        batch: String(Math.floor(currentCount / 10) + 1),
        emailStatus: 'Not Sent',
        contactEmailStatus: hasMissingClientEmail(row.email) ? 'Missing Email' : '',
        replyStatus: 'No Reply',
        responseCategory: 'No reply',
        notes: '',
        nextAction: hasMissingClientEmail(row.email) ? 'Ask broker for client email' : '',
        dealStatus: 'No Reply',
      },
    };
  });
}

function normalizeHeader(value: CellValue): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeCampaign(value: string): string {
  const normalized = value.replace(/campaign/i, '').trim().toUpperCase();
  const campaignLetter = normalized.match(/[ABC]/)?.[0];

  return campaignLetter ?? normalized;
}
