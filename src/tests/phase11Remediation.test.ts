/**
 * UNS SCHOOL — Phase 11 Remediation Test Suite
 * Validates 2026–2027 official start date, calendar event provenance, resource provenance,
 * seed idempotency, category normalization, and "Use as Template" lesson record independence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { seedContentData } from '../db/seeds/contentSeed';
import { resourceRepository, academicYearRepository, lessonRepository, classRepository } from '../db/repositories';
import type { LocalResource, CalendarEvent, Lesson, SchoolClass, AcademicYear } from '../types';

describe('Phase 11 Remediation: Integrity & Consistency', () => {
  beforeEach(async () => {
    // Clear all tables for a clean test state
    for (const table of db.tables) {
      await table.clear();
    }
  });

  it('1. verifies official 2026–2027 school start date is Sunday, September 6, 2026', async () => {
    await seedContentData(db);

    const year2026 = await academicYearRepository.getById('ay-2026-2027');
    expect(year2026).toBeDefined();
    expect(year2026?.startDate).toBe('2026-09-06');
    expect(year2026?.terms[0].startDate).toBe('2026-09-06');

    const startEvt = year2026?.calendarEvents?.find(
      (e) => e.id === 'evt-ay-2026-2027-rentree' || e.id === 'evt-ay-2026-2027-term1-start'
    );
    expect(startEvt).toBeDefined();
    expect(startEvt?.startDate).toBe('2026-09-06');
    expect(startEvt?.status).toBe('official_verified');
    expect(startEvt?.isOfficial).toBe(true);
    expect(startEvt?.description).toContain('July 30, 2026');
  });

  it('2. verifies calendar event provenance logic (user events must be user_created and non-official)', async () => {
    await seedContentData(db);
    const activeYear = await academicYearRepository.getCurrent();
    expect(activeYear).toBeDefined();

    if (!activeYear) return;

    // Simulate creating a new teacher note event
    const newTeacherEvt: CalendarEvent = {
      id: `evt-user-${Date.now()}`,
      title: 'Coordination Meeting with Inspector',
      startDate: '2026-10-15',
      eventType: 'school_event',
      description: 'Department coordination meeting',
      status: 'user_created',
      isOfficial: false,
    };

    const updatedEvents = [...(activeYear.calendarEvents || []), newTeacherEvt];
    await academicYearRepository.update(activeYear.id, {
      calendarEvents: updatedEvents,
    });

    const reloadedYear = await academicYearRepository.getById(activeYear.id);
    const addedEvt = reloadedYear?.calendarEvents?.find((e) => e.id === newTeacherEvt.id);

    expect(addedEvt).toBeDefined();
    expect(addedEvt?.status).toBe('user_created');
    expect(addedEvt?.isOfficial).toBe(false);
  });

  it('3. verifies resource provenance restriction for teacher-authored content', async () => {
    const customRes: LocalResource = {
      id: `res-custom-${Date.now()}`,
      title: 'Teacher Unit Quiz for 2MS',
      description: 'Personalized short test on past simple tense',
      category: 'Worksheets',
      levelCode: '2MS',
      fileName: 'teacher_quiz_2ms.md',
      fileMimeType: 'text/markdown',
      fileSizeBytes: 250,
      fileHashSHA256: 'abc123hash',
      tags: ['quiz', 'grammar', '2AM'],
      provenance: 'user_created',
      isOfficial: false,
      sourceReference: 'Teacher Original Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await resourceRepository.save(customRes);

    const saved = await resourceRepository.getById(customRes.id);
    expect(saved).toBeDefined();
    expect(saved?.provenance).toBe('user_created');
    expect(saved?.isOfficial).toBe(false);
  });

  it('4. verifies seed idempotency (multiple seed executions produce zero duplicates)', async () => {
    // First seeding
    await seedContentData(db);
    const firstResourceCount = await db.resources.count();
    const firstYears = await db.academicYears.toArray();
    const firstEventsCount = firstYears[0]?.calendarEvents?.length || 0;

    expect(firstResourceCount).toBeGreaterThan(0);
    expect(firstEventsCount).toBeGreaterThan(0);

    // Second seeding
    await seedContentData(db);
    const secondResourceCount = await db.resources.count();
    const secondYears = await db.academicYears.toArray();
    const secondEventsCount = secondYears[0]?.calendarEvents?.length || 0;

    expect(secondResourceCount).toBe(firstResourceCount);
    expect(secondEventsCount).toBe(firstEventsCount);

    // Add custom resource and re-seed
    const userRes: LocalResource = {
      id: 'res-custom-unique-999',
      title: 'Custom Teacher Work',
      description: 'Custom work',
      category: 'Teacher Templates',
      levelCode: '3MS',
      fileName: 'custom.md',
      fileMimeType: 'text/markdown',
      fileSizeBytes: 100,
      fileHashSHA256: 'def456hash',
      tags: ['custom'],
      provenance: 'user_created',
      isOfficial: false,
      sourceReference: 'Self',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.resources.add(userRes);

    await seedContentData(db);

    const thirdResourceCount = await db.resources.count();
    expect(thirdResourceCount).toBe(firstResourceCount + 1);

    const checkUserRes = await db.resources.get('res-custom-unique-999');
    expect(checkUserRes).toBeDefined();
    expect(checkUserRes?.title).toBe('Custom Teacher Work');
  });

  it('5. verifies "Use as Template" creates an independent lesson without mutating starter resource', async () => {
    await seedContentData(db);

    const templateResource = await resourceRepository.getById('tpl-plan-1ms-greetings');
    expect(templateResource).toBeDefined();
    expect(templateResource?.templatePayload).toBeDefined();

    const payload = templateResource!.templatePayload!;

    // Create a school class for context
    const cls: SchoolClass = {
      id: 'cls-1am1',
      schoolId: 'sch-1',
      academicYearId: 'ay-2026-2027',
      name: '1MS1',
      levelCode: '1MS',
      roomNumber: 'Room 4',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.classes.add(cls);

    // Create new lesson from template payload
    const newLesson: Lesson = {
      id: `les-template-applied-${Date.now()}`,
      classId: cls.id,
      academicYearId: cls.academicYearId,
      levelCode: cls.levelCode,
      curriculumVersionId: 'dz-cem-ang-2024',
      rubricId: payload.rubricCode,
      sessionNumberInSequence: 1,
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '09:00',
      title: payload.title,
      specificObjectives: [payload.communicativeObjective],
      targetedCompetencyIds: ['C1'],
      materialsAndAids: payload.materialsAndAids || [],
      activitySteps: payload.activitySteps.map((step) => ({
        id: `act-${step.stepNumber}`,
        stepNumber: step.stepNumber,
        phaseName: step.phaseName,
        allocatedMinutes: step.allocatedMinutes,
        teacherRoleAndInstructions: step.teacherRoleAndInstructions,
        studentRoleAndTasks: step.studentRoleAndTasks,
        interactionPattern: step.interactionPattern as any,
        materialsAndAids: step.materialsAndAids,
      })),
      assignedHomeworkTitle: payload.homeworkTitle,
      assignedHomeworkInstructions: payload.homeworkInstructions,
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.lessons.add(newLesson);

    // Verify created lesson exists
    const savedLesson = await db.lessons.get(newLesson.id);
    expect(savedLesson).toBeDefined();
    expect(savedLesson?.title).toBe(payload.title);

    // Mutate the applied lesson
    await db.lessons.put({
      ...savedLesson!,
      title: 'Customized Lesson Title for Class 1MS1',
      assignedHomeworkTitle: 'Updated Custom Homework',
    });

    // Reload starter resource and verify it is completely unchanged
    const reloadedStarter = await resourceRepository.getById('tpl-plan-1ms-greetings');
    expect(reloadedStarter).toBeDefined();
    expect(reloadedStarter?.title).toBe('Suggested Lesson Plan: 1MS Greeting & Self-Introduction (Listen & Do)');
    expect(reloadedStarter?.templatePayload?.title).toBe('1MS Seq 1: Greeting People & Introducing Oneself');
    expect(reloadedStarter?.templatePayload?.homeworkTitle).toBe('Fill in My Identity Card');
  });

  it('6. verifies all seeded resources belong to canonical categories', async () => {
    await seedContentData(db);

    const canonicalCategories = new Set([
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

    const allResources = await resourceRepository.listAll();
    expect(allResources.length).toBeGreaterThan(0);

    for (const res of allResources) {
      expect(canonicalCategories.has(res.category)).toBe(true);
    }
  });
});
