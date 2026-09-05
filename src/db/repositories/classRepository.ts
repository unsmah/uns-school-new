/**
 * UNS SCHOOL — School Class Repository
 * Enforces SchoolClass.schoolId === AcademicYear.schoolId invariant,
 * prevents class migration across academic years / schools (immutability),
 * and enforces archived academic year read-only protection.
 */

import { db } from '../database';
import type { SchoolClass } from '../../types';

export const classRepository = {
  async listByAcademicYear(academicYearId: string, includeArchived = false): Promise<SchoolClass[]> {
    const query = db.classes.where('academicYearId').equals(academicYearId);
    if (!includeArchived) {
      return await query.and((c) => !c.isArchived).toArray();
    }
    return await query.toArray();
  },

  async getById(id: string): Promise<SchoolClass | undefined> {
    return await db.classes.get(id);
  },

  async create(schoolClass: SchoolClass): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.classes, db.academicYears, db.schools], async () => {
      // 1. Verify school exists
      const school = await db.schools.get(schoolClass.schoolId);
      if (!school) {
        throw new Error(`School with id ${schoolClass.schoolId} not found.`);
      }

      // 2. Verify academic year exists
      const year = await db.academicYears.get(schoolClass.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${schoolClass.academicYearId} not found.`);
      }

      // 3. Enforce structural invariant: Class schoolId MUST equal AcademicYear schoolId
      if (year.schoolId !== schoolClass.schoolId) {
        throw new Error('Class schoolId does not match AcademicYear schoolId.');
      }

      // 4. Archive protection: Cannot add classes to archived year
      if (year.isArchived) {
        throw new Error('Cannot add new classes to an archived academic year.');
      }

      // 5. Check unique class name in this academic year
      const duplicate = await db.classes
        .where('academicYearId')
        .equals(schoolClass.academicYearId)
        .and((c) => c.name.trim().toLowerCase() === schoolClass.name.trim().toLowerCase() && c.id !== schoolClass.id)
        .first();

      if (duplicate) {
        throw new Error(`A class named "${schoolClass.name}" already exists in this academic year.`);
      }

      await db.classes.add({
        ...schoolClass,
        createdAt: schoolClass.createdAt || now,
        updatedAt: now,
      });

      return schoolClass.id;
    });
  },

  async update(id: string, updates: Partial<SchoolClass>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.classes, db.academicYears], async () => {
      const existing = await db.classes.get(id);
      if (!existing) {
        throw new Error(`Class with id ${id} not found.`);
      }

      // Immutability: Prohibit class migration across academic years or schools
      if (updates.academicYearId !== undefined && updates.academicYearId !== existing.academicYearId) {
        throw new Error('Class academicYearId cannot be changed after creation.');
      }
      if (updates.schoolId !== undefined && updates.schoolId !== existing.schoolId) {
        throw new Error('Class schoolId cannot be changed after creation.');
      }

      // Archive protection: Cannot modify classes in archived academic year
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify classes in an archived academic year.');
      }

      if (updates.name && updates.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
        const duplicate = await db.classes
          .where('academicYearId')
          .equals(existing.academicYearId)
          .and((c) => c.name.trim().toLowerCase() === updates.name!.trim().toLowerCase() && c.id !== id)
          .first();

        if (duplicate) {
          throw new Error(`A class named "${updates.name}" already exists in this academic year.`);
        }
      }

      await db.classes.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async archive(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.classes, db.academicYears], async () => {
      const existing = await db.classes.get(id);
      if (!existing) {
        throw new Error(`Class with id ${id} not found.`);
      }
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify classes in an archived academic year.');
      }
      await db.classes.update(id, {
        isArchived: true,
        updatedAt: now,
      });
    });
  },

  async deleteIfEmpty(id: string): Promise<boolean> {
    return await db.transaction('rw', [db.classes, db.studentEnrollments, db.lessons, db.academicYears], async () => {
      const existing = await db.classes.get(id);
      if (!existing) {
        throw new Error(`Class with id ${id} not found.`);
      }

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete classes in an archived academic year.');
      }

      const enrollmentsCount = await db.studentEnrollments.where('classId').equals(id).count();
      const lessonsCount = await db.lessons.where('classId').equals(id).count();

      if (enrollmentsCount > 0 || lessonsCount > 0) {
        throw new Error('Cannot delete class that has enrolled students or recorded lessons. Archive it instead.');
      }

      await db.classes.delete(id);
      return true;
    });
  },
};
