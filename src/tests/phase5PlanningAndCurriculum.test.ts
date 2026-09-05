/**
 * UNS SCHOOL — Phase 5 Planning & Curriculum Test Suite
 * Validates data-driven curriculum exploration, deterministic sequence progress calculation,
 * competency and objective tracking, academic-year/class isolation, and historical curriculum integrity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { curriculumRepository } from '../db/repositories/curriculumRepository';
import { lessonRepository } from '../db/repositories/lessonRepository';
import {
  computeSequenceProgress,
  computeClassPlanningOverview,
  computeCompetencyCoverage,
  computeObjectiveCoverage,
} from '../services/planningCalculationService';
import type {
  CurriculumVersion,
  CurriculumLevelConfig,
  CurriculumSequence,
  CompetencyDefinition,
  SessionRubricDefinition,
  LearningObjectiveDefinition,
  Lesson,
} from '../types';

describe('Phase 5: Planning & Curriculum Architecture', () => {
  const testSchoolId = 'school-test-1';
  const testYear1Id = 'ay-2024-2025';
  const testYear2Id = 'ay-2025-2026';
  const testClass1Id = 'class-1am-1';
  const testClass2Id = 'class-1am-2';
  const testHistoricalCurrId = 'curr-dz-v2020';
  const testActiveCurrId = 'curr-dz-v2024';

  const createTestLesson = (partial: Partial<Lesson>): Lesson => {
    const now = new Date().toISOString();
    return {
      id: partial.id || `lesson-${Math.random().toString(36).substring(2, 9)}`,
      academicYearId: partial.academicYearId || testYear1Id,
      classId: partial.classId || testClass1Id,
      levelCode: partial.levelCode || '1MS',
      curriculumVersionId: partial.curriculumVersionId || testActiveCurrId,
      sequenceId: partial.sequenceId,
      rubricId: partial.rubricId || 'rub-practice',
      sessionNumberInSequence: partial.sessionNumberInSequence || 1,
      date: partial.date || '2024-10-01',
      startTime: partial.startTime || '08:00',
      endTime: partial.endTime || '09:00',
      title: partial.title || 'Lesson Title',
      specificObjectives: partial.specificObjectives || [],
      targetedCompetencyIds: partial.targetedCompetencyIds || [],
      materialsAndAids: partial.materialsAndAids || [],
      activitySteps: partial.activitySteps || [],
      isCompleted: partial.isCompleted ?? true,
      isArchived: partial.isArchived ?? false,
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now,
    };
  };

  beforeEach(async () => {
    // Clear all relevant tables before each test
    await db.lessons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();
    await db.curriculumVersions.clear();
    await db.curriculumLevels.clear();
    await db.curriculumSequences.clear();
    await db.learningObjectives.clear();
    await db.competencies.clear();
    await db.sessionRubrics.clear();

    // 0. Seed School
    await db.schools.put({
      id: testSchoolId,
      name: 'CEM Test School',
      wilaya: 'Algiers',
      commune: 'Bab El Oued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. Seed Academic Years
    await db.academicYears.put({
      id: testYear1Id,
      schoolId: testSchoolId,
      label: '2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.academicYears.put({
      id: testYear2Id,
      schoolId: testSchoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: false,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Seed Classes
    await db.classes.put({
      id: testClass1Id,
      schoolId: testSchoolId,
      academicYearId: testYear1Id,
      name: '1AM 1',
      levelCode: '1MS',
      roomNumber: 'Room 10',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.classes.put({
      id: testClass2Id,
      schoolId: testSchoolId,
      academicYearId: testYear1Id,
      name: '1AM 2',
      levelCode: '1MS',
      roomNumber: 'Room 11',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Seed Curriculum Versions (Active & Historical)
    const activeVersion: CurriculumVersion = {
      id: testActiveCurrId,
      code: 'ALGERIA-CEM-ENG-2024',
      title: 'National Middle School English Syllabus (2024)',
      status: 'active',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await curriculumRepository.saveVersion(activeVersion);

    const historicalVersion: CurriculumVersion = {
      id: testHistoricalCurrId,
      code: 'ALGERIA-CEM-ENG-2020',
      title: 'National Middle School English Syllabus (2020 Archive)',
      status: 'historical',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await curriculumRepository.saveVersion(historicalVersion);

    // 4. Seed Levels
    const level1MS: CurriculumLevelConfig = {
      id: 'lvl-1ms-2024',
      curriculumVersionId: testActiveCurrId,
      levelCode: '1MS',
      levelTitle: '1st Year Middle School (1AM)',
      weeklyHoursRecommended: 3,
      exitProfileDescription: 'Basic interpersonal communication and foundational English literacy.',
      order: 1,
    };
    await curriculumRepository.saveLevel(level1MS);

    // 5. Seed Competencies
    const compC1: CompetencyDefinition = {
      id: 'comp-c1',
      curriculumVersionId: testActiveCurrId,
      levelCode: 'ALL',
      code: 'C1',
      name: 'Interact orally in English',
      order: 1,
    };
    const compC2: CompetencyDefinition = {
      id: 'comp-c2',
      curriculumVersionId: testActiveCurrId,
      levelCode: 'ALL',
      code: 'C2',
      name: 'Interpret oral and written texts',
      order: 2,
    };
    await curriculumRepository.saveCompetency(compC1);
    await curriculumRepository.saveCompetency(compC2);

    // 6. Seed Rubrics
    const rub1: SessionRubricDefinition = {
      id: 'rub-practice',
      curriculumVersionId: testActiveCurrId,
      code: 'i_practise',
      name: 'I Practise',
      pedagogicalStage: 'Practice',
      defaultDurationMinutes: 60,
      order: 1,
    };
    await curriculumRepository.saveRubric(rub1);

    // 7. Seed Sequences
    const seq1: CurriculumSequence = {
      id: 'seq-1am-seq1',
      curriculumVersionId: testActiveCurrId,
      levelCode: '1MS',
      sequenceNumber: 1,
      title: 'Sequence 1: Me and My Friends',
      communicativeObjective: 'Introduce oneself and exchange personal information.',
      projectWorkTitle: 'My Identity Card',
      targetedCompetencyIds: ['comp-c1', 'comp-c2'],
      plannedSessionsCount: 10,
      order: 1,
    };
    const seq2: CurriculumSequence = {
      id: 'seq-1am-seq2',
      curriculumVersionId: testActiveCurrId,
      levelCode: '1MS',
      sequenceNumber: 2,
      title: 'Sequence 2: Me and My Family',
      communicativeObjective: 'Describe family members and home environment.',
      projectWorkTitle: 'My Family Album',
      targetedCompetencyIds: ['comp-c1', 'comp-c2'],
      plannedSessionsCount: 10,
      order: 2,
    };
    await curriculumRepository.saveSequence(seq1);
    await curriculumRepository.saveSequence(seq2);

    // 8. Seed Learning Objectives
    const obj1: LearningObjectiveDefinition = {
      id: 'obj-1',
      sequenceId: 'seq-1am-seq1',
      curriculumVersionId: testActiveCurrId,
      type: 'Communicative',
      description: 'Greet formally and informally.',
      order: 1,
    };
    const obj2: LearningObjectiveDefinition = {
      id: 'obj-2',
      sequenceId: 'seq-1am-seq1',
      curriculumVersionId: testActiveCurrId,
      type: 'Linguistic',
      description: 'Use the verb to be in simple present.',
      order: 2,
    };
    await curriculumRepository.saveObjective(obj1);
    await curriculumRepository.saveObjective(obj2);
  });

  describe('1. Curriculum Explorer & Repository Operations', () => {
    it('retrieves active and historical curriculum versions correctly', async () => {
      const versions = await curriculumRepository.listVersions();
      expect(versions).toHaveLength(2);

      const active = await curriculumRepository.getActiveVersion();
      expect(active).toBeDefined();
      expect(active?.id).toBe(testActiveCurrId);
      expect(active?.status).toBe('active');

      const historical = await curriculumRepository.getVersionById(testHistoricalCurrId);
      expect(historical).toBeDefined();
      expect(historical?.status).toBe('historical');
    });

    it('retrieves sequences and objectives by curriculum version and level', async () => {
      const sequences = await curriculumRepository.listSequences(testActiveCurrId, '1MS');
      expect(sequences).toHaveLength(2);
      expect(sequences[0].sequenceNumber).toBe(1);
      expect(sequences[1].sequenceNumber).toBe(2);

      const objectives = await curriculumRepository.listObjectives('seq-1am-seq1');
      expect(objectives).toHaveLength(2);
      expect(objectives[0].type).toBe('Communicative');
      expect(objectives[1].type).toBe('Linguistic');
    });

    it('prevents deleting a sequence if lessons reference it', async () => {
      const sampleLesson = createTestLesson({
        id: 'lesson-with-seq',
        academicYearId: testYear1Id,
        classId: testClass1Id,
        curriculumVersionId: testActiveCurrId,
        sequenceId: 'seq-1am-seq1',
        rubricId: 'rub-practice',
        date: '2024-10-01',
        title: 'Greeting and Introductions',
        isCompleted: true,
      });
      await lessonRepository.create(sampleLesson);

      await expect(curriculumRepository.deleteSequence('seq-1am-seq1')).rejects.toThrow(
        /Cannot delete sequence/
      );
    });
  });

  describe('2. Deterministic Sequence Progress Calculation', () => {
    it('computes sequence progress metrics accurately from authoritative Lesson records', () => {
      const sequence: CurriculumSequence = {
        id: 'seq-1',
        curriculumVersionId: testActiveCurrId,
        levelCode: '1MS',
        sequenceNumber: 1,
        title: 'Sequence 1: Me and My Friends',
        targetedCompetencyIds: ['comp-c1'],
        plannedSessionsCount: 10,
        order: 1,
      };

      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 1',
          isCompleted: true,
        }),
        createTestLesson({
          id: 'l-2',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-03',
          startTime: '09:00',
          endTime: '10:00',
          title: 'Lesson 2',
          isCompleted: true,
        }),
        createTestLesson({
          id: 'l-3',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-05',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 3 (Planned)',
          isCompleted: false, // Incomplete / Planned
        }),
      ];

      const metrics = computeSequenceProgress(sequence, lessons);

      expect(metrics.plannedSessionsCount).toBe(10);
      expect(metrics.recordedLessonsCount).toBe(3);
      expect(metrics.completedLessonsCount).toBe(2);
      expect(metrics.remainingSessionsCount).toBe(8); // 10 planned - 2 completed
      expect(metrics.completionPercentage).toBe(20); // (2 / 10) * 100 = 20%
      expect(metrics.firstLessonDate).toBe('2024-10-01');
      expect(metrics.lastLessonDate).toBe('2024-10-05');
    });

    it('computes class planning overview aggregating all sequences', () => {
      const sequences: CurriculumSequence[] = [
        {
          id: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          levelCode: '1MS',
          sequenceNumber: 1,
          title: 'Sequence 1',
          targetedCompetencyIds: [],
          plannedSessionsCount: 10,
          order: 1,
        },
        {
          id: 'seq-2',
          curriculumVersionId: testActiveCurrId,
          levelCode: '1MS',
          sequenceNumber: 2,
          title: 'Sequence 2',
          targetedCompetencyIds: [],
          plannedSessionsCount: 10,
          order: 2,
        },
      ];

      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 1',
          isCompleted: true,
        }),
        createTestLesson({
          id: 'l-2',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-2',
          rubricId: 'rub-practice',
          date: '2024-10-15',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 2',
          isCompleted: true,
        }),
      ];

      const overview = computeClassPlanningOverview({
        classId: testClass1Id,
        academicYearId: testYear1Id,
        levelCode: '1MS',
        sequences,
        lessons,
      });

      expect(overview.totalPlannedSessions).toBe(20);
      expect(overview.totalRecordedLessons).toBe(2);
      expect(overview.totalCompletedLessons).toBe(2);
      expect(overview.overallProgressPercentage).toBe(10); // 2 / 20 = 10%
      expect(overview.sequencesMetrics).toHaveLength(2);
    });
  });

  describe('3. Academic-Year & Class Isolation', () => {
    it('isolates planning progress strictly by classId and academicYearId', () => {
      const sequences: CurriculumSequence[] = [
        {
          id: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          levelCode: '1MS',
          sequenceNumber: 1,
          title: 'Sequence 1',
          targetedCompetencyIds: [],
          plannedSessionsCount: 10,
          order: 1,
        },
      ];

      const mixedLessons: Lesson[] = [
        // Target: Class 1, Year 1 (Completed)
        createTestLesson({
          id: 'l-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 1',
          isCompleted: true,
        }),
        // Different Class: Class 2, Year 1
        createTestLesson({
          id: 'l-2',
          academicYearId: testYear1Id,
          classId: testClass2Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Class 2 Lesson',
          isCompleted: true,
        }),
        // Different Academic Year: Class 1, Year 2
        createTestLesson({
          id: 'l-3',
          academicYearId: testYear2Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2025-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Next Year Lesson',
          isCompleted: true,
        }),
      ];

      const overviewClass1 = computeClassPlanningOverview({
        classId: testClass1Id,
        academicYearId: testYear1Id,
        levelCode: '1MS',
        sequences,
        lessons: mixedLessons,
      });

      expect(overviewClass1.totalRecordedLessons).toBe(1);
      expect(overviewClass1.totalCompletedLessons).toBe(1);
      expect(overviewClass1.overallProgressPercentage).toBe(10);
    });
  });

  describe('4. Competency and Objective Tracking', () => {
    it('tracks competency targeting frequency and active dates', () => {
      const competencies: CompetencyDefinition[] = [
        {
          id: 'comp-c1',
          curriculumVersionId: testActiveCurrId,
          levelCode: 'ALL',
          code: 'C1',
          name: 'Oral Interaction',
          order: 1,
        },
        {
          id: 'comp-c2',
          curriculumVersionId: testActiveCurrId,
          levelCode: 'ALL',
          code: 'C2',
          name: 'Text Interpretation',
          order: 2,
        },
      ];

      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 1',
          targetedCompetencyIds: ['comp-c1'],
          isCompleted: true,
        }),
        createTestLesson({
          id: 'l-2',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          rubricId: 'rub-practice',
          date: '2024-10-05',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Lesson 2',
          targetedCompetencyIds: ['comp-c1', 'comp-c2'],
          isCompleted: true,
        }),
      ];

      const metrics = computeCompetencyCoverage(competencies, lessons);

      expect(metrics[0].competency.code).toBe('C1');
      expect(metrics[0].targetedLessonsCount).toBe(2);
      expect(metrics[0].firstTargetedDate).toBe('2024-10-01');
      expect(metrics[0].lastTargetedDate).toBe('2024-10-05');

      expect(metrics[1].competency.code).toBe('C2');
      expect(metrics[1].targetedLessonsCount).toBe(1);
      expect(metrics[1].firstTargetedDate).toBe('2024-10-05');
    });

    it('matches sequence learning objectives to lesson specific objectives', () => {
      const objectives: LearningObjectiveDefinition[] = [
        {
          id: 'obj-1',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Communicative',
          description: 'Greet formally and informally',
          order: 1,
        },
        {
          id: 'obj-2',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Linguistic',
          description: 'Use the verb to be in simple present',
          order: 2,
        },
      ];

      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-1',
          rubricId: 'rub-practice',
          date: '2024-10-01',
          startTime: '08:00',
          endTime: '09:00',
          title: 'Greeting lesson',
          specificObjectives: ['Greet formally and informally'],
          isCompleted: true,
        }),
      ];

      const coverage = computeObjectiveCoverage(objectives, lessons);

      expect(coverage[0].objective.id).toBe('obj-1');
      expect(coverage[0].addressedInLessonsCount).toBe(1);

      expect(coverage[1].objective.id).toBe('obj-2');
      expect(coverage[1].addressedInLessonsCount).toBe(0);
    });
  });

  describe('5. Historical Curriculum Integrity', () => {
    it('preserves historical curriculum version references in lessons without corruption', async () => {
      // Seed historical rubric belonging to the 2020 historical curriculum
      await curriculumRepository.saveRubric({
        id: 'rub-practice-2020',
        curriculumVersionId: testHistoricalCurrId,
        code: 'i_practise',
        name: 'I Practise (2020)',
        pedagogicalStage: 'Practice',
        defaultDurationMinutes: 60,
        order: 1,
      });

      // Seed a historical sequence belonging to the 2020 historical curriculum
      await curriculumRepository.saveSequence({
        id: 'seq-historical-1',
        curriculumVersionId: testHistoricalCurrId,
        levelCode: '1MS',
        sequenceNumber: 1,
        title: 'Historical Sequence 1 (2020)',
        targetedCompetencyIds: [],
        plannedSessionsCount: 10,
        order: 1,
      });

      const historicalLesson = createTestLesson({
        id: 'lesson-historical-2020',
        academicYearId: testYear1Id,
        classId: testClass1Id,
        curriculumVersionId: testHistoricalCurrId,
        sequenceId: 'seq-historical-1',
        rubricId: 'rub-practice-2020',
        date: '2024-10-01',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Old Curriculum Lesson',
        isCompleted: true,
      });

      await lessonRepository.create(historicalLesson);

      const retrieved = await lessonRepository.getById('lesson-historical-2020');
      expect(retrieved).toBeDefined();
      expect(retrieved?.curriculumVersionId).toBe(testHistoricalCurrId);
      expect(retrieved?.sequenceId).toBe('seq-historical-1');
      expect(retrieved?.rubricId).toBe('rub-practice-2020');

      // Verify historical version is still immutable and retrievable
      const histVersion = await curriculumRepository.getVersionById(testHistoricalCurrId);
      expect(histVersion?.status).toBe('historical');
    });
  });

  describe('6. Empty States and Edge Cases', () => {
    it('handles class with 0 recorded lessons cleanly', () => {
      const sequences: CurriculumSequence[] = [
        {
          id: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          levelCode: '1MS',
          sequenceNumber: 1,
          title: 'Sequence 1',
          targetedCompetencyIds: [],
          plannedSessionsCount: 12,
          order: 1,
        },
      ];

      const overview = computeClassPlanningOverview({
        classId: testClass1Id,
        academicYearId: testYear1Id,
        levelCode: '1MS',
        sequences,
        lessons: [],
      });

      expect(overview.totalPlannedSessions).toBe(12);
      expect(overview.totalRecordedLessons).toBe(0);
      expect(overview.totalCompletedLessons).toBe(0);
      expect(overview.overallProgressPercentage).toBe(0);
      expect(overview.isPlannedTargetConfigured).toBe(true);
      expect(overview.sequencesMetrics[0].completionPercentage).toBe(0);
      expect(overview.sequencesMetrics[0].remainingSessionsCount).toBe(12);
    });

    it('does NOT invent planning values when plannedSessionsCount is missing or zero', () => {
      const unconfiguredSequence: CurriculumSequence = {
        id: 'seq-unconfigured',
        curriculumVersionId: testActiveCurrId,
        levelCode: '1MS',
        sequenceNumber: 1,
        title: 'Sequence Without Target',
        targetedCompetencyIds: [],
        plannedSessionsCount: 0, // Unconfigured
        order: 1,
      };

      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-unconfigured-1',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          curriculumVersionId: testActiveCurrId,
          sequenceId: 'seq-unconfigured',
          title: 'Lesson 1',
          isCompleted: true,
        }),
      ];

      const metric = computeSequenceProgress(unconfiguredSequence, lessons);

      expect(metric.isPlannedTargetConfigured).toBe(false);
      expect(metric.plannedSessionsCount).toBeNull();
      expect(metric.remainingSessionsCount).toBeNull();
      expect(metric.completionPercentage).toBeNull();
      expect(metric.completedLessonsCount).toBe(1);
      expect(metric.recordedLessonsCount).toBe(1);

      const overview = computeClassPlanningOverview({
        classId: testClass1Id,
        academicYearId: testYear1Id,
        levelCode: '1MS',
        sequences: [unconfiguredSequence],
        lessons,
      });

      expect(overview.isPlannedTargetConfigured).toBe(false);
      expect(overview.totalPlannedSessions).toBe(0);
      expect(overview.overallProgressPercentage).toBeNull();
      expect(overview.totalRecordedLessons).toBe(1);
      expect(overview.totalCompletedLessons).toBe(1);
    });

    it('strictly avoids false-positive conflation of similar objective descriptions', () => {
      const objectives: LearningObjectiveDefinition[] = [
        {
          id: 'obj-base',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Linguistic',
          description: 'Use the verb to be in simple present',
          order: 1,
        },
        {
          id: 'obj-negative',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Linguistic',
          description: 'Use the verb to be in simple present negative form',
          order: 2,
        },
        {
          id: 'obj-questions',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Linguistic',
          description: 'Use the verb to be in simple present questions',
          order: 3,
        },
      ];

      // Lesson specifically targets only the negative form
      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-neg',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          sequenceId: 'seq-1',
          specificObjectives: ['Use the verb to be in simple present negative form.'],
          isCompleted: true,
        }),
      ];

      const coverage = computeObjectiveCoverage(objectives, lessons);

      // obj-negative must match
      expect(coverage.find((c) => c.objective.id === 'obj-negative')?.addressedInLessonsCount).toBe(1);
      // obj-base must NOT match (even though obj-base string is a substring of obj-negative)
      expect(coverage.find((c) => c.objective.id === 'obj-base')?.addressedInLessonsCount).toBe(0);
      // obj-questions must NOT match
      expect(coverage.find((c) => c.objective.id === 'obj-questions')?.addressedInLessonsCount).toBe(0);
    });

    it('strictly rejects objective matching across sequence boundaries', () => {
      const objectives: LearningObjectiveDefinition[] = [
        {
          id: 'obj-seq1',
          sequenceId: 'seq-1',
          curriculumVersionId: testActiveCurrId,
          type: 'Communicative',
          description: 'Introduce family members',
          order: 1,
        },
        {
          id: 'obj-seq2',
          sequenceId: 'seq-2',
          curriculumVersionId: testActiveCurrId,
          type: 'Communicative',
          description: 'Introduce family members',
          order: 1,
        },
      ];

      // Lesson belongs to Sequence 2
      const lessons: Lesson[] = [
        createTestLesson({
          id: 'l-seq2',
          academicYearId: testYear1Id,
          classId: testClass1Id,
          sequenceId: 'seq-2',
          specificObjectives: ['Introduce family members'],
          isCompleted: true,
        }),
      ];

      const coverage = computeObjectiveCoverage(objectives, lessons);

      expect(coverage.find((c) => c.objective.id === 'obj-seq1')?.addressedInLessonsCount).toBe(0);
      expect(coverage.find((c) => c.objective.id === 'obj-seq2')?.addressedInLessonsCount).toBe(1);
    });
  });
});
