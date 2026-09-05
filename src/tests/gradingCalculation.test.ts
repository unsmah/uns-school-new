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

  it('calculates comprehensive statistics for single assessment', () => {
    const testAssessment = assessments[0]; // maxScore = 20
    const testGrades: GradeEntry[] = [
      { id: 'g1', assessmentId: testAssessment.id, studentEnrollmentId: 's1', score: 18, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g2', assessmentId: testAssessment.id, studentEnrollmentId: 's2', score: 14, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g3', assessmentId: testAssessment.id, studentEnrollmentId: 's3', score: 8, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g4', assessmentId: testAssessment.id, studentEnrollmentId: 's4', score: null, isAbsent: true, isMedicalExemption: false, updatedAt: '' }, // treated as 0
      { id: 'g5', assessmentId: testAssessment.id, studentEnrollmentId: 's5', score: null, isAbsent: true, isMedicalExemption: true, updatedAt: '' }, // exempt
    ];

    const stats = gradingCalculationService.calculateAssessmentStatistics(testAssessment, testGrades, 6);
    expect(stats.totalEnrolled).toBe(6);
    expect(stats.enteredCount).toBe(5);
    expect(stats.missingCount).toBe(1);
    expect(stats.absentCount).toBe(1);
    expect(stats.exemptCount).toBe(1);
    // Effective scores: 18, 14, 8, 0 -> sum = 40, count = 4 -> average = 10
    expect(stats.averageScore).toBe(10);
    expect(stats.highestScore).toBe(18);
    expect(stats.lowestScore).toBe(0);
    expect(stats.passCount).toBe(2); // 18, 14 are >= 10
    expect(stats.passRatePercentage).toBe(50);
  });

  it('calculates class term overview with per-student results and aggregate metrics', () => {
    const enrollments = [
      { id: 's1', studentPersonId: 'p1', academicYearId: 'year-1', classId: 'class-1', registerNumber: 1, isRepeating: false, status: 'active' as const, createdAt: '', updatedAt: '' },
      { id: 's2', studentPersonId: 'p2', academicYearId: 'year-1', classId: 'class-1', registerNumber: 2, isRepeating: false, status: 'active' as const, createdAt: '', updatedAt: '' },
    ];
    const testGrades: GradeEntry[] = [
      { id: 'g1', assessmentId: 'ass-cc', studentEnrollmentId: 's1', score: 14, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g2', assessmentId: 'ass-test', studentEnrollmentId: 's1', score: 12, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g3', assessmentId: 'ass-exam', studentEnrollmentId: 's1', score: 16, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g4', assessmentId: 'ass-cc', studentEnrollmentId: 's2', score: 10, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g5', assessmentId: 'ass-test', studentEnrollmentId: 's2', score: 8, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
      { id: 'g6', assessmentId: 'ass-exam', studentEnrollmentId: 's2', score: 10, isAbsent: false, isMedicalExemption: false, updatedAt: '' },
    ];

    const overview = gradingCalculationService.calculateClassTermOverview({
      termNumber: 1,
      scheme: sampleScheme,
      assessments,
      enrollments,
      grades: testGrades,
    });

    expect(overview.statistics.totalEnrolled).toBe(2);
    expect(overview.statistics.completeCount).toBe(2);
    expect(overview.statistics.missingCount).toBe(0);
    // s1 weightedAverage = 14.5, s2 weightedAverage = (10*1 + 8*1 + 10*2)/4 = 38/4 = 9.5
    // classAverage = (14.5 + 9.5)/2 = 12.0
    expect(overview.statistics.classAverage).toBe(12);
    expect(overview.statistics.highestScore).toBe(14.5);
    expect(overview.statistics.lowestScore).toBe(9.5);
    expect(overview.statistics.passCount).toBe(1);
    expect(overview.statistics.passRatePercentage).toBe(50);
  });
});

