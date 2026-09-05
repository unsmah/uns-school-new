/**
 * UNS SCHOOL — Grading Calculation Service
 * Pure calculation engine evaluated against a declarative GradingScheme.
 *
 * CRITICAL SECURITY & SAFETY DIRECTIVE:
 * Never executes arbitrary scripts or expressions via eval() or Function().
 */

import type { GradingScheme, Assessment, GradeEntry, AssessmentStatistics, StudentEnrollment } from '../types';

export interface CalculatedStudentGradeResult {
  studentEnrollmentId: string;
  componentScores: Record<
    string,
    {
      score: number | null;
      maxScore: number;
      coefficient: number;
      isAbsent: boolean;
      isMedicalExemption: boolean;
    }
  >;
  weightedAverage: number | null; // Final score scaled to maxOverallScore (e.g. 0 to 20)
  isComplete: boolean; // True if all mandatory components have been recorded
  totalCoefficients: number;
}

export interface ClassTermOverview {
  termNumber: 1 | 2 | 3;
  studentResults: CalculatedStudentGradeResult[];
  statistics: {
    totalEnrolled: number;
    evaluatedCount: number;
    completeCount: number;
    missingCount: number;
    classAverage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    passCount: number;
    passRatePercentage: number;
  };
  componentAverages: Record<string, { averageScore: number | null; evaluatedCount: number }>;
}

