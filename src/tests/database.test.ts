import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { seedInitialData } from '../db/seeds';

describe('Database Schema & Opening', () => {
  beforeEach(async () => {
    await db.open();
  });

  it('opens database with correct name and schema version', async () => {
    expect(db.name).toBe('uns_school_db');
    expect(db.verno).toBe(1);
    expect(db.isOpen()).toBe(true);
  });

  it('contains all 22 normalized tables required for school workflows', () => {
    const tableNames = db.tables.map((t) => t.name);
    const expectedTables = [
      'schools',
      'teacherProfile',
      'academicYears',
      'gradingSchemes',
      'classes',
      'studentPersons',
      'studentEnrollments',
      'curriculumVersions',
      'curriculumLevels',
      'competencies',
      'sessionRubrics',
      'curriculumSequences',
      'learningObjectives',
      'lessons',
      'attendance',
      'assessments',
      'grades',
      'homework',
      'observations',
      'remediation',
      'timetable',
      'resources',
    ];

    for (const table of expectedTables) {
      expect(tableNames).toContain(table);
    }
  });

  it('performs idempotent seeding without overwriting', async () => {
    await seedInitialData(db);
    const initialCount = await db.curriculumVersions.count();
    expect(initialCount).toBeGreaterThan(0);

    // Running seedInitialData a second time should be idempotent
    await seedInitialData(db);
    const secondCount = await db.curriculumVersions.count();
    expect(secondCount).toBe(initialCount);
  });
});
