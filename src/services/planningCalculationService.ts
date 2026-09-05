/**
 * UNS SCHOOL — Planning & Curriculum Calculation Service
 * Deterministic calculation of sequence progress, pacing metrics, competency coverage,
 * and learning objective alignment directly derived from authoritative database records.
 *
 * SCOPE & INVARIANTS:
 * - Pure calculations: no fake percentages or artificial projections.
 * - Strictly isolated by academicYearId and classId.
 * - Read-only derived data layer respecting immutable historical curriculum versions.
 */

import type {
  Lesson,
  CurriculumSequence,
  CompetencyDefinition,
  LearningObjectiveDefinition,
} from '../types';

export interface SequenceProgressMetrics {
  sequence: CurriculumSequence;
  plannedSessionsCount: number;
  recordedLessonsCount: number;
  completedLessonsCount: number;
  remainingSessionsCount: number;
  completionPercentage: number;
  lessons: Lesson[];
  firstLessonDate: string | null;
  lastLessonDate: string | null;
}

export interface ClassPlanningOverview {
  classId: string;
  academicYearId: string;
  levelCode: string;
  totalPlannedSessions: number;
  totalRecordedLessons: number;
  totalCompletedLessons: number;
  overallProgressPercentage: number;
  sequencesMetrics: SequenceProgressMetrics[];
}

export interface CompetencyCoverageMetrics {
  competency: CompetencyDefinition;
  targetedLessonsCount: number;
  lessons: Lesson[];
  firstTargetedDate: string | null;
  lastTargetedDate: string | null;
}

export interface ObjectiveCoverageMetrics {
  objective: LearningObjectiveDefinition;
  sequenceTitle?: string;
  addressedInLessonsCount: number;
  lessons: Lesson[];
}

/**
 * Computes deterministic progress metrics for a single curriculum sequence.
 */
export function computeSequenceProgress(
  sequence: CurriculumSequence,
  lessonsForClassInYear: Lesson[]
): SequenceProgressMetrics {
  const sequenceLessons = lessonsForClassInYear
    .filter((l) => l.sequenceId === sequence.id)
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

  const plannedSessionsCount = sequence.plannedSessionsCount > 0 ? sequence.plannedSessionsCount : 12;
  const recordedLessonsCount = sequenceLessons.length;
  const completedLessonsCount = sequenceLessons.filter((l) => l.isCompleted).length;
  const remainingSessionsCount = Math.max(0, plannedSessionsCount - completedLessonsCount);
  const completionPercentage =
    plannedSessionsCount > 0
      ? Math.min(100, Math.round((completedLessonsCount / plannedSessionsCount) * 100))
      : 0;

  return {
    sequence,
    plannedSessionsCount,
    recordedLessonsCount,
    completedLessonsCount,
    remainingSessionsCount,
    completionPercentage,
    lessons: sequenceLessons,
    firstLessonDate: sequenceLessons[0]?.date || null,
    lastLessonDate: sequenceLessons[sequenceLessons.length - 1]?.date || null,
  };
}

/**
 * Computes deterministic class-level planning overview across all sequences.
 */
export function computeClassPlanningOverview(params: {
  classId: string;
  academicYearId: string;
  levelCode: string;
  sequences: CurriculumSequence[];
  lessons: Lesson[];
}): ClassPlanningOverview {
  const { classId, academicYearId, levelCode, sequences, lessons } = params;

  // Strictly enforce class and academic year isolation
  const scopedLessons = lessons.filter(
    (l) => l.classId === classId && l.academicYearId === academicYearId
  );

  const sequencesMetrics = sequences.map((seq) =>
    computeSequenceProgress(seq, scopedLessons)
  );

  const totalPlannedSessions = sequences.reduce(
    (sum, seq) => sum + (seq.plannedSessionsCount > 0 ? seq.plannedSessionsCount : 12),
    0
  );
  const totalRecordedLessons = scopedLessons.length;
  const totalCompletedLessons = scopedLessons.filter((l) => l.isCompleted).length;
  const overallProgressPercentage =
    totalPlannedSessions > 0
      ? Math.min(100, Math.round((totalCompletedLessons / totalPlannedSessions) * 100))
      : 0;

  return {
    classId,
    academicYearId,
    levelCode,
    totalPlannedSessions,
    totalRecordedLessons,
    totalCompletedLessons,
    overallProgressPercentage,
    sequencesMetrics,
  };
}

/**
 * Computes coverage metrics for each competency in the curriculum.
 */
export function computeCompetencyCoverage(
  competencies: CompetencyDefinition[],
  lessonsForClassInYear: Lesson[]
): CompetencyCoverageMetrics[] {
  return competencies.map((comp) => {
    const matchingLessons = lessonsForClassInYear
      .filter((l) => l.targetedCompetencyIds && l.targetedCompetencyIds.includes(comp.id))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      competency: comp,
      targetedLessonsCount: matchingLessons.length,
      lessons: matchingLessons,
      firstTargetedDate: matchingLessons[0]?.date || null,
      lastTargetedDate: matchingLessons[matchingLessons.length - 1]?.date || null,
    };
  });
}

/**
 * Computes coverage metrics for each learning objective.
 */
export function computeObjectiveCoverage(
  objectives: LearningObjectiveDefinition[],
  lessonsForClassInYear: Lesson[],
  sequencesMap?: Map<string, CurriculumSequence>
): ObjectiveCoverageMetrics[] {
  return objectives.map((obj) => {
    const normalizedTarget = obj.description.trim().toLowerCase();

    const matchingLessons = lessonsForClassInYear.filter((l) => {
      // Check if this lesson belongs to the same sequence
      if (l.sequenceId && l.sequenceId !== obj.sequenceId) {
        return false;
      }
      if (!l.specificObjectives || l.specificObjectives.length === 0) {
        return false;
      }
      return l.specificObjectives.some((spec) => {
        const normalizedSpec = spec.trim().toLowerCase();
        return (
          normalizedSpec === normalizedTarget ||
          normalizedSpec.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedSpec)
        );
      });
    });

    const sequence = sequencesMap?.get(obj.sequenceId);

    return {
      objective: obj,
      sequenceTitle: sequence?.title,
      addressedInLessonsCount: matchingLessons.length,
      lessons: matchingLessons,
    };
  });
}