export const gradingCalculationService = {
  /**
   * Calculates the overall grade for a student given a scheme and assessment grades.
   */
  calculateStudentTermGrade(
    studentEnrollmentId: string,
    scheme: GradingScheme,
    assessments: Assessment[],
    grades: GradeEntry[]
  ): CalculatedStudentGradeResult {
    const componentScores: CalculatedStudentGradeResult['componentScores'] = {};
    let weightedSum = 0;
    let totalCoefficients = 0;
    let hasMissingMandatory = false;

    // Build effective component configurations map:
    // Prefer Assessment.componentSnapshot (frozen at creation), fall back to scheme.components
    const componentConfigsMap = new Map<
      string,
      { maxScore: number; coefficient: number; isMandatory: boolean; label: string }
    >();

    for (const comp of scheme.components) {
      componentConfigsMap.set(comp.componentKey, {
        maxScore: comp.maxScore,
        coefficient: comp.coefficient,
        isMandatory: comp.isMandatory,
        label: comp.label,
      });
    }

    // Override or add from assessment snapshots if present (historical integrity)
    for (const assessment of assessments) {
      if (assessment.componentSnapshot) {
        componentConfigsMap.set(assessment.componentKey, {
          maxScore: assessment.componentSnapshot.maxScore,
          coefficient: assessment.componentSnapshot.coefficient,
          isMandatory: assessment.componentSnapshot.isMandatory,
          label: assessment.componentSnapshot.label,
        });
      }
    }

    for (const [componentKey, config] of componentConfigsMap.entries()) {
      // Find assessments matching this componentKey
      const matchingAssessments = assessments.filter((a) => a.componentKey === componentKey);

      if (matchingAssessments.length === 0) {
        if (config.isMandatory) {
          hasMissingMandatory = true;
        }
        continue;
      }

      // Calculate average score for this component if multiple assessments exist (e.g. Devoir 1 & Devoir 2)
      let componentScoreSum = 0;
      let validAssessmentCount = 0;
      let isAbsent = false;
      let isMedicalExemption = false;
      let recordedCount = 0;

      for (const assessment of matchingAssessments) {
        const grade = grades.find(
          (g) => g.assessmentId === assessment.id && g.studentEnrollmentId === studentEnrollmentId
        );

        if (!grade) {
          if (config.isMandatory) hasMissingMandatory = true;
          continue;
        }

        recordedCount++;

        if (grade.isMedicalExemption) {
          isMedicalExemption = true;
          continue;
        }

        if (grade.isAbsent) {
          isAbsent = true;
          // In official scoring, unexcused absence is treated as 0 score unless exempted
          componentScoreSum += 0;
          validAssessmentCount++;
          continue;
        }

        if (grade.score !== null && grade.score !== undefined) {
          // Normalize score to component maxScore scale using assessment snapshot maxScore (or fallback config)
          const targetMax = assessment.componentSnapshot?.maxScore ?? config.maxScore;
          const normalizedScore = (grade.score / assessment.maxScore) * targetMax;
          componentScoreSum += normalizedScore;
          validAssessmentCount++;
        } else if (config.isMandatory) {
          hasMissingMandatory = true;
        }
      }

      const finalComponentScore = validAssessmentCount > 0 ? parseFloat((componentScoreSum / validAssessmentCount).toFixed(2)) : null;

      // Use frozen snapshot configuration for coefficient and maxScore
      const effectiveSnapshot = matchingAssessments[0]?.componentSnapshot;
      const effectiveMaxScore = effectiveSnapshot?.maxScore ?? config.maxScore;
      const effectiveCoefficient = effectiveSnapshot?.coefficient ?? config.coefficient;

      componentScores[componentKey] = {
        score: finalComponentScore,
        maxScore: effectiveMaxScore,
        coefficient: effectiveCoefficient,
        isAbsent,
        isMedicalExemption,
      };

      if (finalComponentScore !== null && !isMedicalExemption) {
        const effectiveMaxOverallScore = matchingAssessments[0]?.maxOverallScoreSnapshot ?? scheme.maxOverallScore;
        weightedSum += (finalComponentScore / effectiveMaxScore) * effectiveMaxOverallScore * effectiveCoefficient;
        totalCoefficients += effectiveCoefficient;
      }
    }

    const weightedAverage = totalCoefficients > 0 ? parseFloat((weightedSum / totalCoefficients).toFixed(2)) : null;

    return {
      studentEnrollmentId,
      componentScores,
      weightedAverage,
      isComplete: !hasMissingMandatory && weightedAverage !== null,
      totalCoefficients,
    };
  },

  /**
   * Calculates comprehensive statistics for a single assessment.
   */
  calculateAssessmentStatistics(
    assessment: Assessment,
    grades: GradeEntry[],
    totalEnrolled: number
  ): AssessmentStatistics {
    const matchingGrades = grades.filter((g) => g.assessmentId === assessment.id);
    const exemptGrades = matchingGrades.filter((g) => g.isMedicalExemption);
    const absentGrades = matchingGrades.filter((g) => g.isAbsent && !g.isMedicalExemption);
    
    // Valid numerical scores
    const scoredGrades = matchingGrades.filter(
      (g) => g.score !== null && g.score !== undefined && !g.isMedicalExemption && !g.isAbsent
    );

    const enteredCount = matchingGrades.filter(
      (g) => (g.score !== null && g.score !== undefined) || g.isAbsent || g.isMedicalExemption
    ).length;

    const missingCount = Math.max(0, totalEnrolled - enteredCount);

    // Calculate effective scores including unexcused absences as 0
    const effectiveScores: number[] = [
      ...scoredGrades.map((g) => g.score as number),
      ...absentGrades.map(() => 0),
    ];

    if (effectiveScores.length === 0) {
      return {
        assessmentId: assessment.id,
        totalEnrolled,
        enteredCount,
        missingCount,
        absentCount: absentGrades.length,
        exemptCount: exemptGrades.length,
        averageScore: null,
        averageNormalizedScore: null,
        highestScore: null,
        lowestScore: null,
        passCount: 0,
        passRatePercentage: 0,
      };
    }

    const sum = effectiveScores.reduce((acc, curr) => acc + curr, 0);
    const rawAverage = sum / effectiveScores.length;
    const normalizedAverage = (rawAverage / assessment.maxScore) * 20;
    const highest = Math.max(...effectiveScores);
    const lowest = Math.min(...effectiveScores);
    const passingThreshold = assessment.maxScore / 2; // e.g. 10/20
    const passCount = effectiveScores.filter((s) => s >= passingThreshold).length;
    const passRatePercentage = parseFloat(((passCount / effectiveScores.length) * 100).toFixed(1));

    return {
      assessmentId: assessment.id,
      totalEnrolled,
      enteredCount,
      missingCount,
      absentCount: absentGrades.length,
      exemptCount: exemptGrades.length,
      averageScore: parseFloat(rawAverage.toFixed(2)),
      averageNormalizedScore: parseFloat(normalizedAverage.toFixed(2)),
      highestScore: highest,
      lowestScore: lowest,
      passCount,
      passRatePercentage,
    };
  },

  /**
   * Calculates class statistics: average, highest, lowest, pass rate (score >= 10/20).
   */
  calculateClassTermStatistics(results: CalculatedStudentGradeResult[], passingThreshold = 10): {
    classAverage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    passCount: number;
    totalEvaluated: number;
    passRatePercentage: number;
  } {
    const validScores = results
      .map((r) => r.weightedAverage)
      .filter((s): s is number => s !== null && s !== undefined);

    if (validScores.length === 0) {
      return {
        classAverage: null,
        highestScore: null,
        lowestScore: null,
        passCount: 0,
        totalEvaluated: 0,
        passRatePercentage: 0,
      };
    }

    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    const highest = Math.max(...validScores);
    const lowest = Math.min(...validScores);
    const passCount = validScores.filter((s) => s >= passingThreshold).length;

    return {
      classAverage: parseFloat((sum / validScores.length).toFixed(2)),
      highestScore: highest,
      lowestScore: lowest,
      passCount,
      totalEvaluated: validScores.length,
      passRatePercentage: parseFloat(((passCount / validScores.length) * 100).toFixed(1)),
    };
  },

  /**
   * Produces a full term overview for a class, including all student evaluations and class aggregate metrics.
   */
  calculateClassTermOverview(params: {
    termNumber: 1 | 2 | 3;
    scheme: GradingScheme;
    assessments: Assessment[];
    enrollments: StudentEnrollment[];
    grades: GradeEntry[];
  }): ClassTermOverview {
    const { termNumber, scheme, assessments, enrollments, grades } = params;

    const termAssessments = assessments.filter((a) => a.termNumber === termNumber);
    const studentResults: CalculatedStudentGradeResult[] = enrollments.map((e) =>
      this.calculateStudentTermGrade(e.id, scheme, termAssessments, grades)
    );

    const stats = this.calculateClassTermStatistics(studentResults);
    const completeCount = studentResults.filter((r) => r.isComplete).length;
    const missingCount = enrollments.length - completeCount;

    // Component-level averages
    const componentAverages: Record<string, { averageScore: number | null; evaluatedCount: number }> = {};
    for (const comp of scheme.components) {
      const validCompScores = studentResults
        .map((r) => r.componentScores[comp.componentKey]?.score)
        .filter((s): s is number => s !== null && s !== undefined);

      if (validCompScores.length > 0) {
        const compSum = validCompScores.reduce((acc, curr) => acc + curr, 0);
        componentAverages[comp.componentKey] = {
          averageScore: parseFloat((compSum / validCompScores.length).toFixed(2)),
          evaluatedCount: validCompScores.length,
        };
      } else {
        componentAverages[comp.componentKey] = {
          averageScore: null,
          evaluatedCount: 0,
        };
      }
    }

    return {
      termNumber,
      studentResults,
      statistics: {
        totalEnrolled: enrollments.length,
        evaluatedCount: stats.totalEvaluated,
        completeCount,
        missingCount,
        classAverage: stats.classAverage,
        highestScore: stats.highestScore,
        lowestScore: stats.lowestScore,
        passCount: stats.passCount,
        passRatePercentage: stats.passRatePercentage,
      },
      componentAverages,
    };
  },
};

