/**
 * UNS SCHOOL — Teacher Profile Repository
 */

import { db } from '../database';
import type { TeacherProfile } from '../../types';

export const DEFAULT_TEACHER_PROFILE: TeacherProfile = {
  id: 'teacher-profile-primary',
  fullNameLatin: 'Teacher of English',
  fullNameArabic: 'أستاذ مادة اللغة الإنجليزية',
  gender: 'male',
  subject: 'English Language (اللغة الإنجليزية)',
  corpsRank: "Professeur d'Enseignement Moyen (PEM) / أستاذ التعليم المتوسط",
  echelon: 3,
  qualificationDegree: "Licence d'Anglais / شهادة الليسانس في اللغة الإنجليزية",
  assignedLevels: ['1MS', '2MS', '3MS', '4MS'],
  weeklyHoursQuota: 18,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const teacherRepository = {
  async get(): Promise<TeacherProfile | undefined> {
    return await db.teacherProfile.toCollection().first();
  },

  async getOrCreate(): Promise<TeacherProfile> {
    const existing = await this.get();
    if (existing) return existing;

    const now = new Date().toISOString();
    const initial: TeacherProfile = {
      ...DEFAULT_TEACHER_PROFILE,
      id: 'teacher-profile-primary',
      createdAt: now,
      updatedAt: now,
    };
    await this.save(initial);
    return initial;
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
        const id = profile.id || 'teacher-profile-primary';
        await db.teacherProfile.add({
          ...profile,
          id,
          createdAt: profile.createdAt || now,
          updatedAt: now,
        });
        return id;
      }
    });
  },

  async update(partial: Partial<TeacherProfile>): Promise<TeacherProfile> {
    const current = await this.getOrCreate();
    const updated: TeacherProfile = {
      ...current,
      ...partial,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    await this.save(updated);
    return updated;
  },
};
