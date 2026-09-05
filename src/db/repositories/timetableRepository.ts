/**
 * UNS SCHOOL — Timetable Repository
 * Sunday to Thursday weekly timetable slots.
 */

import { db } from '../database';
import type { TimetableSlot } from '../../types';

export const timetableRepository = {
  async listByAcademicYear(academicYearId: string): Promise<TimetableSlot[]> {
    return await db.timetable.where('academicYearId').equals(academicYearId).toArray();
  },

  async listByDay(academicYearId: string, dayOfWeek: TimetableSlot['dayOfWeek']): Promise<TimetableSlot[]> {
    return await db.timetable
      .where('academicYearId')
      .equals(academicYearId)
      .and((t) => t.dayOfWeek === dayOfWeek)
      .sortBy('periodNumber');
  },

  async save(slot: TimetableSlot): Promise<string> {
    await db.timetable.put(slot);
    return slot.id;
  },

  async delete(id: string): Promise<void> {
    await db.timetable.delete(id);
  },
};
