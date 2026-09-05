/**
 * UNS SCHOOL — Attendance Repository
 * Strictly anchored to Lesson as the authoritative session event.
 */

import { db } from '../database';
import type { AttendanceRecord } from '../../types';

export const attendanceRepository = {
  async listByLesson(lessonId: string): Promise<AttendanceRecord[]> {
    return await db.attendance.where('lessonId').equals(lessonId).toArray();
  },

  async listByStudent(studentEnrollmentId: string): Promise<AttendanceRecord[]> {
    return await db.attendance.where('studentEnrollmentId').equals(studentEnrollmentId).toArray();
  },

  async listByClassAndDate(classId: string, date: string): Promise<AttendanceRecord[]> {
    return await db.attendance
      .where('classId')
      .equals(classId)
      .and((r) => r.date === date)
      .toArray();
  },

  async saveBatchForLesson(lessonId: string, records: AttendanceRecord[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.attendance, db.lessons, db.academicYears, db.studentEnrollments], async () => {
      // 1. Verify parent lesson exists
      const parentLesson = await db.lessons.get(lessonId);
      if (!parentLesson) {
        throw new Error(`Cannot record attendance for nonexistent lesson ${lessonId}.`);
      }

      // 2. Verify academic year is not archived
      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot record attendance in an archived academic year.');
      }

      // 3. Enforce: AttendanceRecord.date === Lesson.date
      // 4. Upsert records preventing duplicates per [lessonId+studentEnrollmentId]
      for (const record of records) {
        const enrollment = await db.studentEnrollments.get(record.studentEnrollmentId);
        if (!enrollment) {
          throw new Error(`Student enrollment ${record.studentEnrollmentId} does not exist.`);
        }

        if (enrollment.classId !== parentLesson.classId) {
          throw new Error(`Enrollment ${record.studentEnrollmentId} does not belong to lesson class ${parentLesson.classId}.`);
        }

        if (enrollment.academicYearId !== parentLesson.academicYearId) {
          throw new Error(`Enrollment ${record.studentEnrollmentId} does not belong to lesson academic year ${parentLesson.academicYearId}.`);
        }

        const syncedRecord: AttendanceRecord = {
          ...record,
          lessonId,
          classId: parentLesson.classId,
          date: parentLesson.date, // Strictly synchronized with lesson date
          updatedAt: now,
        };

        const existing = await db.attendance
          .where('lessonId')
          .equals(lessonId)
          .and((a) => a.studentEnrollmentId === record.studentEnrollmentId)
          .first();

        if (existing) {
          await db.attendance.update(existing.id, {
            status: syncedRecord.status,
            minutesLate: syncedRecord.minutesLate,
            remarks: syncedRecord.remarks,
            updatedAt: now,
          });
        } else {
          await db.attendance.add({
            ...syncedRecord,
            createdAt: record.createdAt || now,
          });
        }
      }
    });
  },

  async recordAttendance(record: AttendanceRecord): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.attendance, db.lessons, db.academicYears, db.studentEnrollments], async () => {
      const parentLesson = await db.lessons.get(record.lessonId);
      if (!parentLesson) {
        throw new Error(`Cannot record attendance for nonexistent lesson ${record.lessonId}.`);
      }

      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot record attendance in an archived academic year.');
      }

      const enrollment = await db.studentEnrollments.get(record.studentEnrollmentId);
      if (!enrollment) {
        throw new Error(`Student enrollment ${record.studentEnrollmentId} does not exist.`);
      }

      if (enrollment.classId !== parentLesson.classId) {
        throw new Error(`Enrollment ${record.studentEnrollmentId} does not belong to lesson class ${parentLesson.classId}.`);
      }

      if (enrollment.academicYearId !== parentLesson.academicYearId) {
        throw new Error(`Enrollment ${record.studentEnrollmentId} does not belong to lesson academic year ${parentLesson.academicYearId}.`);
      }

      const existing = await db.attendance
        .where('lessonId')
        .equals(record.lessonId)
        .and((a) => a.studentEnrollmentId === record.studentEnrollmentId)
        .first();

      if (existing) {
        throw new Error(`Attendance already recorded for student ${record.studentEnrollmentId} in lesson ${record.lessonId}. Update existing record instead.`);
      }

      await db.attendance.add({
        ...record,
        classId: parentLesson.classId,
        date: parentLesson.date,
        createdAt: record.createdAt || now,
        updatedAt: now,
      });

      return record.id;
    });
  },

  async getAttendanceForStudentInLesson(lessonId: string, studentEnrollmentId: string): Promise<AttendanceRecord | undefined> {
    return await db.attendance
      .where('lessonId')
      .equals(lessonId)
      .and((a) => a.studentEnrollmentId === studentEnrollmentId)
      .first();
  },
};
