/**
 * UNS SCHOOL — Workflow Extras Types
 * Covers homework, pedagogical observations, remediation, timetable, and local resources.
 */

export interface HomeworkTask {
  id: string;
  classId: string;
  lessonId?: string; // Optional lesson linkage
  academicYearId: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  title: string;
  instructions: string;
  textbookReference?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentObservation {
  id: string;
  studentEnrollmentId: string;
  studentPersonId: string;
  classId: string;
  academicYearId: string;
  date: string;
  category: 'Participation' | 'Behaviour' | 'Pedagogical Difficulty' | 'Exceptional Effort' | 'Private Note';
  content: string;
  isPrivateToTeacher: boolean;
  createdAt: string;
}

export interface RemediationSession {
  id: string;
  academicYearId: string;
  classId: string;
  sequenceId?: string;
  competencyId?: string;
  identifiedPedagogicalWeakness: string;
  targetedStudentEnrollmentIds: string[];
  scheduledDate: string;
  remedialActivitiesDescription: string;
  outcomeEvaluationNotes?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableSlot {
  id: string;
  academicYearId: string;
  schoolId: string;
  dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  periodNumber: number; // 1..8
  startTime: string; // "08:00"
  endTime: string;   // "09:00"
  classId: string;
  roomNumber?: string;
  subject?: string;
  notes?: string;
}

export interface LessonTemplatePayload {
  title: string;
  levelCode: string; // '1MS' | '2MS' | '3MS' | '4MS' | 'ALL'
  sequenceNumber?: number;
  rubricCode?: string; // e.g., 'listen_and_do', 'practise', 'read_and_discover', 'think_and_write'
  pedagogicalStage?: string;
  estimatedDurationMinutes: number;
  communicativeObjective: string;
  specificObjectives: string[];
  targetedCompetencies: string[]; // e.g., ['C1', 'C2']
  materialsAndAids: string[];
  activitySteps: {
    stepNumber: number;
    phaseName: string;
    allocatedMinutes: number;
    teacherRoleAndInstructions: string;
    studentRoleAndTasks: string;
    interactionPattern: 'Teacher-Pupil' | 'Pupil-Pupil' | 'Individual' | 'Group' | 'Plenary';
    materialsAndAids?: string;
  }[];
  homeworkTitle?: string;
  homeworkInstructions?: string;
  differentiationNotes?: string;
}

export type ResourceCategory =
  | 'Lesson Plan'
  | 'Classroom Activities'
  | 'Worksheets'
  | 'Grammar'
  | 'Vocabulary'
  | 'Teacher Templates'
  | 'Assessment Templates'
  | 'Classroom Management'
  | 'BEM Preparation'
  | 'Remediation';

export type ResourceProvenance =
  | 'official_verified'
  | 'teacher_template'
  | 'sample'
  | 'reference'
  | 'user_created';

export interface LocalResource {
  id: string;
  title: string;
  description?: string;
  category: ResourceCategory;
  levelCode?: string;
  sequenceNumber?: number;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  fileHashSHA256: string;
  fileBlob?: Blob; // Stored in IndexedDB
  tags: string[];
  provenance?: ResourceProvenance;
  isOfficial?: boolean;
  sourceReference?: string;
  templatePayload?: LessonTemplatePayload;
  createdAt: string;
  updatedAt: string;
}
