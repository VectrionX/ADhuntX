import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_CSV_BYTES, MAX_CSV_ROWS, REQUIRED_CSV_HEADERS, CSVValidationError, parseCSV } from '../utils.ts';

const header = REQUIRED_CSV_HEADERS.join(',');
const row = ['Jane Doe', 'jdoe', 'True', '2025-01-01', 'Users', 'User', 'HR', '2025-01-01', '2026-01-01', 'True', 'False', 'False'].join(',');
const validCSV = `${header}\n${row}`;

const rejects = (content: string, message: string) => {
  assert.throws(() => parseCSV(content), (error: unknown) => error instanceof CSVValidationError && error.message.includes(message));
};

test('accepts a valid export and preserves quoted commas', () => {
  const users = parseCSV(`${header}\n${row.replace('Users', '"Users, Marketing"')}`);
  assert.equal(users.length, 1);
  assert.equal(users[0].MemberOf, 'Users, Marketing');
});

test('rejects a file over 5MB before parsing rows', () => {
  rejects(`${header}\n${'x'.repeat(MAX_CSV_BYTES)}`, '5MB');
});

test('rejects more than 10,000 data rows before processing', () => {
  rejects(`${header}\n${Array(MAX_CSV_ROWS + 1).fill(row).join('\n')}`, '10,000');
});

test('rejects malformed rows and missing required headers', () => {
  rejects(`${header}\n${row},unexpected`, 'columns');
  rejects('UserName,SamAccountName\nJane,jdoe', 'Missing required headers');
  rejects(`${header}\n"unterminated`, 'unterminated quote');
});

test('boundary validation is pure and does not persist or upload data', () => {
  assert.equal(typeof globalThis.fetch, 'function');
  assert.equal('localStorage' in globalThis, false);
  assert.deepEqual(parseCSV(validCSV)[0].SamAccountName, 'jdoe');
});
