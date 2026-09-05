import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  academicYearRepository,
  classRepository,
  studentEnrollmentRepository,
  lessonRepository,
  attendanceRepository,
  assessmentRepository,
  gradeRepository,
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
  GradingScheme,
} from '../types';

describe('Phase 1 Final Integrity Hardening Tests', () => {
  const schoolId = 'school-integrity-test';
  const year1Id = 'year-integrity-1';
  const year2Id = 'year-integrity-2';
  const class1Year1Id = 'class-1-year-1';
  const class2Year2Id = 'class-2-year-2';

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
    await db.sessionRubrics.clear();
    await db.gradingSchemes.clear();

    await db.schools.add({
      id: schoolId,
      name: 'CEM Test School',
      commune: 'Algiers',
      wilaya: '16',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const year1: AcademicYear = {
      id: year1Id,
      schoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(year1);

    const year2: AcademicYear = {
      id: year2Id,
      schoolId,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: false,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(year2);

    const class1: SchoolClass = {
      id: class1Year1Id,
      schoolId,
      academicYearId: year1Id,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(class1);

    const class2: SchoolClass = {
      id: class2Year2Id,
      schoolId,
      academicYearId: year2Id,
      levelCode: '2MS',
      name: '2MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(class2);

    await db.curriculumVersions.add({
      id: 'curr-valid-v1',
      code: 'DZ-2016',
      title: 'Official Curriculum',
      status: 'active',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.sessionRubrics.add({
      id: 'rubric-1',
      curriculumVersionId: 'curr-valid-v1',
      code: 'listen_and_do',
      name: 'I Listen and Do',
      pedagogicalStage: 'Presentation',
      defaultDurationMinutes: 60,
      order: 1,
    });

    const defaultScheme: GradingScheme = {
      id: 'scheme-official-1',
      academicYearId: year1Id,
      name: 'Year 1 Grading Scheme',
      formulaType: 'weighted_average',
      maxOverallScore: 20,
      isOfficial: true,
      components: [
        { componentKey: 'term_test', label: 'Devoir', maxScore: 20, coefficient: 1, isMandatory: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.gradingSchemes.add(defaultScheme);
  });

  describe('Student Enrollment Invariants', () => {
    it('rejects enrollment with non-existent student person', async () => {
      const enrollment: StudentEnrollment = {
        id: 'enroll-invalid-student',
        studentPersonId: 'ghost-student-id',
        academicYearId: year1Id,
        classId: class1Year1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(studentEnrollmentRepository.create(enrollment)).rejects.toThrow(
        /Student person with id ghost-student-id does not exist/i
      );
    });

    it('rejects enrollment when class belongs to a different academic year', async () => {
      const student: StudentPerson = {
        id: 'student-person-valid',
        firstNameLatin: 'Anis',
        lastNameLatin: 'Hadj',
        gender: 'M',
        dateOfBirth: '2012-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student);

      // class2Year2Id belongs to year2Id, but enrollment specifies year1Id
      const enrollment: StudentEnrollment = {
        id: 'enroll-mismatch-year',
        studentPersonId: student.id,
        academicYearId: year1Id,
        classId: class2Year2Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(studentEnrollmentRepository.create(enrollment)).rejects.toThrow(
        /does not belong to academic year/i
      );
    });

    it('rejects update that introduces a mismatched class and academic year', async () => {
      const student: StudentPerson = {
        id: 'student-update-test',
        firstNameLatin: 'Lina',
        lastNameLatin: 'Mansouri',
        gender: 'F',
        dateOfBirth: '2012-02-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student);

      const enrollment: StudentEnrollment = {
        id: 'enroll-valid-initially',
        studentPersonId: student.id,
        academicYearId: year1Id,
        classId: class1Year1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollment);

      // Updating class to class2Year2Id without updating academicYearId must fail
      await expect(
        studentEnrollmentRepository.update(enrollment.id, { classId: class2Year2Id })
      ).rejects.toThrow(/does not belong to academic year/i);
    });
  });

  describe('Lesson Invariants', () => {
    it('rejects lesson creation when class does not belong to the lesson academic year', async () => {
      const lesson: Lesson = {
        id: 'lesson-mismatch-year',
        academicYearId: year1Id,
        classId: class2Year2Id, // belongs to year2Id!
        levelCode: '2MS',
        curriculumVersionId: 'curr-valid-v1',
        date: '2025-10-10',
        startTime: '08:00',
        endTime: '09:00',
        rubricId: 'rubric-1',
        title: 'Test Lesson',
        specificObjectives: ['Objective'],
        targetedCompetencyIds: ['comp-1'],
        materialsAndAids: [],
        activitySteps: [],
        sessionNumberInSequence: 1,
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(lesson)).rejects.toThrow(
        /does not belong to academic year/i
      );
    });

    it('rejects lesson creation with invalid curriculum reference', async () => {
      const lesson: Lesson = {
        id: 'lesson-invalid-curr',
        academicYearId: year1Id,
        classId: class1Year1Id,
        levelCode: '1MS',
        curriculumVersionId: 'non-existent-curriculum-id',
        date: '2025-10-10',
        startTime: '08:00',
        endTime: '09:00',
        rubricId: 'rubric-1',
        title: 'Test Lesson',
        specificObjectives: ['Objective'],
        targetedCompetencyIds: ['comp-1'],
        materialsAndAids: [],
        activitySteps: [],
        sessionNumberInSequence: 1,
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(lessonRepository.create(lesson)).rejects.toThrow(
        /Curriculum version with id non-existent-curriculum-id does not exist/i
      );
    });

    it('rejects unsafe class or academic year change on a lesson that already has attendance records', async () => {
      const student: StudentPerson = {
        id: 'student-att-lesson',
        firstNameLatin: 'Nour',
        lastNameLatin: 'Saidi',
        gender: 'F',
        dateOfBirth: '2012-03-03',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student);

      const enrollment: StudentEnrollment = {
        id: 'enroll-att-lesson',
        studentPersonId: student.id,
        academicYearId: year1Id,
        classId: class1Year1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollment);

      const lesson: Lesson = {
        id: 'lesson-with-att',
        academicYearId: year1Id,
        classId: class1Year1Id,
        levelCode: '1MS',
        curriculumVersionId: 'curr-valid-v1',
        date: '2025-10-10',
        startTime: '08:00',
        endTime: '09:00',
        rubricId: 'rubric-1',
        title: 'Active Lesson',
        specificObjectives: ['Objective'],
        targetedCompetencyIds: ['comp-1'],
        materialsAndAids: [],
        activitySteps: [],
        sessionNumberInSequence: 1,
        isCompleted: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lesson);

      // Record attendance
      await attendanceRepository.recordAttendance({
        id: 'att-1-lesson',
        lessonId: lesson.id,
        classId: class1Year1Id,
        studentEnrollmentId: enrollment.id,
        date: lesson.date,
        status: 'Present',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Another class in year 1
      const class3Year1: SchoolClass = {
        id: 'class-3-year-1',
        schoolId,
        academicYearId: year1Id,
        levelCode: '1MS',
        name: '1MS 2',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await classRepository.create(class3Year1);

      // Attempting to change classId of lesson with attendance must fail
      await expect(
        lessonRepository.update(lesson.id, { classId: class3Year1.id })
      ).rejects.toThrow(/Cannot change class or academic year for a lesson that already has attendance records/i);
    });
  });

  describe('Attendance Invariants', () => {
    it('rejects recording attendance for a student enrolled in a different class', async () => {
      const student: StudentPerson = {
        id: 'student-other-class',
        firstNameLatin: 'Sami',
        lastNameLatin: 'Belkacem',
        gender: 'M',
        dateOfBirth: '2012-04-04',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student);

      // Student is enrolled in class2Year2Id
      const enrollment: StudentEnrollment = {
        id: 'enroll-other-class',
        studentPersonId: student.id,
        academicYearId: year2Id,
        classId: class2Year2Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollment);

      // Lesson is in class1Year1Id
      const lesson: Lesson = {
        id: 'lesson-for-class1',
        academicYearId: year1Id,
        classId: class1Year1Id,
        levelCode: '1MS',
        curriculumVersionId: 'curr-valid-v1',
        date: '2025-10-15',
        startTime: '08:00',
        endTime: '09:00',
        rubricId: 'rubric-1',
        title: 'Class 1 Lesson',
        specificObjectives: ['Objective'],
        targetedCompetencyIds: ['comp-1'],
        materialsAndAids: [],
        activitySteps: [],
        sessionNumberInSequence: 1,
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lesson);

      const attendanceRecord: AttendanceRecord = {
        id: 'att-mismatch-class',
        lessonId: lesson.id,
        classId: class1Year1Id,
        studentEnrollmentId: enrollment.id,
        date: lesson.date,
        status: 'Present',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(attendanceRepository.recordAttendance(attendanceRecord)).rejects.toThrow(
        /does not belong to lesson class/i
      );
    });
  });

  describe('Assessment & Grade Invariants', () => {
    it('rejects assessment when class does not belong to the assessment academic year', async () => {
      const assessment: Assessment = {
        id: 'assess-mismatch-year',
        academicYearId: year1Id,
        classId: class2Year2Id, // class belongs to year2Id
        gradingSchemeId: 'scheme-official-1',
        componentKey: 'term_test',
        title: 'Devoir',
        termNumber: 1,
        date: '2025-11-01',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(assessmentRepository.create(assessment)).rejects.toThrow(
        /does not belong to academic year/i
      );
    });

    it('rejects assessment when grading scheme belongs to another academic year', async () => {
      // Create a scheme tied strictly to year2Id
      const year2Scheme: GradingScheme = {
        id: 'scheme-year-2',
        academicYearId: year2Id,
        name: 'Year 2 Scheme',
        formulaType: 'weighted_average',
        maxOverallScore: 20,
        isOfficial: true,
        components: [
          { componentKey: 'term_test', label: 'Devoir', maxScore: 20, coefficient: 1, isMandatory: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.gradingSchemes.add(year2Scheme);

      const assessment: Assessment = {
        id: 'assess-scheme-mismatch',
        academicYearId: year1Id,
        classId: class1Year1Id,
        gradingSchemeId: year2Scheme.id, // belongs to year2Id!
        componentKey: 'term_test',
        title: 'Devoir Year 1 with Year 2 Scheme',
        termNumber: 1,
        date: '2025-11-01',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(assessmentRepository.create(assessment)).rejects.toThrow(
        /belongs to academic year/i
      );
    });

    it('rejects grade recording for a student enrolled in a different class or academic year', async () => {
      const assessment: Assessment = {
        id: 'assess-valid-1',
        academicYearId: year1Id,
        classId: class1Year1Id,
        gradingSchemeId: 'scheme-official-1',
        componentKey: 'term_test',
        title: 'Devoir Year 1',
        termNumber: 1,
        date: '2025-11-10',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await assessmentRepository.create(assessment);

      const student: StudentPerson = {
        id: 'student-other-enrollment',
        firstNameLatin: 'Farid',
        lastNameLatin: 'Bounedjah',
        gender: 'M',
        dateOfBirth: '2012-05-05',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student);

      // Student enrolled in class 2 / year 2
      const enrollmentYear2: StudentEnrollment = {
        id: 'enroll-in-year2',
        studentPersonId: student.id,
        academicYearId: year2Id,
        classId: class2Year2Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollmentYear2);

      const gradeEntry: GradeEntry = {
        id: 'grade-mismatch-entry',
        assessmentId: assessment.id,
        studentEnrollmentId: enrollmentYear2.id,
        score: 17,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      };

      await expect(gradeRepository.recordGrade(gradeEntry)).rejects.toThrow(
        /does not belong to assessment class/i
      );
    });
  });
});
