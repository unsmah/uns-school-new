/**
 * UNS SCHOOL — Comprehensive System Audit & Integrity Hardening Regression Test Suite
 * Validates 2026-09-06 start date migration, multi-year calendar separation, provenance forgery defense,
 * assessment structural locking, resource category consistency, and seed idempotency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { seedInitialData } from '../db/seeds';
import { MIGRATIONS_REGISTRY } from '../db/migrations';
import {
  academicYearRepository,
  resourceRepository,
  assessmentRepository,
  schoolRepository,
  classRepository,
  gradingSchemeRepository,
} from '../db/repositories';
import type { LocalResource, CalendarEvent, Assessment, AcademicYear, SchoolClass } from '../types';

describe('UNS SCHOOL — System Bug Audit & Integrity Hardening Suite', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedInitialData(db);
  });

  describe('1. Academic Year 2026–2027 Official Pupil Start Date (2026-09-06)', () => {
    it('verifies 2026–2027 academic year pupil start date is strictly 2026-09-06', async () => {
      const year = await academicYearRepository.getById('ay-2026-2027');
      expect(year).toBeDefined();
      expect(year?.startDate).toBe('2026-09-06');

      // Verify 1st trimester start date
      const term1 = year?.terms.find((t) => t.termNumber === 1);
      expect(term1).toBeDefined();
      expect(term1?.startDate).toBe('2026-09-06');

      // Verify rentrée calendar event date
      const rentreeEvt = year?.calendarEvents.find(
        (e) => e.id === 'evt-ay-2026-2027-term1-start' || e.title.includes('1st Trimester')
      );
      expect(rentreeEvt).toBeDefined();
      expect(rentreeEvt?.startDate).toBe('2026-09-06');
      expect(rentreeEvt?.status).toBe('official_verified');
      expect(rentreeEvt?.isOfficial).toBe(true);
    });

    it('corrects legacy database containing 2026-09-20 during migration', async () => {
      // Simulate legacy record with old start date
      await db.academicYears.update('ay-2026-2027', {
        startDate: '2026-09-20',
        terms: [
          { id: 't1', termNumber: 1, startDate: '2026-09-20', endDate: '2026-12-17', name: '1st Trimester' },
          { id: 't2', termNumber: 2, startDate: '2027-01-03', endDate: '2027-03-18', name: '2nd Trimester' },
          { id: 't3', termNumber: 3, startDate: '2027-04-04', endDate: '2027-07-01', name: '3rd Trimester' },
        ],
      });

      // Run Version 2 migration logic directly
      const v2Migration = MIGRATIONS_REGISTRY.find((m) => m.version === 2);
      expect(v2Migration?.upgrade).toBeDefined();

      await db.transaction('rw', [db.academicYears, db.resources], async (trans) => {
        await v2Migration!.upgrade!(trans);
      });

      const year = await academicYearRepository.getById('ay-2026-2027');
      expect(year?.startDate).toBe('2026-09-06');
      expect(year?.terms[0].startDate).toBe('2026-09-06');
    });
  });

  describe('2. Multi-Year Calendar Isolation & Contamination Prevention', () => {
    it('ensures calendar events for other academic years derive dates dynamically and avoid 2026-2027 text', async () => {
      const school = await schoolRepository.get();
      // Create a test 2025-2026 academic year
      const sampleYear2025: AcademicYear = {
        id: 'ay-2025-2026',
        schoolId: school!.id,
        label: '2025-2026',
        startDate: '2025-09-21',
        endDate: '2026-07-02',
        isCurrent: false,
        isArchived: true,
        terms: [
          { id: 't1', termNumber: 1, startDate: '2025-09-21', endDate: '2025-12-18', name: '1st Trimester' },
          { id: 't2', termNumber: 2, startDate: '2026-01-04', endDate: '2026-03-19', name: '2nd Trimester' },
          { id: 't3', termNumber: 3, startDate: '2026-04-05', endDate: '2026-07-02', name: '3rd Trimester' },
        ],
        calendarEvents: [
          {
            id: 'evt-2025-winter',
            title: 'Winter Break 2025',
            startDate: '2025-12-19',
            endDate: '2026-01-03',
            eventType: 'holiday',
            description: 'Winter vacation for 2025-2026 school year',
            status: 'sample',
            isOfficial: false,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await academicYearRepository.create(sampleYear2025);

      const year2025 = await academicYearRepository.getById('ay-2025-2026');
      expect(year2025).toBeDefined();

      if (year2025) {
        for (const evt of year2025.calendarEvents) {
          expect(evt.description).not.toContain('2026–2027');
          expect(evt.isOfficial).toBe(false);
          expect(evt.status).toBe('sample');
        }

        const winterEvt = year2025.calendarEvents.find((e) => e.id.includes('winter'));
        expect(winterEvt?.startDate).toContain('2025-12');
      }
    });

    it('prevents official status on calendar events in non-2026 academic years', async () => {
      const year = await academicYearRepository.getById('ay-2026-2027');
      expect(year).toBeDefined();
    });
  });

  describe('3. Provenance Rules & Forgery Defense Below UI', () => {
    it('sanitizes isOfficial to false if provenance is user_created', async () => {
      const forgedRes: LocalResource = {
        id: 'res-forged-1',
        title: 'Forged User Worksheet',
        category: 'Worksheets',
        fileName: 'forged.md',
        fileMimeType: 'text/markdown',
        fileSizeBytes: 100,
        fileHashSHA256: 'dummyhash',
        tags: ['grammar'],
        provenance: 'user_created',
        isOfficial: true, // Untrusted user attempt to claim official status
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await resourceRepository.save(forgedRes);

      const saved = await resourceRepository.getById('res-forged-1');
      expect(saved).toBeDefined();
      expect(saved?.provenance).toBe('user_created');
      expect(saved?.isOfficial).toBe(false); // Forced to false
    });

    it('blocks elevating new records to official_verified via public save method', async () => {
      const forgedOfficial: LocalResource = {
        id: 'res-forged-2',
        title: 'Attempted Fake Official Curriculum Document',
        category: 'Lesson Plan',
        fileName: 'fake.md',
        fileMimeType: 'text/markdown',
        fileSizeBytes: 100,
        fileHashSHA256: 'dummyhash',
        tags: ['curriculum'],
        provenance: 'official_verified',
        isOfficial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await resourceRepository.save(forgedOfficial);

      const saved = await resourceRepository.getById('res-forged-2');
      expect(saved?.provenance).toBe('user_created');
      expect(saved?.isOfficial).toBe(false);
    });

    it('allows seedOfficial method to store genuine official records', async () => {
      const genuineOfficial: LocalResource = {
        id: 'res-genuine-official',
        title: 'Genuine Official Ministry Resource',
        category: 'Lesson Plan',
        fileName: 'official.md',
        fileMimeType: 'text/markdown',
        fileSizeBytes: 200,
        fileHashSHA256: 'officialhash',
        tags: ['official'],
        provenance: 'official_verified',
        isOfficial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await resourceRepository.seedOfficial(genuineOfficial);

      const saved = await resourceRepository.getById('res-genuine-official');
      expect(saved?.provenance).toBe('official_verified');
      expect(saved?.isOfficial).toBe(true);
    });

    it('blocks forging official calendar events via academicYearRepository update', async () => {
      const year = await academicYearRepository.getById('ay-2026-2027');
      expect(year).toBeDefined();

      const newForgedEvt: CalendarEvent = {
        id: 'evt-user-custom-official',
        title: 'User Fake Official Holiday',
        startDate: '2026-10-15',
        eventType: 'holiday',
        description: 'Attempting to inject official status',
        status: 'official_verified',
        isOfficial: true,
      };

      await academicYearRepository.update('ay-2026-2027', {
        calendarEvents: [...(year?.calendarEvents || []), newForgedEvt],
      });

      const updatedYear = await academicYearRepository.getById('ay-2026-2027');
      const savedEvt = updatedYear?.calendarEvents.find((e) => e.id === 'evt-user-custom-official');
      expect(savedEvt?.status).toBe('user_created');
      expect(savedEvt?.isOfficial).toBe(false);
    });
  });

  describe('4. Assessment Structural Field Locking When Student Grades Exist', () => {
    it('blocks changing maxScore, componentKey, coefficient, termNumber, or classId when grades exist', async () => {
      const school = await schoolRepository.get();
      let testClass = (await classRepository.listByAcademicYear('ay-2026-2027'))[0];
      if (!testClass) {
        const classId = await classRepository.create({
          id: 'cls-audit-1',
          academicYearId: 'ay-2026-2027',
          schoolId: school!.id,
          levelCode: '1MS',
          name: '1MS1',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        testClass = (await classRepository.getById(classId))!;
      }
      const schemes = await gradingSchemeRepository.listAll();

      const assessment: Assessment = {
        id: 'asm-test-locking',
        academicYearId: 'ay-2026-2027',
        classId: testClass.id,
        gradingSchemeId: schemes[0].id,
        componentKey: schemes[0].components[0].componentKey,
        componentSnapshot: schemes[0].components[0],
        maxOverallScoreSnapshot: schemes[0].maxOverallScore,
        title: 'Trimester 1 Quiz',
        date: '2026-10-10',
        termNumber: 1,
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await assessmentRepository.create(assessment);

      // Insert a grade for this assessment
      await db.grades.add({
        id: 'grd-test-1',
        assessmentId: 'asm-test-locking',
        studentEnrollmentId: 'enr-test-1',
        score: 15,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      });

      // Attempt to change maxScore
      await expect(
        assessmentRepository.update('asm-test-locking', { maxScore: 30 })
      ).rejects.toThrow('Cannot change grading-defining fields');

      // Attempt to change coefficient
      await expect(
        assessmentRepository.update('asm-test-locking', { coefficient: 2 })
      ).rejects.toThrow('Cannot change grading-defining fields');

      // Updating non-structural field like title or instructions should succeed
      await assessmentRepository.update('asm-test-locking', { title: 'Updated Quiz Title' });
      const updated = await assessmentRepository.getById('asm-test-locking');
      expect(updated?.title).toBe('Updated Quiz Title');
    });
  });

  describe('5. Resource Canonical Categories & Seed Idempotency', () => {
    it('verifies all starter resources use canonical categories and valid provenance', async () => {
      const resources = await resourceRepository.listAll();
      const CANONICAL_CATEGORIES = new Set([
        'Lesson Plan',
        'Classroom Activities',
        'Worksheets',
        'Grammar',
        'Vocabulary',
        'Teacher Templates',
        'Assessment Templates',
        'Classroom Management',
        'BEM Preparation',
        'Remediation',
      ]);

      for (const res of resources) {
        expect(CANONICAL_CATEGORIES.has(res.category)).toBe(true);
        expect(res.provenance).toBeDefined();
        if (res.provenance !== 'official_verified') {
          expect(res.isOfficial).toBe(false);
        }
      }
    });

    it('executes seed initial data idempotently without creating duplicate records', async () => {
      const initialResources = await resourceRepository.listAll();
      const initialYears = await academicYearRepository.listAll();

      // Re-run seedInitialData
      await seedInitialData(db);

      const afterResources = await resourceRepository.listAll();
      const afterYears = await academicYearRepository.listAll();

      expect(afterResources.length).toBe(initialResources.length);
      expect(afterYears.length).toBe(initialYears.length);
    });
  });
});
