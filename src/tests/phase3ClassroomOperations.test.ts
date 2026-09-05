import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  timetableRepository,
  lessonRepository,
  attendanceRepository,
  classRepository,
  academicYearRepository,
  studentEnrollmentRepository,
  studentPersonRepository,
} from '../db/repositories';
import type {
  AcademicYear,
  SchoolClass,
  StudentPerson,
  StudentEnrollment,
  Lesson,
  AttendanceRecord,
  TimetableSlot,
  CurriculumVersion,
} from '../types';

describe('Phase 3 — Classroom Operations & Integrity Tests', () => {
  const schoolId = 'school-p3-test';
  const activeYearId = 'year-p3-active';
  const archivedYearId = 'year-p3-archived';
  const class1Id = 'class-p3-1ms1';
  const class2Id = 'class-p3-2ms1';
  const archivedClassId = 'class-p3-archived';
  const curriculumVersionId = 'curr-p3-dz-2016';
  const altCurriculumVersionId = 'curr-p3-alt-2020';

  beforeEach(async () => {
    await db.timetable.clear();
    await db.attendance.clear();
    await db.lessons.clear();
    await db.studentEnrollments.clear();
    await db.studentPersons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();
    await db.curriculumVersions.clear();
    await db.curriculumLevels.clear();
    await db.curriculumSequences.clear();
    await db.sessionRubrics.clear();

    const now = new Date().toISOString();

    // 1. School
    await db.schools.add({
      id: schoolId,
      name: 'CEM Ibn Khaldoun',
      commune: 'Bab El Oued',
      wilaya: '16',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Primary Curriculum Version & Levels & Sequences & Rubrics
    const currVersion: CurriculumVersion = {
      id: curriculumVersionId,
      code: 'DZ-MS-EN-2016',
      title: 'Algerian Middle School English 2016',
      status: 'active',
      isOfficial: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.curriculumVersions.add(currVersion);

    await db.curriculumLevels.add({
      id: 'lvl-p3-1ms',
      curriculumVersionId,
      levelCode: '1MS',
      levelTitle: '1st Year',
      weeklyHoursRecommended: 3,
      order: 1,
    });

    await db.curriculumLevels.add({
      id: 'lvl-p3-2ms',
      curriculumVersionId,
      levelCode: '2MS',
      levelTitle: '2nd Year',
      weeklyHoursRecommended: 3,
      order: 2,
    });

    await db.curriculumSequences.add({
      id: 'seq-1ms-1',
      curriculumVersionId,
      levelCode: '1MS',
      sequenceNumber: 1,
      title: 'Me and My Friends',
      targetedCompetencyIds: [],
      plannedSessionsCount: 6,
      order: 1,
    });

    await db.curriculumSequences.add({
      id: 'seq-2ms-1',
      curriculumVersionId,
      levelCode: '2MS',
      sequenceNumber: 1,
      title: 'Me and My Shopping',
      targetedCompetencyIds: [],
      plannedSessionsCount: 6,
      order: 1,
    });

    await db.sessionRubrics.add({
      id: 'rub-listen-do',
      curriculumVersionId,
      code: 'listen_and_do',
      name: 'I Listen and Do',
      pedagogicalStage: 'Presentation',
      defaultDurationMinutes: 60,
      order: 1,
    });

    await db.sessionRubrics.add({
      id: 'rub-2ms-only',
      curriculumVersionId,
      code: 'grammar_focus_2ms',
      name: 'Grammar Practice 2MS',
      pedagogicalStage: 'Practice',
      levelCode: '2MS',
      defaultDurationMinutes: 60,
      order: 2,
    });

    // 3. Alternate Curriculum Version for cross-version rejection tests
    const altCurrVersion: CurriculumVersion = {
      id: altCurriculumVersionId,
      code: 'DZ-MS-EN-2020',
      title: 'Alternative Curriculum Version',
      status: 'active',
      isOfficial: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.curriculumVersions.add(altCurrVersion);

    await db.curriculumLevels.add({
      id: 'lvl-p3-alt-1ms',
      curriculumVersionId: altCurriculumVersionId,
      levelCode: '1MS',
      levelTitle: '1st Year Alt',
      weeklyHoursRecommended: 3,
      order: 1,
    });

    await db.curriculumSequences.add({
      id: 'seq-alt-1ms-1',
      curriculumVersionId: altCurriculumVersionId,
      levelCode: '1MS',
      sequenceNumber: 1,
      title: 'Alt Sequence',
      targetedCompetencyIds: [],
      plannedSessionsCount: 6,
      order: 1,
    });

    await db.sessionRubrics.add({
      id: 'rub-alt-version',
      curriculumVersionId: altCurriculumVersionId,
      code: 'alt_rubric',
      name: 'Alt Rubric',
      pedagogicalStage: 'Presentation',
      defaultDurationMinutes: 60,
      order: 1,
    });

    // 4. Active & Archived Academic Years
    const activeYear: AcademicYear = {
      id: activeYearId,
      schoolId,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    await academicYearRepository.create(activeYear);

    const archivedYear: AcademicYear = {
      id: archivedYearId,
      schoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.academicYears.add(archivedYear);

    // 5. Classes
    const class1: SchoolClass = {
      id: class1Id,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      roomNumber: 'Salle 04',
      createdAt: now,
      updatedAt: now,
    };
    await classRepository.create(class1);

    const class2: SchoolClass = {
      id: class2Id,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '2MS',
      name: '2MS 1',
      isArchived: false,
      roomNumber: 'Salle 05',
      createdAt: now,
      updatedAt: now,
    };
    await classRepository.create(class2);

    const archivedClass: SchoolClass = {
      id: archivedClassId,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '1MS',
      name: '1MS Archived',
      isArchived: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.classes.add(archivedClass);
  });

  describe('Timetable Operations & Conflict Scoping', () => {
    it('successfully creates a Sunday-Thursday weekly slot and lists by day', async () => {
      const slot: TimetableSlot = {
        id: 'slot-sun-p1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
        roomNumber: 'Salle 04',
      };

      const savedId = await timetableRepository.create(slot);
      expect(savedId).toBe('slot-sun-p1');

      const sundaySlots = await timetableRepository.listByDay(activeYearId, 'Sunday');
      expect(sundaySlots).toHaveLength(1);
      expect(sundaySlots[0].classId).toBe(class1Id);
      expect(sundaySlots[0].periodNumber).toBe(1);
    });

    it('rejects invalid teaching days outside Algerian Sunday-Thursday week', async () => {
      const invalidSlot: any = {
        id: 'slot-fri-p1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Friday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidSlot)).rejects.toThrow(
        /Invalid teaching day "Friday"/i
      );
    });

    it('rejects invalid period numbers (< 1 or > 8)', async () => {
      const invalidPeriodSlot: TimetableSlot = {
        id: 'slot-p9',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 9,
        startTime: '16:00',
        endTime: '17:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidPeriodSlot)).rejects.toThrow(
        /Invalid period number/i
      );
    });

    it('rejects invalid time ranges where startTime >= endTime', async () => {
      const invalidTimeSlot: TimetableSlot = {
        id: 'slot-inverted-time',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Tuesday',
        periodNumber: 2,
        startTime: '10:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidTimeSlot)).rejects.toThrow(
        /Invalid time range/i
      );
    });

    it('rejects timetable slot creation in archived academic year', async () => {
      const archivedYearSlot: TimetableSlot = {
        id: 'slot-archived-year',
        academicYearId: archivedYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(archivedYearSlot)).rejects.toThrow(
        /archived academic year/i
      );
    });

    it('rejects timetable slot for an archived class', async () => {
      const archivedClassSlot: TimetableSlot = {
        id: 'slot-archived-class',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Wednesday',
        periodNumber: 3,
        startTime: '10:00',
        endTime: '11:00',
        classId: archivedClassId,
      };

      await expect(timetableRepository.create(archivedClassSlot)).rejects.toThrow(
        /archived class/i
      );
    });

    it('rejects duplicate slot on same day and period for the same class', async () => {
      const slot1: TimetableSlot = {
        id: 'slot-same-class-1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot1);

      const slot2: TimetableSlot = {
        id: 'slot-same-class-2',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class1Id, // Same class!
      };

      await expect(timetableRepository.create(slot2)).rejects.toThrow(
        /already exists for class class-p3-1ms1 on Thursday Period 4/i
      );
    });

    it('allows different classes to have slots on the same day and period', async () => {
      const slotClass1: TimetableSlot = {
        id: 'slot-diff-class-1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class1Id,
      };
      await timetableRepository.create(slotClass1);

      const slotClass2: TimetableSlot = {
        id: 'slot-diff-class-2',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class2Id, // Different class!
      };

      const id2 = await timetableRepository.create(slotClass2);
      expect(id2).toBe('slot-diff-class-2');

      const thursdaySlots = await timetableRepository.listByDay(activeYearId, 'Thursday');
      expect(thursdaySlots).toHaveLength(2);
    });

    it('allows slots with same class/day/period in different academic years', async () => {
      // First create a slot in activeYearId
      const slot1: TimetableSlot = {
        id: 'slot-year1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot1);

      // Create a 2nd active year and class
      const secondYear: AcademicYear = {
        id: 'year-second-active',
        schoolId,
        label: '2027-2028',
        startDate: '2027-09-01',
        endDate: '2028-06-30',
        isCurrent: false,
        isArchived: false,
        terms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.academicYears.add(secondYear);

      const secondYearClass: SchoolClass = {
        id: 'class-second-year',
        schoolId,
        academicYearId: 'year-second-active',
        levelCode: '1MS',
        name: '1MS 1 (2027)',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.classes.add(secondYearClass);

      const slot2: TimetableSlot = {
        id: 'slot-year2',
        academicYearId: 'year-second-active',
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: secondYearClass.id,
      };

      const id2 = await timetableRepository.create(slot2);
      expect(id2).toBe('slot-year2');
    });

    it('rejects updating a slot into an occupied slot for the same class', async () => {
      const slot1: TimetableSlot = {
        id: 'slot-upd-1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot1);

      const slot2: TimetableSlot = {
        id: 'slot-upd-2',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot2);

      // Updating slot2 to period 1 (which class1 already occupies)
      await expect(
        timetableRepository.update('slot-upd-2', { periodNumber: 1 })
      ).rejects.toThrow(/already exists for class class-p3-1ms1 on Monday Period 1/i);
    });

    it('allows updating a slot into the same period as a different class', async () => {
      const slotClass1: TimetableSlot = {
        id: 'slot-cls1-p1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Tuesday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };
      await timetableRepository.create(slotClass1);

      const slotClass2: TimetableSlot = {
        id: 'slot-cls2-p2',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Tuesday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: class2Id,
      };
      await timetableRepository.create(slotClass2);

      // Update slotClass2 to period 1 (allowed because class2 does not yet have a slot in period 1)
      await timetableRepository.update('slot-cls2-p2', { periodNumber: 1, startTime: '08:00', endTime: '09:00' });
      const updatedSlot = await timetableRepository.getById('slot-cls2-p2');
      expect(updatedSlot?.periodNumber).toBe(1);
    });

    it('prohibits mutating academicYearId or schoolId on existing slot', async () => {
      const slot: TimetableSlot = {
        id: 'slot-immutable-check',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot);

      await expect(
        timetableRepository.update('slot-immutable-check', { academicYearId: 'another-year' })
      ).rejects.toThrow(/academicYearId cannot be changed/i);

      await expect(
        timetableRepository.update('slot-immutable-check', { schoolId: 'another-school' })
      ).rejects.toThrow(/schoolId cannot be changed/i);
    });
  });

  describe('Lesson Curriculum Context Validation', () => {
    it('accepts valid curriculum version + sequence + rubric matching level', async () => {
      const validLesson: Lesson = {
        id: 'lesson-valid-curr',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-1ms-1',
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Valid Lesson Test',
        specificObjectives: ['Learn greetings'],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const id = await lessonRepository.create(validLesson);
      expect(id).toBe('lesson-valid-curr');
    });

    it('rejects lesson with nonexistent curriculum version', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-bad-version',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId: 'curr-nonexistent',
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Bad Version',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Curriculum version with id curr-nonexistent does not exist/i
      );
    });

    it('rejects lesson with nonexistent sequence', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-nonexistent-seq',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-nonexistent',
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Bad Seq',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Curriculum sequence with id seq-nonexistent does not exist/i
      );
    });

    it('rejects lesson with sequence from another curriculum version', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-wrong-version-seq',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-alt-1ms-1', // Belongs to altCurriculumVersionId
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Wrong Version Seq',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /belongs to curriculum version curr-p3-alt-2020/i
      );
    });

    it('rejects lesson with sequence for another level', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-wrong-level-seq',
        academicYearId: activeYearId,
        classId: class1Id, // 1MS class
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-2ms-1', // 2MS sequence
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Wrong Level Seq',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Curriculum sequence seq-2ms-1 is for level 2MS, not lesson level 1MS/i
      );
    });

    it('rejects lesson with nonexistent rubric', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-nonexistent-rubric',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-nonexistent',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Bad Rubric',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Session rubric with id rub-nonexistent does not exist/i
      );
    });

    it('rejects lesson with rubric from another curriculum version', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-wrong-version-rubric',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-alt-version', // Belongs to altCurriculumVersionId
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Wrong Version Rubric',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Session rubric rub-alt-version belongs to curriculum version curr-p3-alt-2020/i
      );
    });

    it('rejects lesson with rubric configured for another level', async () => {
      const invalidLesson: Lesson = {
        id: 'lesson-wrong-level-rubric',
        academicYearId: activeYearId,
        classId: class1Id, // 1MS class
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-2ms-only', // Configured strictly for 2MS
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Wrong Level Rubric',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
        /Session rubric rub-2ms-only is configured for level 2MS, not lesson level 1MS/i
      );
    });

    it('rejects updating a lesson to an invalid sequence or rubric relationship', async () => {
      const lesson: Lesson = {
        id: 'lesson-to-update-curr',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-1ms-1',
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Initial Valid Lesson',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lesson);

      // Attempt update to 2MS sequence
      await expect(
        lessonRepository.update(lesson.id, { sequenceId: 'seq-2ms-1' })
      ).rejects.toThrow(/is for level 2MS, not lesson level 1MS/i);

      // Attempt update to rubric from another curriculum version
      await expect(
        lessonRepository.update(lesson.id, { rubricId: 'rub-alt-version' })
      ).rejects.toThrow(/belongs to curriculum version curr-p3-alt-2020/i);
    });

    it('preserves existing historical lessons and their original curriculum references', async () => {
      const historicalLesson: Lesson = {
        id: 'lesson-historical',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        sequenceId: 'seq-1ms-1',
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Historical Lesson',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(historicalLesson);

      // Update non-curriculum field
      await lessonRepository.update(historicalLesson.id, {
        title: 'Historical Lesson with Refined Title',
      });

      const retrieved = await lessonRepository.getById(historicalLesson.id);
      expect(retrieved?.title).toBe('Historical Lesson with Refined Title');
      expect(retrieved?.curriculumVersionId).toBe(curriculumVersionId);
      expect(retrieved?.sequenceId).toBe('seq-1ms-1');
      expect(retrieved?.rubricId).toBe('rub-listen-do');
    });
  });

  describe('Bulk Attendance (markAllPresent) Atomicity & Scoping', () => {
    let student1EnrId: string;
    let student2EnrId: string;
    let wrongClassEnrId: string;
    let wrongYearEnrId: string;
    let testLesson: Lesson;

    beforeEach(async () => {
      const now = new Date().toISOString();

      // Student 1 & 2 in Class 1MS 1 (active year)
      const p1: StudentPerson = {
        id: 'p-1',
        firstNameLatin: 'Amin',
        lastNameLatin: 'Bensaid',
        gender: 'M',
        createdAt: now,
        updatedAt: now,
      };
      const p2: StudentPerson = {
        id: 'p-2',
        firstNameLatin: 'Fatima',
        lastNameLatin: 'Zahra',
        gender: 'F',
        createdAt: now,
        updatedAt: now,
      };
      const pWrongClass: StudentPerson = {
        id: 'p-wrong-cls',
        firstNameLatin: 'Karim',
        lastNameLatin: 'Ziani',
        gender: 'M',
        createdAt: now,
        updatedAt: now,
      };
      const pWrongYear: StudentPerson = {
        id: 'p-wrong-yr',
        firstNameLatin: 'Sofia',
        lastNameLatin: 'Kader',
        gender: 'F',
        createdAt: now,
        updatedAt: now,
      };

      await db.studentPersons.bulkAdd([p1, p2, pWrongClass, pWrongYear]);

      student1EnrId = 'enr-c1-1';
      student2EnrId = 'enr-c1-2';
      wrongClassEnrId = 'enr-c2-wrong';
      wrongYearEnrId = 'enr-archived-wrong';

      await studentEnrollmentRepository.create({
        id: student1EnrId,
        studentPersonId: p1.id,
        academicYearId: activeYearId,
        classId: class1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      await studentEnrollmentRepository.create({
        id: student2EnrId,
        studentPersonId: p2.id,
        academicYearId: activeYearId,
        classId: class1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 2,
        createdAt: now,
        updatedAt: now,
      });

      await studentEnrollmentRepository.create({
        id: wrongClassEnrId,
        studentPersonId: pWrongClass.id,
        academicYearId: activeYearId,
        classId: class2Id, // Class 2!
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      // Enrollment in archived year
      await db.studentEnrollments.add({
        id: wrongYearEnrId,
        studentPersonId: pWrongYear.id,
        academicYearId: archivedYearId, // Archived year!
        classId: class1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 3,
        createdAt: now,
        updatedAt: now,
      });

      testLesson = {
        id: 'lesson-for-att-atomicity',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-15',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Atomicity Roll Call Test',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      await lessonRepository.create(testLesson);
    });

    it('creates all records when all enrollments are valid', async () => {
      await attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, student2EnrId]);

      const records = await attendanceRepository.listByLesson(testLesson.id);
      expect(records).toHaveLength(2);
      expect(records.every((r) => r.status === 'Present')).toBe(true);
    });

    it('fails completely and writes ZERO records when one enrollment is nonexistent', async () => {
      await expect(
        attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, 'enr-nonexistent', student2EnrId])
      ).rejects.toThrow(/does not exist/i);

      const records = await attendanceRepository.listByLesson(testLesson.id);
      expect(records).toHaveLength(0); // Zero writes!
    });

    it('fails completely and writes ZERO records when one enrollment is from a different class', async () => {
      await expect(
        attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, wrongClassEnrId])
      ).rejects.toThrow(/does not belong to lesson class/i);

      const records = await attendanceRepository.listByLesson(testLesson.id);
      expect(records).toHaveLength(0); // Zero writes!
    });

    it('fails completely and writes ZERO records when one enrollment is from a different academic year', async () => {
      await expect(
        attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, wrongYearEnrId])
      ).rejects.toThrow(/does not belong to lesson academic year/i);

      const records = await attendanceRepository.listByLesson(testLesson.id);
      expect(records).toHaveLength(0); // Zero writes!
    });

    it('rejects duplicate enrollment IDs passed in array before persistence', async () => {
      await expect(
        attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, student1EnrId])
      ).rejects.toThrow(/Duplicate enrollment ID supplied to markAllPresent/i);

      const records = await attendanceRepository.listByLesson(testLesson.id);
      expect(records).toHaveLength(0);
    });

    it('re-running markAllPresent updates records in place without duplicating', async () => {
      await attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, student2EnrId]);
      const firstRunRecords = await attendanceRepository.listByLesson(testLesson.id);
      expect(firstRunRecords).toHaveLength(2);

      // Re-run
      await attendanceRepository.markAllPresent(testLesson.id, [student1EnrId, student2EnrId]);
      const secondRunRecords = await attendanceRepository.listByLesson(testLesson.id);
      expect(secondRunRecords).toHaveLength(2);
      expect(secondRunRecords.map((r) => r.id).sort()).toEqual(firstRunRecords.map((r) => r.id).sort());
    });
  });

  describe('Attendance Statistics Academic Year Scoping', () => {
    it('scopes class attendance statistics strictly to academicYearId + classId', async () => {
      const now = new Date().toISOString();

      // Create a student in Class 1
      const student: StudentPerson = {
        id: 'p-stat-scope',
        firstNameLatin: 'Nour',
        lastNameLatin: 'Haddad',
        gender: 'F',
        createdAt: now,
        updatedAt: now,
      };
      await db.studentPersons.add(student);

      const enr: StudentEnrollment = {
        id: 'enr-stat-scope',
        studentPersonId: student.id,
        academicYearId: activeYearId,
        classId: class1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: now,
        updatedAt: now,
      };
      await studentEnrollmentRepository.create(enr);

      // Lesson 1 in active year for Class 1
      const lessonActive: Lesson = {
        id: 'lesson-active-stat',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-20',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Active Year Lesson',
        specificObjectives: [],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      await lessonRepository.create(lessonActive);

      await attendanceRepository.recordAttendance({
        id: 'att-stat-1',
        lessonId: lessonActive.id,
        classId: class1Id,
        studentEnrollmentId: enr.id,
        date: lessonActive.date,
        status: 'Present',
        createdAt: now,
        updatedAt: now,
      });

      const stats = await attendanceRepository.getAttendanceStatsForClass(activeYearId, class1Id);
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalRecords).toBe(1);
      expect(stats.presentCount).toBe(1);
      expect(stats.absentCount).toBe(0);
      expect(stats.averageRate).toBe(100);

      // Calling with mismatched academicYearId rejects
      await expect(
        attendanceRepository.getAttendanceStatsForClass(archivedYearId, class1Id)
      ).rejects.toThrow(/does not belong to academic year/i);
    });
  });
});
