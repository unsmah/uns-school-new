/**
 * UNS SCHOOL — Lesson Repository
 * Primary authoritative source of truth for pedagogical execution and attendance anchoring.
 * Enforces school-academic year consistency, non-archived checks,
 * class-level alignment, atomic date synchronization, and cascade deletion.
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

  async listByClassAndAcademicYear(classId: string, academicYearId: string): Promise<Lesson[]> {
    return await db.lessons
      .where('classId')
      .equals(classId)
      .and((l) => l.academicYearId === academicYearId)
      .sortBy('date');
  },

  async listByDate(date: string): Promise<Lesson[]> {
    return await db.lessons.where('date').equals(date).sortBy('startTime');
  },

  async listByDateAndAcademicYear(date: string, academicYearId: string): Promise<Lesson[]> {
    return await db.lessons
      .where('date')
      .equals(date)
      .and((l) => l.academicYearId === academicYearId)
      .sortBy('startTime');
  },

  async listByAcademicYear(academicYearId: string): Promise<Lesson[]> {
    return await db.lessons.where('academicYearId').equals(academicYearId).toArray();
  },

  async create(lesson: Lesson): Promise<string> {
    const now = new Date().toISOString();

    if (lesson.startTime && lesson.endTime && lesson.startTime >= lesson.endTime) {
      throw new Error(`Invalid lesson time range: start time (${lesson.startTime}) must precede end time (${lesson.endTime}).`);
    }

    return await db.transaction(
      'rw',
      [
        db.lessons,
        db.academicYears,
        db.classes,
        db.curriculumVersions,
        db.curriculumLevels,
        db.curriculumSequences,
        db.sessionRubrics,
      ],
      async () => {
        // 1. Academic year validation
        const year = await db.academicYears.get(lesson.academicYearId);
        if (!year) {
          throw new Error(`Academic year with id ${lesson.academicYearId} does not exist.`);
        }
        if (year.isArchived) {
          throw new Error('Cannot add lessons to an archived academic year.');
        }

        // 2. Class validation
        const schoolClass = await db.classes.get(lesson.classId);
        if (!schoolClass) {
          throw new Error(`Class with id ${lesson.classId} does not exist.`);
        }
        if (schoolClass.isArchived) {
          throw new Error('Cannot add lessons to an archived class.');
        }
        if (schoolClass.academicYearId !== lesson.academicYearId) {
          throw new Error(`Class ${lesson.classId} does not belong to academic year ${lesson.academicYearId}.`);
        }

        // 3. Curriculum version validation
        const curriculum = await db.curriculumVersions.get(lesson.curriculumVersionId);
        if (!curriculum) {
          throw new Error(`Curriculum version with id ${lesson.curriculumVersionId} does not exist.`);
        }

        // 4. Level validation
        const effectiveLevel = lesson.levelCode || schoolClass.levelCode;
        if (lesson.levelCode && schoolClass.levelCode && lesson.levelCode !== schoolClass.levelCode) {
          throw new Error(`Lesson level ${lesson.levelCode} does not match class level ${schoolClass.levelCode}.`);
        }

        const levelConfigCount = await db.curriculumLevels
          .where('curriculumVersionId')
          .equals(lesson.curriculumVersionId)
          .count();
        if (levelConfigCount > 0 && effectiveLevel) {
          const matchingLevel = await db.curriculumLevels
            .where('[curriculumVersionId+levelCode]')
            .equals([lesson.curriculumVersionId, effectiveLevel])
            .first();
          if (!matchingLevel) {
            throw new Error(`Curriculum version ${lesson.curriculumVersionId} does not support level ${effectiveLevel}.`);
          }
        }

        // 5. Sequence validation
        if (lesson.sequenceId) {
          const sequence = await db.curriculumSequences.get(lesson.sequenceId);
          if (!sequence) {
            throw new Error(`Curriculum sequence with id ${lesson.sequenceId} does not exist.`);
          }
          if (sequence.curriculumVersionId !== lesson.curriculumVersionId) {
            throw new Error(
              `Curriculum sequence ${lesson.sequenceId} belongs to curriculum version ${sequence.curriculumVersionId}, not ${lesson.curriculumVersionId}.`
            );
          }
          if (effectiveLevel && sequence.levelCode !== effectiveLevel) {
            throw new Error(
              `Curriculum sequence ${lesson.sequenceId} is for level ${sequence.levelCode}, not lesson level ${effectiveLevel}.`
            );
          }
        }

        // 6. Rubric validation
        if (lesson.rubricId) {
          const rubric = await db.sessionRubrics.get(lesson.rubricId);
          if (!rubric) {
            throw new Error(`Session rubric with id ${lesson.rubricId} does not exist.`);
          }
          if (rubric.curriculumVersionId !== lesson.curriculumVersionId) {
            throw new Error(
              `Session rubric ${lesson.rubricId} belongs to curriculum version ${rubric.curriculumVersionId}, not ${lesson.curriculumVersionId}.`
            );
          }
          if (rubric.levelCode && effectiveLevel && rubric.levelCode !== effectiveLevel) {
            throw new Error(
              `Session rubric ${lesson.rubricId} is configured for level ${rubric.levelCode}, not lesson level ${effectiveLevel}.`
            );
          }
        }

        await db.lessons.add({
          ...lesson,
          createdAt: lesson.createdAt || now,
          updatedAt: now,
        });

        return lesson.id;
      }
    );
  },

  async update(id: string, updates: Partial<Lesson>): Promise<void> {
    const now = new Date().toISOString();

    if (updates.startTime && updates.endTime && updates.startTime >= updates.endTime) {
      throw new Error(`Invalid lesson time range: start time (${updates.startTime}) must precede end time (${updates.endTime}).`);
    }

    await db.transaction(
      'rw',
      [
        db.lessons,
        db.attendance,
        db.academicYears,
        db.classes,
        db.curriculumVersions,
        db.curriculumLevels,
        db.curriculumSequences,
        db.sessionRubrics,
      ],
      async () => {
        const existing = await db.lessons.get(id);
        if (!existing) {
          throw new Error(`Lesson with id ${id} not found.`);
        }

        const existingYear = await db.academicYears.get(existing.academicYearId);
        if (existingYear?.isArchived) {
          throw new Error('Cannot modify lessons in an archived academic year.');
        }
        if (existing.isArchived) {
          throw new Error('Cannot modify an archived lesson.');
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
          updates.levelCode !== undefined ||
          updates.sequenceId !== undefined ||
          updates.rubricId !== undefined;

        if (isChangingRelationships) {
          const targetYearId = updates.academicYearId ?? existing.academicYearId;
          const targetClassId = updates.classId ?? existing.classId;
          const targetCurriculumVersionId = updates.curriculumVersionId ?? existing.curriculumVersionId;
          const targetLevelCode = updates.levelCode ?? existing.levelCode;
          const targetSequenceId = updates.sequenceId !== undefined ? updates.sequenceId : existing.sequenceId;
          const targetRubricId = updates.rubricId !== undefined ? updates.rubricId : existing.rubricId;

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
          if (targetClass.isArchived) {
            throw new Error('Cannot move lessons to an archived class.');
          }

          if (targetClass.academicYearId !== targetYearId) {
            throw new Error(`Class ${targetClassId} does not belong to academic year ${targetYearId}.`);
          }

          const curriculum = await db.curriculumVersions.get(targetCurriculumVersionId);
          if (!curriculum) {
            throw new Error(`Curriculum version with id ${targetCurriculumVersionId} does not exist.`);
          }

          const effectiveLevel = targetLevelCode || targetClass.levelCode;
          if (targetLevelCode && targetClass.levelCode && targetLevelCode !== targetClass.levelCode) {
            throw new Error(`Lesson level ${targetLevelCode} does not match class level ${targetClass.levelCode}.`);
          }

          const levelConfigCount = await db.curriculumLevels
            .where('curriculumVersionId')
            .equals(targetCurriculumVersionId)
            .count();
          if (levelConfigCount > 0 && effectiveLevel) {
            const matchingLevel = await db.curriculumLevels
              .where('[curriculumVersionId+levelCode]')
              .equals([targetCurriculumVersionId, effectiveLevel])
              .first();
            if (!matchingLevel) {
              throw new Error(`Curriculum version ${targetCurriculumVersionId} does not support level ${effectiveLevel}.`);
            }
          }

          // Sequence validation
          if (targetSequenceId) {
            const sequence = await db.curriculumSequences.get(targetSequenceId);
            if (!sequence) {
              throw new Error(`Curriculum sequence with id ${targetSequenceId} does not exist.`);
            }
            if (sequence.curriculumVersionId !== targetCurriculumVersionId) {
              throw new Error(
                `Curriculum sequence ${targetSequenceId} belongs to curriculum version ${sequence.curriculumVersionId}, not ${targetCurriculumVersionId}.`
              );
            }
            if (effectiveLevel && sequence.levelCode !== effectiveLevel) {
              throw new Error(
                `Curriculum sequence ${targetSequenceId} is for level ${sequence.levelCode}, not lesson level ${effectiveLevel}.`
              );
            }
          }

          // Rubric validation
          if (targetRubricId) {
            const rubric = await db.sessionRubrics.get(targetRubricId);
            if (!rubric) {
              throw new Error(`Session rubric with id ${targetRubricId} does not exist.`);
            }
            if (rubric.curriculumVersionId !== targetCurriculumVersionId) {
              throw new Error(
                `Session rubric ${targetRubricId} belongs to curriculum version ${rubric.curriculumVersionId}, not ${targetCurriculumVersionId}.`
              );
            }
            if (rubric.levelCode && effectiveLevel && rubric.levelCode !== effectiveLevel) {
              throw new Error(
                `Session rubric ${targetRubricId} is configured for level ${rubric.levelCode}, not lesson level ${effectiveLevel}.`
              );
            }
          }
        }

      // If lesson date was updated, synchronize all anchored attendance records atomically
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

  async countByClass(classId: string): Promise<number> {
    return await db.lessons.where('classId').equals(classId).count();
  },
};
