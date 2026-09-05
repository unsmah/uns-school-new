import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/database';
import { homeworkRepository } from '../db/repositories/homeworkRepository';
import { observationRepository } from '../db/repositories/observationRepository';
import { remediationRepository } from '../db/repositories/remediationRepository';
import { academicYearRepository } from '../db/repositories/academicYearRepository';
import { classRepository } from '../db/repositories/classRepository';
import { studentPersonRepository } from '../db/repositories/studentPersonRepository';
import { studentEnrollmentRepository } from '../db/repositories/studentEnrollmentRepository';
import { schoolRepository } from '../db/repositories/schoolRepository';
import type { AcademicYear, SchoolClass, StudentPerson, StudentEnrollment, HomeworkTask, StudentObservation, RemediationSession } from '../types';

describe('Phase 7 - Workflow Extras & Teacher Productivity', () => {
  let year: AcademicYear;
  let cls: SchoolClass;
  let person: StudentPerson;
  let enrollment: StudentEnrollment;

  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });

    await schoolRepository.save({
      id: 'school-1',
      name: 'Test School',
      commune: 'Test Commune',
      wilaya: 'Test Wilaya',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    year = {
      id: 'year-1',
      schoolId: 'school-1',
      startDate: '2023-09-01',
      endDate: '2024-07-01',
      label: '2023-2024',
      isCurrent: true,
      isArchived: false,
      terms: [
        { id: 'term-1', termNumber: 1, name: 'First Term', startDate: '2023-09-01', endDate: '2023-11-30' },
        { id: 'term-2', termNumber: 2, name: 'Second Term', startDate: '2023-12-01', endDate: '2024-02-28' },
        { id: 'term-3', termNumber: 3, name: 'Third Term', startDate: '2024-03-01', endDate: '2024-05-31' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await academicYearRepository.create(year);

    cls = {
      id: 'class-1',
      academicYearId: 'year-1',
      schoolId: 'school-1',
      name: '1AM-1',
      levelCode: '1AM',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await classRepository.create(cls);

    person = {
      id: 'person-1',
      nationalIdNumber: '123456789',
      firstNameLatin: 'Test',
      lastNameLatin: 'User',
      firstNameArabic: 'اختبار',
      lastNameArabic: 'مستخدم',
      dateOfBirth: '2010-01-01',
      gender: 'M',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentPersonRepository.create(person);

    enrollment = {
      id: 'enroll-1',
      studentPersonId: 'person-1',
      academicYearId: 'year-1',
      classId: 'class-1',
      registerNumber: 1,
      isRepeating: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await studentEnrollmentRepository.create(enrollment);
  });

  afterEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
  });

  describe('Homework Workflow', () => {
    it('creates and tracks homework linked to a class', async () => {
      const task: HomeworkTask = {
        id: 'hw-1',
        academicYearId: year.id,
        classId: cls.id,
        title: 'Read chapter 1',
        instructions: 'Read pages 1-10',
        assignedDate: '2023-10-01',
        dueDate: '2023-10-05',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await homeworkRepository.save(task);
      
      const saved = await homeworkRepository.getById('hw-1');
      expect(saved).toBeDefined();
      expect(saved?.title).toBe('Read chapter 1');
      
      await homeworkRepository.toggleCompleted('hw-1', true);
      const updated = await homeworkRepository.getById('hw-1');
      expect(updated?.isCompleted).toBe(true);
    });
    
    it('prevents creating homework in archived academic years', async () => {
      await academicYearRepository.update('year-1', { isArchived: true });
      const task: HomeworkTask = {
        id: 'hw-2',
        academicYearId: 'year-1',
        classId: 'class-1',
        title: 'Archived test',
        instructions: '',
        assignedDate: '2023-10-01',
        dueDate: '2023-10-05',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await expect(homeworkRepository.save(task)).rejects.toThrow(/archived/);
    });
  });

  describe('Student Observations', () => {
    it('creates and lists observations for a student', async () => {
      const obs: StudentObservation = {
        id: 'obs-1',
        academicYearId: year.id,
        classId: cls.id,
        studentEnrollmentId: enrollment.id,
        studentPersonId: person.id,
        date: '2023-10-10',
        category: 'Participation',
        content: 'Excellent answers today',
        isPrivateToTeacher: true,
        createdAt: new Date().toISOString(),
      };
      await observationRepository.create(obs);
      
      const list = await observationRepository.listByStudent(enrollment.id);
      expect(list.length).toBe(1);
      expect(list[0].category).toBe('Participation');
    });
    
    it('prevents adding observations to an archived year', async () => {
      await academicYearRepository.update('year-1', { isArchived: true });
      const obs: StudentObservation = {
        id: 'obs-2',
        academicYearId: year.id,
        classId: cls.id,
        studentEnrollmentId: enrollment.id,
        studentPersonId: person.id,
        date: '2023-10-10',
        category: 'Behaviour',
        content: 'Disruptive',
        isPrivateToTeacher: true,
        createdAt: new Date().toISOString(),
      };
      await expect(observationRepository.create(obs)).rejects.toThrow(/archived/);
    });
  });

  describe('Remediation Sessions', () => {
    it('creates and edits remediation sessions with targeted students', async () => {
      const sess: RemediationSession = {
        id: 'rem-1',
        academicYearId: year.id,
        classId: cls.id,
        scheduledDate: '2023-11-01',
        identifiedPedagogicalWeakness: 'Grammar tenses',
        remedialActivitiesDescription: 'Review exercises',
        targetedStudentEnrollmentIds: [enrollment.id],
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await remediationRepository.save(sess);
      
      const saved = await remediationRepository.getById('rem-1');
      expect(saved).toBeDefined();
      expect(saved?.targetedStudentEnrollmentIds).toContain(enrollment.id);
    });
  });
});
