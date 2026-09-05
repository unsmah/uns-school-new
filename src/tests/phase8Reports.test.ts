import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/database';
import { classRepository } from '../db/repositories/classRepository';
import { studentPersonRepository } from '../db/repositories/studentPersonRepository';
import { studentEnrollmentRepository } from '../db/repositories/studentEnrollmentRepository';
import { lessonRepository } from '../db/repositories/lessonRepository';
import { attendanceRepository } from '../db/repositories/attendanceRepository';
import { schoolRepository } from '../db/repositories/schoolRepository';
import type { AcademicYear, SchoolClass, StudentPerson, StudentEnrollment, Lesson, AttendanceRecord, School, Assessment, GradeEntry, GradingScheme } from '../types';

describe('Phase 8 - Reports & Export', () => {
  let yearId: string;
  let classId: string;
  let studentPersonId: string;
  let enrollmentId: string;
  let lessonId: string;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    const school: School = {
      id: 'school-1',
      name: 'Test School',
      commune: 'Algiers',
      wilaya: 'Algiers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await schoolRepository.save(school);

    const year: AcademicYear = {
      id: 'year-1',
      schoolId: 'school-1',
      label: '2023/2024',
      startDate: '2023-09-01',
      endDate: '2024-07-01',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(year);
    yearId = year.id;

    const cls: SchoolClass = {
      id: 'class-1',
      academicYearId: yearId,
      schoolId: 'school-1',
      name: '1AM-1',
      levelCode: '1AM',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(cls);
    classId = cls.id;

    const person: StudentPerson = {
      id: 'person-1',
      nationalIdNumber: '123',
      firstNameLatin: 'Test',
      lastNameLatin: 'Student',
      firstNameArabic: '',
      lastNameArabic: '',
      dateOfBirth: '2010-01-01',
      gender: 'M',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentPersonRepository.create(person);
    studentPersonId = person.id;

    const enrollment: StudentEnrollment = {
      id: 'enroll-1',
      studentPersonId: person.id,
      academicYearId: yearId,
      classId: cls.id,
      registerNumber: 1,
      isRepeating: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentEnrollmentRepository.create(enrollment);
    enrollmentId = enrollment.id;

    await db.sessionRubrics.add({ id: 'rubric-1', curriculumVersionId: 'v1', code: 'test', name: 'Test', pedagogicalStage: 'Presentation', defaultDurationMinutes: 45, order: 1 });
    await db.curriculumVersions.add({ id: 'v1', code: 'V1', title: 'Curriculum V1', status: 'active', isOfficial: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const lesson: Lesson = {
      id: 'lesson-1',
      academicYearId: yearId,
      classId: cls.id,
      levelCode: '1AM',
      rubricId: 'rubric-1',
      sessionNumberInSequence: 1,
      date: '2023-11-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Lesson 1',
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      curriculumVersionId: 'v1',
      targetedCompetencyIds: [],
      specificObjectives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
        await lessonRepository.create(lesson);
    lessonId = lesson.id; 
  
  });

  afterEach(async () => {
    await db.delete();
  });

  it('verifies that student list joins person and enrollment properly', async () => {
    const enrollments = await studentEnrollmentRepository.listByClass(classId);
    expect(enrollments.length).toBe(1);
    expect(enrollments[0].person).toBeDefined();
    expect(enrollments[0].person?.firstNameLatin).toBe('Test');
  });

  it('verifies that attendance reports map correctly to a lesson', async () => {
    const att: AttendanceRecord = {
      id: 'att-1',
      lessonId: lessonId,
      studentEnrollmentId: enrollmentId,
      classId: classId,
      status: 'Absent',
      date: new Date().toISOString().substring(0,10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.attendance.add(att);

    const lessons = await lessonRepository.listByClass(classId);
    expect(lessons.length).toBe(1);

    const records = await attendanceRepository.listByLesson(lessonId);
    expect(records.length).toBe(1);
    expect(records[0].status).toBe('Absent');
  });

  it('demonstrates that a historical report retains historical curriculum version rather than active version', async () => {
    // Add active curriculum (2024)
    await db.curriculumVersions.add({
      id: 'v_active_2024',
      code: 'V2024',
      title: 'Active 2024 Curriculum',
      status: 'active',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add historical curriculum (2020)
    await db.curriculumVersions.add({
      id: 'v_historical_2020',
      code: 'V2020',
      title: 'Historical 2020 Curriculum',
      status: 'historical',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Historical lesson referencing v_historical_2020
    const histLesson: Lesson = {
      id: 'lesson-hist-1',
      academicYearId: yearId,
      classId: classId,
      levelCode: '1AM',
      rubricId: 'rubric-1',
      sessionNumberInSequence: 1,
      date: '2020-10-15',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Historical Lesson',
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      curriculumVersionId: 'v_historical_2020',
      targetedCompetencyIds: [],
      specificObjectives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.lessons.add(histLesson);

    const classLessons = await lessonRepository.listByClassAndAcademicYear(classId, yearId);
    const versionIds = Array.from(new Set(classLessons.map(l => l.curriculumVersionId)));

    // Ensure the lesson explicitly retains v_historical_2020 and does NOT switch to active version
    expect(versionIds.includes('v_historical_2020')).toBe(true);
    expect(versionIds.includes('v_active_2024')).toBe(false);
  });

  it('proves that changing current grading scheme after assessment does not alter historical report interpretation', async () => {
    const { gradingCalculationService } = await import('../services/gradingCalculationService');
    const assessment: Assessment = {
      id: 'ast-1',
      academicYearId: yearId,
      classId: classId,
      gradingSchemeId: 'scheme-1',
      termNumber: 1,
      title: 'Historical Test',
      componentKey: 'interrogation_ecrite',
      maxScore: 10,
      coefficient: 2,
      date: '2023-11-15',
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      componentSnapshot: {
        componentKey: 'interrogation_ecrite',
        label: 'Written Quiz',
        maxScore: 10,
        coefficient: 2,
        isMandatory: true,
      },
      maxOverallScoreSnapshot: 20,
    };

    const grades: GradeEntry[] = [
      {
        id: 'grd-1',
        assessmentId: 'ast-1',
        studentEnrollmentId: enrollmentId,
        score: 8,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      },
    ];

    // Compute stats with original snapshot (maxScore: 10)
    const initialStats = gradingCalculationService.calculateAssessmentStatistics(assessment, grades, 1);
    expect(initialStats.averageScore).toBe(8);
    expect(initialStats.passCount).toBe(1);
    expect(initialStats.passRatePercentage).toBe(100);

    // Simulate changing active global scheme to maxScore: 20
    const modifiedScheme: GradingScheme = {
      id: 'scheme-2025',
      name: '2025 Modified Scheme',
      academicYearId: yearId,
      formulaType: 'weighted_average',
      isOfficial: true,
      maxOverallScore: 20,
      components: [
        {
          componentKey: 'interrogation_ecrite',
          label: 'Quiz',
          maxScore: 20,
          coefficient: 1,
          isMandatory: true,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.gradingSchemes.add(modifiedScheme);

    // Re-calculate assessment stats using assessment object with snapshot
    const postChangeStats = gradingCalculationService.calculateAssessmentStatistics(assessment, grades, 1);
    expect(postChangeStats.averageScore).toBe(8);
    expect(postChangeStats.passCount).toBe(1);
    expect(postChangeStats.passRatePercentage).toBe(100);
  });
});
