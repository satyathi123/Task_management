import { Question } from '../services/api';

const REQUIRED_COLUMNS = [
  'question',
  'option1',
  'option2',
  'option3',
  'option4',
  'correct_option',
] as const;

const OPTIONAL_COLUMNS = ['explanation', 'difficulty', 'topic', 'sub_topic', 'media_url'] as const;

export const CSV_TEMPLATE_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

export interface CSVImportResult {
  questions: Question[];
  skippedRows: { row: number; reason: string }[];
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'));
}

function splitCSVRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || (char === '\r' && text[i + 1] !== '\n')) && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (current.trim()) rows.push(current);
      current = '';
    } else if (char === '\r' && text[i + 1] === '\n' && !inQuotes) {
      if (current.trim()) rows.push(current);
      current = '';
      i++;
    } else {
      current += char;
    }
  }

  if (current.trim()) rows.push(current);
  return rows;
}

function normalizeCorrectOption(value: string): string | null {
  const normalized = value.trim().toLowerCase();

  if (['option1', 'option2', 'option3', 'option4'].includes(normalized)) {
    return normalized;
  }

  const numericMap: Record<string, string> = {
    '1': 'option1',
    '2': 'option2',
    '3': 'option3',
    '4': 'option4',
  };
  if (numericMap[normalized]) return numericMap[normalized];

  const alphaMap: Record<string, string> = {
    a: 'option1',
    b: 'option2',
    c: 'option3',
    d: 'option4',
  };
  if (alphaMap[normalized]) return alphaMap[normalized];

  return null;
}

function normalizeDifficulty(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'easy') return 'easy';
  if (normalized === 'medium' || normalized === 'med') return 'medium';
  if (normalized === 'difficult' || normalized === 'hard') return 'difficult';
  return fallback;
}

export function parseQuestionsCSV(
  csvText: string,
  defaults: {
    subject: string;
    testId: string;
    defaultDifficulty: string;
  }
): CSVImportResult {
  const rows = splitCSVRows(csvText.trim());
  if (rows.length < 2) {
    throw new Error('CSV file must contain a header row and at least one question row.');
  }

  const headers = parseCSVLine(rows[0]).map(normalizeHeader);
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}. Expected: ${CSV_TEMPLATE_COLUMNS.join(', ')}`
    );
  }

  const questions: Question[] = [];
  const skippedRows: { row: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = parseCSVLine(rows[i]);
    if (values.every((v) => !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? '';
    });

    const questionText = row.question?.trim();
    const option1 = row.option1?.trim();
    const option2 = row.option2?.trim();
    const option3 = row.option3?.trim();
    const option4 = row.option4?.trim();
    const correctOption = normalizeCorrectOption(row.correct_option || '');

    if (!questionText) {
      skippedRows.push({ row: i + 1, reason: 'Question text is empty.' });
      continue;
    }

    if (!option1 || !option2 || !option3 || !option4) {
      skippedRows.push({ row: i + 1, reason: 'All four options are required.' });
      continue;
    }

    if (!correctOption) {
      skippedRows.push({
        row: i + 1,
        reason: `Invalid correct_option "${row.correct_option}". Use option1–option4, 1–4, or A–D.`,
      });
      continue;
    }

    questions.push({
      type: 'mcq',
      subject: defaults.subject,
      question: questionText,
      option1,
      option2,
      option3,
      option4,
      correct_option: correctOption,
      explanation: row.explanation?.trim() || '',
      difficulty: normalizeDifficulty(row.difficulty, defaults.defaultDifficulty),
      topic: row.topic?.trim() || '',
      sub_topic: row.sub_topic?.trim() || '',
      paragraph: '',
      media_url: row.media_url?.trim() || '',
      category: '',
      test_id: defaults.testId,
    });
  }

  if (questions.length === 0) {
    throw new Error('No valid questions found in the CSV file.');
  }

  return { questions, skippedRows };
}

export function generateCSVTemplate(): string {
  const header = CSV_TEMPLATE_COLUMNS.join(',');
  const sample = [
    '"What is 2 + 2?","2","3","4","5","option3","Basic addition","easy","Algebra","Linear Equations",""',
    '"Capital of France?","London","Berlin","Paris","Madrid","option3","Paris is the capital","medium","","",""',
  ];
  return [header, ...sample].join('\n');
}
