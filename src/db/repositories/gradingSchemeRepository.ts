/**
 * UNS SCHOOL — Grading Scheme Repository
 * Pure data storage for calculation configurations and weighting rules.
 */

import { db } from '../database';
import type { GradingScheme } from '../../types';

export const gradingSchemeRepository = {
  async listAll(): Promise<GradingScheme[]> {
    return await db.gradingSchemes.toArray();
  },

  async getById(id: string): Promise<GradingScheme | undefined> {
    return await db.gradingSchemes.get(id);
  },

  async save(scheme: GradingScheme): Promise<string> {
    const now = new Date().toISOString();
    const existing = await db.gradingSchemes.get(scheme.id);
    if (existing) {
      await db.gradingSchemes.put({ ...scheme, updatedAt: now });
    } else {
      await db.gradingSchemes.add({
        ...scheme,
        createdAt: scheme.createdAt || now,
        updatedAt: now,
      });
    }
    return scheme.id;
  },

  async delete(id: string): Promise<void> {
    // Check if any assessment is using this scheme before allowing delete
    const inUse = await db.assessments.where('gradingSchemeId').equals(id).count();
    if (inUse > 0) {
      throw new Error('Cannot delete grading scheme that is referenced by existing assessments.');
    }
    await db.gradingSchemes.delete(id);
  },
};
