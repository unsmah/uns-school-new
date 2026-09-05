/**
 * UNS SCHOOL — Student CSV Import Service
 * Handles robust parsing, multi-pass validation, duplicate detection, preview generation,
 * and transactional execution for student roster imports.
 */

import { db } from '../db/database';
import { studentPersonRepository, studentEnrollmentRepository } from '../db/repositories';
import type { StudentPerson, StudentEnrollment } from '../types';

export interface RawCsvRow {
  rowNumber: number;
  data: Record<string, string>;
}

export interface ParsedStudentRow {
  rowNumber: number;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string; // Normalized YYYY-MM-DD
  gender: 'M' | 'F';
  nationalIdNumber?: string;
  registerNumber: number;
  isRepeating: boolean;
  guardianName?: string;
  guardianPhone?: string;
  
  // Resolution flags
  existingPersonId?: string; // If matched to an existing StudentPerson
  isNewPerson: boolean;
  isDuplicateEnrollment: boolean;
  hasRegisterConflict: boolean;
  conflictDetails?: string;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicateCandidateCount: number;
  registerConflictCount: number;
  alreadyEnrolledCount: number;
  canExecute: boolean;
}

export interface ImportExecutionSummary {
  createdPersonsCount: number;
  matchedPersonsCount: number;
  createdEnrollmentsCount: number;
  totalProcessed: number;
}

// Normalized header keys
const HEADER_ALIASES: Record<string, string> = {
  // First Name Latin
  firstname: 'firstNameLatin',
  first_name: 'firstNameLatin',
  firstnamelatin: 'firstNameLatin',
  'first name': 'firstNameLatin',
  prenom: 'firstNameLatin',
  prénom: 'firstNameLatin',
  
  // Last Name Latin
  lastname: 'lastNameLatin',
  last_name: 'lastNameLatin',
  lastnamelatin: 'lastNameLatin',
  'last name': 'lastNameLatin',
  nom: 'lastNameLatin',
  
  // Arabic First Name
  firstnamearabic: 'firstNameArabic',
  firstname_ar: 'firstNameArabic',
  'prenom arabe': 'firstNameArabic',
  prenomarabe: 'firstNameArabic',
  'الاسم': 'firstNameArabic',
  'الاسم بالعربية': 'firstNameArabic',
  
  // Arabic Last Name
  lastnamearabic: 'lastNameArabic',
  lastname_ar: 'lastNameArabic',
  'nom arabe': 'lastNameArabic',
  nomarabe: 'lastNameArabic',
  'اللقب': 'lastNameArabic',
  'اللقب بالعربية': 'lastNameArabic',
  
  // Date of Birth
  dateofbirth: 'dateOfBirth',
  date_of_birth: 'dateOfBirth',
  dob: 'dateOfBirth',
  birthdate: 'dateOfBirth',
  'date de naissance': 'dateOfBirth',
  date_naissance: 'dateOfBirth',
  'تاريخ الميلاد': 'dateOfBirth',
  
  // Gender
  gender: 'gender',
  sex: 'gender',
  sexe: 'gender',
  'الجنس': 'gender',
  
  // NIN
  nationalidnumber: 'nationalIdNumber',
  national_id: 'nationalIdNumber',
  nin: 'nationalIdNumber',
  matricule: 'nationalIdNumber',
  'رقم التعريف الوطني': 'nationalIdNumber',
  
  // Register Number
  registernumber: 'registerNumber',
  register_number: 'registerNumber',
  registerno: 'registerNumber',
  'numero d\'ordre': 'registerNumber',
  'numéro d\'ordre': 'registerNumber',
  numero_ordre: 'registerNumber',
  num_ordre: 'registerNumber',
  n_ordre: 'registerNumber',
  numero: 'registerNumber',
  num: 'registerNumber',
  'رقم القيد': 'registerNumber',
  'الرقم': 'registerNumber',
  
  // Repeating
  isrepeating: 'isRepeating',
  is_repeating: 'isRepeating',
  repeating: 'isRepeating',
  redoublant: 'isRepeating',
  'معيد': 'isRepeating',
  
  // Guardian
  guardianname: 'guardianName',
  guardian_name: 'guardianName',
  tuteur: 'guardianName',
  'اسم الولي': 'guardianName',
  guardianphone: 'guardianPhone',
  guardian_phone: 'guardianPhone',
  telephone_tuteur: 'guardianPhone',
  'هاتف الولي': 'guardianPhone',
};

