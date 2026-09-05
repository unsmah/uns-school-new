/**
 * UNS SCHOOL — Database Schema Constants & Table Definitions
 * Schema Version: 1
 */

export const DB_NAME = 'uns_school_db';
export const DB_VERSION = 1;

export const DB_TABLES = {
  // Administrative Core
  SCHOOLS: 'schools',
  TEACHER_PROFILE: 'teacherProfile',
  ACADEMIC_YEARS: 'academicYears',
  GRADING_SCHEMES: 'gradingSchemes',
  CLASSES: 'classes',
  
  // Student Two-Tier Identity
  STUDENT_PERSONS: 'studentPersons',
  STUDENT_ENROLLMENTS: 'studentEnrollments',
  
  // Curriculum (Data-driven, Versioned)
  CURRICULUM_VERSIONS: 'curriculumVersions',
  CURRICULUM_LEVELS: 'curriculumLevels',
  COMPETENCIES: 'competencies',
  SESSION_RUBRICS: 'sessionRubrics',
  CURRICULUM_SEQUENCES: 'curriculumSequences',
  LEARNING_OBJECTIVES: 'learningObjectives',
  
  // Pedagogical Operation & Session Anchor
  LESSONS: 'lessons',
  ATTENDANCE: 'attendance',
  
  // Assessment & Grades
  ASSESSMENTS: 'assessments',
  GRADES: 'grades',
  
  // Workflow Extras
  HOMEWORK: 'homework',
  OBSERVATIONS: 'observations',
  REMEDIATION: 'remediation',
  TIMETABLE: 'timetable',
  RESOURCES: 'resources',
} as const;

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];

/**
 * Dexie schema store definitions for Version 1.
 * Note: Indexes are for lookup performance, NOT uniqueness constraints.
 * Business uniqueness and referential integrity are strictly enforced by the repository layer.
 */
export const SCHEMA_V1_STORES = {
  schools: '&id',
  teacherProfile: '&id',
  academicYears: '&id, schoolId, isCurrent, isArchived',
  gradingSchemes: '&id, academicYearId, isOfficial',
  classes: '&id, academicYearId, levelCode, isArchived, [academicYearId+levelCode]',
  studentPersons: '&id, nationalIdNumber, lastNameLatin, firstNameLatin',
  studentEnrollments: '&id, studentPersonId, academicYearId, classId, [classId+registerNumber], [academicYearId+studentPersonId]',
  
  // Curriculum Versioning
  curriculumVersions: '&id, code, status, isOfficial',
  curriculumLevels: '&id, curriculumVersionId, levelCode, [curriculumVersionId+levelCode]',
  competencies: '&id, curriculumVersionId, levelCode, code, [curriculumVersionId+levelCode]',
  sessionRubrics: '&id, curriculumVersionId, code',
  curriculumSequences: '&id, curriculumVersionId, levelCode, sequenceNumber, [curriculumVersionId+levelCode+sequenceNumber]',
  learningObjectives: '&id, sequenceId, curriculumVersionId',
  
  // Operational Data
  lessons: '&id, academicYearId, classId, date, sequenceId, rubricId, isCompleted, [classId+date], [academicYearId+classId+date]',
  attendance: '&id, lessonId, studentEnrollmentId, classId, date, [lessonId+studentEnrollmentId], [classId+date]',
  assessments: '&id, academicYearId, classId, termNumber, componentKey, [classId+termNumber], date',
  grades: '&id, assessmentId, studentEnrollmentId, [assessmentId+studentEnrollmentId]',
  
  // Workflow Extras
  homework: '&id, classId, academicYearId, dueDate, lessonId, isCompleted, [classId+dueDate]',
  observations: '&id, studentEnrollmentId, studentPersonId, classId, date, category',
  remediation: '&id, academicYearId, classId, scheduledDate, sequenceId',
  timetable: '&id, academicYearId, dayOfWeek, classId, [academicYearId+dayOfWeek]',
  resources: '&id, category, levelCode, fileHashSHA256, createdAt',
};
