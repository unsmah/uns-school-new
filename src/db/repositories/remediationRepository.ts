/**
 * UNS SCHOOL — Remediation Repository
 */

import { db } from '../database';
import type { RemediationSession } from '../../types';

export const remediationRepository = {
  async listByClass(classId: string): Promise<RemediationSession[]> {
    return await db.remediation.where('classId').equals(classId).sortBy('scheduledDate');
  },

  async listByAcademicYear(academicYearId: string): Promise<RemediationSession[]> {
    return await db.remediation.where('academicYearId').equals(academicYearId).sortBy('scheduledDate');
  },

  async getById(id: string): Promise<RemediationSession | undefined> {
    return await db.remediation.get(id);
  },

  async save(session: RemediationSession): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', [
      db.remediation,
      db.academicYears,
      db.classes,
      db.studentEnrollments,
      db.curriculumSequences,
      db.competencies
    ], async () => {
      const year = await db.academicYears.get(session.academicYearId);
      if (!year) {
        throw new Error(`Academic year with id ${session.academicYearId} does not exist.`);
      }
      if (year.isArchived) {
        throw new Error('Cannot add or modify remediation sessions in an archived academic year.');
      }

      const schoolClass = await db.classes.get(session.classId);
      if (!schoolClass) {
        throw new Error(`Class with id ${session.classId} does not exist.`);
      }
      if (schoolClass.isArchived) {
        throw new Error('Cannot add or modify remediation sessions for an archived class.');
      }
      if (schoolClass.academicYearId !== session.academicYearId) {
        throw new Error(`Class ${session.classId} does not belong to academic year ${session.academicYearId}.`);
      }

      for (const enrId of session.targetedStudentEnrollmentIds) {
        const enr = await db.studentEnrollments.get(enrId);
        if (!enr) {
          throw new Error(`Targeted student enrollment ${enrId} does not exist.`);
        }
        if (enr.academicYearId !== session.academicYearId) {
          throw new Error(`Targeted enrollment ${enrId} does not match remediation academic year.`);
        }
        if (enr.classId !== session.classId) {
          throw new Error(`Targeted enrollment ${enrId} does not match remediation class.`);
        }
      }

      if (session.sequenceId) {
        const seq = await db.curriculumSequences.get(session.sequenceId);
        if (!seq) {
          throw new Error(`Sequence ${session.sequenceId} does not exist.`);
        }
        if (seq.levelCode !== schoolClass.levelCode) {
          throw new Error(`Sequence level code ${seq.levelCode} does not match class level code ${schoolClass.levelCode}.`);
        }
      }

      if (session.competencyId) {
        const comp = await db.competencies.get(session.competencyId);
        if (!comp) {
          throw new Error(`Competency ${session.competencyId} does not exist.`);
        }
        if (comp.levelCode !== schoolClass.levelCode) {
          throw new Error(`Competency level code ${comp.levelCode} does not match class level code ${schoolClass.levelCode}.`);
        }
      }

      const existing = await db.remediation.get(session.id);
      if (existing) {
        await db.remediation.put({ ...session, updatedAt: now });
      } else {
        await db.remediation.add({
          ...session,
          createdAt: session.createdAt || now,
          updatedAt: now,
        });
      }
      return session.id;
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.remediation, db.academicYears], async () => {
      const existing = await db.remediation.get(id);
      if (!existing) return;
      const year = await db.academicYears.get(existing.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot delete remediation sessions in an archived academic year.');
      }
      await db.remediation.delete(id);
    });
  },
};
