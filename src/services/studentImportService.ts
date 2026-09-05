/**
 * UNS SCHOOL — Student CSV Import Service
 * Handles robust parsing, multi-pass validation, identity disambiguation,
 * duplicate detection, preview generation, and transactional execution for student roster imports.
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

export interface TargetImportContext {
  schoolId: string;
  academicYearId: string;
  classId: string;
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
 * Pure CSV parser supporting commas, semicolons, tabs, and pipes,
 * with RFC 4180 quotes, escaped quotes, and multiline support.
 */
export function parseCsvText(csvText: string): RawCsvRow[] {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter by checking first non-empty line
  const lines = cleanText.split(/\r?\n/);
  const firstLine = lines.find((l) => l.trim().length > 0) || '';

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  let delimiter = ',';
  let maxCount = commaCount;

  if (semicolonCount > maxCount) {
    delimiter = ';';
    maxCount = semicolonCount;
  }
  if (tabCount > maxCount) {
    delimiter = '\t';
    maxCount = tabCount;
  }
  if (pipeCount > maxCount) {
    delimiter = '|';
    maxCount = pipeCount;
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
          i++; // Skip escaped double quote
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

  // Normalize header keys
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

export interface DateParseResult {
  isValid: boolean;
  date?: string; // Normalized YYYY-MM-DD
  error?: string;
}

/**
 * Validates and normalizes date of birth.
 * Missing/empty DOB is allowed by domain model (returns isValid: true, date: undefined).
 * If non-empty, checks format, calendar validity (including leap years), and realistic age bounds.
 */
export function parseAndValidateDateOfBirth(dateStr?: string): DateParseResult {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: true, date: undefined };
  }
  const s = dateStr.trim();
  let y: number, m: number, d: number;

  // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  // 8-digit compact YYYYMMDD
  const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (ymdMatch) {
    y = parseInt(ymdMatch[1], 10);
    m = parseInt(ymdMatch[2], 10);
    d = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    d = parseInt(dmyMatch[1], 10);
    m = parseInt(dmyMatch[2], 10);
    y = parseInt(dmyMatch[3], 10);
  } else if (compactMatch) {
    y = parseInt(compactMatch[1], 10);
    m = parseInt(compactMatch[2], 10);
    d = parseInt(compactMatch[3], 10);
  } else {
    return {
      isValid: false,
      error: `Malformed date of birth: "${dateStr}". Expected format: YYYY-MM-DD or DD/MM/YYYY.`,
    };
  }

  // Month validity
  if (m < 1 || m > 12) {
    return {
      isValid: false,
      error: `Invalid month (${m}) in date of birth: "${dateStr}".`,
    };
  }

  // Day validity (handles leap years via Date.UTC)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d < 1 || d > daysInMonth) {
    return {
      isValid: false,
      error: `Invalid day (${d}) for month ${m} in date of birth: "${dateStr}".`,
    };
  }

  // Realistic year bounds
  const currentYear = new Date().getFullYear();
  if (y < 1900 || y > currentYear) {
    return {
      isValid: false,
      error: `Date of birth year (${y}) is out of reasonable range (1900-${currentYear}).`,
    };
  }

  const normalized = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { isValid: true, date: normalized };
}

/**
 * Normalizes gender strings strictly.
 * Returns 'M' | 'F' or undefined. NEVER defaults invalid/missing input to 'M'.
 */