/**
 * Pure CSV parser supporting commas, semicolons, tabs, quoted strings and newlines.
 */
export function parseCsvText(csvText: string): RawCsvRow[] {
  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter: check first non-empty line
  const lines = cleanText.split(/\r?\n/);
  const firstLine = lines.find((l) => l.trim().length > 0) || '';
  
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  // Robust RFC 4180 tokenizer
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  // Header normalization
  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/['"`]/g, ''));
  const mappedHeaders = headerRow.map((h) => HEADER_ALIASES[h] || h);

  const result: RawCsvRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rowData = rows[r];
    // Skip completely empty lines
    if (rowData.every((c) => c.trim().length === 0)) continue;

    const rowObj: Record<string, string> = {};
    for (let c = 0; c < mappedHeaders.length; c++) {
      const key = mappedHeaders[c];
      const val = rowData[c] !== undefined ? rowData[c].trim() : '';
      rowObj[key] = val;
    }
    result.push({
      rowNumber: r + 1, // 1-indexed human row
      data: rowObj,
    });
  }

  return result;
}

/**
 * Normalizes date formats into ISO YYYY-MM-DD
 */
export function normalizeDate(dateStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const s = dateStr.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return undefined;
}

/**
 * Normalizes gender strings
 */
export function normalizeGender(val?: string): 'M' | 'F' | undefined {
  if (!val) return undefined;
  const s = val.trim().toLowerCase();
  if (s === 'm' || s === 'male' || s === 'garçon' || s === 'garcon' || s === 'g' || s === 'ذكر' || s === '1') {
    return 'M';
  }
  if (s === 'f' || s === 'female' || s === 'fille' || s === 'f' || s === 'أنثى' || s === '2') {
    return 'F';
  }
  return undefined;
}

/**
 * Normalizes boolean repeating status
 */
export function normalizeRepeating(val?: string): boolean {
  if (!val) return false;
  const s = val.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'oui' || s === 'redoublant' || s === 'نعم';
}

/**
 * Parses, validates, and generates a rich preview for the teacher before importing.
 */
