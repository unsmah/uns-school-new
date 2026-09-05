/**
 * UNS SCHOOL — Attendance Repository
 * Strictly anchored to Lesson as the authoritative session event.
 * Enforces date synchronization, enrollment-class integrity,
 * archive protection, and atomic roll call recording.
 */

import { db } from '../database';
import type { AttendanceRecord } from '../../types';

export interface LessonAttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number; // percentage 0..100
}

export interface ClassAttendanceStats {
  totalSessions: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  averageRate: number; // percentage 0..100
}

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

  async listByClass(classId: string): Promise<AttendanceRecord[]> {
    return await db.attendance.where('classId').equals(classId).toArray();
  },

  async getAttendanceForStudentInLesson(lessonId: string, studentEnrollmentId: string): Promise<AttendanceRecord | undefined> {
    return await db.attendance
      .where('lessonId')
      .equals(lessonId)
      .and((a) => a.studentEnrollmentId === studentEnrollmentId)
      .first();
  },

  async recordAttendance(record: AttendanceRecord): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.attendance, db.lessons, db.academicYears, db.classes, db.studentEnrollments], async () => {
      const parentLesson = await db.lessons.get(record.lessonId);
      if (!parentLesson) {
        throw new Error(`Cannot record attendance for nonexistent lesson ${record.lessonId}.`);
      }

      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot record attendance in an archived academic year.');
      }

      const parentClass = await db.classes.get(parentLesson.classId);
      if (parentClass?.isArchived) {
        throw new Error('Cannot record attendance in an archived class.');
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

  async saveBatchForLesson(lessonId: string, records: AttendanceRecord[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.attendance, db.lessons, db.academicYears, db.classes, db.studentEnrollments], async () => {
      const parentLesson = await db.lessons.get(lessonId);
      if (!parentLesson) {
        throw new Error(`Cannot record attendance for nonexistent lesson ${lessonId}.`);
      }

      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot record attendance in an archived academic year.');
      }

      const parentClass = await db.classes.get(parentLesson.classId);
      if (parentClass?.isArchived) {
        throw new Error('Cannot record attendance in an archived class.');
      }

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

  async markAllPresent(lessonId: string, studentEnrollmentIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.attendance, db.lessons, db.academicYears, db.classes, db.studentEnrollments], async () => {
      const parentLesson = await db.lessons.get(lessonId);
      if (!parentLesson) {
        throw new Error(`Cannot record attendance for nonexistent lesson ${lessonId}.`);
      }

      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot record attendance in an archived academic year.');
      }

      const parentClass = await db.classes.get(parentLesson.classId);
      if (parentClass?.isArchived) {
        throw new Error('Cannot record attendance in an archived class.');
      }

      for (const enrollmentId of studentEnrollmentIds) {
        const enrollment = await db.studentEnrollments.get(enrollmentId);
        if (!enrollment) continue;
        if (enrollment.classId !== parentLesson.classId || enrollment.academicYearId !== parentLesson.academicYearId) {
          continue;
        }

        const existing = await db.attendance
          .where('lessonId')
          .equals(lessonId)
          .and((a) => a.studentEnrollmentId === enrollmentId)
          .first();

        if (existing) {
          await db.attendance.update(existing.id, {
            status: 'Present',
            minutesLate: undefined,
            remarks: existing.remarks,
            updatedAt: now,
          });
        } else {
          await db.attendance.add({
            id: `att-${lessonId}-${enrollmentId}-${Date.now()}`,
            lessonId,
            classId: parentLesson.classId,
            studentEnrollmentId: enrollmentId,
            date: parentLesson.date,
            status: 'Present',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });
  },

  async deleteByLesson(lessonId: string): Promise<void> {
    await db.transaction('rw', [db.attendance, db.lessons, db.academicYears], async () => {
      const parentLesson = await db.lessons.get(lessonId);
      if (!parentLesson) return;

      const year = await db.academicYears.get(parentLesson.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete attendance in an archived academic year.');
      }

      await db.attendance.where('lessonId').equals(lessonId).delete();
    });
  },

  async getAttendanceStatsForLesson(lessonId: string): Promise<LessonAttendanceStats> {
    const records = await db.attendance.where('lessonId').equals(lessonId).toArray();
    const total = records.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const r of records) {
      if (r.status === 'Present') present++;
      else if (r.status === 'Absent') absent++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'Excused') excused++;
    }

    const attending = present + late;
    const rate = total > 0 ? Math.round((attending / total) * 100) : 100;

    return { total, present, absent, late, excused, rate };
  },

  async getAttendanceStatsForClass(classId: string): Promise<ClassAttendanceStats> {
    const records = await db.attendance.where('classId').equals(classId).toArray();
    const lessonsCount = await db.lessons.where('classId').equals(classId).count();

    const totalRecords = records.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const r of records) {
      if (r.status === 'Present') presentCount++;
      else if (r.status === 'Absent') absentCount++;
      else if (r.status === 'Late') lateCount++;
      else if (r.status === 'Excused') excusedCount++;
    }

    const attending = presentCount + lateCount;
    const averageRate = totalRecords > 0 ? Math.round((attending / totalRecords) * 100) : 100;

    return {
      totalSessions: lessonsCount,
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      averageRate,
    };
  },
};
