import { describe, it, expect } from 'vitest';
import { gradingCalculationService } from '../services/gradingCalculationService';
import type { GradingScheme, Assessment, GradeEntry } from '../types';

describe('Grading Calculation Engine', () => {
  const sampleScheme: GradingScheme = {
    id: 'scheme-test',
    name: 'Algerian Middle School Tripartite Scheme',
    formulaType: 'weighted_average',
    maxOverallScore: 20,
    isOfficial: true,
    components: [
      {
        componentKey: 'continuous_assessment',
        label: 'Continuous Assessment',
        maxScore: 20,
        coefficient: 1,
        isMandatory: true,
      },
      {
        componentKey: 'term_test',
        label: 'Devoir Surveillé',
        maxScore: 20,
        coefficient: 1,
        isMandatory: true,
      },
      {
        componentKey: 'exam_composition',
        label: 'Composition',
        maxScore: 20,
        coefficient: 2,
        isMandatory: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const assessments: Assessment[] = [
    {
      id: 'ass-cc',
      academicYearId: 'year-1',
      classId: 'class-1',
      gradingSchemeId: 'scheme-test',
      componentKey: 'continuous_assessment',
      title: 'Évaluation continue',
      termNumber: 1,
      date: '2026-10-01',
      maxScore: 20,
      coefficient: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ass-test',
      academicYearId: 'year-1',
      classId: 'class-1',
      gradingSchemeId: 'scheme-test',
      componentKey: 'term_test',
      title: 'Devoir Surveillé',
      termNumber: 1,
      date: '2026-10-15',
      maxScore: 20,
      coefficient: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ass-exam',
      academicYearId: 'year-1',
      classId: 'class-1',
      gradingSchemeId: 'scheme-test',
      componentKey: 'exam_composition',
      title: 'Composition',
      termNumber: 1,
      date: '2026-11-20',
      maxScore: 20,
      coefficient: 2,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('calculates deterministic weighted average for complete student grades', () => {
    // Student A: CC=14 (coeff 1), Test=12 (coeff 1), Exam=16 (coeff 2)
    // Weighted Sum: (14*1) + (12*1) + (16*2) = 14 + 12 + 32 = 58
    // Total Coeffs: 1 + 1 + 2 = 4
    // Expected: 58 / 4 = 14.50
    const grades: GradeEntry[] = [
      {
        id: 'g1',
        assessmentId: 'ass-cc',
        studentEnrollmentId: 'student-A',
        score: 14,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g2',
        assessmentId: 'ass-test',
        studentEnrollmentId: 'student-A',
        score: 12,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g3',
        assessmentId: 'ass-exam',
        studentEnrollmentId: 'student-A',
        score: 16,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
    ];

    const result = gradingCalculationService.calculateStudentTermGrade(
      'student-A',
      sampleScheme,
      assessments,
      grades
    );

    expect(result.isComplete).toBe(true);
    expect(result.weightedAverage).toBe(14.5);
    expect(result.totalCoefficients).toBe(4);
  });

  it('marks isComplete as false when a mandatory component is missing', () => {
    // Missing exam_composition
    const grades: GradeEntry[] = [
      {
        id: 'g1',
        assessmentId: 'ass-cc',
        studentEnrollmentId: 'student-B',
        score: 15,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g2',
        assessmentId: 'ass-test',
        studentEnrollmentId: 'student-B',
        score: 13,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
    ];

    const result = gradingCalculationService.calculateStudentTermGrade(
      'student-B',
      sampleScheme,
      assessments,
      grades
    );

    expect(result.isComplete).toBe(false);
    expect(result.componentScores['exam_composition'].score).toBeNull();
  });

  it('handles unexcused absence as 0 in official scoring', () => {
    // Student C: CC=12 (coeff 1), Test=absent_unexcused (0, coeff 1), Exam=14 (coeff 2)
    // Weighted Sum: (12*1) + (0*1) + (14*2) = 12 + 0 + 28 = 40
    // Total Coeffs: 4
    // Expected: 40 / 4 = 10.00
    const grades: GradeEntry[] = [
      {
        id: 'g1',
        assessmentId: 'ass-cc',
        studentEnrollmentId: 'student-C',
        score: 12,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g2',
        assessmentId: 'ass-test',
        studentEnrollmentId: 'student-C',
        score: null,
        isAbsent: true,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g3',
        assessmentId: 'ass-exam',
        studentEnrollmentId: 'student-C',
        score: 14,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
    ];

    const result = gradingCalculationService.calculateStudentTermGrade(
      'student-C',
      sampleScheme,
      assessments,
      grades
    );

    expect(result.componentScores['term_test'].isAbsent).toBe(true);
    expect(result.componentScores['term_test'].score).toBe(0);
    expect(result.weightedAverage).toBe(10);
  });

  it('excludes medical exemption from weighted sum calculation', () => {
    // Student D: CC=16 (coeff 1), Test=medical exemption (excluded), Exam=16 (coeff 2)
    // Weighted Sum: (16*1) + (16*2) = 48
    // Total Coeffs: 1 + 2 = 3
    // Expected: 48 / 3 = 16.00
    const grades: GradeEntry[] = [
      {
        id: 'g1',
        assessmentId: 'ass-cc',
        studentEnrollmentId: 'student-D',
        score: 16,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
      {
        id: 'g2',
        assessmentId: 'ass-test',
        studentEnrollmentId: 'student-D',
        score: null,
        isAbsent: true,
        isMedicalExemption: true,
        updatedAt: '',
      },
      {
        id: 'g3',
        assessmentId: 'ass-exam',
        studentEnrollmentId: 'student-D',
        score: 16,
        isAbsent: false,
        isMedicalExemption: false,
        updatedAt: '',
      },
    ];

    const result = gradingCalculationService.calculateStudentTermGrade(
      'student-D',
      sampleScheme,
      assessments,
      grades
    );

    expect(result.componentScores['term_test'].isMedicalExemption).toBe(true);
    expect(result.weightedAverage).toBe(16);
    expect(result.totalCoefficients).toBe(3);
  });
});
