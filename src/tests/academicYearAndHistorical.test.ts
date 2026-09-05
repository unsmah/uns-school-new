import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  academicYearRepository,
  classRepository,
  studentEnrollmentRepository,
  lessonRepository,
  attendanceRepository,
  assessmentRepository,
  gradeRepository,
} from '../db/repositories';
import type { AcademicYear, SchoolClass, StudentPerson, StudentEnrollment } from '../types';

describe('Academic Year Invariants & Historical Protection', () => {
  const schoolId = 'school-dz-test-1';
  const year1Id = 'year-2025-2026';
  const year2Id = 'year-2026-2027';

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

    await db.schools.add({
      id: schoolId,
      name: 'CEM Test School',
      commune: 'Algiers',
      wilaya: '16',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('enforces only one current academic year per school', async () => {
    const year1: AcademicYear = {
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
    await academicYearRepository.create(year1);

    const currentAfterFirst = await academicYearRepository.getCurrent(schoolId);
    expect(currentAfterFirst?.id).toBe(year1Id);

    // Creating second year with isCurrent = true should reset year1 isCurrent to false
    const year2: AcademicYear = {
      id: year2Id,
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
    await academicYearRepository.create(year2);

    const currentAfterSecond = await academicYearRepository.getCurrent(schoolId);
    expect(currentAfterSecond?.id).toBe(year2Id);

    const year1Reloaded = await academicYearRepository.getById(year1Id);
    expect(year1Reloaded?.isCurrent).toBe(false);
  });

  it('allows two schools to each have their own current academic year without demoting each other (Test B)', async () => {
    const schoolA = 'school-a';
    const schoolB = 'school-b';
    await db.schools.bulkAdd([
      { id: schoolA, name: 'CEM School A', commune: 'Algiers', wilaya: '16', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: schoolB, name: 'CEM School B', commune: 'Oran', wilaya: '31', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);

    const yearA: AcademicYear = {
      id: 'year-a-2026',
      schoolId: schoolA,
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

    const yearB: AcademicYear = {
      id: 'year-b-2026',
      schoolId: schoolB,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(yearB);

    const currentA = await academicYearRepository.getCurrent(schoolA);
    const currentB = await academicYearRepository.getCurrent(schoolB);

    expect(currentA?.id).toBe('year-a-2026');
    expect(currentA?.isCurrent).toBe(true);
    expect(currentB?.id).toBe('year-b-2026');
    expect(currentB?.isCurrent).toBe(true);
  });

  it('prohibits moving an academic year between schools via update (Test A)', async () => {
    const schoolA = 'school-move-a';
    const schoolB = 'school-move-b';
    await db.schools.bulkAdd([
      { id: schoolA, name: 'CEM School A', commune: 'Algiers', wilaya: '16', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: schoolB, name: 'CEM School B', commune: 'Oran', wilaya: '31', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);

    const yearA: AcademicYear = {
      id: 'year-move-a',
      schoolId: schoolA,
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

    // Moving Year A to School B must be rejected to maintain school ownership invariant
    await expect(
      academicYearRepository.update(yearA.id, { schoolId: schoolB })
    ).rejects.toThrow(/Academic year schoolId cannot be changed after creation/i);

    const reloadedYearA = await academicYearRepository.getById(yearA.id);
    expect(reloadedYearA?.schoolId).toBe(schoolA);
    expect(reloadedYearA?.isCurrent).toBe(true);
  });

  it('guarantees no school can have two current years after create or update (Test C)', async () => {
    const testSchool = 'school-single-current-check';
    await db.schools.add({
      id: testSchool,
      name: 'CEM Test',
      commune: 'Setif',
      wilaya: '19',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. Create first current year
    await academicYearRepository.create({
      id: 'year-c-1',
      schoolId: testSchool,
      label: '2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let currentCount = await db.academicYears.where('schoolId').equals(testSchool).and((y) => Boolean(y.isCurrent)).count();
    expect(currentCount).toBe(1);

    // 2. Create second current year -> demotes first
    await academicYearRepository.create({
      id: 'year-c-2',
      schoolId: testSchool,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    currentCount = await db.academicYears.where('schoolId').equals(testSchool).and((y) => Boolean(y.isCurrent)).count();
    expect(currentCount).toBe(1);
    expect((await academicYearRepository.getCurrent(testSchool))?.id).toBe('year-c-2');

    // 3. Create non-current year then update it to current -> demotes previous
    await academicYearRepository.create({
      id: 'year-c-3',
      schoolId: testSchool,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: false,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await academicYearRepository.update('year-c-3', { isCurrent: true });

    currentCount = await db.academicYears.where('schoolId').equals(testSchool).and((y) => Boolean(y.isCurrent)).count();
    expect(currentCount).toBe(1);
    expect((await academicYearRepository.getCurrent(testSchool))?.id).toBe('year-c-3');
  });

  it('rejects adding new classes to an archived academic year', async () => {
    const archivedYear: AcademicYear = {
      id: 'year-archived-1',
      schoolId,
      label: '2023-2024',
      startDate: '2023-09-01',
      endDate: '2024-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(archivedYear);

    const newClass: SchoolClass = {
      id: 'class-test-archived',
      schoolId,
      academicYearId: archivedYear.id,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(classRepository.create(newClass)).rejects.toThrow(
      'Cannot add new classes to an archived academic year.'
    );
  });

  it('rejects student enrollments in an archived academic year', async () => {
    const archivedYear: AcademicYear = {
      id: 'year-archived-2',
      schoolId,
      label: '2023-2024',
      startDate: '2023-09-01',
      endDate: '2024-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(archivedYear);

    const student: StudentPerson = {
      id: 'student-p-1',
      firstNameLatin: 'Amina',
      lastNameLatin: 'Bensalem',
      gender: 'F',
      dateOfBirth: '2012-05-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(student);

    const archivedClass: SchoolClass = {
      id: 'class-in-archived-year',
      schoolId,
      academicYearId: archivedYear.id,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.classes.add(archivedClass);

    const enrollment: StudentEnrollment = {
      id: 'enrollment-1',
      studentPersonId: student.id,
      academicYearId: archivedYear.id,
      classId: archivedClass.id,
      status: 'active',
      isRepeating: false,
      registerNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(studentEnrollmentRepository.create(enrollment)).rejects.toThrow(
      'Cannot enroll students in an archived academic year.'
    );
  });

  it('rejects adding assessments or grades to an archived academic year', async () => {
    const archivedYear: AcademicYear = {
      id: 'year-archived-3',
      schoolId,
      label: '2023-2024',
      startDate: '2023-09-01',
      endDate: '2024-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(archivedYear);

    await expect(
      assessmentRepository.create({
        id: 'assessment-test-archived',
        academicYearId: archivedYear.id,
        classId: 'class-test',
        gradingSchemeId: 'scheme-dz-ms-official',
        componentKey: 'term_test',
        title: 'Test 1',
        termNumber: 1,
        date: '2023-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).rejects.toThrow('Cannot add assessments to an archived academic year.');
  });
});
