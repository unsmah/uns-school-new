/**
 * UNS SCHOOL — Grade Entry Repository
 * Manages assessment scores with atomic uniqueness per [assessmentId+studentEnrollmentId].
 */

import { db } from '../database';
import type { GradeEntry } from '../../types';

export const gradeRepository = {
  async listByAssessment(assessmentId: string): Promise<GradeEntry[]> {
    return await db.grades.where('assessmentId').equals(assessmentId).toArray();
  },

  async listByStudent(studentEnrollmentId: string): Promise<GradeEntry[]> {
    return await db.grades.where('studentEnrollmentId').equals(studentEnrollmentId).toArray();
  },

  async getGrade(assessmentId: string, studentEnrollmentId: string): Promise<GradeEntry | undefined> {
    return await db.grades
      .where('assessmentId')
      .equals(assessmentId)
      .and((g) => g.studentEnrollmentId === studentEnrollmentId)
      .first();
  },

  async saveBatch(assessmentId: string, entries: GradeEntry[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.grades, db.assessments, db.academicYears, db.studentEnrollments], async () => {
      // 1. Verify parent assessment exists and is not locked
      const assessment = await db.assessments.get(assessmentId);
      if (!assessment) {
        throw new Error(`Assessment with id ${assessmentId} does not exist.`);
      }
      if (assessment.isLocked) {
        throw new Error('Assessment is locked. Cannot modify grades.');
      }

      // 2. Verify academic year is not archived
      const year = await db.academicYears.get(assessment.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify grades in an archived academic year.');
      }

      // 3. Upsert entries preventing duplicates per [assessmentId+studentEnrollmentId]
      for (const entry of entries) {
        const enrollment = await db.studentEnrollments.get(entry.studentEnrollmentId);
        if (!enrollment) {
          throw new Error(`Student enrollment with id ${entry.studentEnrollmentId} does not exist.`);
        }

        if (enrollment.classId !== assessment.classId) {
          throw new Error(`Enrollment ${entry.studentEnrollmentId} does not belong to assessment class ${assessment.classId}.`);
        }

        if (enrollment.academicYearId !== assessment.academicYearId) {
          throw new Error(`Enrollment ${entry.studentEnrollmentId} does not belong to assessment academic year ${assessment.academicYearId}.`);
        }

        if (entry.score !== null && entry.score !== undefined) {
          if (entry.score < 0 || entry.score > assessment.maxScore) {
            throw new Error(`Grade score ${entry.score} exceeds bounds (0 to ${assessment.maxScore}).`);
          }
        }

        const existing = await db.grades
          .where('assessmentId')
          .equals(assessmentId)
          .and((g) => g.studentEnrollmentId === entry.studentEnrollmentId)
          .first();

        if (existing) {
          await db.grades.update(existing.id, {
            score: entry.score,
            isAbsent: entry.isAbsent,
            isMedicalExemption: entry.isMedicalExemption,
            teacherRemarks: entry.teacherRemarks,
            updatedAt: now,
          });
        } else {
          await db.grades.add({
            ...entry,
            assessmentId,
            updatedAt: now,
          });
        }
      }
    });
  },

  async recordGrade(entry: GradeEntry): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.grades, db.assessments, db.academicYears, db.studentEnrollments], async () => {
      const assessment = await db.assessments.get(entry.assessmentId);
      if (!assessment) {
        throw new Error(`Assessment with id ${entry.assessmentId} does not exist.`);
      }
      if (assessment.isLocked) {
        throw new Error('Assessment is locked. Cannot modify grades.');
      }
      const year = await db.academicYears.get(assessment.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify grades in an archived academic year.');
      }

      const enrollment = await db.studentEnrollments.get(entry.studentEnrollmentId);
      if (!enrollment) {
        throw new Error(`Student enrollment with id ${entry.studentEnrollmentId} does not exist.`);
      }

      if (enrollment.classId !== assessment.classId) {
        throw new Error(`Enrollment ${entry.studentEnrollmentId} does not belong to assessment class ${assessment.classId}.`);
      }

      if (enrollment.academicYearId !== assessment.academicYearId) {
        throw new Error(`Enrollment ${entry.studentEnrollmentId} does not belong to assessment academic year ${assessment.academicYearId}.`);
      }

      if (entry.score !== null && entry.score !== undefined) {
        if (entry.score < 0 || entry.score > assessment.maxScore) {
          throw new Error(`Grade score ${entry.score} exceeds bounds (0 to ${assessment.maxScore}).`);
        }
      }

      const existing = await db.grades
        .where('assessmentId')
        .equals(entry.assessmentId)
        .and((g) => g.studentEnrollmentId === entry.studentEnrollmentId)
        .first();

      if (existing) {
        throw new Error(`Grade entry already exists for student ${entry.studentEnrollmentId} in assessment ${entry.assessmentId}.`);
      }

      await db.grades.add({
        ...entry,
        updatedAt: now,
      });

      return entry.id;
    });
  },

  async saveSingle(entry: GradeEntry): Promise<void> {
    await this.saveBatch(entry.assessmentId, [entry]);
  },
};
