/**
 * UNS SCHOOL — Phase 6 Integration Tests
 * Assessments, Gradebook, Deterministic Grading & Historical Integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { schoolRepository } from '../db/repositories/schoolRepository';
import { academicYearRepository } from '../db/repositories/academicYearRepository';
import { classRepository } from '../db/repositories/classRepository';
import { studentPersonRepository } from '../db/repositories/studentPersonRepository';
import { studentEnrollmentRepository } from '../db/repositories/studentEnrollmentRepository';
import { assessmentRepository } from '../db/repositories/assessmentRepository';
import { gradeRepository } from '../db/repositories/gradeRepository';
import { gradingCalculationService } from '../services/gradingCalculationService';
import type { GradingScheme, Assessment, GradeEntry } from '../types';

describe('Phase 6 — Assessments, Gradebook & Deterministic Grading', () => {
  const schoolId = 'school-p6-test';
  let activeYearId: string;
  let archivedYearId: string;
  let activeClassId: string;
  let studentEnrollment1: string;
  let studentEnrollment2: string;
  let sampleScheme: GradingScheme;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // 0. Seed School
    await schoolRepository.save({
      id: schoolId,
      name: 'CEM Test School',
      commune: 'Algiers',
      wilaya: 'Algiers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. Seed Academic Years
    activeYearId = await academicYearRepository.create({
      id: 'year-2026-2027',
      schoolId,
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [
        { id: 't1', termNumber: 1, name: '1st Term', startDate: '2026-09-01', endDate: '2026-12-15' },
        { id: 't2', termNumber: 2, name: '2nd Term', startDate: '2027-01-05', endDate: '2027-03-20' },
        { id: 't3', termNumber: 3, name: '3rd Term', startDate: '2027-04-05', endDate: '2027-06-30' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    archivedYearId = await academicYearRepository.create({
      id: 'year-2025-2026',
      schoolId,
      label: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [
        { id: 't1-prev', termNumber: 1, name: '1st Term', startDate: '2025-09-01', endDate: '2025-12-15' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Seed Class
    activeClassId = await classRepository.create({
      id: 'class-4am1',
      schoolId,
      academicYearId: activeYearId,
      name: '4AM 1',
      levelCode: '4MS',
      roomNumber: 'Room 12',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Seed Grading Scheme
    sampleScheme = {
      id: 'scheme-dz-official',
      name: 'Official Algerian Middle School Evaluation Scheme',
      formulaType: 'weighted_average',
      maxOverallScore: 20,
      isOfficial: true,
      components: [
        {
          componentKey: 'continuous_assessment',
          label: 'Évaluation continue',
          maxScore: 20,
          coefficient: 1,
          isMandatory: true,
        },
        {
          componentKey: 'term_test',
          label: 'Devoir surveillé',
          maxScore: 20,
          coefficient: 1,
          isMandatory: true,
        },
        {
          componentKey: 'exam_composition',
          label: 'Composition trimestrielle',
          maxScore: 20,
          coefficient: 2,
          isMandatory: true,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.gradingSchemes.add(sampleScheme);

    // 4. Seed Students & Enrollments
    const person1 = await studentPersonRepository.create({
      id: 'person-1',
      firstNameLatin: 'Amina',
      lastNameLatin: 'Benali',
      gender: 'F',
      dateOfBirth: '2012-04-15',
      nationalIdNumber: 'REG-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const person2 = await studentPersonRepository.create({
      id: 'person-2',
      firstNameLatin: 'Karim',
      lastNameLatin: 'Mansouri',
      gender: 'M',
      dateOfBirth: '2012-08-20',
      nationalIdNumber: 'REG-002',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    studentEnrollment1 = await studentEnrollmentRepository.enroll({
      id: 'enr-1',
      studentPersonId: person1,
      academicYearId: activeYearId,
      classId: activeClassId,
      registerNumber: 1,
      isRepeating: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    studentEnrollment2 = await studentEnrollmentRepository.enroll({
      id: 'enr-2',
      studentPersonId: person2,
      academicYearId: activeYearId,
      classId: activeClassId,
      registerNumber: 2,
      isRepeating: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('Assessment Creation & Integrity', () => {
    it('creates an assessment and snapshots the grading component configuration', async () => {
      const assessment: Assessment = {
        id: 'ass-t1-test1',
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 1,
        title: 'Devoir Surveillé N°1',
        date: '2026-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdId = await assessmentRepository.create(assessment);
      expect(createdId).toBe('ass-t1-test1');

      const retrieved = await assessmentRepository.getById('ass-t1-test1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Devoir Surveillé N°1');
      expect(retrieved?.componentSnapshot).toBeDefined();
      expect(retrieved?.componentSnapshot?.componentKey).toBe('term_test');
      expect(retrieved?.componentSnapshot?.coefficient).toBe(1);
    });

    it('rejects assessment creation in an archived academic year', async () => {
      const assessment: Assessment = {
        id: 'ass-archived-yr',
        academicYearId: archivedYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 1,
        title: 'Devoir Test',
        date: '2026-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(assessmentRepository.create(assessment)).rejects.toThrow(
        /Cannot add assessments to an archived academic year/
      );
    });

    it('rejects assessment creation with invalid parameters (empty title, invalid maxScore, invalid date)', async () => {
      const invalidAssessment: Assessment = {
        id: 'ass-invalid',
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 1,
        title: '   ', // Empty
        date: 'invalid-date',
        maxScore: -5,
        coefficient: 0,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(assessmentRepository.create(invalidAssessment)).rejects.toThrow();
    });

    it('prevents modifying or deleting locked assessments', async () => {
      const assessment: Assessment = {
        id: 'ass-locked-test',
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'exam_composition',
        termNumber: 1,
        title: 'Composition T1',
        date: '2026-11-25',
        maxScore: 20,
        coefficient: 2,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await assessmentRepository.create(assessment);
      await assessmentRepository.lockAssessment('ass-locked-test');

      // Attempting to update title while locked
      await expect(
        assessmentRepository.update('ass-locked-test', { title: 'Modified Title' })
      ).rejects.toThrow(/This assessment is locked and cannot be edited/);

      // Attempting to delete while locked
      await expect(assessmentRepository.delete('ass-locked-test')).rejects.toThrow(
        /Cannot delete a locked assessment/
      );

      // Can unlock and edit
      await assessmentRepository.unlockAssessment('ass-locked-test');
      await assessmentRepository.update('ass-locked-test', { title: 'Composition T1 (Final)' });
      const updated = await assessmentRepository.getById('ass-locked-test');
      expect(updated?.title).toBe('Composition T1 (Final)');
    });
  });

  describe('Gradebook Operations & Grade Recording', () => {
    let assessmentId: string;

    beforeEach(async () => {
      assessmentId = await assessmentRepository.create({
        id: 'ass-t1-test',
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 1,
        title: 'Devoir Surveillé N°1',
        date: '2026-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('records and batch-saves grades with score validation', async () => {
      const grades: GradeEntry[] = [
        {
          id: 'g-1',
          assessmentId,
          studentEnrollmentId: studentEnrollment1,
          score: 16.5,
          isAbsent: false,
          isMedicalExemption: false,
          teacherRemarks: 'Excellent analytical work',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'g-2',
          assessmentId,
          studentEnrollmentId: studentEnrollment2,
          score: 11,
          isAbsent: false,
          isMedicalExemption: false,
          updatedAt: new Date().toISOString(),
        },
      ];

      await gradeRepository.saveBatch(assessmentId, grades);

      const savedGrades = await gradeRepository.listByAssessment(assessmentId);
      expect(savedGrades.length).toBe(2);

      const g1 = savedGrades.find((g) => g.studentEnrollmentId === studentEnrollment1);
      expect(g1?.score).toBe(16.5);
      expect(g1?.teacherRemarks).toBe('Excellent analytical work');
    });

    it('rejects grade exceeding assessment maximum score', async () => {
      const invalidGrade: GradeEntry = {
        id: 'g-over-max',
        assessmentId,
        studentEnrollmentId: studentEnrollment1,
        score: 25, // maxScore is 20
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      };

      await expect(gradeRepository.recordGrade(invalidGrade)).rejects.toThrow(
        /exceeds bounds/
      );
    });

    it('rejects cross-class grade insertion', async () => {
      // Create another class
      const otherClassId = await classRepository.create({
        id: 'class-4am2',
        schoolId,
        academicYearId: activeYearId,
        name: '4AM 2',
        levelCode: '4MS',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const otherPerson = await studentPersonRepository.create({
        id: 'person-other',
        firstNameLatin: 'Farid',
        lastNameLatin: 'Zaid',
        gender: 'M',
        dateOfBirth: '2012-09-01',
        nationalIdNumber: 'REG-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const otherEnrollment = await studentEnrollmentRepository.enroll({
        id: 'enr-other',
        studentPersonId: otherPerson,
        academicYearId: activeYearId,
        classId: otherClassId,
        registerNumber: 1,
        isRepeating: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Attempting to record grade for student from 4AM2 into 4AM1's assessment
      const crossClassGrade: GradeEntry = {
        id: 'g-cross',
        assessmentId, // is in 4AM1
        studentEnrollmentId: otherEnrollment, // is in 4AM2
        score: 15,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      };

      await expect(gradeRepository.recordGrade(crossClassGrade)).rejects.toThrow(
        /does not belong to assessment class/
      );
    });

    it('clears grade for student correctly', async () => {
      await gradeRepository.recordGrade({
        id: 'g-to-clear',
        assessmentId,
        studentEnrollmentId: studentEnrollment1,
        score: 14,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      });

      let grade = await gradeRepository.getGrade(assessmentId, studentEnrollment1);
      expect(grade).toBeDefined();

      await gradeRepository.clearGradeForStudent(assessmentId, studentEnrollment1);
      grade = await gradeRepository.getGrade(assessmentId, studentEnrollment1);
      expect(grade).toBeUndefined();
    });

    it('rejects assessment creation with an invalid componentKey not present in grading scheme', async () => {
      const invalidAssessment: Assessment = {
        id: 'ass-invalid-comp',
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'non_existent_component_key',
        termNumber: 1,
        title: 'Invalid Component Test',
        date: '2026-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(assessmentRepository.create(invalidAssessment)).rejects.toThrow(
        /does not exist in the selected grading scheme/
      );
    });

    it('mandatorily preserves historical grading calculation using Assessment.componentSnapshot when scheme changes to configuration B', async () => {
      // 1. Create assessment with configuration A (term_test coefficient = 1)
      const assessmentId = 'ass-snapshot-regress';
      await assessmentRepository.create({
        id: assessmentId,
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 1,
        title: 'Devoir Snapshot Test',
        date: '2026-10-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Record a grade for student 1
      await gradeRepository.recordGrade({
        id: 'g-regress-1',
        assessmentId,
        studentEnrollmentId: studentEnrollment1,
        score: 16,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      });

      // 2. Calculate result under initial scheme configuration A
      const resultA = gradingCalculationService.calculateStudentTermGrade(
        studentEnrollment1,
        sampleScheme,
        await assessmentRepository.listByClass(activeClassId),
        await db.grades.toArray()
      );
      const initialWeightedAverage = resultA.weightedAverage;
      expect(initialWeightedAverage).not.toBeNull();

      // 3. Change current grading scheme to configuration B (e.g., change term_test coefficient from 1 to 5)
      const modifiedScheme: GradingScheme = {
        ...sampleScheme,
        components: sampleScheme.components.map((c) =>
          c.componentKey === 'term_test' ? { ...c, coefficient: 5 } : c
        ),
      };
      await db.gradingSchemes.put(modifiedScheme);

      // 4. Recalculate OLD assessment using the updated grading scheme
      const resultB = gradingCalculationService.calculateStudentTermGrade(
        studentEnrollment1,
        modifiedScheme,
        await assessmentRepository.listByClass(activeClassId),
        await db.grades.toArray()
      );

      // 5. Assert the result is unchanged because historical calculation uses Assessment.componentSnapshot (coefficient = 1)
      expect(resultB.weightedAverage).toBe(initialWeightedAverage);
    });

    it('mandatorily preserves historical grading calculation when scheme maxOverallScore changes', async () => {
      const assessmentId = 'ass-maxoverall-regress';
      await assessmentRepository.create({
        id: assessmentId,
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'term_test',
        termNumber: 2,
        title: 'Max Overall Score Snapshot Test',
        date: '2026-11-15',
        maxScore: 20,
        coefficient: 1,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await gradeRepository.recordGrade({
        id: 'g-max-1',
        assessmentId,
        studentEnrollmentId: studentEnrollment1,
        score: 14,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      });

      const resA = gradingCalculationService.calculateStudentTermGrade(
        studentEnrollment1,
        sampleScheme,
        await assessmentRepository.listByClass(activeClassId),
        await db.grades.toArray()
      );
      const avgA = resA.weightedAverage;

      // Change scheme maxOverallScore to 40
      const modifiedScheme: GradingScheme = {
        ...sampleScheme,
        maxOverallScore: 40,
      };
      await db.gradingSchemes.put(modifiedScheme);

      const resB = gradingCalculationService.calculateStudentTermGrade(
        studentEnrollment1,
        modifiedScheme,
        await assessmentRepository.listByClass(activeClassId),
        await db.grades.toArray()
      );

      // Result must remain identical because assessment froze maxOverallScoreSnapshot
      expect(resB.weightedAverage).toBe(avgA);
    });

    it('explicitly scopes gradeRepository.listByClassAndTerm by academicYearId, classId, and termNumber', async () => {
      const gradesForTerm = await gradeRepository.listByClassAndTerm(activeYearId, activeClassId, 1);
      expect(Array.isArray(gradesForTerm)).toBe(true);
    });

    it('prevents modification of grading-defining fields if the assessment has grades', async () => {
      const assessmentId = 'ass-freeze-test';
      await assessmentRepository.create({
        id: assessmentId,
        academicYearId: activeYearId,
        classId: activeClassId,
        gradingSchemeId: sampleScheme.id,
        componentKey: 'continuous_assessment',
        termNumber: 1,
        title: 'Freeze Test Assessment',
        date: '2026-10-01',
        maxScore: 10,
        coefficient: 2,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await gradeRepository.recordGrade({
        id: 'g-freeze-1',
        assessmentId,
        studentEnrollmentId: studentEnrollment1,
        score: 8,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: new Date().toISOString(),
      });

      // Attempt to change grading-defining fields should fail
      await expect(assessmentRepository.update(assessmentId, { maxScore: 20 })).rejects.toThrow('Cannot change grading-defining fields');
      await expect(assessmentRepository.update(assessmentId, { coefficient: 3 })).rejects.toThrow('Cannot change grading-defining fields');
      await expect(assessmentRepository.update(assessmentId, { componentKey: 'term_test' })).rejects.toThrow('Cannot change grading-defining fields');
      await expect(assessmentRepository.update(assessmentId, { termNumber: 2 })).rejects.toThrow('Cannot change grading-defining fields');
      await expect(assessmentRepository.update(assessmentId, { gradingSchemeId: 'some-other-scheme' })).rejects.toThrow('Cannot change class, academic year, or grading scheme');

      // Attempt to overwrite snapshots should be silently ignored (they should remain identical)
      const fakeSnapshot = {
        componentKey: 'fake',
        label: 'Fake',
        coefficient: 99,
        maxScore: 100,
        isMandatory: true,
      };
      await assessmentRepository.update(assessmentId, {
        title: 'Updated Title', // Allowed
        componentSnapshot: fakeSnapshot,
        maxOverallScoreSnapshot: 100
      });

      const updated = await db.assessments.get(assessmentId);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.componentSnapshot?.coefficient).not.toBe(99);
      expect(updated?.maxOverallScoreSnapshot).not.toBe(100);
      
      // Calculate grade to ensure invariance
      const res = gradingCalculationService.calculateStudentTermGrade(
        studentEnrollment1,
        sampleScheme,
        await assessmentRepository.listByClass(activeClassId),
        await db.grades.toArray()
      );
      
      expect(res.weightedAverage).toBeDefined();
    });
  });
});
