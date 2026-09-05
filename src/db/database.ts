/**
 * UNS SCHOOL — Authoritative Client-Side IndexedDB Database Instance
 * Uses Dexie.js as the IndexedDB abstraction layer.
 */

import Dexie, { type Table } from 'dexie';
import { DB_NAME, DB_VERSION, SCHEMA_V1_STORES } from './schema';
import { applyMigrations } from './migrations';
import type {
  School,
  TeacherProfile,
  AcademicYear,
  GradingScheme,
  SchoolClass,
  StudentPerson,
  StudentEnrollment,
  CurriculumVersion,
  CurriculumLevelConfig,
  CompetencyDefinition,
  SessionRubricDefinition,
  CurriculumSequence,
  LearningObjectiveDefinition,
  Lesson,
  AttendanceRecord,
  Assessment,
  GradeEntry,
  HomeworkTask,
  StudentObservation,
  RemediationSession,
  TimetableSlot,
  LocalResource,
} from '../types';

export class UnsSchoolDatabase extends Dexie {
  // Administrative Core
  schools!: Table<School, string>;
  teacherProfile!: Table<TeacherProfile, string>;
  academicYears!: Table<AcademicYear, string>;
  gradingSchemes!: Table<GradingScheme, string>;
  classes!: Table<SchoolClass, string>;

  // Student Identity & Enrollment
  studentPersons!: Table<StudentPerson, string>;
  studentEnrollments!: Table<StudentEnrollment, string>;

  // Versioned Curriculum
  curriculumVersions!: Table<CurriculumVersion, string>;
  curriculumLevels!: Table<CurriculumLevelConfig, string>;
  competencies!: Table<CompetencyDefinition, string>;
  sessionRubrics!: Table<SessionRubricDefinition, string>;
  curriculumSequences!: Table<CurriculumSequence, string>;
  learningObjectives!: Table<LearningObjectiveDefinition, string>;

  // Lessons & Attendance
  lessons!: Table<Lesson, string>;
  attendance!: Table<AttendanceRecord, string>;

  // Assessments & Grades
  assessments!: Table<Assessment, string>;
  grades!: Table<GradeEntry, string>;

  // Workflow
  homework!: Table<HomeworkTask, string>;
  observations!: Table<StudentObservation, string>;
  remediation!: Table<RemediationSession, string>;
  timetable!: Table<TimetableSlot, string>;
  resources!: Table<LocalResource, string>;

  constructor() {
    super(DB_NAME);

    // Register Schema Version 1
    this.version(DB_VERSION).stores(SCHEMA_V1_STORES);

    // Apply versioned schema migrations
    applyMigrations(this);
  }
}

// Singleton export
export const db = new UnsSchoolDatabase();