export function normalizeGender(val?: string): 'M' | 'F' | undefined {
  if (!val) return undefined;
  const s = val.trim().toLowerCase();
  if (['m', 'male', 'garçon', 'garcon', 'homme', 'h', 'ذكر', '1', 'boy'].includes(s)) {
    return 'M';
  }
  if (['f', 'female', 'fille', 'femme', 'feminin', 'féminin', 'أنثى', '2', 'girl'].includes(s)) {
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
 * Name normalization for safe matching (case-insensitive, diacritic-insensitive, collapsed whitespace).
 */
export function normalizeName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Validates target school, academic year, and class context.
 */
export async function validateImportTargetContext(targetContext: TargetImportContext): Promise<{
  school: any;
  academicYear: any;
  schoolClass: any;
}> {
  const school = await db.schools.get(targetContext.schoolId);
  if (!school) {
    throw new Error(`Target school with ID ${targetContext.schoolId} not found.`);
  }

  const academicYear = await db.academicYears.get(targetContext.academicYearId);
  if (!academicYear) {
    throw new Error(`Target academic year with ID ${targetContext.academicYearId} not found.`);
  }

  if (academicYear.schoolId !== targetContext.schoolId) {
    throw new Error('Target academic year does not belong to the selected school.');
  }

  if (academicYear.isArchived) {
    throw new Error('Cannot import students into an archived academic year.');
  }

  const schoolClass = await db.classes.get(targetContext.classId);
  if (!schoolClass) {
    throw new Error(`Target class with ID ${targetContext.classId} not found.`);
  }

  if (schoolClass.schoolId !== targetContext.schoolId) {
    throw new Error('Target class does not belong to the selected school.');
  }

  if (schoolClass.academicYearId !== targetContext.academicYearId) {
    throw new Error('Target class does not belong to the selected academic year.');
  }

  if (schoolClass.isArchived) {
    throw new Error('Cannot import students into an archived class.');
  }

  return { school, academicYear, schoolClass };
}

/**
 * Parses, validates, and generates an audit preview before importing.
 * Applies strict identity matching, gender checks, calendar bounds, and context invariant checks.
 */
export async function prepareStudentImportPreview(
  csvText: string,
  targetContext: TargetImportContext
): Promise<ImportPreviewResult> {
  // Validate school/year/class hierarchy and archive protection
  await validateImportTargetContext(targetContext);

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

  // Pre-fetch existing database entities
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
  const seenBatchNins = new Map<string, number>(); // NIN -> rowNumber
  const seenBatchIdentities = new Map<string, number>(); // Name+DOB -> rowNumber

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
    const dobResult = parseAndValidateDateOfBirth(rawDob);
    if (!dobResult.isValid) {
      errors.push(dobResult.error || `Invalid date of birth: "${rawDob}".`);
    }
    const dateOfBirth = dobResult.date;

    const rawGender = data.gender || data.sexe || '';
    const parsedGender = normalizeGender(rawGender);
    if (!parsedGender) {
      errors.push(
        rawGender
          ? `Invalid gender value: "${rawGender}". Must be M (Male / ذكر) or F (Female / أنثى).`
          : 'Gender is required (M/F).'
      );
    }
    const gender: 'M' | 'F' = parsedGender || 'M';

    const nationalIdNumber = (data.nationalIdNumber || data.nin || '').trim() || undefined;
    const rawReg = data.registerNumber || data.numero_ordre || data.numero || '';

    // Register number validation
    let registerNumber = parseInt(rawReg, 10);
    if (isNaN(registerNumber) || registerNumber <= 0) {
      // Auto-assign next available integer if omitted
      let candidateReg = idx + 1;
      while (existingRegisterNumbers.has(candidateReg) || seenRegisterNumbersInBatch.has(candidateReg)) {
        candidateReg++;
      }
      registerNumber = candidateReg;
    }

    const isRepeating = normalizeRepeating(data.isRepeating || data.redoublant);
    const guardianName = (data.guardianName || '').trim() || undefined;
    const guardianPhone = (data.guardianPhone || '').trim() || undefined;

    // Required fields check
    if (!firstNameLatin) {
      errors.push('First name (Latin) is required.');
    }
    if (!lastNameLatin) {
      errors.push('Last name (Latin) is required.');
    }

    const normFirst = normalizeName(firstNameLatin);
    const normLast = normalizeName(lastNameLatin);

    // Intra-batch duplicate checks
    if (nationalIdNumber) {
      const lowerNin = nationalIdNumber.toLowerCase();
      if (seenBatchNins.has(lowerNin)) {
        errors.push(`National ID "${nationalIdNumber}" appears multiple times in this CSV batch (row #${seenBatchNins.get(lowerNin)}).`);
      } else {
        seenBatchNins.set(lowerNin, raw.rowNumber);
      }
    }

    if (normFirst && normLast && dateOfBirth) {
      const identityKey = `${normFirst}_${normLast}_${dateOfBirth}`;
      if (seenBatchIdentities.has(identityKey)) {
        errors.push(`Duplicate student "${firstNameLatin} ${lastNameLatin}" (${dateOfBirth}) in this CSV batch (row #${seenBatchIdentities.get(identityKey)}).`);
      } else {
        seenBatchIdentities.set(identityKey, raw.rowNumber);
      }
    }

    // Student identity matching against database
    let matchedPerson: StudentPerson | undefined = undefined;

    if (nationalIdNumber) {
      const ninMatches = existingPersons.filter(
        (p) => p.nationalIdNumber?.trim().toLowerCase() === nationalIdNumber.toLowerCase()
      );

      if (ninMatches.length > 1) {
        errors.push(`Multiple existing student records share National ID "${nationalIdNumber}". Ambiguous match.`);
      } else if (ninMatches.length === 1) {
        const candidate = ninMatches[0];
        const candFirst = normalizeName(candidate.firstNameLatin);
        const candLast = normalizeName(candidate.lastNameLatin);

        // Check for severe identity discrepancy
        if (normFirst && normLast && (candFirst !== normFirst || candLast !== normLast)) {
          errors.push(
            `National ID "${nationalIdNumber}" matches database record for "${candidate.firstNameLatin} ${candidate.lastNameLatin}", but CSV specifies "${firstNameLatin} ${lastNameLatin}". Conflict detected.`
          );
        } else if (dateOfBirth && candidate.dateOfBirth && dateOfBirth !== candidate.dateOfBirth) {
          errors.push(
            `National ID "${nationalIdNumber}" matches database record, but Date of Birth differs (${candidate.dateOfBirth} vs ${dateOfBirth}). Conflict detected.`
          );
        } else {
          matchedPerson = candidate;
        }
      }
    }

    // Name + DOB match fallback if not matched by NIN
    if (!matchedPerson && normFirst && normLast) {
      const nameMatches = existingPersons.filter(
        (p) => normalizeName(p.firstNameLatin) === normFirst && normalizeName(p.lastNameLatin) === normLast
      );

      if (nameMatches.length > 1) {
        // Rule E: Multiple candidate records with same name -> prohibit automatic match
        errors.push(
          `Multiple existing student records found for name "${firstNameLatin} ${lastNameLatin}". Ambiguous identity requires manual resolution.`
        );
      } else if (nameMatches.length === 1) {
        const candidate = nameMatches[0];

        // Rule C: Missing DOB on either record prohibits automatic merge
        if (!dateOfBirth || !candidate.dateOfBirth) {
          errors.push(
            `A student named "${firstNameLatin} ${lastNameLatin}" exists in the database, but Date of Birth is missing on ${!dateOfBirth ? 'CSV row' : 'database record'}. Automatic merge prohibited for safety.`
          );
        } else if (candidate.dateOfBirth !== dateOfBirth) {
          // Rule D: Conflicting DOB
          errors.push(
            `A student named "${firstNameLatin} ${lastNameLatin}" exists in the database with a different Date of Birth (${candidate.dateOfBirth} vs ${dateOfBirth}). Identity conflict.`
          );
        } else {
          // Rule B: Exact name + exact DOB match
          matchedPerson = candidate;
        }
      }
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

    // Check register number conflicts
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
      errors.push(`Register number #${registerNumber} is duplicated within this CSV import.`);
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
 * Guarantees atomic insertion of identities and enrollments.
 */
export async function executeStudentImport(
  preview: ImportPreviewResult,
  targetContext: TargetImportContext
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
    [db.studentPersons, db.studentEnrollments, db.academicYears, db.classes, db.schools],
    async () => {
      // Re-verify target context inside atomic transaction
      const school = await db.schools.get(targetContext.schoolId);
      if (!school) {
        throw new Error(`Target school with ID ${targetContext.schoolId} not found.`);
      }

      const year = await db.academicYears.get(targetContext.academicYearId);
      if (!year) {
        throw new Error(`Academic year ${targetContext.academicYearId} not found.`);
      }
      if (year.schoolId !== targetContext.schoolId) {
        throw new Error('Academic year does not belong to target school.');
      }
      if (year.isArchived) {
        throw new Error('Cannot import students into an archived academic year.');
      }

      const schoolClass = await db.classes.get(targetContext.classId);
      if (!schoolClass) {
        throw new Error(`Class ${targetContext.classId} not found.`);
      }
      if (schoolClass.schoolId !== targetContext.schoolId) {
        throw new Error('Target class does not belong to target school.');
      }
      if (schoolClass.academicYearId !== targetContext.academicYearId) {
        throw new Error('Target class does not belong to target academic year.');
      }
      if (schoolClass.isArchived) {
        throw new Error('Cannot import students into an archived class.');
      }

      // Process each row
      for (const row of preview.validRows) {
        let personId = row.existingPersonId;

        if (!personId) {
          // Create new StudentPerson identity
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