export async function prepareStudentImportPreview(
  csvText: string,
  targetContext: { schoolId: string; academicYearId: string; classId: string }
): Promise<ImportPreviewResult> {
  const rawRows = parseCsvText(csvText);
  if (rawRows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicateCandidateCount: 0,
      registerConflictCount: 0,
      alreadyEnrolledCount: 0,
      canExecute: false,
    };
  }

  // Pre-fetch context database entities to validate invariants
  const [existingPersons, existingEnrollmentsInClass, existingEnrollmentsInYear] = await Promise.all([
    db.studentPersons.toArray(),
    db.studentEnrollments.where('classId').equals(targetContext.classId).toArray(),
    db.studentEnrollments.where('academicYearId').equals(targetContext.academicYearId).toArray(),
  ]);

  const existingRegisterNumbers = new Set(
    existingEnrollmentsInClass.map((e) => e.registerNumber)
  );

  const activeEnrollmentsByPersonId = new Map<string, StudentEnrollment>();
  for (const e of existingEnrollmentsInYear) {
    if (e.status === 'active') {
      activeEnrollmentsByPersonId.set(e.studentPersonId, e);
    }
  }

  const seenRegisterNumbersInBatch = new Set<number>();
  const validRows: ParsedStudentRow[] = [];
  const invalidRows: ParsedStudentRow[] = [];

  let duplicateCandidateCount = 0;
  let registerConflictCount = 0;
  let alreadyEnrolledCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const data = raw.data;
    const errors: string[] = [];
    const warnings: string[] = [];

    const firstNameLatin = (data.firstNameLatin || data.prenom || data.firstname || '').trim();
    const lastNameLatin = (data.lastNameLatin || data.nom || data.lastname || '').trim();
    const firstNameArabic = (data.firstNameArabic || '').trim() || undefined;
    const lastNameArabic = (data.lastNameArabic || '').trim() || undefined;
    const rawDob = data.dateOfBirth || data.dob || data.date_naissance || '';
    const dateOfBirth = normalizeDate(rawDob);
    const rawGender = data.gender || data.sexe || '';
    const gender = normalizeGender(rawGender) || 'M';
    const nationalIdNumber = (data.nationalIdNumber || data.nin || '').trim() || undefined;
    const rawReg = data.registerNumber || data.numero_ordre || data.numero || '';
    
    // Auto-calculate register number if omitted or parse it
    let registerNumber = parseInt(rawReg, 10);
    if (isNaN(registerNumber) || registerNumber <= 0) {
      // Fallback register number: pick next available integer
      registerNumber = idx + 1;
    }

    const isRepeating = normalizeRepeating(data.isRepeating || data.redoublant);
    const guardianName = (data.guardianName || '').trim() || undefined;
    const guardianPhone = (data.guardianPhone || '').trim() || undefined;

    // Field validations
    if (!firstNameLatin) {
      errors.push('First name (Latin) is required');
    }
    if (!lastNameLatin) {
      errors.push('Last name (Latin) is required');
    }
    if (rawDob && !dateOfBirth) {
      warnings.push(`Invalid date of birth format: "${rawDob}". Format should be YYYY-MM-DD.`);
    }

    // Match existing student person:
    // 1. Match by NIN if NIN exists
    // 2. Match by exact (firstNameLatin + lastNameLatin + dateOfBirth)
    let matchedPerson: StudentPerson | undefined = undefined;
    if (nationalIdNumber) {
      matchedPerson = existingPersons.find(
        (p) => p.nationalIdNumber?.trim().toLowerCase() === nationalIdNumber.toLowerCase()
      );
    }
    if (!matchedPerson && firstNameLatin && lastNameLatin) {
      matchedPerson = existingPersons.find(
        (p) =>
          p.firstNameLatin.trim().toLowerCase() === firstNameLatin.toLowerCase() &&
          p.lastNameLatin.trim().toLowerCase() === lastNameLatin.toLowerCase() &&
          (!dateOfBirth || !p.dateOfBirth || p.dateOfBirth === dateOfBirth)
      );
    }

    let isNewPerson = true;
    let existingPersonId: string | undefined = undefined;

    if (matchedPerson) {
      isNewPerson = false;
      existingPersonId = matchedPerson.id;
      duplicateCandidateCount++;
      warnings.push(`Matched existing student identity: ${matchedPerson.firstNameLatin} ${matchedPerson.lastNameLatin}`);
    }

    // Check duplicate active enrollment in academic year
    let isDuplicateEnrollment = false;
    if (existingPersonId && activeEnrollmentsByPersonId.has(existingPersonId)) {
      isDuplicateEnrollment = true;
      alreadyEnrolledCount++;
      errors.push('Student is already actively enrolled in this academic year.');
    }

    // Check register number conflict
    let hasRegisterConflict = false;
    let conflictDetails: string | undefined = undefined;

    if (existingRegisterNumbers.has(registerNumber)) {
      hasRegisterConflict = true;
      registerConflictCount++;
      errors.push(`Register number #${registerNumber} is already used by an enrolled student in this class.`);
      conflictDetails = `Conflict with existing class register #${registerNumber}`;
    } else if (seenRegisterNumbersInBatch.has(registerNumber)) {
      hasRegisterConflict = true;
      registerConflictCount++;
      errors.push(`Register number #${registerNumber} appears multiple times in this CSV import.`);
      conflictDetails = `Duplicate register #${registerNumber} in CSV`;
    } else {
      seenRegisterNumbersInBatch.add(registerNumber);
    }

    const parsedRow: ParsedStudentRow = {
      rowNumber: raw.rowNumber,
      firstNameLatin,
      lastNameLatin,
      firstNameArabic,
      lastNameArabic,
      dateOfBirth,
      gender,
      nationalIdNumber,
      registerNumber,
      isRepeating,
      guardianName,
      guardianPhone,
      existingPersonId,
      isNewPerson,
      isDuplicateEnrollment,
      hasRegisterConflict,
      conflictDetails,
      errors,
      warnings,
    };

    if (errors.length > 0) {
      invalidRows.push(parsedRow);
    } else {
      validRows.push(parsedRow);
    }
  }

  const canExecute = validRows.length > 0 && invalidRows.length === 0;

  return {
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    duplicateCandidateCount,
    registerConflictCount,
    alreadyEnrolledCount,
    canExecute,
  };
}

