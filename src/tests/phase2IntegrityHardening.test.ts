/**
 * UNS SCHOOL — Phase 2 Integrity & Audit Regression Tests
 * Verifies class/academic-year/school invariants, class immutability,
 * archived academic year protections, strict CSV identity disambiguation,
 * gender/DOB validation, and school context checks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  academicYearRepository,
  classRepository,
  studentPersonRepository,
  studentEnrollmentRepository,
} from '../db/repositories';
import {
  parseCsvText,
  parseAndValidateDateOfBirth,
  normalizeGender,
  prepareStudentImportPreview,
  executeStudentImport,
} from '../services/studentImportService';
import type { AcademicYear, SchoolClass, StudentPerson } from '../types';

describe('Phase 2 Integrity Hardening & Domain Invariant Tests', () => {
  const schoolId = 'school-p2-test';
  const otherSchoolId = 'school-other-test';
  const year1Id = 'year-p2-active';
  const yearArchivedId = 'year-p2-archived';
  const class1Id = 'class-p2-1';

  beforeEach(async () => {
    await db.grades.clear();
    await db.assessments.clear();
    await db.attendance.clear();
    await db.lessons.clear();
    await db.studentEnrollments.clear();
    await db.studentPersons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();

    // Create main school
    await db.schools.add({
      id: schoolId,
      name: 'Ibn Khaldoun Middle School',
      commune: 'Algiers',
      wilaya: '16',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create other school
    await db.schools.add({
      id: otherSchoolId,
      name: 'Other Secondary School',
      commune: 'Oran',
      wilaya: '31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create active academic year
    const activeYear: AcademicYear = {
      id: year1Id,
      schoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(activeYear);

    // Create archived academic year
    const archivedYear: AcademicYear = {
      id: yearArchivedId,
      schoolId,
      label: '2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(archivedYear);

    // Create valid class in active year
    const validClass: SchoolClass = {
      id: class1Id,
      schoolId,
      academicYearId: year1Id,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(validClass);
  });

  describe('Fix #1 — Class / Academic Year / School Invariant', () => {
    it('rejects class creation when class.schoolId differs from academicYear.schoolId', async () => {
      const invalidClass: SchoolClass = {
        id: 'class-mismatched-school',
        schoolId: otherSchoolId, // Does NOT match year1's schoolId (schoolId)
        academicYearId: year1Id,
        levelCode: '1MS',
        name: '1MS 2',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(classRepository.create(invalidClass)).rejects.toThrow(
        /Class schoolId does not match AcademicYear schoolId/i
      );
    });

    it('rejects class creation when academic year does not exist', async () => {
      const ghostClass: SchoolClass = {
        id: 'class-ghost-year',
        schoolId,
        academicYearId: 'non-existent-year',
        levelCode: '1MS',
        name: '1MS 3',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(classRepository.create(ghostClass)).rejects.toThrow(
        /Academic year with id non-existent-year not found/i
      );
    });
  });

  describe('Fix #2 — Class Academic Year & School Immutability', () => {
    it('prohibits migrating a class to a different academic year via update', async () => {
      await expect(
        classRepository.update(class1Id, { academicYearId: yearArchivedId })
      ).rejects.toThrow(/Class academicYearId cannot be changed after creation/i);
    });

    it('prohibits mutating schoolId on an existing class via update', async () => {
      await expect(
        classRepository.update(class1Id, { schoolId: otherSchoolId })
      ).rejects.toThrow(/Class schoolId cannot be changed after creation/i);
    });
  });

  describe('Fix #3 — Archive Protection Invariants', () => {
    it('rejects creating a class in an archived academic year', async () => {
      const classInArchivedYear: SchoolClass = {
        id: 'class-in-archived',
        schoolId,
        academicYearId: yearArchivedId,
        levelCode: '2MS',
        name: '2MS 1',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(classRepository.create(classInArchivedYear)).rejects.toThrow(
        /Cannot add new classes to an archived academic year/i
      );
    });

    it('rejects modifying a class that belongs to an archived academic year', async () => {
      // Direct insert a class into the archived year to test update guards
      const oldClass: SchoolClass = {
        id: 'class-old',
        schoolId,
        academicYearId: yearArchivedId,
        levelCode: '3MS',
        name: '3MS 1',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.classes.add(oldClass);

      await expect(
        classRepository.update(oldClass.id, { name: '3MS 1 Renamed' })
      ).rejects.toThrow(/Cannot modify classes in an archived academic year/i);
    });
  });

  describe('Fix #4 — Safe CSV Student Identity Disambiguation', () => {
    it('Rule A: Matches by exact National ID when valid', async () => {
      const existingStudent: StudentPerson = {
        id: 'student-nin-1',
        firstNameLatin: 'Anis',
        lastNameLatin: 'Boussaid',
        gender: 'M',
        dateOfBirth: '2012-04-10',
        nationalIdNumber: '201216010099999',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(existingStudent);

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth,nationalIdNumber
1,Anis,Boussaid,M,2012-04-10,201216010099999`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.validRows.length).toBe(1);
      expect(preview.validRows[0].isNewPerson).toBe(false);
      expect(preview.validRows[0].existingPersonId).toBe(existingStudent.id);
    });

    it('Rule B: Matches by exact Name + exact DOB when NIN is absent', async () => {
      const existingStudent: StudentPerson = {
        id: 'student-name-dob-1',
        firstNameLatin: 'Amel',
        lastNameLatin: 'Zerrouki',
        gender: 'F',
        dateOfBirth: '2012-08-15',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(existingStudent);

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Amel,Zerrouki,F,2012-08-15`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.validRows.length).toBe(1);
      expect(preview.validRows[0].isNewPerson).toBe(false);
      expect(preview.validRows[0].existingPersonId).toBe(existingStudent.id);
    });

    it('Rule C: Prohibits auto-merge when DOB is missing on CSV or database record', async () => {
      const existingStudent: StudentPerson = {
        id: 'student-no-dob',
        firstNameLatin: 'Karim',
        lastNameLatin: 'Ziani',
        gender: 'M',
        // dateOfBirth is undefined!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(existingStudent);

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Karim,Ziani,M,2012-01-01`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.invalidRows.length).toBe(1);
      expect(preview.invalidRows[0].errors[0]).toMatch(/Automatic merge prohibited for safety/i);
    });

    it('Rule D: Flags identity conflict when DOB differs for same-named student', async () => {
      const existingStudent: StudentPerson = {
        id: 'student-diff-dob',
        firstNameLatin: 'Yacine',
        lastNameLatin: 'Brahimi',
        gender: 'M',
        dateOfBirth: '2012-05-10',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(existingStudent);

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Yacine,Brahimi,M,2011-12-20`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.invalidRows.length).toBe(1);
      expect(preview.invalidRows[0].errors[0]).toMatch(/Identity conflict/i);
    });

    it('Rule E: Rejects automatic merge when multiple database candidates share the name', async () => {
      await studentPersonRepository.create({
        id: 'p1',
        firstNameLatin: 'Mohamed',
        lastNameLatin: 'Belhadj',
        gender: 'M',
        dateOfBirth: '2012-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await studentPersonRepository.create({
        id: 'p2',
        firstNameLatin: 'Mohamed',
        lastNameLatin: 'Belhadj',
        gender: 'M',
        dateOfBirth: '2012-02-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Mohamed,Belhadj,M,2012-01-01`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.invalidRows.length).toBe(1);
      expect(preview.invalidRows[0].errors[0]).toMatch(/Ambiguous identity requires manual resolution/i);
    });
  });

  describe('Fix #5 — Strict Gender Validation', () => {
    it('normalizes valid gender aliases correctly', () => {
      expect(normalizeGender('M')).toBe('M');
      expect(normalizeGender('male')).toBe('M');
      expect(normalizeGender('Garçon')).toBe('M');
      expect(normalizeGender('ذكر')).toBe('M');
      expect(normalizeGender('F')).toBe('F');
      expect(normalizeGender('female')).toBe('F');
      expect(normalizeGender('fille')).toBe('F');
      expect(normalizeGender('أنثى')).toBe('F');
    });

    it('rejects invalid or missing gender and does NOT silently default to M', async () => {
      expect(normalizeGender('')).toBeUndefined();
      expect(normalizeGender('unknown')).toBeUndefined();

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Salima,Hamidi,,2012-06-01
2,Riad,Mahrez,X,2012-07-01`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.invalidRows.length).toBe(2);
      expect(preview.invalidRows[0].errors.some((e) => /gender is required/i.test(e))).toBe(true);
      expect(preview.invalidRows[1].errors.some((e) => /invalid gender value/i.test(e))).toBe(true);
    });
  });

  describe('Fix #6 — Robust Date of Birth Calendar Validation', () => {
    it('parses valid calendar dates accurately', () => {
      const res1 = parseAndValidateDateOfBirth('2012-05-14');
      expect(res1.isValid).toBe(true);
      expect(res1.date).toBe('2012-05-14');

      const res2 = parseAndValidateDateOfBirth('14/05/2012');
      expect(res2.isValid).toBe(true);
      expect(res2.date).toBe('2012-05-14');

      // Leap year 2012
      const resLeap = parseAndValidateDateOfBirth('2012-02-29');
      expect(resLeap.isValid).toBe(true);
      expect(resLeap.date).toBe('2012-02-29');
    });

    it('rejects impossible dates like Feb 30, month 13, and non-leap Feb 29 as row errors', async () => {
      const resFeb30 = parseAndValidateDateOfBirth('2012-02-30');
      expect(resFeb30.isValid).toBe(false);

      const resNonLeapFeb29 = parseAndValidateDateOfBirth('2013-02-29');
      expect(resNonLeapFeb29.isValid).toBe(false);

      const resMonth13 = parseAndValidateDateOfBirth('2012-13-01');
      expect(resMonth13.isValid).toBe(false);

      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth
1,Test,Student,M,2012-02-30`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.invalidRows.length).toBe(1);
      expect(preview.invalidRows[0].errors.some((e) => /date of birth/i.test(e))).toBe(true);
    });
  });

  describe('Fix #7 & #8 — Context Validation & Delimiter Detection', () => {
    it('supports comma, semicolon, tab, and pipe delimiters cleanly', () => {
      const commaCsv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth\n1,Karim,Ziani,M,2012-01-01`;
      const parsedComma = parseCsvText(commaCsv);
      expect(parsedComma.length).toBe(1);
      expect(parsedComma[0].data.firstNameLatin).toBe('Karim');

      const semicolonCsv = `registerNumber;firstNameLatin;lastNameLatin;gender;dateOfBirth\n1;Ali;Bennani;M;2012-01-01`;
      const parsedSemicolon = parseCsvText(semicolonCsv);
      expect(parsedSemicolon.length).toBe(1);
      expect(parsedSemicolon[0].data.firstNameLatin).toBe('Ali');

      const tabCsv = `registerNumber\tfirstNameLatin\tlastNameLatin\tgender\tdateOfBirth\n1\tRiyad\tMahrez\tM\t2012-01-01`;
      const parsedTab = parseCsvText(tabCsv);
      expect(parsedTab.length).toBe(1);
      expect(parsedTab[0].data.firstNameLatin).toBe('Riyad');

      const pipeCsv = `registerNumber|firstNameLatin|lastNameLatin|gender|dateOfBirth\n1|Sofiane|Feghouli|M|2012-01-01`;
      const parsedPipe = parseCsvText(pipeCsv);
      expect(parsedPipe.length).toBe(1);
      expect(parsedPipe[0].data.firstNameLatin).toBe('Sofiane');
    });

    it('rejects import if target school or class context does not match', async () => {
      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth\n1,Nabil,Bentaleb,M,2012-01-01`;

      await expect(
        prepareStudentImportPreview(csv, {
          schoolId: otherSchoolId, // mismatch!
          academicYearId: year1Id,
          classId: class1Id,
        })
      ).rejects.toThrow(/Target academic year does not belong to the selected school/i);
    });
  });

  describe('Fix #9 — Non-Mutating Preview & Atomic Execution Verification', () => {
    it('guarantees that preparing a preview does not insert any records into IndexedDB', async () => {
      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth\n1,PreviewOnly,Student,M,2012-03-03`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.validRows.length).toBe(1);

      // Verify zero records were written to DB during preview
      const personsCount = await db.studentPersons.count();
      const enrollmentsCount = await db.studentEnrollments.count();
      expect(personsCount).toBe(0);
      expect(enrollmentsCount).toBe(0);
    });

    it('commits all records atomically upon execution', async () => {
      const csv = `registerNumber,firstNameLatin,lastNameLatin,gender,dateOfBirth\n1,AtomicOne,Test,M,2012-01-01\n2,AtomicTwo,Test,F,2012-02-02`;

      const preview = await prepareStudentImportPreview(csv, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(preview.canExecute).toBe(true);

      const summary = await executeStudentImport(preview, {
        schoolId,
        academicYearId: year1Id,
        classId: class1Id,
      });

      expect(summary.createdPersonsCount).toBe(2);
      expect(summary.createdEnrollmentsCount).toBe(2);

      const dbPersons = await db.studentPersons.toArray();
      const dbEnrollments = await db.studentEnrollments.toArray();
      expect(dbPersons.length).toBe(2);
      expect(dbEnrollments.length).toBe(2);
      expect(dbEnrollments.map((e) => e.registerNumber).sort()).toEqual([1, 2]);
    });
  });

  describe('Fix #10 — Repository Level School & Class Invariant Checks', () => {
    it('rejects academic year creation for non-existent schoolId', async () => {
      const invalidYear: AcademicYear = {
        id: 'year-ghost-school',
        schoolId: 'non-existent-school-id',
        label: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(academicYearRepository.create(invalidYear)).rejects.toThrow(
        /School with id non-existent-school-id not found/i
      );
    });

    it('rejects enrolling student into an archived class', async () => {
      const person: StudentPerson = {
        id: 'person-test-archived-cls',
        firstNameLatin: 'Amina',
        lastNameLatin: 'Belkacem',
        gender: 'F',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(person);

      const archivedClass: SchoolClass = {
        id: 'class-archived-target',
        schoolId,
        academicYearId: year1Id,
        levelCode: '1MS',
        name: '1MS Archived',
        isArchived: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.classes.add(archivedClass);

      await expect(
        studentEnrollmentRepository.enroll({
          id: 'enr-test-1',
          studentPersonId: person.id,
          academicYearId: year1Id,
          classId: archivedClass.id,
          registerNumber: 1,
          isRepeating: false,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(/Cannot enroll students in an archived class/i);
    });
  });

  describe('Fix #11 — AcademicYear.schoolId Immutability & Archived Read-Only Hardening', () => {
    it('A. schoolId cannot change: rejects updating schoolId to another school and preserves original schoolId', async () => {
      const yearA: AcademicYear = {
        id: 'year-school-a-test',
        schoolId,
        label: '2025-2026 A',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearA);

      // Attempt to mutate schoolId to otherSchoolId
      await expect(
        academicYearRepository.update(yearA.id, { schoolId: otherSchoolId })
      ).rejects.toThrow(/Academic year schoolId cannot be changed after creation/i);

      // Verify the stored record still belongs to School A
      const storedYear = await academicYearRepository.getById(yearA.id);
      expect(storedYear?.schoolId).toBe(schoolId);
    });

    it('B. archived year cannot be modified: ordinary update() rejects label, dates, schoolId, isCurrent, isArchived', async () => {
      const yearToArchive: AcademicYear = {
        id: 'year-to-be-archived',
        schoolId,
        label: '2024-2025 History',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
        isCurrent: true,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearToArchive);

      // Archive it
      await academicYearRepository.archive(yearToArchive.id);

      // Verify status
      const archived = await academicYearRepository.getById(yearToArchive.id);
      expect(archived?.isArchived).toBe(true);
      expect(archived?.isCurrent).toBe(false);

      // Attempt to update label
      await expect(
        academicYearRepository.update(yearToArchive.id, { label: 'Mutated Label' })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Attempt to update startDate
      await expect(
        academicYearRepository.update(yearToArchive.id, { startDate: '2024-10-01' })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Attempt to update endDate
      await expect(
        academicYearRepository.update(yearToArchive.id, { endDate: '2025-07-31' })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Attempt to update schoolId
      await expect(
        academicYearRepository.update(yearToArchive.id, { schoolId: otherSchoolId })
      ).rejects.toThrow(/Academic year schoolId cannot be changed after creation/i);

      // Attempt to update isCurrent
      await expect(
        academicYearRepository.update(yearToArchive.id, { isCurrent: true })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Attempt to bypass by passing isArchived: true in update payload
      await expect(
        academicYearRepository.update(yearToArchive.id, { label: 'Bypass attempt', isArchived: true })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Verify the stored record remains unchanged
      const finalStored = await academicYearRepository.getById(yearToArchive.id);
      expect(finalStored?.label).toBe('2024-2025 History');
      expect(finalStored?.startDate).toBe('2024-09-01');
      expect(finalStored?.endDate).toBe('2025-06-30');
      expect(finalStored?.schoolId).toBe(schoolId);
      expect(finalStored?.isCurrent).toBe(false);
      expect(finalStored?.isArchived).toBe(true);
    });

    it('C. explicit unarchive works: unarchive(id) restores editability', async () => {
      const yearToUnarchive: AcademicYear = {
        id: 'year-unarchive-test',
        schoolId,
        label: '2023-2024 Temp',
        startDate: '2023-09-01',
        endDate: '2024-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearToUnarchive);
      await academicYearRepository.archive(yearToUnarchive.id);

      // Confirm ordinary update is rejected
      await expect(
        academicYearRepository.update(yearToUnarchive.id, { label: 'Cannot change while archived' })
      ).rejects.toThrow(/Archived academic years are read-only/i);

      // Call unarchive
      await academicYearRepository.unarchive(yearToUnarchive.id);

      // Confirm normal update is allowed again
      await academicYearRepository.update(yearToUnarchive.id, { label: '2023-2024 Restored' });
      const updated = await academicYearRepository.getById(yearToUnarchive.id);
      expect(updated?.label).toBe('2023-2024 Restored');
      expect(updated?.isArchived).toBe(false);
    });

    it('D. archive behavior remains correct: sets isArchived=true and isCurrent=false', async () => {
      const yearCurrent: AcademicYear = {
        id: 'year-curr-test',
        schoolId,
        label: '2025-2026 Current',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        isCurrent: true,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearCurrent);

      await academicYearRepository.archive(yearCurrent.id);
      const archived = await academicYearRepository.getById(yearCurrent.id);
      expect(archived?.isArchived).toBe(true);
      expect(archived?.isCurrent).toBe(false);
    });
  });

  describe('Fix #12 — StudentEnrollment.academicYearId Immutability & Multi-Year Preservation', () => {
    it('A. academicYearId cannot change: rejects mutating enrollment academicYearId via update', async () => {
      const yearA: AcademicYear = {
        id: 'year-enr-a',
        schoolId,
        label: '2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        isCurrent: true,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const yearB: AcademicYear = {
        id: 'year-enr-b',
        schoolId,
        label: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearA);
      await academicYearRepository.create(yearB);

      const classA: SchoolClass = {
        id: 'class-enr-a',
        schoolId,
        academicYearId: yearA.id,
        levelCode: '1MS',
        name: '1MS 1',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await classRepository.create(classA);

      const person: StudentPerson = {
        id: 'student-enr-immut-1',
        firstNameLatin: 'Walid',
        lastNameLatin: 'Mesbah',
        gender: 'M',
        dateOfBirth: '2012-04-05',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(person);

      const enrollmentAId = await studentEnrollmentRepository.enroll({
        id: 'enr-walid-year-a',
        studentPersonId: person.id,
        academicYearId: yearA.id,
        classId: classA.id,
        registerNumber: 1,
        isRepeating: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Attempt to update enrollment to Year B
      await expect(
        studentEnrollmentRepository.update(enrollmentAId, { academicYearId: yearB.id })
      ).rejects.toThrow(/Enrollment academicYearId cannot be changed after creation/i);

      // Verify original enrollment still belongs to Year A
      const storedEnr = await studentEnrollmentRepository.getById(enrollmentAId);
      expect(storedEnr?.academicYearId).toBe(yearA.id);
      expect(storedEnr?.classId).toBe(classA.id);
    });

    it('B. promotion/history principle: permits creating separate new enrollment for next year while preserving historical enrollment intact', async () => {
      const yearA: AcademicYear = {
        id: 'year-promo-a',
        schoolId,
        label: '2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const yearB: AcademicYear = {
        id: 'year-promo-b',
        schoolId,
        label: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        isCurrent: true,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await academicYearRepository.create(yearA);
      await academicYearRepository.create(yearB);

      const classA: SchoolClass = {
        id: 'class-promo-1ms',
        schoolId,
        academicYearId: yearA.id,
        levelCode: '1MS',
        name: '1MS 1',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const classB: SchoolClass = {
        id: 'class-promo-2ms',
        schoolId,
        academicYearId: yearB.id,
        levelCode: '2MS',
        name: '2MS 1',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await classRepository.create(classA);
      await classRepository.create(classB);

      const student: StudentPerson = {
        id: 'student-promo-target',
        firstNameLatin: 'Lina',
        lastNameLatin: 'Haddad',
        gender: 'F',
        dateOfBirth: '2012-08-20',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentPersonRepository.create(student);

      // Create enrollment in Year A (1MS)
      const enrAId = await studentEnrollmentRepository.enroll({
        id: 'enr-lina-year-a',
        studentPersonId: student.id,
        academicYearId: yearA.id,
        classId: classA.id,
        registerNumber: 5,
        isRepeating: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Promote to Year B (2MS) by creating new separate enrollment
      const enrBId = await studentEnrollmentRepository.enroll({
        id: 'enr-lina-year-b',
        studentPersonId: student.id,
        academicYearId: yearB.id,
        classId: classB.id,
        registerNumber: 2,
        isRepeating: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(enrAId).not.toBe(enrBId);

      // Query all enrollments for student
      const studentHistory = await studentEnrollmentRepository.listByStudent(student.id);
      expect(studentHistory.length).toBe(2);

      const enrA = studentHistory.find((e) => e.academicYearId === yearA.id);
      const enrB = studentHistory.find((e) => e.academicYearId === yearB.id);

      expect(enrA).toBeDefined();
      expect(enrA?.classId).toBe(classA.id);
      expect(enrA?.registerNumber).toBe(5);

      expect(enrB).toBeDefined();
      expect(enrB?.classId).toBe(classB.id);
      expect(enrB?.registerNumber).toBe(2);
    });
  });
});
