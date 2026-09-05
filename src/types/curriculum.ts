/**
 * UNS SCHOOL — Versioned Curriculum Types
 * Data-driven architecture supporting multiple syllabus versions without hardcoded enums.
 */

export interface CurriculumVersion {
  id: string; // e.g. "dz-cem-ang-2024"
  code: string; // e.g. "ALGERIA-CEM-ENGLISH-V2024"
  title: string; // e.g. "Official Middle School English Curriculum"
  description?: string;
  effectiveFromAcademicYear?: string;
  status: 'active' | 'historical' | 'draft' | 'future';
  isOfficial: boolean;
  sourceDocumentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumLevelConfig {
  id: string;
  curriculumVersionId: string;
  levelCode: string; // e.g., "1MS", "2MS", "3MS", "4MS"
  levelTitle: string; // e.g. "1st Year Middle School (1AM)"
  weeklyHoursRecommended: number; // e.g., 3 or 4 hours
  exitProfileDescription?: string;
  order: number;
}

export interface CompetencyDefinition {
  id: string;
  curriculumVersionId: string;
  levelCode: string;
  code: string; // e.g. "C1", "C2", "C3"
  name: string; // e.g. "Interact orally in English"
  description?: string;
  criteria?: string[];
  order: number;
}

export interface SessionRubricDefinition {
  id: string;
  curriculumVersionId: string;
  levelCode?: string;
  code: string; // e.g. "initial_situation", "listen_and_do", "practise"
  name: string; // e.g. "I listen and do", "I pronounce", "I practise"
  pedagogicalStage: 'Pre-requisite' | 'Presentation' | 'Practice' | 'Production' | 'Integration' | 'Evaluation';
  defaultDurationMinutes: number;
  description?: string;
  order: number;
}

export interface CurriculumSequence {
  id: string;
  curriculumVersionId: string;
  levelCode: string;
  sequenceNumber: number; // 1, 2, 3...
  title: string; // e.g., "Sequence 1: Me, My Friends and My Family"
  communicativeObjective?: string;
  projectWorkTitle?: string;
  projectWorkDescription?: string;
  targetedCompetencyIds: string[];
  plannedSessionsCount: number;
  order: number;
}

export interface LearningObjectiveDefinition {
  id: string;
  sequenceId: string;
  curriculumVersionId: string;
  type: 'Linguistic' | 'Communicative' | 'Methodological' | 'Cultural';
  description: string;
  order: number;
}
