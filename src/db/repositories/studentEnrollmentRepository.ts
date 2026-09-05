/**
 * UNS SCHOOL — Student Enrollment Repository
 * Enforces single active enrollment per academic year and class register number uniqueness.
 */

import { db } from '../database';
import type { StudentEnrollment, StudentPerson } from '../../types';

export interface EnrolledStudentItem {
  enrollment: StudentEnrollment;
  person: StudentPerson;
}

export const studentEnrollmentRepository = {
  async listByClass(classId: string): Promise<EnrolledStudentItem[]> {
    const enrollments = await db.studentEnrollments
      .where('classId')
      .equals(classId)
      .toArray();

    enrollments.sort((a, b) => a.registerNumber - b.registerNumber);

    const result: EnrolledStudentItem[] = [];
    for (const enrollment of enrollments) {
      const person = await db.studentPersons.get(enrollment.studentPersonId);
      if (person) {
        result.push({ enrollment, person });
      }
    }
    return result;
  },

  async listByAcademicYear(academicYearId: string): Promise<StudentEnrollment[]> {
    return await db.studentEnrollments.where('academicYearId').equals(academicYearId).toArray();
  },

  async listByStudent(studentPersonId: string): Promise<StudentEnrollment[]> {
    return await db.studentEnrollments
      .where('studentPersonId')
      .equals(studentPersonId)
      .toArray();
  },

  async getById(id: string): Promise<StudentEnrollment | undefined> {
    return await db.studentEnrollments.get(id);
  },

  async enroll(enrollment: StudentEnrollment): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.studentEnrollments, db.studentPersons, db.academicYears, db.classes], async () => {
      // 1. Verify student person exists
      const person = await db.studentPersons.get(enrollment.studentPersonId);
      if (!person) {
        throw new Error(`Student person with id ${enrollment.studentPersonId} does not exist.`);
      }

      // 2. Verify academic year exists and is not archived
      const year = await db.academicYears.get(enrollment.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${enrollment.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot enroll students in an archived academic year.');
      }

      // 3. Verify class exists
      const schoolClass = await db.classes.get(enrollment.classId);
      if (!schoolClass) {
        throw new Error(`Class with id ${enrollment.classId} does not exist.`);
      }
      if (schoolClass.isArchived) {
        throw new Error('Cannot enroll students in an archived class.');
      }

      // 4. Verify class/year relationship and school consistency
      if (schoolClass.academicYearId !== enrollment.academicYearId) {
        throw new Error(`Class ${enrollment.classId} does not belong to academic year ${enrollment.academicYearId}.`);
      }
      if (schoolClass.schoolId !== year.schoolId) {
        throw new Error(`Class schoolId does not match AcademicYear schoolId.`);
      }

      // 5. Enforce: One active enrollment per academic year per person
      if (enrollment.status === 'active') {
        const existingInYear = await db.studentEnrollments
          .where('academicYearId')
          .equals(enrollment.academicYearId)
          .and((e) => e.studentPersonId === enrollment.studentPersonId && e.status === 'active' && e.id !== enrollment.id)
          .first();

        if (existingInYear) {
          throw new Error('Student is already actively enrolled in this academic year. Transfer rather than re-enroll.');
        }
      }

      // 6. Enforce: Register number must be unique in this class
      const existingRegNum = await db.studentEnrollments
        .where('classId')
        .equals(enrollment.classId)
        .and((e) => e.registerNumber === enrollment.registerNumber && e.id !== enrollment.id)
        .first();

      if (existingRegNum) {
        throw new Error(`Register number ${enrollment.registerNumber} is already taken in this class.`);
      }

      await db.studentEnrollments.add({
        ...enrollment,
        createdAt: enrollment.createdAt || now,
        updatedAt: now,
      });

      return enrollment.id;
    });
  },

  async create(enrollment: StudentEnrollment): Promise<string> {
    return await this.enroll(enrollment);
  },

  async update(id: string, updates: Partial<StudentEnrollment>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.studentEnrollments, db.studentPersons, db.academicYears, db.classes], async () => {
      const existing = await db.studentEnrollments.get(id);
      if (!existing) {
        throw new Error(`Enrollment with id ${id} not found.`);
      }

      const existingYear = await db.academicYears.get(existing.academicYearId);
      if (existingYear?.isArchived) {
        throw new Error('Cannot modify enrollment in an archived academic year.');
      }

      const targetStudentPersonId = updates.studentPersonId ?? existing.studentPersonId;
      const targetAcademicYearId = updates.academicYearId ?? existing.academicYearId;
      const targetClassId = updates.classId ?? existing.classId;
      const targetStatus = updates.status ?? existing.status;
      const targetRegisterNumber = updates.registerNumber ?? existing.registerNumber;

      const hasCriticalFieldInUpdates =
        updates.studentPersonId !== undefined ||
        updates.academicYearId !== undefined ||
        updates.classId !== undefined ||
        updates.status !== undefined ||
        updates.registerNumber !== undefined;

      if (hasCriticalFieldInUpdates) {
        // 1. Verify student person exists
        const person = await db.studentPersons.get(targetStudentPersonId);
        if (!person) {
          throw new Error(`Student person with id ${targetStudentPersonId} does not exist.`);
        }

        // 2. Verify academic year exists and is not archived
        const targetYear = await db.academicYears.get(targetAcademicYearId);
        if (!targetYear) {
          throw new Error(`Academic year with id ${targetAcademicYearId} does not exist.`);
        }
        if (targetYear.isArchived) {
          throw new Error('Cannot enroll students in an archived academic year.');
        }

        // 3. Verify class exists
        const targetClass = await db.classes.get(targetClassId);
        if (!targetClass) {
          throw new Error(`Class with id ${targetClassId} does not exist.`);
        }
        if (targetClass.isArchived) {
          throw new Error('Cannot enroll students in an archived class.');
        }

        // 4. Verify class/year relationship and school consistency
        if (targetClass.academicYearId !== targetAcademicYearId) {
          throw new Error(`Class ${targetClassId} does not belong to academic year ${targetAcademicYearId}.`);
        }
        if (targetClass.schoolId !== targetYear.schoolId) {
          throw new Error(`Class schoolId does not match AcademicYear schoolId.`);
        }

        // 5. Active enrollment uniqueness
        if (targetStatus === 'active') {
          const duplicateActive = await db.studentEnrollments
            .where('academicYearId')
            .equals(targetAcademicYearId)
            .and((e) => e.studentPersonId === targetStudentPersonId && e.status === 'active' && e.id !== id)
            .first();

          if (duplicateActive) {
            throw new Error('Student already has an active enrollment in this academic year.');
          }
        }

        // 6. Register number uniqueness in target class
        const duplicateRegNum = await db.studentEnrollments
          .where('classId')
          .equals(targetClassId)
          .and((e) => e.registerNumber === targetRegisterNumber && e.id !== id)
          .first();

        if (duplicateRegNum) {
          throw new Error(`Register number ${targetRegisterNumber} is already taken in this class.`);
        }
      }

      await db.studentEnrollments.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async changeStatus(id: string, status: StudentEnrollment['status'], reason?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.update(id, {
      status,
      statusChangeDate: now.split('T')[0],
      statusChangeReason: reason,
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.studentEnrollments, db.academicYears, db.attendance, db.grades], async () => {
      const existing = await db.studentEnrollments.get(id);
      if (!existing) return;
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete enrollment from an archived academic year.');
      }
      const hasAttendance = await db.attendance.where('studentEnrollmentId').equals(id).count();
      const hasGrades = await db.grades.where('studentEnrollmentId').equals(id).count();
      if (hasAttendance > 0 || hasGrades > 0) {
        throw new Error('Cannot delete enrollment with existing attendance or grade records. Mark as withdrawn or transferred instead.');
      }
      await db.studentEnrollments.delete(id);
    });
  },
};
