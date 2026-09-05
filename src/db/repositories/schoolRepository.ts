/**
 * UNS SCHOOL — School Repository
 */

import { db } from '../database';
import type { School } from '../../types';

export const schoolRepository = {
  async get(): Promise<School | undefined> {
    return await db.schools.toCollection().first();
  },

  async getById(id: string): Promise<School | undefined> {
    return await db.schools.get(id);
  },

  async save(school: School): Promise<string> {
    const now = new Date().toISOString();
    const existing = await db.schools.get(school.id);
    if (existing) {
      await db.schools.put({
        ...school,
        updatedAt: now,
      });
      return school.id;
    } else {
      await db.schools.add({
        ...school,
        createdAt: school.createdAt || now,
        updatedAt: now,
      });
      return school.id;
    }
  },

  async count(): Promise<number> {
    return await db.schools.count();
  },
};
