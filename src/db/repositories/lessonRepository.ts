/**
 * UNS SCHOOL — Lesson Repository
 * Primary authoritative source of truth for pedagogical execution and attendance anchoring.
 */

import { db } from '../database';
import type { Lesson } from '../../types';

export const lessonRepository = {
  async getById(id: string): Promise<Lesson | undefined> {
    return await db.lessons.get(id);
  },

  async listByClass(classId: string): Promise<Lesson[]> {
    return await db.lessons.where('classId').equals(classId).sortBy('date');
  },

  async listByDate(date: string): Promise<Lesson[]> {
    return await db.lessons.where('date').equals(date).sortBy('startTime');
  },

  async listByAcademicYear(academicYearId: string): Promise<Lesson[]> {
    return await db.lessons.where('academicYearId').equals(academicYearId).toArray();
  },

  async create(lesson: Lesson): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.lessons, db.academicYears, db.classes, db.curriculumVersions, db.curriculumLevels], async () => {
      const year = await db.academicYears.get(lesson.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${lesson.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add lessons to an archived academic year.');
      }

      const schoolClass = await db.classes.get(lesson.classId);
      if (!schoolClass) {
        throw new Error(`Class with id ${lesson.classId} does not exist.`);
      }

      if (schoolClass.academicYearId !== lesson.academicYearId) {
        throw new Error(`Class ${lesson.classId} does not belong to academic year ${lesson.academicYearId}.`);
      }

      const curriculum = await db.curriculumVersions.get(lesson.curriculumVersionId);
      if (!curriculum) {
        throw new Error(`Curriculum version with id ${lesson.curriculumVersionId} does not exist.`);
      }

      if (lesson.levelCode && schoolClass.levelCode && lesson.levelCode !== schoolClass.levelCode) {
        throw new Error(`Lesson level ${lesson.levelCode} does not match class level ${schoolClass.levelCode}.`);
      }

      const levelConfigCount = await db.curriculumLevels
        .where('curriculumVersionId')
        .equals(lesson.curriculumVersionId)
        .count();
      if (levelConfigCount > 0 && lesson.levelCode) {
        const matchingLevel = await db.curriculumLevels
          .where('[curriculumVersionId+levelCode]')
          .equals([lesson.curriculumVersionId, lesson.levelCode])
          .first();
        if (!matchingLevel) {
          throw new Error(`Curriculum version ${lesson.curriculumVersionId} does not support level ${lesson.levelCode}.`);
        }
      }

      await db.lessons.add({
        ...lesson,
        createdAt: lesson.createdAt || now,
        updatedAt: now,
      });

      return lesson.id;
    });
  },

  async update(id: string, updates: Partial<Lesson>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.lessons, db.attendance, db.academicYears, db.classes, db.curriculumVersions, db.curriculumLevels], async () => {
      const existing = await db.lessons.get(id);
      if (!existing) {
        throw new Error(`Lesson with id ${id} not found.`);
      }

      const existingYear = await db.academicYears.get(existing.academicYearId);
      if (existingYear?.isArchived) {
        throw new Error('Cannot modify lessons in an archived academic year.');
      }

      const isChangingClass = updates.classId !== undefined && updates.classId !== existing.classId;
      const isChangingYear = updates.academicYearId !== undefined && updates.academicYearId !== existing.academicYearId;

      if (isChangingClass || isChangingYear) {
        const attendanceCount = await db.attendance.where('lessonId').equals(id).count();
        if (attendanceCount > 0) {
          throw new Error('Cannot change class or academic year for a lesson that already has attendance records.');
        }
      }

      const isChangingRelationships =
        updates.academicYearId !== undefined ||
        updates.classId !== undefined ||
        updates.curriculumVersionId !== undefined ||
        updates.levelCode !== undefined;

      if (isChangingRelationships) {
        const targetYearId = updates.academicYearId ?? existing.academicYearId;
        const targetClassId = updates.classId ?? existing.classId;
        const targetCurriculumVersionId = updates.curriculumVersionId ?? existing.curriculumVersionId;
        const targetLevelCode = updates.levelCode ?? existing.levelCode;

        const targetYear = await db.academicYears.get(targetYearId);
        if (!targetYear) {
          throw new Error(`Academic year with id ${targetYearId} does not exist.`);
        }
        if (targetYear.isArchived) {
          throw new Error('Cannot modify lessons in an archived academic year.');
        }

        const targetClass = await db.classes.get(targetClassId);
        if (!targetClass) {
          throw new Error(`Class with id ${targetClassId} does not exist.`);
        }

        if (targetClass.academicYearId !== targetYearId) {
          throw new Error(`Class ${targetClassId} does not belong to academic year ${targetYearId}.`);
        }

        const curriculum = await db.curriculumVersions.get(targetCurriculumVersionId);
        if (!curriculum) {
          throw new Error(`Curriculum version with id ${targetCurriculumVersionId} does not exist.`);
        }

        if (targetLevelCode && targetClass.levelCode && targetLevelCode !== targetClass.levelCode) {
          throw new Error(`Lesson level ${targetLevelCode} does not match class level ${targetClass.levelCode}.`);
        }

        const levelConfigCount = await db.curriculumLevels
          .where('curriculumVersionId')
          .equals(targetCurriculumVersionId)
          .count();
        if (levelConfigCount > 0 && targetLevelCode) {
          const matchingLevel = await db.curriculumLevels
            .where('[curriculumVersionId+levelCode]')
            .equals([targetCurriculumVersionId, targetLevelCode])
            .first();
          if (!matchingLevel) {
            throw new Error(`Curriculum version ${targetCurriculumVersionId} does not support level ${targetLevelCode}.`);
          }
        }
      }

      // If lesson date was updated, synchronize all anchored attendance records
      if (updates.date && updates.date !== existing.date) {
        const linkedAttendance = await db.attendance.where('lessonId').equals(id).toArray();
        for (const record of linkedAttendance) {
          await db.attendance.update(record.id, { date: updates.date, updatedAt: now });
        }
      }

      await db.lessons.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async delete(id: string): Promise<void> {
    // Atomic cascade: delete lesson and linked attendance records
    await db.transaction('rw', [db.lessons, db.attendance, db.academicYears], async () => {
      const existing = await db.lessons.get(id);
      if (!existing) return;

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete lessons in an archived academic year.');
      }

      await db.attendance.where('lessonId').equals(id).delete();
      await db.lessons.delete(id);
    });
  },

  async countByAcademicYear(academicYearId: string): Promise<number> {
    return await db.lessons.where('academicYearId').equals(academicYearId).count();
  },
};
