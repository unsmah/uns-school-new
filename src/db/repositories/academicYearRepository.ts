/**
 * UNS SCHOOL — Academic Year Repository
 * Enforces single current academic year and historical preservation.
 */

import { db } from '../database';
import type { AcademicYear } from '../../types';

export const academicYearRepository = {
  async listAll(): Promise<AcademicYear[]> {
    const years = await db.academicYears.toArray();
    return years.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  },

  async getById(id: string): Promise<AcademicYear | undefined> {
    return await db.academicYears.get(id);
  },

  async getCurrent(schoolId?: string): Promise<AcademicYear | undefined> {
    if (schoolId) {
      return await db.academicYears
        .where('schoolId')
        .equals(schoolId)
        .and((y) => Boolean(y.isCurrent))
        .first();
    }
    return await db.academicYears.filter((y) => Boolean(y.isCurrent)).first();
  },

  async create(year: AcademicYear): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', db.academicYears, async () => {
      if (year.isCurrent) {
        // Demote any existing current academic year FOR THIS SCHOOL ONLY
        const schoolYears = await db.academicYears.where('schoolId').equals(year.schoolId).toArray();
        for (const existingYear of schoolYears) {
          if (existingYear.isCurrent) {
            await db.academicYears.update(existingYear.id, { isCurrent: false, updatedAt: now });
          }
        }
      }

      await db.academicYears.add({
        ...year,
        createdAt: year.createdAt || now,
        updatedAt: now,
      });

      return year.id;
    });
  },

  async update(id: string, updates: Partial<AcademicYear>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.academicYears, async () => {
      const existing = await db.academicYears.get(id);
      if (!existing) {
        throw new Error(`Academic year with id ${id} not found.`);
      }

      if (existing.isArchived && !updates.isArchived) {
        // Historical protection guard: Cannot modify archived year without explicit unarchive
        if (updates.startDate || updates.endDate || updates.label || updates.schoolId || updates.isCurrent) {
          throw new Error('Archived academic years are read-only. Unarchive first to make changes.');
        }
      }

      const targetIsCurrent = updates.isCurrent !== undefined ? updates.isCurrent : existing.isCurrent;
      const targetSchoolId = updates.schoolId !== undefined ? updates.schoolId : existing.schoolId;

      // Invariant: Each school may have at most ONE current academic year.
      // If the academic year is or remains current in the destination school, demote any other current year for that school.
      if (targetIsCurrent) {
        const schoolYears = await db.academicYears.where('schoolId').equals(targetSchoolId).toArray();
        for (const otherYear of schoolYears) {
          if (otherYear.id !== id && otherYear.isCurrent) {
            await db.academicYears.update(otherYear.id, { isCurrent: false, updatedAt: now });
          }
        }
      }

      await db.academicYears.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async archive(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.academicYears, async () => {
      await db.academicYears.update(id, {
        isArchived: true,
        isCurrent: false,
        updatedAt: now,
      });
    });
  },

  async unarchive(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.academicYears, async () => {
      await db.academicYears.update(id, {
        isArchived: false,
        updatedAt: now,
      });
    });
  },

  async deleteIfEmpty(id: string): Promise<boolean> {
    return await db.transaction('rw', [db.academicYears, db.classes, db.studentEnrollments, db.lessons], async () => {
      const existing = await db.academicYears.get(id);
      if (!existing) {
        throw new Error(`Academic year with id ${id} not found.`);
      }
      const classesCount = await db.classes.where('academicYearId').equals(id).count();
      const enrollmentsCount = await db.studentEnrollments.where('academicYearId').equals(id).count();
      const lessonsCount = await db.lessons.where('academicYearId').equals(id).count();
      if (classesCount > 0 || enrollmentsCount > 0 || lessonsCount > 0) {
        throw new Error('Cannot delete academic year with attached classes, enrollments, or lessons. Archive it instead.');
      }
      await db.academicYears.delete(id);
      return true;
    });
  },
};
