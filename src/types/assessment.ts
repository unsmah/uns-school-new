/**
 * UNS SCHOOL — Assessment & Gradebook Types
 */

import type { GradingComponentConfig } from './school';

export interface Assessment {
  id: string;
  academicYearId: string;
  classId: string;
  gradingSchemeId: string; // References GradingScheme
  componentKey: string; // Matches GradingComponentConfig.componentKey
  termNumber: 1 | 2 | 3;
  title: string; // e.g. "Devoir N°1 du 1er Trimestre"
  description?: string;
  date: string; // YYYY-MM-DD
  maxScore: number; // Default 20
  coefficient: number; // e.g. 1, 2
  curriculumSequenceId?: string;
  targetedCompetencyIds?: string[];
  isLocked: boolean; // Locked after term deliberation
  componentSnapshot?: GradingComponentConfig; // Historical snapshot of component config at creation time
  maxOverallScoreSnapshot?: number; // Historical snapshot of grading scheme maxOverallScore at creation time
  createdAt: string;
  updatedAt: string;
}

export interface GradeEntry {
  id: string;
  assessmentId: string; // References Assessment
  studentEnrollmentId: string; // References StudentEnrollment
  score: number | null; // null represents missing / not entered
  isAbsent: boolean; // Unexcused absence (treated as 0 in official grading)
  isMedicalExemption: boolean; // Excused / Medical exemption (excluded from weighted calculations)
  teacherRemarks?: string;
  updatedAt: string;
}

export interface AssessmentStatistics {
  assessmentId: string;
  totalEnrolled: number;
  enteredCount: number;
  missingCount: number;
  absentCount: number;
  exemptCount: number;
  averageScore: number | null; // Scaled to assessment maxScore
  averageNormalizedScore: number | null; // Normalized out of 20
  highestScore: number | null;
  lowestScore: number | null;
  passCount: number; // Score >= 50% of maxScore
  passRatePercentage: number;
}