/**
 * Transactional execution of confirmed valid student rows.
 * Guaranteed to execute entirely in an atomic Dexie transaction.
 */
export async function executeStudentImport(
  preview: ImportPreviewResult,
  targetContext: { schoolId: string; academicYearId: string; classId: string }
): Promise<ImportExecutionSummary> {
  if (preview.validRows.length === 0) {
    throw new Error('No valid student rows to import.');
  }

  const now = new Date().toISOString();
  let createdPersonsCount = 0;
  let matchedPersonsCount = 0;
  let createdEnrollmentsCount = 0;

  await db.transaction(
    'rw',
    [db.studentPersons, db.studentEnrollments, db.academicYears, db.classes],
    async () => {
      // 1. Verify target class and academic year
      const year = await db.academicYears.get(targetContext.academicYearId);
      if (!year) {
        throw new Error(`Academic year ${targetContext.academicYearId} not found.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot import students into an archived academic year.');
      }

      const schoolClass = await db.classes.get(targetContext.classId);
      if (!schoolClass) {
        throw new Error(`Class ${targetContext.classId} not found.`);
      }
      if (schoolClass.academicYearId !== targetContext.academicYearId) {
        throw new Error('Class does not belong to the selected academic year.');
      }

      // 2. Process each valid row
      for (const row of preview.validRows) {
        let personId = row.existingPersonId;

        if (!personId) {
          // Create new StudentPerson
          personId = crypto.randomUUID();
          const newPerson: StudentPerson = {
            id: personId,
            firstNameLatin: row.firstNameLatin,
            lastNameLatin: row.lastNameLatin,
            firstNameArabic: row.firstNameArabic,
            lastNameArabic: row.lastNameArabic,
            dateOfBirth: row.dateOfBirth,
            gender: row.gender,
            nationalIdNumber: row.nationalIdNumber,
            guardianName: row.guardianName,
            guardianPhone: row.guardianPhone,
            createdAt: now,
            updatedAt: now,
          };
          await studentPersonRepository.create(newPerson);
          createdPersonsCount++;
        } else {
          matchedPersonsCount++;
        }

        // Create StudentEnrollment
        const enrollmentId = crypto.randomUUID();
        const enrollment: StudentEnrollment = {
          id: enrollmentId,
          studentPersonId: personId,
          academicYearId: targetContext.academicYearId,
          classId: targetContext.classId,
          registerNumber: row.registerNumber,
          isRepeating: row.isRepeating,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

        await studentEnrollmentRepository.enroll(enrollment);
        createdEnrollmentsCount++;
      }
    }
  );

  return {
    createdPersonsCount,
    matchedPersonsCount,
    createdEnrollmentsCount,
    totalProcessed: preview.validRows.length,
  };
}
