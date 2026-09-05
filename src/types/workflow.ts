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

export interface LocalResource {
  id: string;
  title: string;
  category: 'Worksheet' | 'Lesson Plan' | 'Exam / Test' | 'Flashcards' | 'Audio / Video' | 'Grammar' | 'Vocabulary' | 'BEM Prep';
  levelCode?: string;
  sequenceNumber?: number;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  fileHashSHA256: string;
  fileBlob?: Blob; // Stored in IndexedDB
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
