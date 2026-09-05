/**
 * UNS SCHOOL — Homework Repository
 * Authoritative storage and referential integrity for homework tasks.
 * Validates non-archived academic years, active classes, class-year alignment,
 * and lesson-level linkage.
 */

import { db } from '../database';
import type { HomeworkTask } from '../../types';

export const homeworkRepository = {
  async listByClass(classId: string): Promise<HomeworkTask[]> {
    return await db.homework.where('classId').equals(classId).sortBy('dueDate');
  },

  async listByAcademicYear(academicYearId: string): Promise<HomeworkTask[]> {
    return await db.homework.where('academicYearId').equals(academicYearId).sortBy('dueDate');
  },

  async listByClassAndAcademicYear(classId: string, academicYearId: string): Promise<HomeworkTask[]> {
    return await db.homework
      .where('classId')
      .equals(classId)
      .and((h) => h.academicYearId === academicYearId)
      .sortBy('dueDate');
  },

  async listByLesson(lessonId: string): Promise<HomeworkTask[]> {
    return await db.homework.where('lessonId').equals(lessonId).sortBy('dueDate');
  },

  async getByLessonId(lessonId: string): Promise<HomeworkTask | undefined> {
    return await db.homework.where('lessonId').equals(lessonId).first();
  },

  async getById(id: string): Promise<HomeworkTask | undefined> {
    return await db.homework.get(id);
  },

  async create(task: HomeworkTask): Promise<string> {
    return this.save(task);
  },

  async save(task: HomeworkTask): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.homework, db.academicYears, db.classes, db.lessons], async () => {
      // 1. Academic Year validation
      const year = await db.academicYears.get(task.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${task.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add or modify homework in an archived academic year.');
      }

      // 2. Class validation
      const schoolClass = await db.classes.get(task.classId);
      if (!schoolClass) {
        throw new Error(`Class with id ${task.classId} does not exist.`);
      }
      if (schoolClass.isArchived) {
        throw new Error('Cannot add or modify homework for an archived class.');
      }
      if (schoolClass.academicYearId !== task.academicYearId) {
        throw new Error(`Class ${task.classId} does not belong to academic year ${task.academicYearId}.`);
      }

      // 3. Optional Lesson linkage validation
      if (task.lessonId) {
        const lesson = await db.lessons.get(task.lessonId);
        if (!lesson) {
          throw new Error(`Referenced lesson with id ${task.lessonId} does not exist.`);
        }
        if (lesson.isArchived) {
          throw new Error('Cannot link homework to an archived lesson.');
        }
        if (lesson.classId !== task.classId) {
          throw new Error(`Homework class (${task.classId}) does not match lesson class (${lesson.classId}).`);
        }
        if (lesson.academicYearId !== task.academicYearId) {
          throw new Error(`Homework academic year (${task.academicYearId}) does not match lesson academic year (${lesson.academicYearId}).`);
        }
      }

      const existing = await db.homework.get(task.id);
      if (existing) {
        await db.homework.put({ ...task, updatedAt: now });
      } else {
        await db.homework.add({
          ...task,
          createdAt: task.createdAt || now,
          updatedAt: now,
        });
      }
      return task.id;
    });
  },

  async toggleCompleted(id: string, isCompleted: boolean): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.homework, db.academicYears], async () => {
      const existing = await db.homework.get(id);
      if (!existing) return;
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify homework in an archived academic year.');
      }
      await db.homework.update(id, { isCompleted, updatedAt: now });
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.homework, db.academicYears], async () => {
      const existing = await db.homework.get(id);
      if (!existing) return;
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete homework in an archived academic year.');
      }
      await db.homework.delete(id);
    });
  },

  async deleteByLesson(lessonId: string): Promise<void> {
    await db.transaction('rw', [db.homework, db.academicYears], async () => {
      const existingList = await db.homework.where('lessonId').equals(lessonId).toArray();
      for (const item of existingList) {
        const year = await db.academicYears.get(item.academicYearId);
        if (year?.isArchived) {
          throw new Error('Cannot delete homework in an archived academic year.');
        }
      }
      await db.homework.where('lessonId').equals(lessonId).delete();
    });
  },
};
