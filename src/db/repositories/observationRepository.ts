/**
 * UNS SCHOOL — Student Observations Repository
 * Local pedagogical notes stored privately.
 */

import { db } from '../database';
import type { StudentObservation } from '../../types';

export const observationRepository = {
  async listByStudent(studentEnrollmentId: string): Promise<StudentObservation[]> {
    return await db.observations.where('studentEnrollmentId').equals(studentEnrollmentId).reverse().sortBy('date');
  },

  async listByClassAndAcademicYear(classId: string, academicYearId: string): Promise<StudentObservation[]> {
    return await db.observations
      .where('classId')
      .equals(classId)
      .and((o) => o.academicYearId === academicYearId)
      .reverse()
      .sortBy('date');
  },

  async create(observation: StudentObservation): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [db.observations, db.studentEnrollments, db.academicYears], async () => {
      const enrollment = await db.studentEnrollments.get(observation.studentEnrollmentId);
      if (!enrollment) {
        throw new Error(`Student enrollment with id ${observation.studentEnrollmentId} does not exist.`);
      }

      if (observation.academicYearId !== enrollment.academicYearId) {
        throw new Error('Observation academic year must match student enrollment academic year.');
      }
      if (observation.classId !== enrollment.classId) {
        throw new Error('Observation class must match student enrollment class.');
      }
      if (observation.studentPersonId !== enrollment.studentPersonId) {
        throw new Error('Observation student person must match student enrollment person.');
      }

      const year = await db.academicYears.get(observation.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${observation.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add observations in an archived academic year.');
      }

      await db.observations.add({
        ...observation,
        createdAt: observation.createdAt || now,
      });
      return observation.id;
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.observations, db.studentEnrollments, db.academicYears], async () => {
      const existing = await db.observations.get(id);
      if (!existing) return;

      const enrollment = await db.studentEnrollments.get(existing.studentEnrollmentId);
      if (enrollment) {
        const year = await db.academicYears.get(enrollment.academicYearId);
        if (year?.isArchived) {
          throw new Error('Cannot delete observations from an archived academic year.');
        }
      }

      await db.observations.delete(id);
    });
  },
};
