import { Question } from '../services/api';

const REQUIRED_COLUMNS = [
  'question',
  'option1',
  'option2',
  'option3',
  'option4',
  'correct_option',
] as const;

const COLUMN_ALIASES: Record<string, string> = {
  q: 'question',
  question_text: 'question',
  questiontext: 'question',
  option_1: 'option1',
  option_2: 'option2',
  option_3: 'option3',
  option_4: 'option4',
  opt1: 'option1',
  opt2: 'option2',
  opt3: 'option3',
  opt4: 'option4',
  a: 'option1',
  b: 'option2',
  c: 'option3',
  d: 'option4',
  correct: 'correct_option',
  answer: 'correct_option',
  correct_answer: 'correct_option',
  correctoption: 'correct_option',
  solution: 'explanation',
  explain: 'explanation',
  level: 'difficulty',
  level_of_difficulty: 'difficulty',
  subtopic: 'sub_topic',
  sub_topic_name: 'sub_topic',
  media: 'media_url',
  image: 'media_url',
  image_url: 'media_url',
};

export interface CSVParseResult {
  questions: Question[];
  errors: string[];
  skipped: number;
}

export interface CSVParseDefaults {
  subject: string;
  testId: string;
  difficulty: string;
}

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, '_');
  return COLUMN_ALIASES[key] || key;
}

/** Parse a single CSV line, respecting double-quoted fields. */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
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
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((f) => f.trim().replace(/^"(.*)"$/, '$1'));
}

function parseCSVRows(csvText: string): string[][] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map(parseCSVLine);
}

function normalizeCorrectOption(value: string): string | null {
  const v = value.trim().toLowerCase();

  if (['option1', 'option2', 'option3', 'option4'].includes(v)) {
    return v;
  }
  if (['1', 'a'].includes(v)) return 'option1';
  if (['2', 'b'].includes(v)) return 'option2';
  if (['3', 'c'].includes(v)) return 'option3';
  if (['4', 'd'].includes(v)) return 'option4';

  return null;
}

function normalizeDifficulty(value: string, fallback: string): string {
  const v = value.trim().toLowerCase();
  if (v === 'easy' || v === 'medium' || v === 'difficult') return v;
  if (v === 'hard') return 'difficult';
  return fallback;
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, idx) => {
    if (header) {
      record[header] = row[idx]?.trim() ?? '';
    }
  });
  return record;
}

function isRowEmpty(record: Record<string, string>): boolean {
  return Object.values(record).every((v) => !v.trim());
}

export function parseQuestionsCSV(
  csvText: string,
  defaults: CSVParseDefaults,
): CSVParseResult {
  const errors: string[] = [];
  const questions: Question[] = [];
  let skipped = 0;

  const rows = parseCSVRows(csvText);
  if (rows.length < 2) {
    return {
      questions: [],
      errors: ['CSV file is empty or contains only a header row.'],
      skipped: 0,
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    return {
      questions: [],
      errors: [`Missing required columns: ${missing.join(', ')}`],
      skipped: 0,
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const record = rowToRecord(headers, rows[i]);
    const rowNum = i + 1;

    if (isRowEmpty(record)) {
      skipped++;
      continue;
    }

    const questionText = record.question?.trim() ?? '';
    const option1 = record.option1?.trim() ?? '';
    const option2 = record.option2?.trim() ?? '';
    const option3 = record.option3?.trim() ?? '';
    const option4 = record.option4?.trim() ?? '';
    const correctOption = normalizeCorrectOption(record.correct_option ?? '');

    if (!questionText) {
      errors.push(`Row ${rowNum}: question text is required.`);
      skipped++;
      continue;
    }
    if (!option1 || !option2 || !option3 || !option4) {
      errors.push(`Row ${rowNum}: all four options are required.`);
      skipped++;
      continue;
    }
    if (!correctOption) {
      errors.push(
        `Row ${rowNum}: correct_option must be option1–option4 (or 1–4 / A–D).`,
      );
      skipped++;
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
      explanation: record.explanation?.trim() ?? '',
      difficulty: normalizeDifficulty(record.difficulty ?? '', defaults.difficulty),
      topic: record.topic?.trim() ?? '',
      sub_topic: record.sub_topic?.trim() ?? '',
      paragraph: record.paragraph?.trim() ?? '',
      media_url: record.media_url?.trim() ?? '',
      category: record.category?.trim() ?? '',
      test_id: defaults.testId,
    });
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push('No valid question rows found in the CSV file.');
  }

  return { questions, errors, skipped };
}

export const CSV_TEMPLATE_HEADERS = [
  'question',
  'option1',
  'option2',
  'option3',
  'option4',
  'correct_option',
  'explanation',
  'difficulty',
  'topic',
  'sub_topic',
  'media_url',
].join(',');
