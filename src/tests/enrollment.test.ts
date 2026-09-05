import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  studentEnrollmentRepository,
  classRepository,
  academicYearRepository,
} from '../db/repositories';
import type { AcademicYear, SchoolClass, StudentPerson, StudentEnrollment } from '../types';

describe('Student Enrollment Invariants', () => {
  const schoolId = 'school-dz-test-enroll';
  const academicYearId = 'year-test-active';
  const classId = 'class-1am-1';

  beforeEach(async () => {
    await db.grades.clear();
    await db.attendance.clear();
    await db.studentEnrollments.clear();
    await db.studentPersons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();

    await db.schools.add({
      id: schoolId,
      name: 'CEM Test School',
      commune: 'Oran',
      wilaya: '31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeYear: AcademicYear = {
      id: academicYearId,
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
    await academicYearRepository.create(activeYear);

    const schoolClass: SchoolClass = {
      id: classId,
      schoolId,
      academicYearId,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(schoolClass);
  });

  it('rejects duplicate registerNumberInClass in the same class', async () => {
    const student1: StudentPerson = {
      id: 'student-1',
      firstNameLatin: 'Yacine',
      lastNameLatin: 'Brahimi',
      gender: 'M',
      dateOfBirth: '2013-02-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const student2: StudentPerson = {
      id: 'student-2',
      firstNameLatin: 'Riyad',
      lastNameLatin: 'Mahrez',
      gender: 'M',
      dateOfBirth: '2013-03-20',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.bulkAdd([student1, student2]);

    const enrollment1: StudentEnrollment = {
      id: 'enroll-1',
      studentPersonId: student1.id,
      academicYearId,
      classId,
      status: 'active',
      isRepeating: false,
      registerNumber: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentEnrollmentRepository.create(enrollment1);

    const enrollment2: StudentEnrollment = {
      id: 'enroll-2',
      studentPersonId: student2.id,
      academicYearId,
      classId,
      status: 'active',
      isRepeating: false,
      registerNumber: 5, // Duplicate!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(studentEnrollmentRepository.create(enrollment2)).rejects.toThrow(
      'already taken in this class'
    );
  });

  it('rejects duplicate active enrollment for the same student in the same year', async () => {
    const class2Id = 'class-1am-2';
    await classRepository.create({
      id: class2Id,
      schoolId,
      academicYearId,
      levelCode: '1MS',
      name: '1MS 2',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const student: StudentPerson = {
      id: 'student-single',
      firstNameLatin: 'Sofia',
      lastNameLatin: 'Dahmani',
      gender: 'F',
      dateOfBirth: '2013-07-11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(student);

    await studentEnrollmentRepository.create({
      id: 'enroll-sofia-1',
      studentPersonId: student.id,
      academicYearId,
      classId,
      status: 'active',
      isRepeating: false,
      registerNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Attempting to enroll Sofia as active in a second class in the same year must be rejected
    await expect(
      studentEnrollmentRepository.create({
        id: 'enroll-sofia-2',
        studentPersonId: student.id,
        academicYearId,
        classId: class2Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).rejects.toThrow('already actively enrolled');
  });

  it('allows changing status from active to transferred_out and permits new enrollment', async () => {
    const student: StudentPerson = {
      id: 'student-transfer',
      firstNameLatin: 'Karim',
      lastNameLatin: 'Ziani',
      gender: 'M',
      dateOfBirth: '2013-08-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(student);

    const initialEnrollmentId = 'enroll-karim-1';
    await studentEnrollmentRepository.create({
      id: initialEnrollmentId,
      studentPersonId: student.id,
      academicYearId,
      classId,
      status: 'active',
      isRepeating: false,
      registerNumber: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mark as transferred_out
    await studentEnrollmentRepository.changeStatus(initialEnrollmentId, 'transferred_out', 'Family relocation');

    const updated = await studentEnrollmentRepository.getById(initialEnrollmentId);
    expect(updated?.status).toBe('transferred_out');
    expect(updated?.statusChangeReason).toBe('Family relocation');
    expect(updated?.statusChangeDate).toBeDefined();
  });
});
