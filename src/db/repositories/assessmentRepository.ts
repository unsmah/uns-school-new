/**
 * UNS SCHOOL — Assessment Repository
 */

import { db } from '../database';
import type { Assessment } from '../../types';

export const assessmentRepository = {
  async listByClassAndTerm(classId: string, termNumber: 1 | 2 | 3): Promise<Assessment[]> {
    return await db.assessments
      .where('classId')
      .equals(classId)
      .and((a) => a.termNumber === termNumber)
      .sortBy('date');
  },

  async listByClass(classId: string): Promise<Assessment[]> {
    return await db.assessments.where('classId').equals(classId).sortBy('date');
  },

  async getById(id: string): Promise<Assessment | undefined> {
    return await db.assessments.get(id);
  },

  async create(assessment: Assessment): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.assessments, db.academicYears, db.classes, db.gradingSchemes], async () => {
      const year = await db.academicYears.get(assessment.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${assessment.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add assessments to an archived academic year.');
      }

      const targetClass = await db.classes.get(assessment.classId);
      if (!targetClass) {
        throw new Error(`Class with id ${assessment.classId} does not exist.`);
      }

      if (targetClass.academicYearId !== assessment.academicYearId) {
        throw new Error(`Class ${assessment.classId} does not belong to academic year ${assessment.academicYearId}.`);
      }

      const scheme = await db.gradingSchemes.get(assessment.gradingSchemeId);
      if (!scheme) {
        throw new Error(`Grading scheme with id ${assessment.gradingSchemeId} does not exist.`);
      }

      if (scheme.academicYearId && scheme.academicYearId !== assessment.academicYearId) {
        throw new Error(`Grading scheme ${assessment.gradingSchemeId} belongs to academic year ${scheme.academicYearId}, not ${assessment.academicYearId}.`);
      }

      await db.assessments.add({
        ...assessment,
        createdAt: assessment.createdAt || now,
        updatedAt: now,
      });

      return assessment.id;
    });
  },

  async update(id: string, updates: Partial<Assessment>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.assessments, db.grades, db.academicYears, db.classes, db.gradingSchemes], async () => {
      const existing = await db.assessments.get(id);
      if (!existing) {
        throw new Error(`Assessment with id ${id} not found.`);
      }

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify assessments in an archived academic year.');
      }

      if (existing.isLocked && !updates.isLocked) {
        throw new Error('This assessment is locked and cannot be edited.');
      }

      const isChangingClass = updates.classId !== undefined && updates.classId !== existing.classId;
      const isChangingYear = updates.academicYearId !== undefined && updates.academicYearId !== existing.academicYearId;
      const isChangingScheme = updates.gradingSchemeId !== undefined && updates.gradingSchemeId !== existing.gradingSchemeId;

      if (isChangingClass || isChangingYear || isChangingScheme) {
        const gradeCount = await db.grades.where('assessmentId').equals(id).count();
        if (gradeCount > 0) {
          throw new Error('Cannot change class, academic year, or grading scheme for an assessment with existing grades.');
        }

        const targetYearId = updates.academicYearId ?? existing.academicYearId;
        const targetClassId = updates.classId ?? existing.classId;
        const targetSchemeId = updates.gradingSchemeId ?? existing.gradingSchemeId;

        const targetYear = await db.academicYears.get(targetYearId);
        if (!targetYear) {
          throw new Error(`Academic year with id ${targetYearId} does not exist.`);
        }
        if (targetYear.isArchived) {
          throw new Error('Cannot modify assessments in an archived academic year.');
        }

        const targetClass = await db.classes.get(targetClassId);
        if (!targetClass) {
          throw new Error(`Class with id ${targetClassId} does not exist.`);
        }
        if (targetClass.academicYearId !== targetYearId) {
          throw new Error(`Class ${targetClassId} does not belong to academic year ${targetYearId}.`);
        }

        const targetScheme = await db.gradingSchemes.get(targetSchemeId);
        if (!targetScheme) {
          throw new Error(`Grading scheme with id ${targetSchemeId} does not exist.`);
        }
        if (targetScheme.academicYearId && targetScheme.academicYearId !== targetYearId) {
          throw new Error(`Grading scheme ${targetSchemeId} belongs to academic year ${targetScheme.academicYearId}, not ${targetYearId}.`);
        }
      }

      await db.assessments.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.assessments, db.grades, db.academicYears], async () => {
      const existing = await db.assessments.get(id);
      if (!existing) return;

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete assessments in an archived academic year.');
      }

      if (existing.isLocked) {
        throw new Error('Cannot delete a locked assessment.');
      }

      // Cascade delete associated grades
      await db.grades.where('assessmentId').equals(id).delete();
      await db.assessments.delete(id);
    });
  },
};
