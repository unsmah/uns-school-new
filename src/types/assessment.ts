/**
 * UNS SCHOOL — Assessment & Gradebook Types
 */

export interface Assessment {
  id: string;
  academicYearId: string;
  classId: string;
  gradingSchemeId: string; // References GradingScheme
  componentKey: string; // Matches GradingComponentConfig.componentKey
  termNumber: 1 | 2 | 3;
  title: string; // e.g. "Devoir N°1 du 1er Trimestre"
  date: string; // YYYY-MM-DD
  maxScore: number; // Default 20
  coefficient: number; // e.g. 1, 2
  curriculumSequenceId?: string;
  targetedCompetencyIds?: string[];
  isLocked: boolean; // Locked after term deliberation
  createdAt: string;
  updatedAt: string;
}

export interface GradeEntry {
  id: string;
  assessmentId: string; // References Assessment
  studentEnrollmentId: string; // References StudentEnrollment
  score: number | null; // null represents missing / absent
  isAbsent: boolean;
  isMedicalExemption: boolean;
  teacherRemarks?: string;
  updatedAt: string;
}
