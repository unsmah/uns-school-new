/**
 * UNS SCHOOL — Timetable Repository
 * Sunday to Thursday weekly timetable slots.
 * Enforces school-academic year consistency, non-archived checks,
 * class ownership validation, period bounds (1..8), and valid time ranges.
 */

import { db } from '../database';
import type { TimetableSlot } from '../../types';

const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;

export const timetableRepository = {
  async getById(id: string): Promise<TimetableSlot | undefined> {
    return await db.timetable.get(id);
  },

  async listByAcademicYear(academicYearId: string): Promise<TimetableSlot[]> {
    return await db.timetable
      .where('academicYearId')
      .equals(academicYearId)
      .toArray();
  },

  async listByClass(classId: string): Promise<TimetableSlot[]> {
    return await db.timetable
      .where('classId')
      .equals(classId)
      .sortBy('periodNumber');
  },

  async listByDay(academicYearId: string, dayOfWeek: TimetableSlot['dayOfWeek']): Promise<TimetableSlot[]> {
    return await db.timetable
      .where('academicYearId')
      .equals(academicYearId)
      .and((t) => t.dayOfWeek === dayOfWeek)
      .sortBy('periodNumber');
  },

  async create(slot: TimetableSlot): Promise<string> {
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    if (!validDays.includes(slot.dayOfWeek)) {
      throw new Error(`Invalid teaching day "${slot.dayOfWeek}". Must be Sunday through Thursday.`);
    }

    if (typeof slot.periodNumber !== 'number' || slot.periodNumber < 1 || slot.periodNumber > 8) {
      throw new Error(`Invalid period number "${slot.periodNumber}". Must be an integer between 1 and 8.`);
    }

    if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
      throw new Error(`Invalid time range: start time (${slot.startTime}) must precede end time (${slot.endTime}).`);
    }

    return await db.transaction('rw', [db.timetable, db.academicYears, db.classes, db.schools], async () => {
      // 1. Verify academic year exists
      const year = await db.academicYears.get(slot.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${slot.academicYearId} not found.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add timetable slots to an archived academic year.');
      }

      // 2. Verify school consistency
      if (slot.schoolId && slot.schoolId !== year.schoolId) {
        throw new Error('Timetable slot schoolId does not match AcademicYear schoolId.');
      }
      const schoolId = slot.schoolId || year.schoolId;

      // 3. Verify class exists & belongs to academic year & school
      const schoolClass = await db.classes.get(slot.classId);
      if (!schoolClass) {
        throw new Error(`Class with id ${slot.classId} not found.`);
      }
      if (schoolClass.isArchived) {
        throw new Error('Cannot add timetable slots for an archived class.');
      }
      if (schoolClass.academicYearId !== slot.academicYearId) {
        throw new Error(`Class ${slot.classId} does not belong to academic year ${slot.academicYearId}.`);
      }
      if (schoolClass.schoolId !== schoolId) {
        throw new Error(`Class schoolId does not match timetable slot schoolId.`);
      }

      // 4. Check conflict on same day & period for the active academic year
      const conflict = await db.timetable
        .where('academicYearId')
        .equals(slot.academicYearId)
        .and((t) => t.dayOfWeek === slot.dayOfWeek && t.periodNumber === slot.periodNumber && t.id !== slot.id)
        .first();

      if (conflict) {
        throw new Error(
          `A timetable slot already exists for ${slot.dayOfWeek} Period ${slot.periodNumber} in this academic year.`
        );
      }

      const recordToSave: TimetableSlot = {
        ...slot,
        schoolId,
      };

      await db.timetable.add(recordToSave);
      return slot.id;
    });
  },

  async update(id: string, updates: Partial<TimetableSlot>): Promise<void> {
    return await db.transaction('rw', [db.timetable, db.academicYears, db.classes], async () => {
      const existing = await db.timetable.get(id);
      if (!existing) {
        throw new Error(`Timetable slot with id ${id} not found.`);
      }

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot modify timetable slots in an archived academic year.');
      }

      // Immutability: cannot change academicYearId or schoolId
      if (updates.academicYearId !== undefined && updates.academicYearId !== existing.academicYearId) {
        throw new Error('Timetable slot academicYearId cannot be changed after creation.');
      }
      if (updates.schoolId !== undefined && updates.schoolId !== existing.schoolId) {
        throw new Error('Timetable slot schoolId cannot be changed after creation.');
      }

      const targetDay = updates.dayOfWeek ?? existing.dayOfWeek;
      const targetPeriod = updates.periodNumber ?? existing.periodNumber;
      const targetStartTime = updates.startTime ?? existing.startTime;
      const targetEndTime = updates.endTime ?? existing.endTime;
      const targetClassId = updates.classId ?? existing.classId;

      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      if (!validDays.includes(targetDay)) {
        throw new Error(`Invalid teaching day "${targetDay}". Must be Sunday through Thursday.`);
      }

      if (typeof targetPeriod !== 'number' || targetPeriod < 1 || targetPeriod > 8) {
        throw new Error(`Invalid period number "${targetPeriod}". Must be an integer between 1 and 8.`);
      }

      if (targetStartTime && targetEndTime && targetStartTime >= targetEndTime) {
        throw new Error(`Invalid time range: start time (${targetStartTime}) must precede end time (${targetEndTime}).`);
      }

      if (updates.classId !== undefined && updates.classId !== existing.classId) {
        const targetClass = await db.classes.get(targetClassId);
        if (!targetClass) {
          throw new Error(`Class with id ${targetClassId} not found.`);
        }
        if (targetClass.isArchived) {
          throw new Error('Cannot assign timetable slot to an archived class.');
        }
        if (targetClass.academicYearId !== existing.academicYearId) {
          throw new Error(`Class ${targetClassId} does not belong to academic year ${existing.academicYearId}.`);
        }
      }

      // Check conflict if day or period changed
      if (updates.dayOfWeek !== undefined || updates.periodNumber !== undefined) {
        const conflict = await db.timetable
          .where('academicYearId')
          .equals(existing.academicYearId)
          .and((t) => t.dayOfWeek === targetDay && t.periodNumber === targetPeriod && t.id !== id)
          .first();

        if (conflict) {
          throw new Error(
            `A timetable slot already exists for ${targetDay} Period ${targetPeriod} in this academic year.`
          );
        }
      }

      await db.timetable.update(id, updates);
    });
  },

  async save(slot: TimetableSlot): Promise<string> {
    const existing = await db.timetable.get(slot.id);
    if (existing) {
      await this.update(slot.id, slot);
      return slot.id;
    }
    return await this.create(slot);
  },

  async delete(id: string): Promise<void> {
    return await db.transaction('rw', [db.timetable, db.academicYears], async () => {
      const existing = await db.timetable.get(id);
      if (!existing) return;

      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete timetable slots in an archived academic year.');
      }

      await db.timetable.delete(id);
    });
  },
};
