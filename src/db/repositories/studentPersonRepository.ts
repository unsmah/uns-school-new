/**
 * UNS SCHOOL — Student Person Repository
 * Manages the stable, permanent human identity of students across academic years.
 */

import { db } from '../database';
import type { StudentPerson } from '../../types';

export const studentPersonRepository = {
  async listAll(): Promise<StudentPerson[]> {
    const persons = await db.studentPersons.toArray();
    return persons.sort((a, b) => a.lastNameLatin.localeCompare(b.lastNameLatin));
  },

  async getById(id: string): Promise<StudentPerson | undefined> {
    return await db.studentPersons.get(id);
  },

  async searchByName(term: string): Promise<StudentPerson[]> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return [];
    return await db.studentPersons
      .filter(
        (p) =>
          p.lastNameLatin.toLowerCase().includes(normalized) ||
          p.firstNameLatin.toLowerCase().includes(normalized) ||
          (p.lastNameArabic?.includes(normalized) ?? false) ||
          (p.firstNameArabic?.includes(normalized) ?? false)
      )
      .toArray();
  },

  async create(person: StudentPerson): Promise<string> {
    const now = new Date().toISOString();
    return await db.transaction('rw', db.studentPersons, async () => {
      // Check duplicate NIN if provided
      if (person.nationalIdNumber?.trim()) {
        const existingNin = await db.studentPersons
          .where('nationalIdNumber')
          .equals(person.nationalIdNumber.trim())
          .first();
        if (existingNin && existingNin.id !== person.id) {
          throw new Error(`A student with National ID "${person.nationalIdNumber}" already exists.`);
        }
      }

      await db.studentPersons.add({
        ...person,
        createdAt: person.createdAt || now,
        updatedAt: now,
      });

      return person.id;
    });
  },

  async update(id: string, updates: Partial<StudentPerson>): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.studentPersons, async () => {
      if (updates.nationalIdNumber?.trim()) {
        const existingNin = await db.studentPersons
          .where('nationalIdNumber')
          .equals(updates.nationalIdNumber.trim())
          .first();
        if (existingNin && existingNin.id !== id) {
          throw new Error(`A student with National ID "${updates.nationalIdNumber}" already exists.`);
        }
      }

      await db.studentPersons.update(id, {
        ...updates,
        updatedAt: now,
      });
    });
  },

  async count(): Promise<number> {
    return await db.studentPersons.count();
  },
};
