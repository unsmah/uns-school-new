import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  attendanceRepository,
  gradeRepository,
  assessmentRepository,
  lessonRepository,
  studentEnrollmentRepository,
  classRepository,
  academicYearRepository,
} from '../db/repositories';
import type {
  AcademicYear,
  SchoolClass,
  StudentPerson,
  StudentEnrollment,
  Lesson,
  Assessment,
  AttendanceRecord,
  GradeEntry,
} from '../types';

describe('Attendance & Grade Transactional Integrity', () => {
  const schoolId = 'school-att-test';
  const academicYearId = 'year-att-test';
  const classId = 'class-att-test';
  const enrollmentId = 'enroll-att-test';
  const lessonId = 'lesson-att-test';
  const assessmentId = 'assessment-att-test';

  beforeEach(async () => {
    await db.grades.clear();
    await db.assessments.clear();
    await db.attendance.clear();
    await db.lessons.clear();
    await db.studentEnrollments.clear();
    await db.studentPersons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();
    await db.curriculumVersions.clear();
    await db.gradingSchemes.clear();

    await db.curriculumVersions.add({
      id: 'curr-v1',
      code: 'DZ-2016',
      title: 'Algerian Curriculum',
      status: 'active',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.gradingSchemes.add({
      id: 'scheme-dz-ms-official',
      name: 'Official Scheme',
      formulaType: 'weighted_average',
      maxOverallScore: 20,
      isOfficial: true,
      components: [
        { componentKey: 'term_test', label: 'Devoir', maxScore: 20, coefficient: 1, isMandatory: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeYear: AcademicYear = {
      id: academicYearId,
      schoolId,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(activeYear);

    const schoolClass: SchoolClass = {
      id: classId,
      schoolId,
      academicYearId,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(schoolClass);

    const student: StudentPerson = {
      id: 'student-att-1',
      firstNameLatin: 'Amine',
      lastNameLatin: 'Gouiri',
      gender: 'M',
      dateOfBirth: '2012-04-12',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(student);

    const enrollment: StudentEnrollment = {
      id: enrollmentId,
      studentPersonId: student.id,
      academicYearId,
      classId,
      status: 'active',
      isRepeating: false,
      registerNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentEnrollmentRepository.create(enrollment);

    const lesson: Lesson = {
      id: lessonId,
      academicYearId,
      classId,
      levelCode: '1MS',
      curriculumVersionId: 'curr-v1',
      date: '2026-10-01',
      startTime: '08:00',
      endTime: '09:00',
      rubricId: 'rubric-1',
      title: 'Greetings & Introductions',
      specificObjectives: ['Greet peers', 'Introduce oneself'],
      targetedCompetencyIds: ['comp-1'],
      materialsAndAids: ['Whiteboard'],
      activitySteps: [],
      sessionNumberInSequence: 1,
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await lessonRepository.create(lesson);

    const assessment: Assessment = {
      id: assessmentId,
      academicYearId,
      classId,
      gradingSchemeId: 'scheme-dz-ms-official',
      componentKey: 'term_test',
      title: 'Devoir Surveillé 1',
      termNumber: 1,
      date: '2026-10-20',
      maxScore: 20,
      coefficient: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await assessmentRepository.create(assessment);
  });

  it('rejects duplicate attendance record for the same student in the same lesson', async () => {
    const record1: AttendanceRecord = {
      id: 'att-rec-1',
      lessonId,
      classId,
      studentEnrollmentId: enrollmentId,
      date: '2026-10-01',
      status: 'Present',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await attendanceRepository.recordAttendance(record1);

    const record2: AttendanceRecord = {
      id: 'att-rec-2',
      lessonId,
      classId,
      studentEnrollmentId: enrollmentId,
      date: '2026-10-01',
      status: 'Absent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(attendanceRepository.recordAttendance(record2)).rejects.toThrow(
      /Attendance already recorded/i
    );
  });

  it('rejects attendance with orphan lesson reference', async () => {
    const orphanRecord: AttendanceRecord = {
      id: 'att-orphan',
      lessonId: 'non-existent-lesson',
      classId,
      studentEnrollmentId: enrollmentId,
      date: '2026-10-01',
      status: 'Present',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(attendanceRepository.recordAttendance(orphanRecord)).rejects.toThrow(
      /Cannot record attendance for nonexistent lesson/i
    );
  });

  it('rejects duplicate grade record for the same student in the same assessment', async () => {
    const grade1: GradeEntry = {
      id: 'grade-rec-1',
      assessmentId,
      studentEnrollmentId: enrollmentId,
      score: 16.5,
      isAbsent: false,
      isMedicalExemption: false,
      updatedAt: new Date().toISOString(),
    };
    await gradeRepository.recordGrade(grade1);

    const grade2: GradeEntry = {
      id: 'grade-rec-2',
      assessmentId,
      studentEnrollmentId: enrollmentId,
      score: 18,
      isAbsent: false,
      isMedicalExemption: false,
      updatedAt: new Date().toISOString(),
    };

    await expect(gradeRepository.recordGrade(grade2)).rejects.toThrow(
      /Grade entry already exists/i
    );
  });

  it('rejects grades that exceed maxScore or are negative', async () => {
    const negativeGrade: GradeEntry = {
      id: 'grade-negative',
      assessmentId,
      studentEnrollmentId: enrollmentId,
      score: -2,
      isAbsent: false,
      isMedicalExemption: false,
      updatedAt: new Date().toISOString(),
    };
    await expect(gradeRepository.recordGrade(negativeGrade)).rejects.toThrow(
      /exceeds bounds/i
    );

    const overMaxGrade: GradeEntry = {
      id: 'grade-overmax',
      assessmentId,
      studentEnrollmentId: enrollmentId,
      score: 25, // maxScore is 20
      isAbsent: false,
      isMedicalExemption: false,
      updatedAt: new Date().toISOString(),
    };
    await expect(gradeRepository.recordGrade(overMaxGrade)).rejects.toThrow(
      /exceeds bounds/i
    );
  });

  it('protects locked assessment from grade changes and edits', async () => {
    // Lock the assessment
    await assessmentRepository.update(assessmentId, { isLocked: true });

    const lockedAssessment = await assessmentRepository.getById(assessmentId);
    expect(lockedAssessment?.isLocked).toBe(true);

    // Attempting to record grade in locked assessment should fail
    await expect(
      gradeRepository.recordGrade({
        id: 'grade-locked-attempt',
        assessmentId,
        studentEnrollmentId: enrollmentId,
        score: 15,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      })
    ).rejects.toThrow(/Assessment is locked/i);

    // Attempting to delete locked assessment should fail
    await expect(assessmentRepository.delete(assessmentId)).rejects.toThrow(
      /Cannot delete a locked assessment/i
    );
  });
});
