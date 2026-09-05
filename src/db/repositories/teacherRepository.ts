/**
 * UNS SCHOOL — Teacher Profile Repository
 */

import { db } from '../database';
import type { TeacherProfile } from '../../types';

export const teacherRepository = {
  async get(): Promise<TeacherProfile | undefined> {
    return await db.teacherProfile.toCollection().first();
  },

  async save(profile: TeacherProfile): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', db.teacherProfile, async () => {
      const existing = await db.teacherProfile.toCollection().first();
      if (existing) {
        // Enforce singleton invariant: update the single existing record
        const id = existing.id;
        await db.teacherProfile.put({
          ...profile,
          id,
          createdAt: existing.createdAt || now,
          updatedAt: now,
        });
        return id;
      } else {
        await db.teacherProfile.add({
          ...profile,
          createdAt: profile.createdAt || now,
          updatedAt: now,
        });
        return profile.id;
      }
    });
  },
};
