/**
 * UNS SCHOOL — Gradebook Matrix View Component
 * Multi-component term deliberation overview with deterministic weighted averages and completeness tracking.
 */

import React from 'react';
import type {
  GradingScheme,
  Assessment,
  GradeEntry,
  SchoolClass,
} from '../../types';
import type { EnrolledStudentItem } from '../../db/repositories/studentEnrollmentRepository';
import { gradingCalculationService, ClassTermOverview } from '../../services/gradingCalculationService';
import { Card } from '../../components/ui/Card';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface GradebookMatrixViewProps {
  schoolClass: SchoolClass;
  termNumber: 1 | 2 | 3;
  scheme: GradingScheme;
  assessments: Assessment[];
  enrolledStudents: EnrolledStudentItem[];
  grades: GradeEntry[];
  onSelectAssessment: (assessmentId: string) => void;
}

export const GradebookMatrixView: React.FC<GradebookMatrixViewProps> = ({
  schoolClass,
  termNumber,
  scheme,
  assessments,
  enrolledStudents,
  grades,
  onSelectAssessment,
}) => {
  const termAssessments = assessments.filter((a) => a.termNumber === termNumber);
  const enrollments = enrolledStudents.map((item) => item.enrollment);

  const overview: ClassTermOverview = gradingCalculationService.calculateClassTermOverview({
    termNumber,
    scheme,
    assessments: termAssessments,
    enrollments,
    grades,
  });

  const getScoreColor = (score: number | null, max = 20) => {
    if (score === null || score === undefined) return 'text-slate-400';
    const normalized = (score / max) * 20;
    if (normalized >= 14) return 'text-emerald-700 dark:text-emerald-300 font-bold';
    if (normalized >= 10) return 'text-blue-700 dark:text-blue-300 font-semibold';
    return 'text-rose-600 dark:text-rose-400 font-semibold';
  };

  return (
    <div className="space-y-4">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Enrolled
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {overview.statistics.totalEnrolled} Students
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Complete
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {overview.statistics.completeCount} / {overview.statistics.totalEnrolled}
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Class Mean
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {overview.statistics.classAverage !== null ? `${overview.statistics.classAverage} / 20` : '—'}
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-900">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              High / Low
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {overview.statistics.highestScore ?? '—'} / {overview.statistics.lowestScore ?? '—'}
            </div>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Pass Rate (≥10)
            </span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {overview.statistics.passRatePercentage}%
            </div>
          </div>
        </Card>
      </div>

      {/* Grid Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-3 px-3 font-semibold w-12 text-center">N°</th>
                <th className="py-3 px-3 font-semibold min-w-[180px]">Student Name</th>

                {/* Dynamic Columns for Scheme Components */}
                {scheme.components.map((comp) => {
                  const matchingCount = termAssessments.filter((a) => a.componentKey === comp.componentKey).length;
                  return (
                    <th key={comp.componentKey} className="py-3 px-3 font-semibold min-w-[140px] text-center">
                      <div className="text-slate-900 dark:text-slate-100 font-bold">
                        {comp.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Coeff {comp.coefficient} • Max {comp.maxScore} pts ({matchingCount} eval)
                      </div>
                    </th>
                  );
                })}

                <th className="py-3 px-3 font-semibold min-w-[130px] text-center bg-slate-100/70 dark:bg-slate-800/60">
                  <div className="text-indigo-900 dark:text-indigo-200 font-bold">
                    Term Average
                  </div>
                  <div className="text-[10px] text-indigo-500 font-normal">
                    Weighted / 20
                  </div>
                </th>

                <th className="py-3 px-3 font-semibold w-28 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {enrolledStudents.map((item) => {
                const result = overview.studentResults.find(
                  (r) => r.studentEnrollmentId === item.enrollment.id
                );

                const weightedAvg = result?.weightedAverage;
                const isComplete = Boolean(result?.isComplete);

                return (
                  <tr
                    key={item.enrollment.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    {/* Register Number */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                      {item.enrollment.registerNumber}
                    </td>

                    {/* Student Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.person.lastNameLatin.toUpperCase()} {item.person.firstNameLatin}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.person.nationalIdNumber || '—'}
                      </div>
                    </td>

                    {/* Component Score Columns */}
                    {scheme.components.map((comp) => {
                      const compData = result?.componentScores[comp.componentKey];
                      const matchingAssessment = termAssessments.find((a) => a.componentKey === comp.componentKey);

                      return (
                        <td
                          key={comp.componentKey}
                          onClick={() => matchingAssessment && onSelectAssessment(matchingAssessment.id)}
                          className={`py-2.5 px-3 text-center transition-colors ${
                            matchingAssessment ? 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30' : ''
                          }`}
                        >
                          {compData?.isMedicalExemption ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Exempt (Disp)
                            </span>
                          ) : compData?.isAbsent ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Absent (0.00)
                            </span>
                          ) : compData?.score !== null && compData?.score !== undefined ? (
                            <span className={`text-sm ${getScoreColor(compData.score, comp.maxScore)}`}>
                              {compData.score.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600 font-mono">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Weighted Term Average */}
                    <td className="py-2.5 px-3 text-center bg-slate-50/60 dark:bg-slate-900/40">
                      {weightedAvg !== null && weightedAvg !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-sm ${
                              weightedAvg >= 10
                                ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'text-rose-600 dark:text-rose-400 font-bold'
                            }`}
                          >
                            {weightedAvg.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {weightedAvg >= 10 ? 'Admis' : 'Non Admis'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600 font-mono">
                          —
                        </span>
                      )}
                    </td>

                    {/* Completion Status */}
                    <td className="py-2.5 px-3 text-center">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Aggregates Summary Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={2} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-400">
                  Class Component Averages:
                </td>

                {scheme.components.map((comp) => {
                  const compAvg = overview.componentAverages[comp.componentKey];
                  return (
                    <td key={comp.componentKey} className="py-3 px-3 text-center font-bold">
                      {compAvg?.averageScore !== null ? (
                        <span className={getScoreColor(compAvg.averageScore, comp.maxScore)}>
                          {compAvg.averageScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                  );
                })}

                <td className="py-3 px-3 text-center bg-slate-200/70 dark:bg-slate-800/80 font-bold text-indigo-900 dark:text-indigo-200">
                  {overview.statistics.classAverage !== null
                    ? `${overview.statistics.classAverage.toFixed(2)} / 20`
                    : '—'}
                </td>

                <td className="py-3 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  {overview.statistics.completeCount}/{overview.statistics.totalEnrolled} Complete
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
