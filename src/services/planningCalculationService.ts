/**
 * UNS SCHOOL — Planning & Curriculum Calculation Service
 * Deterministic calculation of sequence progress, pacing metrics, competency coverage,
 * and learning objective alignment directly derived from authoritative database records.
 *
 * SCOPE & INVARIANTS:
 * - Pure calculations: no fake percentages or artificial fallbacks/projections.
 * - Strictly isolated by academicYearId and classId.
 * - Read-only derived data layer respecting immutable historical curriculum versions.
 *
 * DATA MODEL & OBJECTIVE IDENTITY NOTE:
 * In the current Lesson model, specific objectives are recorded as communicative/linguistic
 * statements (selected from predefined sequence objectives or specified by the teacher).
 * Objective matching is strictly deterministic:
 * 1. Sequences must match identically (lesson.sequenceId === objective.sequenceId).
 * 2. Statements are normalized (trim, lowercase, trailing punctuation stripped, whitespace collapsed)
 *    and compared for exact equality.
 * 3. Loose/fuzzy substring matching is strictly prohibited to prevent conflating distinct
 *    similar objectives (e.g. "verb to be in present simple" vs "verb to be in present simple negative").
 */

import type {
  Lesson,
  CurriculumSequence,
  CompetencyDefinition,
  LearningObjectiveDefinition,
} from '../types';

export interface SequenceProgressMetrics {
  sequence: CurriculumSequence;
  /** Valid planned session target if configured (> 0), or null if unconfigured/unknown */
  plannedSessionsCount: number | null;
  recordedLessonsCount: number;
  completedLessonsCount: number;
  /** Remaining sessions to reach planned target, or null if planned target is unconfigured */
  remainingSessionsCount: number | null;
  /** Completion percentage (0-100), or null if planned target is unconfigured */
  completionPercentage: number | null;
  /** True if sequence has a valid plannedSessionsCount > 0 */
  isPlannedTargetConfigured: boolean;
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
  /** Overall progress percentage across configured sequences, or null if no valid targets exist */
  overallProgressPercentage: number | null;
  /** True if at least one sequence has a valid planned session target */
  isPlannedTargetConfigured: boolean;
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
 * Normalizes objective text for deterministic exact-match comparisons.
 * Strips outer whitespace, converts to lowercase, collapses internal whitespace,
 * and removes trailing punctuation (. , ; :).
 */
export function normalizeObjectiveText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,;:!\n\r\t]+$/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Computes deterministic progress metrics for a single curriculum sequence.
 * Does NOT invent or assume planning targets (no artificial fallbacks).
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

  const isPlannedTargetConfigured =
    typeof sequence.plannedSessionsCount === 'number' && sequence.plannedSessionsCount > 0;
  const plannedSessionsCount = isPlannedTargetConfigured ? sequence.plannedSessionsCount : null;
  const recordedLessonsCount = sequenceLessons.length;
  const completedLessonsCount = sequenceLessons.filter((l) => l.isCompleted).length;

  const remainingSessionsCount = isPlannedTargetConfigured && plannedSessionsCount !== null
    ? Math.max(0, plannedSessionsCount - completedLessonsCount)
    : null;

  const completionPercentage = isPlannedTargetConfigured && plannedSessionsCount !== null && plannedSessionsCount > 0
    ? Math.min(100, Math.round((completedLessonsCount / plannedSessionsCount) * 100))
    : null;

  return {
    sequence,
    plannedSessionsCount,
    recordedLessonsCount,
    completedLessonsCount,
    remainingSessionsCount,
    completionPercentage,
    isPlannedTargetConfigured,
    lessons: sequenceLessons,
    firstLessonDate: sequenceLessons[0]?.date || null,
    lastLessonDate: sequenceLessons[sequenceLessons.length - 1]?.date || null,
  };
}

/**
 * Computes deterministic class-level planning overview across all sequences.
 * Aggregates only configured sequence targets.
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

  const configuredSequences = sequences.filter(
    (seq) => typeof seq.plannedSessionsCount === 'number' && seq.plannedSessionsCount > 0
  );
  const isPlannedTargetConfigured = configuredSequences.length > 0;

  const totalPlannedSessions = configuredSequences.reduce(
    (sum, seq) => sum + seq.plannedSessionsCount,
    0
  );

  const totalRecordedLessons = scopedLessons.length;
  const totalCompletedLessons = scopedLessons.filter((l) => l.isCompleted).length;

  const overallProgressPercentage =
    isPlannedTargetConfigured && totalPlannedSessions > 0
      ? Math.min(100, Math.round((totalCompletedLessons / totalPlannedSessions) * 100))
      : null;

  return {
    classId,
    academicYearId,
    levelCode,
    totalPlannedSessions,
    totalRecordedLessons,
    totalCompletedLessons,
    overallProgressPercentage,
    isPlannedTargetConfigured,
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
 * Computes coverage metrics for each learning objective deterministically.
 * Strict identity: exact sequence match + exact normalized objective string comparison.
 * Substring / fuzzy matching is disallowed to prevent false-positive conflation.
 */
export function computeObjectiveCoverage(
  objectives: LearningObjectiveDefinition[],
  lessonsForClassInYear: Lesson[],
  sequencesMap?: Map<string, CurriculumSequence>
): ObjectiveCoverageMetrics[] {
  return objectives.map((obj) => {
    const normalizedTarget = normalizeObjectiveText(obj.description);

    const matchingLessons = lessonsForClassInYear.filter((l) => {
      // Must belong strictly to the same curriculum sequence
      if (!l.sequenceId || l.sequenceId !== obj.sequenceId) {
        return false;
      }
      if (!l.specificObjectives || l.specificObjectives.length === 0) {
        return false;
      }

      return l.specificObjectives.some((spec) => {
        const normalizedSpec = normalizeObjectiveText(spec);
        // Strict exact equality comparison
        return normalizedSpec === normalizedTarget;
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

