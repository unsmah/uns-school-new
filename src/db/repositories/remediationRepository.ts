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
    return await db.transaction('rw', [db.remediation, db.academicYears], async () => {
      const year = await db.academicYears.get(session.academicYearId);
      if (year?.isArchived) {
        throw new Error('Cannot add or modify remediation sessions in an archived academic year.');
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
