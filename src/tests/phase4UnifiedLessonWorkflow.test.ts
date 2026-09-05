/**
 * UNS SCHOOL — Phase 4: Unified Lesson Workflow Tests
 * Verifies that Lesson is the single authoritative source of truth,
 * automatically synchronizing HomeworkTask records and deriving
 * Cahier Journal and Cahier de Textes views.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  lessonRepository,
  homeworkRepository,
} from '../db/repositories';
import type {
  AcademicYear,
  SchoolClass,
  CurriculumVersion,
  CurriculumSequence,
  SessionRubricDefinition,
  CurriculumCompetency,
  Lesson,
  LessonActivityPlan,
  HomeworkTask,
} from '../types';

describe('Phase 4 — Unified Lesson Workflow & Derived Projections', () => {
  const schoolId = 'school-p4-test';
  const activeYearId = 'year-p4-active';
  const archivedYearId = 'year-p4-archived';
  const class1Id = 'class-p4-1ms1';
  const class2Id = 'class-p4-2ms1';
  const archivedClassId = 'class-p4-archived';
  const curriculumVersionId = 'curr-p4-dz-2016';

  const sequence1Id = 'seq-p4-1ms-1';
  const rubricPresentationId = 'rubric-p4-presentation';
  const competencyInteractingId = 'comp-p4-c1';
  const competencyInterpretingId = 'comp-p4-c2';

  beforeEach(async () => {
    await db.homework.clear();
    await db.attendance.clear();
    await db.lessons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();
    await db.curriculumVersions.clear();
    await db.curriculumLevels.clear();
    await db.curriculumSequences.clear();
    await db.sessionRubrics.clear();
    await db.competencies.clear();

    const now = new Date().toISOString();

    // 1. School
    await db.schools.add({
      id: schoolId,
      name: 'CEM Mouloud Feraoun',
      commune: 'Tizi Ouzou',
      wilaya: '15',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Curriculum
    const currVersion: CurriculumVersion = {
      id: curriculumVersionId,
      code: 'DZ-MS-ENG-2016',
      title: 'National Curriculum of English 2016',
      status: 'active',
      isOfficial: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.curriculumVersions.add(currVersion);

    // Sequences
    const seq1: CurriculumSequence = {
      id: sequence1Id,
      curriculumVersionId,
      levelCode: '1MS',
      sequenceNumber: 1,
      title: 'Me and My Friends',
      communicativeObjective: 'Greetings, personal pronouns, introducing oneself',
      targetedCompetencyIds: [competencyInteractingId],
      plannedSessionsCount: 12,
      order: 1,
    };
    await db.curriculumSequences.add(seq1);

    // Rubrics
    const rubric1: SessionRubricDefinition = {
      id: rubricPresentationId,
      curriculumVersionId,
      code: 'PRESENTATION',
      name: 'I Listen and Do',
      pedagogicalStage: 'Presentation',
      defaultDurationMinutes: 60,
      order: 1,
    };
    await db.sessionRubrics.add(rubric1);

    // Competencies
    const comp1: CurriculumCompetency = {
      id: competencyInteractingId,
      curriculumVersionId,
      levelCode: '1MS',
      code: 'C1',
      name: 'Interact Orally in English',
      description: 'Can communicate simple messages verbally in everyday situations',
      order: 1,
    };
    const comp2: CurriculumCompetency = {
      id: competencyInterpretingId,
      curriculumVersionId,
      levelCode: '1MS',
      code: 'C2',
      name: 'Interpret Oral and Written Texts',
      description: 'Can extract meaning from basic authentic or pedagogical input',
      order: 2,
    };
    await db.competencies.bulkAdd([comp1, comp2]);

    // 3. Academic Years
    const activeYear: AcademicYear = {
      id: activeYearId,
      schoolId,
      label: '2026/2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    const archivedYear: AcademicYear = {
      id: archivedYearId,
      schoolId,
      label: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.academicYears.bulkAdd([activeYear, archivedYear]);

    // 4. Classes
    const class1: SchoolClass = {
      id: class1Id,
      schoolId,
      academicYearId: activeYearId,
      name: '1MS 1',
      levelCode: '1MS',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    const class2: SchoolClass = {
      id: class2Id,
      schoolId,
      academicYearId: activeYearId,
      name: '2MS 1',
      levelCode: '2MS',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    const archivedClass: SchoolClass = {
      id: archivedClassId,
      schoolId,
      academicYearId: activeYearId,
      name: '1MS Archived',
      levelCode: '1MS',
      isArchived: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.classes.bulkAdd([class1, class2, archivedClass]);
  });

  it('creates an authoritative Lesson with didactic activity steps and retrieves them intact', async () => {
    const activitySteps: LessonActivityPlan[] = [
      {
        id: 'step-1',
        stepNumber: 1,
        phaseName: 'Warm-up / Review',
        allocatedMinutes: 5,
        teacherRoleAndInstructions: 'Greets pupils and conducts a quick greeting review ball toss.',
        studentRoleAndTasks: 'Respond to greetings and pass the ball.',
        interactionPattern: 'Teacher-Pupil',
        materialsAndAids: 'Soft ball',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        phaseName: 'Presentation / Input',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Presents dialogue script on coursebook p. 12.',
        studentRoleAndTasks: 'Listen to the audio track and repeat target expressions.',
        interactionPattern: 'Teacher-Pupil',
        materialsAndAids: 'Coursebook & Audio player',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        phaseName: 'Controlled Practice',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Distributes pair dialogue completion prompt.',
        studentRoleAndTasks: 'Work in pairs to fill missing greeting verbs.',
        interactionPattern: 'Pupil-Pupil',
        materialsAndAids: 'Worksheet 1',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        phaseName: 'Production / Free Practice',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Invites pairs to roleplay introducing their seatmate to the class.',
        studentRoleAndTasks: 'Act out the dialogue in front of peers.',
        interactionPattern: 'Group',
        materialsAndAids: 'Props / Name tags',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        phaseName: 'Consolidation / Wrap-up',
        allocatedMinutes: 10,
        teacherRoleAndInstructions: 'Summarizes key expressions and announces homework.',
        studentRoleAndTasks: 'Note down homework in Cahier de Textes.',
        interactionPattern: 'Plenary',
        materialsAndAids: 'Whiteboard',
      },
    ];

    const lesson: Lesson = {
      id: 'lesson-101',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-10-15',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Oral Interaction: Greeting Peers',
      specificObjectives: [
        'By the end of the lesson, learners can greet each other appropriately in English.',
        'Learners can introduce their first name using "My name is...".',
      ],
      targetedCompetencyIds: [competencyInteractingId],
      materialsAndAids: ['Coursebook p.12', 'Audio player', 'Flashcards'],
      activitySteps,
      teacherReflectionNotes: 'Learners were very receptive. High engagement during the ball toss.',
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lesson);

    const saved = await lessonRepository.getById('lesson-101');
    expect(saved).toBeDefined();
    expect(saved?.title).toBe('Oral Interaction: Greeting Peers');
    expect(saved?.activitySteps).toHaveLength(5);
    expect(saved?.activitySteps?.[0].phaseName).toBe('Warm-up / Review');
    expect(saved?.activitySteps?.[2].interactionPattern).toBe('Pupil-Pupil');
    expect(saved?.targetedCompetencyIds).toEqual([competencyInteractingId]);
  });

  it('automatically synchronizes HomeworkTask when Lesson specifies homework fields', async () => {
    const lessonWithHw: Lesson = {
      id: 'lesson-with-hw-1',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 2,
      date: '2026-10-18',
      startTime: '09:00',
      endTime: '10:00',
      title: 'Vocabulary: School Supplies',
      specificObjectives: ['Name 6 classroom items in English'],
      targetedCompetencyIds: [competencyInterpretingId],
      materialsAndAids: ['Flashcards'],
      activitySteps: [],
      assignedHomeworkTitle: 'Activity 3 p. 15',
      assignedHomeworkInstructions: 'Draw and label 5 classroom objects in your notebook.',
      assignedHomeworkDueDate: '2026-10-22',
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lessonWithHw);

    // Verify HomeworkTask was automatically created in db.homework
    const hwList = await homeworkRepository.listByLesson('lesson-with-hw-1');
    expect(hwList).toHaveLength(1);
    const hw = hwList[0];
    expect(hw.title).toBe('Activity 3 p. 15');
    expect(hw.instructions).toBe('Draw and label 5 classroom objects in your notebook.');
    expect(hw.assignedDate).toBe('2026-10-18');
    expect(hw.dueDate).toBe('2026-10-22');
    expect(hw.classId).toBe(class1Id);
    expect(hw.academicYearId).toBe(activeYearId);
  });

  it('updates linked HomeworkTask when Lesson homework details or date change', async () => {
    const lesson: Lesson = {
      id: 'lesson-update-hw',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 3,
      date: '2026-10-19',
      startTime: '10:00',
      endTime: '11:00',
      title: 'Grammar: Indefinite Articles A/An',
      specificObjectives: ['Differentiate between a and an before vowel sounds'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Task 1 p. 18',
      assignedHomeworkDueDate: '2026-10-24',
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lesson);

    // Update lesson date and homework details
    await lessonRepository.update('lesson-update-hw', {
      date: '2026-10-20',
      assignedHomeworkTitle: 'Task 1 & 2 p. 18 (Extended)',
      assignedHomeworkInstructions: 'Complete sentences with a or an.',
      assignedHomeworkDueDate: '2026-10-25',
    });

    const updatedHw = await homeworkRepository.listByLesson('lesson-update-hw');
    expect(updatedHw).toHaveLength(1);
    expect(updatedHw[0].assignedDate).toBe('2026-10-20'); // Synchronized with new lesson date
    expect(updatedHw[0].title).toBe('Task 1 & 2 p. 18 (Extended)');
    expect(updatedHw[0].instructions).toBe('Complete sentences with a or an.');
    expect(updatedHw[0].dueDate).toBe('2026-10-25');
  });

  it('removes linked HomeworkTask when Lesson clears assigned homework', async () => {
    const lesson: Lesson = {
      id: 'lesson-clear-hw',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 4,
      date: '2026-10-21',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Spelling and Phonetics: /p/ vs /b/',
      specificObjectives: ['Discriminate between bilabial plosives'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Pronunciation Drill 2',
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lesson);
    expect(await homeworkRepository.listByLesson('lesson-clear-hw')).toHaveLength(1);

    // Clear homework in lesson update
    await lessonRepository.update('lesson-clear-hw', {
      assignedHomeworkTitle: undefined,
      assignedHomeworkInstructions: undefined,
      assignedHomeworkDueDate: undefined,
    });

    expect(await homeworkRepository.listByLesson('lesson-clear-hw')).toHaveLength(0);
  });

  it('atomically deletes linked HomeworkTask when the Lesson is deleted', async () => {
    const lesson: Lesson = {
      id: 'lesson-cascade-del',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 5,
      date: '2026-10-22',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Review and Formative Check',
      specificObjectives: ['Review Sequence 1 progress'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Mini-Project Outline',
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lesson);
    expect(await homeworkRepository.listByLesson('lesson-cascade-del')).toHaveLength(1);

    // Delete lesson
    await lessonRepository.delete('lesson-cascade-del');

    // Both lesson and homework must be gone
    expect(await lessonRepository.getById('lesson-cascade-del')).toBeUndefined();
    expect(await homeworkRepository.listByLesson('lesson-cascade-del')).toHaveLength(0);
  });

  it('rejects lesson creation with invalid targeted competency IDs', async () => {
    const invalidLesson: Lesson = {
      id: 'lesson-bad-comp',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-10-23',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Faulty Competency Test',
      specificObjectives: ['Test invalid competencies'],
      targetedCompetencyIds: ['non-existent-comp-999'],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(lessonRepository.create(invalidLesson)).rejects.toThrow(
      /Targeted competency with id non-existent-comp-999 does not exist/i
    );
  });

  it('enforces homework referential integrity: rejects archived year or archived class', async () => {
    const hw1: HomeworkTask = {
      id: 'hw-bad-year',
      academicYearId: archivedYearId,
      classId: class1Id,
      title: 'Impossible Homework',
      instructions: 'Should fail',
      assignedDate: '2025-10-01',
      dueDate: '2025-10-05',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Cannot create directly in an archived academic year
    await expect(homeworkRepository.create(hw1)).rejects.toThrow(/archived/i);

    const hw2: HomeworkTask = {
      id: 'hw-bad-class',
      academicYearId: activeYearId,
      classId: archivedClassId,
      title: 'Impossible Homework in Archived Class',
      instructions: 'Should fail',
      assignedDate: '2026-10-01',
      dueDate: '2026-10-05',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Cannot create directly in an archived class
    await expect(homeworkRepository.create(hw2)).rejects.toThrow(/archived/i);
  });

  it('supports derived Cahier Journal querying: chronological sorting by date and time', async () => {
    const l1: Lesson = {
      id: 'cj-l1',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-11-03',
      startTime: '10:00',
      endTime: '11:00',
      title: 'Session 2 of the Day',
      specificObjectives: ['Objective B'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const l2: Lesson = {
      id: 'cj-l2',
      academicYearId: activeYearId,
      classId: class2Id,
      levelCode: '2MS',
      curriculumVersionId,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-11-03',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Session 1 of the Day',
      specificObjectives: ['Objective A'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(l1);
    await lessonRepository.create(l2);

    const dayLessons = await lessonRepository.listByAcademicYearAndDate(activeYearId, '2026-11-03');
    expect(dayLessons).toHaveLength(2);
    // Chronological order by startTime
    expect(dayLessons[0].id).toBe('cj-l2');
    expect(dayLessons[0].startTime).toBe('08:00');
    expect(dayLessons[1].id).toBe('cj-l1');
    expect(dayLessons[1].startTime).toBe('10:00');
  });

  it('supports derived Cahier de Textes querying: filtered by classId with linked homework', async () => {
    const lClass1: Lesson = {
      id: 'ct-l1',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-11-05',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Class 1 Lesson',
      specificObjectives: ['Objective C1'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Class 1 Homework Task',
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lClass2: Lesson = {
      id: 'ct-l2',
      academicYearId: activeYearId,
      classId: class2Id,
      levelCode: '2MS',
      curriculumVersionId,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-11-05',
      startTime: '10:00',
      endTime: '11:00',
      title: 'Class 2 Lesson',
      specificObjectives: ['Objective C2'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lessonRepository.create(lClass1);
    await lessonRepository.create(lClass2);

    // Query specifically for class 1
    const class1Lessons = await lessonRepository.listByClass(class1Id);
    expect(class1Lessons).toHaveLength(1);
    expect(class1Lessons[0].title).toBe('Class 1 Lesson');

    // Query homework for class 1
    const class1Hw = await homeworkRepository.listByClass(class1Id);
    expect(class1Hw).toHaveLength(1);
    expect(class1Hw[0].title).toBe('Class 1 Homework Task');
    expect(class1Hw[0].lessonId).toBe('ct-l1');
  });

  it('strictly scopes Cahier de Textes by classId and academicYearId preventing cross-year leakage', async () => {
    const prevYearClassId = 'class-prev-year-1ms1';
    const prevClass: SchoolClass = {
      id: prevYearClassId,
      schoolId,
      academicYearId: archivedYearId,
      name: '1MS 1', // Same class name in previous year
      levelCode: '1MS',
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.classes.add(prevClass);

    // Insert previous year historical lesson directly into database (simulating pre-existing archived data)
    const prevYearLesson: Lesson = {
      id: 'lesson-prev-year-1',
      academicYearId: archivedYearId,
      classId: prevYearClassId,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2025-10-10',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Previous Year 1MS1 Lesson',
      specificObjectives: ['Old Objective'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Previous Year Homework',
      isCompleted: true,
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.lessons.add(prevYearLesson);
    await db.homework.add({
      id: 'hw-prev-year-1',
      lessonId: 'lesson-prev-year-1',
      academicYearId: archivedYearId,
      classId: prevYearClassId,
      assignedDate: '2025-10-10',
      dueDate: '2025-10-15',
      title: 'Previous Year Homework',
      instructions: 'Complete exercises',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create current year lesson for current 1MS 1 using lessonRepository.create
    const currYearLesson: Lesson = {
      id: 'lesson-curr-year-1',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId,
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-10-10',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Current Year 1MS1 Lesson',
      specificObjectives: ['New Objective'],
      targetedCompetencyIds: [],
      materialsAndAids: [],
      activitySteps: [],
      assignedHomeworkTitle: 'Current Year Homework',
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await lessonRepository.create(currYearLesson);

    // Verify listByClassAndAcademicYear for current active year
    const currentYearLessons = await lessonRepository.listByClassAndAcademicYear(class1Id, activeYearId);
    expect(currentYearLessons).toHaveLength(1);
    expect(currentYearLessons[0].id).toBe('lesson-curr-year-1');
    expect(currentYearLessons[0].title).toBe('Current Year 1MS1 Lesson');

    const currentYearHomework = await homeworkRepository.listByClassAndAcademicYear(class1Id, activeYearId);
    expect(currentYearHomework).toHaveLength(1);
    expect(currentYearHomework[0].title).toBe('Current Year Homework');

    // Verify listByClassAndAcademicYear for archived year
    const archivedYearLessons = await lessonRepository.listByClassAndAcademicYear(prevYearClassId, archivedYearId);
    expect(archivedYearLessons).toHaveLength(1);
    expect(archivedYearLessons[0].id).toBe('lesson-prev-year-1');
    expect(archivedYearLessons[0].title).toBe('Previous Year 1MS1 Lesson');

    const archivedYearHomework = await homeworkRepository.listByClassAndAcademicYear(prevYearClassId, archivedYearId);
    expect(archivedYearHomework).toHaveLength(1);
    expect(archivedYearHomework[0].title).toBe('Previous Year Homework');

    // Confirm querying current class with archived year yields 0
    const emptyLessons = await lessonRepository.listByClassAndAcademicYear(class1Id, archivedYearId);
    expect(emptyLessons).toHaveLength(0);

    const emptyHomework = await homeworkRepository.listByClassAndAcademicYear(class1Id, archivedYearId);
    expect(emptyHomework).toHaveLength(0);
  });

  it('preserves historical curriculum version metadata across curriculum updates', async () => {
    const legacyCurrVersionId = 'curr-legacy-2011';
    const legacySeqId = 'seq-legacy-1';
    const legacyRubricId = 'rubric-legacy-1';
    const legacyCompId = 'comp-legacy-1';

    // Add legacy curriculum version
    await db.curriculumVersions.add({
      id: legacyCurrVersionId,
      code: 'DZ-MS-ENG-2011',
      title: 'Legacy English Curriculum 2011',
      status: 'historical',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.curriculumSequences.add({
      id: legacySeqId,
      curriculumVersionId: legacyCurrVersionId,
      levelCode: '1MS',
      sequenceNumber: 1,
      title: 'Legacy Sequence 1: Hello World',
      communicativeObjective: 'Basic greeting formulas',
      targetedCompetencyIds: [legacyCompId],
      plannedSessionsCount: 8,
      order: 1,
    });

    await db.sessionRubrics.add({
      id: legacyRubricId,
      curriculumVersionId: legacyCurrVersionId,
      code: 'LEGACY_PRACTICE',
      name: 'Old Practice Rubric',
      pedagogicalStage: 'Practice',
      defaultDurationMinutes: 60,
      order: 1,
    });

    await db.competencies.add({
      id: legacyCompId,
      curriculumVersionId: legacyCurrVersionId,
      levelCode: '1MS',
      code: 'LC1',
      name: 'Legacy Oral Communication',
      description: 'Legacy competency description',
      order: 1,
    });

    // Create lesson referencing legacy curriculum version
    const legacyLesson: Lesson = {
      id: 'lesson-legacy-1',
      academicYearId: archivedYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId: legacyCurrVersionId,
      sequenceId: legacySeqId,
      rubricId: legacyRubricId,
      sessionNumberInSequence: 1,
      date: '2025-11-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Legacy Curriculum Lesson',
      specificObjectives: ['Legacy Objective'],
      targetedCompetencyIds: [legacyCompId],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create lesson referencing active curriculum version (2016)
    const modernLesson: Lesson = {
      id: 'lesson-modern-1',
      academicYearId: activeYearId,
      classId: class1Id,
      levelCode: '1MS',
      curriculumVersionId: curriculumVersionId, // 2016 version
      sequenceId: sequence1Id,
      rubricId: rubricPresentationId,
      sessionNumberInSequence: 1,
      date: '2026-11-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Modern Curriculum Lesson',
      specificObjectives: ['Modern Objective'],
      targetedCompetencyIds: [competencyInteractingId],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert legacy lesson directly into DB (representing pre-existing archived data)
    await db.lessons.add(legacyLesson);
    // Create modern lesson in active year via repository
    await lessonRepository.create(modernLesson);

    // Retrieve both lessons
    const retrievedLegacy = await lessonRepository.getById('lesson-legacy-1');
    const retrievedModern = await lessonRepository.getById('lesson-modern-1');

    expect(retrievedLegacy?.curriculumVersionId).toBe(legacyCurrVersionId);
    expect(retrievedLegacy?.sequenceId).toBe(legacySeqId);
    expect(retrievedLegacy?.rubricId).toBe(legacyRubricId);

    expect(retrievedModern?.curriculumVersionId).toBe(curriculumVersionId);
    expect(retrievedModern?.sequenceId).toBe(sequence1Id);
    expect(retrievedModern?.rubricId).toBe(rubricPresentationId);

    // Check sequence lookup from the repository directly
    const legacySeq = await db.curriculumSequences.get(retrievedLegacy!.sequenceId!);
    const modernSeq = await db.curriculumSequences.get(retrievedModern!.sequenceId!);

    expect(legacySeq?.title).toBe('Legacy Sequence 1: Hello World');
    expect(legacySeq?.curriculumVersionId).toBe(legacyCurrVersionId);

    expect(modernSeq?.title).toBe('Me and My Friends');
    expect(modernSeq?.curriculumVersionId).toBe(curriculumVersionId);

    // Check rubric lookup
    const legacyRub = await db.sessionRubrics.get(retrievedLegacy!.rubricId!);
    const modernRub = await db.sessionRubrics.get(retrievedModern!.rubricId!);

    expect(legacyRub?.name).toBe('Old Practice Rubric');
    expect(modernRub?.name).toBe('I Listen and Do');

    // Check competency lookup
    const legacyComp = await db.competencies.get(retrievedLegacy!.targetedCompetencyIds[0]);
    const modernComp = await db.competencies.get(retrievedModern!.targetedCompetencyIds[0]);

    expect(legacyComp?.name).toBe('Legacy Oral Communication');
    expect(modernComp?.name).toBe('Interact Orally in English');
  });
});
