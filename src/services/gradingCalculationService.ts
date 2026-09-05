/**
 * UNS SCHOOL — Grading Calculation Service
 * Pure calculation engine evaluated against a declarative GradingScheme.
 *
 * CRITICAL SECURITY & SAFETY DIRECTIVE:
 * Never executes arbitrary scripts or expressions via eval() or Function().
 */

import type { GradingScheme, Assessment, GradeEntry } from '../types';

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

    for (const component of scheme.components) {
      // Find assessments matching this componentKey
      const matchingAssessments = assessments.filter((a) => a.componentKey === component.componentKey);

      if (matchingAssessments.length === 0) {
        if (component.isMandatory) {
          hasMissingMandatory = true;
        }
        continue;
      }

      // Calculate average score for this component if multiple assessments exist (e.g. Devoir 1 & Devoir 2)
      let componentScoreSum = 0;
      let validAssessmentCount = 0;
      let isAbsent = false;
      let isMedicalExemption = false;

      for (const assessment of matchingAssessments) {
        const grade = grades.find(
          (g) => g.assessmentId === assessment.id && g.studentEnrollmentId === studentEnrollmentId
        );

        if (!grade) {
          if (component.isMandatory) hasMissingMandatory = true;
          continue;
        }

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
          // Normalize score to component maxScore scale if assessment has different max
          const normalizedScore = (grade.score / assessment.maxScore) * component.maxScore;
          componentScoreSum += normalizedScore;
          validAssessmentCount++;
        } else if (component.isMandatory) {
          hasMissingMandatory = true;
        }
      }

      const finalComponentScore = validAssessmentCount > 0 ? componentScoreSum / validAssessmentCount : null;

      componentScores[component.componentKey] = {
        score: finalComponentScore,
        maxScore: component.maxScore,
        coefficient: component.coefficient,
        isAbsent,
        isMedicalExemption,
      };

      if (finalComponentScore !== null && !isMedicalExemption) {
        weightedSum += (finalComponentScore / component.maxScore) * scheme.maxOverallScore * component.coefficient;
        totalCoefficients += component.coefficient;
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
};
