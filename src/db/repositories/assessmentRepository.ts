/**
 * UNS SCHOOL — Assessment Repository
 * Manages assessment definitions, grading component bindings, and historical snapshot preservation.
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

  async listByAcademicYear(academicYearId: string): Promise<Assessment[]> {
    return await db.assessments.where('academicYearId').equals(academicYearId).sortBy('date');
  },

  async getById(id: string): Promise<Assessment | undefined> {
    return await db.assessments.get(id);
  },

  async create(assessment: Assessment): Promise<string> {
    const now = new Date().toISOString();

    // Field-level validation
    if (!assessment.title || assessment.title.trim().length === 0) {
      throw new Error('Assessment title is required and cannot be empty.');
    }
    if (!assessment.date || !/^\d{4}-\d{2}-\d{2}$/.test(assessment.date)) {
      throw new Error('Assessment date must be in YYYY-MM-DD format.');
    }
    if (typeof assessment.maxScore !== 'number' || assessment.maxScore <= 0) {
      throw new Error('Assessment maximum score must be a positive number.');
    }
    if (typeof assessment.coefficient !== 'number' || assessment.coefficient <= 0) {
      throw new Error('Assessment coefficient must be a positive number.');
    }
    if (![1, 2, 3].includes(assessment.termNumber)) {
      throw new Error('Assessment term number must be 1, 2, or 3.');
    }

    return await db.transaction(
      'rw',
      [db.assessments, db.academicYears, db.classes, db.gradingSchemes, db.curriculumSequences],
      async () => {
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
        if (targetClass.isArchived) {
          throw new Error('Cannot add assessments to an archived class.');
        }
        if (targetClass.academicYearId !== assessment.academicYearId) {
          throw new Error(`Class ${assessment.classId} does not belong to academic year ${assessment.academicYearId}.`);
        }

        const scheme = await db.gradingSchemes.get(assessment.gradingSchemeId);
        if (!scheme) {
          throw new Error(`Grading scheme with id ${assessment.gradingSchemeId} does not exist.`);
        }
        if (scheme.academicYearId && scheme.academicYearId !== assessment.academicYearId) {
          throw new Error(
            `Grading scheme ${assessment.gradingSchemeId} belongs to academic year ${scheme.academicYearId}, not ${assessment.academicYearId}.`
          );
        }

        // Validate or extract component snapshot for historical reproducibility
        const matchingComponent = scheme.components.find((c) => c.componentKey === assessment.componentKey);
        const componentSnapshot = assessment.componentSnapshot || matchingComponent;

        // If curriculum sequence is specified, verify it exists and matches class level
        if (assessment.curriculumSequenceId) {
          const sequence = await db.curriculumSequences.get(assessment.curriculumSequenceId);
          if (!sequence) {
            throw new Error(`Curriculum sequence with id ${assessment.curriculumSequenceId} does not exist.`);
          }
          if (sequence.levelCode !== targetClass.levelCode) {
            throw new Error(
              `Curriculum sequence level (${sequence.levelCode}) does not match class level (${targetClass.levelCode}).`
            );
          }
        }

        await db.assessments.add({
          ...assessment,
          title: assessment.title.trim(),
          componentSnapshot,
          createdAt: assessment.createdAt || now,
          updatedAt: now,
        });

        return assessment.id;
      }
    );
  },

  async update(id: string, updates: Partial<Assessment>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction(
      'rw',
      [db.assessments, db.grades, db.academicYears, db.classes, db.gradingSchemes, db.curriculumSequences],
      async () => {
        const existing = await db.assessments.get(id);
        if (!existing) {
          throw new Error(`Assessment with id ${id} not found.`);
        }

        const year = await db.academicYears.get(existing.academicYearId);
        if (year?.isArchived) {
          throw new Error('Cannot modify assessments in an archived academic year.');
        }

        const existingClass = await db.classes.get(existing.classId);
        if (existingClass?.isArchived) {
          throw new Error('Cannot modify assessments in an archived class.');
        }

        if (existing.isLocked && updates.isLocked !== false && updates.isLocked !== undefined && updates.isLocked) {
          // It was locked and remains locked
          throw new Error('This assessment is locked and cannot be edited.');
        }
        if (existing.isLocked && updates.isLocked === undefined) {
          throw new Error('This assessment is locked and cannot be edited.');
        }

        if (updates.title !== undefined && updates.title.trim().length === 0) {
          throw new Error('Assessment title cannot be empty.');
        }
        if (updates.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
          throw new Error('Assessment date must be in YYYY-MM-DD format.');
        }
        if (updates.maxScore !== undefined && (typeof updates.maxScore !== 'number' || updates.maxScore <= 0)) {
          throw new Error('Assessment maximum score must be a positive number.');
        }
        if (updates.coefficient !== undefined && (typeof updates.coefficient !== 'number' || updates.coefficient <= 0)) {
          throw new Error('Assessment coefficient must be a positive number.');
        }
        if (updates.termNumber !== undefined && ![1, 2, 3].includes(updates.termNumber)) {
          throw new Error('Assessment term number must be 1, 2, or 3.');
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
          if (targetClass.isArchived) {
            throw new Error('Cannot modify assessments to an archived class.');
          }
          if (targetClass.academicYearId !== targetYearId) {
            throw new Error(`Class ${targetClassId} does not belong to academic year ${targetYearId}.`);
          }

          const targetScheme = await db.gradingSchemes.get(targetSchemeId);
          if (!targetScheme) {
            throw new Error(`Grading scheme with id ${targetSchemeId} does not exist.`);
          }
          if (targetScheme.academicYearId && targetScheme.academicYearId !== targetYearId) {
            throw new Error(
              `Grading scheme ${targetSchemeId} belongs to academic year ${targetScheme.academicYearId}, not ${targetYearId}.`
            );
          }
        }

        // Check if updating maxScore would invalidate existing recorded grades
        if (updates.maxScore !== undefined && updates.maxScore < existing.maxScore) {
          const grades = await db.grades.where('assessmentId').equals(id).toArray();
          const violatingGrade = grades.find((g) => g.score !== null && g.score > updates.maxScore!);
          if (violatingGrade) {
            throw new Error(
              `Cannot reduce maximum score to ${updates.maxScore}: student has recorded grade of ${violatingGrade.score}.`
            );
          }
        }

        const trimmedUpdates = { ...updates };
        if (trimmedUpdates.title) {
          trimmedUpdates.title = trimmedUpdates.title.trim();
        }

        await db.assessments.update(id, {
          ...trimmedUpdates,
          updatedAt: now,
        });
      }
    );
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.assessments, db.grades, db.academicYears, db.classes], async () => {
      const existing = await db.assessments.get(id);
      if (!existing) return;

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete assessments in an archived academic year.');
      }

      const targetClass = await db.classes.get(existing.classId);
      if (targetClass?.isArchived) {
        throw new Error('Cannot delete assessments in an archived class.');
      }

      if (existing.isLocked) {
        throw new Error('Cannot delete a locked assessment.');
      }

      // Cascade delete associated grades
      await db.grades.where('assessmentId').equals(id).delete();
      await db.assessments.delete(id);
    });
  },

  async lockAssessment(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.assessments, db.academicYears], async () => {
      const existing = await db.assessments.get(id);
      if (!existing) {
        throw new Error(`Assessment with id ${id} not found.`);
      }
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot lock assessments in an archived academic year.');
      }
      await db.assessments.update(id, { isLocked: true, updatedAt: now });
    });
  },

  async unlockAssessment(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.assessments, db.academicYears], async () => {
      const existing = await db.assessments.get(id);
      if (!existing) {
        throw new Error(`Assessment with id ${id} not found.`);
      }
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot unlock assessments in an archived academic year.');
      }
      await db.assessments.update(id, { isLocked: false, updatedAt: now });
    });
  },
};

