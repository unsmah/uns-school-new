/**
 * UNS SCHOOL — Homework Repository
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

  async getById(id: string): Promise<HomeworkTask | undefined> {
    return await db.homework.get(id);
  },

  async save(task: HomeworkTask): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.homework, db.academicYears], async () => {
      const year = await db.academicYears.get(task.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot add or modify homework in an archived academic year.');
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
};
