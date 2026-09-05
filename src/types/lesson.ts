/**
 * UNS SCHOOL — Lesson & Attendance Types
 * Lesson is the primary authoritative source of truth for pedagogical execution and attendance sessions.
 */

export type InteractionPattern = 'Teacher-Pupil' | 'Pupil-Pupil' | 'Individual' | 'Group' | 'Plenary';

export interface LessonActivityPlan {
  id: string;
  stepNumber: number;
  phaseName: string; // e.g. "Warm-up", "Presentation", "Controlled Practice", "Free Production", "Wrap-up"
  allocatedMinutes: number;
  teacherRoleAndInstructions: string;
  studentRoleAndTasks: string;
  interactionPattern: InteractionPattern;
  materialsAndAids?: string;
}

export interface Lesson {
  id: string; // Authoritative source record for this pedagogical event
  academicYearId: string;
  classId: string;
  levelCode: string;
  curriculumVersionId: string;
  sequenceId?: string; // References CurriculumSequence.id
  rubricId: string; // References SessionRubricDefinition.id (data-driven)
  sessionNumberInSequence: number; // e.g. Session 1, Session 2
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  title: string; // Pedagogical lesson title
  specificObjectives: string[];
  targetedCompetencyIds: string[];
  prerequisites?: string[];
  materialsAndAids: string[];
  activitySteps: LessonActivityPlan[];
  
  // Homework assignment
  assignedHomeworkTitle?: string;
  assignedHomeworkInstructions?: string;
  assignedHomeworkDueDate?: string;
  
  // Pedagogical Reflection & Quality Notes
  teacherReflectionNotes?: string;
  remediationPointsNoted?: string[];
  
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  lessonId: string; // Strict foreign key to Lesson (primary session anchor)
  classId: string;
  studentEnrollmentId: string; // Foreign key to StudentEnrollment
  date: string; // YYYY-MM-DD (must equal Lesson.date)
  status: AttendanceStatus;
  minutesLate?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}
