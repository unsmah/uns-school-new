import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  timetableRepository,
  lessonRepository,
  attendanceRepository,
  classRepository,
  academicYearRepository,
  studentEnrollmentRepository,
  studentPersonRepository,
  curriculumRepository,
} from '../db/repositories';
import type {
  AcademicYear,
  SchoolClass,
  StudentPerson,
  StudentEnrollment,
  Lesson,
  AttendanceRecord,
  TimetableSlot,
  CurriculumVersion,
} from '../types';

describe('Phase 3 — Classroom Operations & Integrity Tests', () => {
  const schoolId = 'school-p3-test';
  const activeYearId = 'year-p3-active';
  const archivedYearId = 'year-p3-archived';
  const class1Id = 'class-p3-1ms1';
  const class2Id = 'class-p3-2ms1';
  const archivedClassId = 'class-p3-archived';
  const curriculumVersionId = 'curr-p3-dz-2016';

  beforeEach(async () => {
    await db.timetable.clear();
    await db.attendance.clear();
    await db.lessons.clear();
    await db.studentEnrollments.clear();
    await db.studentPersons.clear();
    await db.classes.clear();
    await db.academicYears.clear();
    await db.schools.clear();
    await db.curriculumVersions.clear();
    await db.curriculumLevels.clear();
    await db.sessionRubrics.clear();

    const now = new Date().toISOString();

    // 1. School
    await db.schools.add({
      id: schoolId,
      name: 'CEM Ibn Khaldoun',
      commune: 'Bab El Oued',
      wilaya: '16',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Curriculum Version & Levels & Rubrics
    const currVersion: CurriculumVersion = {
      id: curriculumVersionId,
      code: 'DZ-MS-EN-2016',
      title: 'Algerian Middle School English 2016',
      status: 'active',
      isOfficial: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.curriculumVersions.add(currVersion);

    await db.curriculumLevels.add({
      id: 'lvl-p3-1ms',
      curriculumVersionId,
      levelCode: '1MS',
      levelTitle: '1st Year',
      weeklyHoursRecommended: 3,
      order: 1,
    });

    await db.curriculumLevels.add({
      id: 'lvl-p3-2ms',
      curriculumVersionId,
      levelCode: '2MS',
      levelTitle: '2nd Year',
      weeklyHoursRecommended: 3,
      order: 2,
    });

    await db.sessionRubrics.add({
      id: 'rub-listen-do',
      curriculumVersionId,
      code: 'listen_and_do',
      name: 'I Listen and Do',
      pedagogicalStage: 'Presentation',
      defaultDurationMinutes: 60,
      order: 1,
    });

    // 3. Active & Archived Academic Years
    const activeYear: AcademicYear = {
      id: activeYearId,
      schoolId,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    await academicYearRepository.create(activeYear);

    const archivedYear: AcademicYear = {
      id: archivedYearId,
      schoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.academicYears.add(archivedYear);

    // 4. Classes
    const class1: SchoolClass = {
      id: class1Id,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      roomNumber: 'Salle 04',
      createdAt: now,
      updatedAt: now,
    };
    await classRepository.create(class1);

    const class2: SchoolClass = {
      id: class2Id,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '2MS',
      name: '2MS 1',
      isArchived: false,
      roomNumber: 'Salle 05',
      createdAt: now,
      updatedAt: now,
    };
    await classRepository.create(class2);

    const archivedClass: SchoolClass = {
      id: archivedClassId,
      schoolId,
      academicYearId: activeYearId,
      levelCode: '1MS',
      name: '1MS Archived',
      isArchived: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.classes.add(archivedClass);
  });

  describe('Timetable Operations & Invariants', () => {
    it('successfully creates a Sunday-Thursday weekly slot and lists by day', async () => {
      const slot: TimetableSlot = {
        id: 'slot-sun-p1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
        roomNumber: 'Salle 04',
      };

      const savedId = await timetableRepository.create(slot);
      expect(savedId).toBe('slot-sun-p1');

      const sundaySlots = await timetableRepository.listByDay(activeYearId, 'Sunday');
      expect(sundaySlots).toHaveLength(1);
      expect(sundaySlots[0].classId).toBe(class1Id);
      expect(sundaySlots[0].periodNumber).toBe(1);
    });

    it('rejects invalid teaching days outside Algerian Sunday-Thursday week', async () => {
      const invalidSlot: any = {
        id: 'slot-fri-p1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Friday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidSlot)).rejects.toThrow(
        /Invalid teaching day "Friday"/i
      );
    });

    it('rejects invalid period numbers (< 1 or > 8)', async () => {
      const invalidPeriodSlot: TimetableSlot = {
        id: 'slot-p9',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Monday',
        periodNumber: 9,
        startTime: '16:00',
        endTime: '17:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidPeriodSlot)).rejects.toThrow(
        /Invalid period number/i
      );
    });

    it('rejects invalid time ranges where startTime >= endTime', async () => {
      const invalidTimeSlot: TimetableSlot = {
        id: 'slot-inverted-time',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Tuesday',
        periodNumber: 2,
        startTime: '10:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(invalidTimeSlot)).rejects.toThrow(
        /Invalid time range/i
      );
    });

    it('rejects timetable slot creation in archived academic year', async () => {
      const archivedYearSlot: TimetableSlot = {
        id: 'slot-archived-year',
        academicYearId: archivedYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        classId: class1Id,
      };

      await expect(timetableRepository.create(archivedYearSlot)).rejects.toThrow(
        /archived academic year/i
      );
    });

    it('rejects timetable slot for an archived class', async () => {
      const archivedClassSlot: TimetableSlot = {
        id: 'slot-archived-class',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Wednesday',
        periodNumber: 3,
        startTime: '10:00',
        endTime: '11:00',
        classId: archivedClassId,
      };

      await expect(timetableRepository.create(archivedClassSlot)).rejects.toThrow(
        /archived class/i
      );
    });

    it('rejects duplicate slot on same day and period for the same academic year', async () => {
      const slot1: TimetableSlot = {
        id: 'slot-dup-1',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot1);

      const slot2: TimetableSlot = {
        id: 'slot-dup-2',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Thursday',
        periodNumber: 4,
        startTime: '11:00',
        endTime: '12:00',
        classId: class2Id,
      };

      await expect(timetableRepository.create(slot2)).rejects.toThrow(
        /already exists for Thursday Period 4/i
      );
    });

    it('prohibits mutating academicYearId or schoolId on existing slot', async () => {
      const slot: TimetableSlot = {
        id: 'slot-immutable-check',
        academicYearId: activeYearId,
        schoolId,
        dayOfWeek: 'Sunday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        classId: class1Id,
      };
      await timetableRepository.create(slot);

      await expect(
        timetableRepository.update('slot-immutable-check', { academicYearId: 'another-year' })
      ).rejects.toThrow(/academicYearId cannot be changed/i);

      await expect(
        timetableRepository.update('slot-immutable-check', { schoolId: 'another-school' })
      ).rejects.toThrow(/schoolId cannot be changed/i);
    });
  });

  describe('Lesson Shell & Attendance Anchoring', () => {
    it('creates lesson, synchronizes date updates to attendance, and cascades deletion', async () => {
      const student1: StudentPerson = {
        id: 'p3-student-1',
        firstNameLatin: 'Yacine',
        lastNameLatin: 'Brahimi',
        gender: 'M',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(student1);

      const enrollment1: StudentEnrollment = {
        id: 'p3-enrollment-1',
        studentPersonId: student1.id,
        academicYearId: activeYearId,
        classId: class1Id,
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollment1);

      const lesson: Lesson = {
        id: 'lesson-p3-1',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-04',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Oral Interaction — Greetings',
        specificObjectives: ['Greet teacher and peers'],
        targetedCompetencyIds: [],
        materialsAndAids: ['Coursebook'],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lesson);

      // Record attendance for this lesson
      await attendanceRepository.recordAttendance({
        id: 'att-p3-1',
        lessonId: lesson.id,
        classId: class1Id,
        studentEnrollmentId: enrollment1.id,
        date: '2026-10-04',
        status: 'Present',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const initialAtt = await attendanceRepository.listByLesson(lesson.id);
      expect(initialAtt).toHaveLength(1);
      expect(initialAtt[0].date).toBe('2026-10-04');

      // Update lesson date -> should cascade to attendance record date
      await lessonRepository.update(lesson.id, { date: '2026-10-05' });
      const updatedAtt = await attendanceRepository.listByLesson(lesson.id);
      expect(updatedAtt[0].date).toBe('2026-10-05');

      // Delete lesson -> cascades delete to attendance records atomically
      await lessonRepository.delete(lesson.id);
      const afterDeleteLesson = await lessonRepository.getById(lesson.id);
      expect(afterDeleteLesson).toBeUndefined();

      const afterDeleteAtt = await attendanceRepository.listByLesson(lesson.id);
      expect(afterDeleteAtt).toHaveLength(0);
    });

    it('rejects attendance if student enrollment does not match lesson class or academic year', async () => {
      const studentInClass2: StudentPerson = {
        id: 'p3-student-cls2',
        firstNameLatin: 'Riyad',
        lastNameLatin: 'Mahrez',
        gender: 'M',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.studentPersons.add(studentInClass2);

      const enrollmentClass2: StudentEnrollment = {
        id: 'p3-enrollment-cls2',
        studentPersonId: studentInClass2.id,
        academicYearId: activeYearId,
        classId: class2Id, // Enrolled in Class 2MS 1
        status: 'active',
        isRepeating: false,
        registerNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await studentEnrollmentRepository.create(enrollmentClass2);

      const lessonClass1: Lesson = {
        id: 'lesson-class1',
        academicYearId: activeYearId,
        classId: class1Id, // Belongs to Class 1MS 1
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-10',
        startTime: '08:00',
        endTime: '09:00',
        title: 'Diagnostic Test',
        specificObjectives: ['Assess entry readiness'],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lessonClass1);

      // Attempting to record attendance for student from class2 in lesson for class1
      await expect(
        attendanceRepository.recordAttendance({
          id: 'att-mismatch',
          lessonId: lessonClass1.id,
          classId: class1Id,
          studentEnrollmentId: enrollmentClass2.id,
          date: '2026-10-10',
          status: 'Present',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(/does not belong to lesson class/i);
    });

    it('supports markAllPresent and accurately computes lesson and class attendance statistics', async () => {
      // Create 3 students in class 1MS 1
      const studentIds = ['s-stat-1', 's-stat-2', 's-stat-3'];
      const enrollments: StudentEnrollment[] = [];

      for (let i = 0; i < studentIds.length; i++) {
        const sId = studentIds[i];
        await db.studentPersons.add({
          id: sId,
          firstNameLatin: `Student${i + 1}`,
          lastNameLatin: `Test`,
          gender: 'M',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const enr: StudentEnrollment = {
          id: `enr-stat-${i + 1}`,
          studentPersonId: sId,
          academicYearId: activeYearId,
          classId: class1Id,
          status: 'active',
          isRepeating: false,
          registerNumber: i + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await studentEnrollmentRepository.create(enr);
        enrollments.push(enr);
      }

      const lesson: Lesson = {
        id: 'lesson-stats-test',
        academicYearId: activeYearId,
        classId: class1Id,
        levelCode: '1MS',
        curriculumVersionId,
        rubricId: 'rub-listen-do',
        sessionNumberInSequence: 1,
        date: '2026-10-11',
        startTime: '10:00',
        endTime: '11:00',
        title: 'Reading & Discovering',
        specificObjectives: ['Read short text'],
        targetedCompetencyIds: [],
        materialsAndAids: [],
        activitySteps: [],
        isCompleted: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await lessonRepository.create(lesson);

      // Execute markAllPresent
      await attendanceRepository.markAllPresent(
        lesson.id,
        enrollments.map((e) => e.id)
      );

      const stats1 = await attendanceRepository.getAttendanceStatsForLesson(lesson.id);
      expect(stats1.total).toBe(3);
      expect(stats1.present).toBe(3);
      expect(stats1.absent).toBe(0);
      expect(stats1.rate).toBe(100);

      // Change 1 to Absent and 1 to Late (15 mins)
      await attendanceRepository.saveBatchForLesson(lesson.id, [
        {
          id: 'att-updated-absent',
          lessonId: lesson.id,
          classId: class1Id,
          studentEnrollmentId: enrollments[1].id,
          date: lesson.date,
          status: 'Absent',
          remarks: 'Sick',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'att-updated-late',
          lessonId: lesson.id,
          classId: class1Id,
          studentEnrollmentId: enrollments[2].id,
          date: lesson.date,
          status: 'Late',
          minutesLate: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const stats2 = await attendanceRepository.getAttendanceStatsForLesson(lesson.id);
      expect(stats2.total).toBe(3);
      expect(stats2.present).toBe(1);
      expect(stats2.absent).toBe(1);
      expect(stats2.late).toBe(1);
      // Attending = present (1) + late (1) = 2/3 = 67%
      expect(stats2.rate).toBe(67);

      const classStats = await attendanceRepository.getAttendanceStatsForClass(class1Id);
      expect(classStats.totalSessions).toBe(1);
      expect(classStats.totalRecords).toBe(3);
      expect(classStats.absentCount).toBe(1);
    });
  });
});
