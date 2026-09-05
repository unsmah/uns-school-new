/**
 * UNS SCHOOL — Gradebook Roster Entry Component
 * Batch grade entry interface with real-time score validation, absent/exempt toggling, and keyboard navigation.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Assessment, GradeEntry, SchoolClass } from '../../types';
import type { EnrolledStudentItem } from '../../db/repositories/studentEnrollmentRepository';
import { gradeRepository } from '../../db/repositories/gradeRepository';
import { gradingCalculationService } from '../../services/gradingCalculationService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  UserX,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface GradebookRosterEntryProps {
  assessment: Assessment;
  schoolClass: SchoolClass;
  enrolledStudents: EnrolledStudentItem[];
  initialGrades: GradeEntry[];
  isReadOnly: boolean;
  onGradesSaved: () => void;
  onToggleLock: (assessment: Assessment) => void;
}

interface StudentGradeDraft {
  studentEnrollmentId: string;
  score: string; // string for fluid typing
  isAbsent: boolean;
  isMedicalExemption: boolean;
  teacherRemarks: string;
  isDirty: boolean;
  validationError?: string;
}

export const GradebookRosterEntry: React.FC<GradebookRosterEntryProps> = ({
  assessment,
  schoolClass,
  enrolledStudents,
  initialGrades,
  isReadOnly,
  onGradesSaved,
  onToggleLock,
}) => {
  const [drafts, setDrafts] = useState<Record<string, StudentGradeDraft>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize drafts whenever initialGrades or students change
  useEffect(() => {
    const draftMap: Record<string, StudentGradeDraft> = {};
    for (const item of enrolledStudents) {
      const existing = initialGrades.find(
        (g) => g.studentEnrollmentId === item.enrollment.id && g.assessmentId === assessment.id
      );

      draftMap[item.enrollment.id] = {
        studentEnrollmentId: item.enrollment.id,
        score: existing?.score !== null && existing?.score !== undefined ? String(existing.score) : '',
        isAbsent: Boolean(existing?.isAbsent),
        isMedicalExemption: Boolean(existing?.isMedicalExemption),
        teacherRemarks: existing?.teacherRemarks || '',
        isDirty: false,
      };
    }
    setDrafts(draftMap);
    setSaveSuccess(false);
    setSaveError(null);
  }, [assessment.id, enrolledStudents, initialGrades]);

  const handleScoreChange = (enrollmentId: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;

      let error: string | undefined = undefined;
      if (value.trim() !== '') {
        const num = parseFloat(value);
        if (isNaN(num)) {
          error = 'Must be a valid number';
        } else if (num < 0 || num > assessment.maxScore) {
          error = `Score must be between 0 and ${assessment.maxScore}`;
        }
      }

      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          score: value,
          isAbsent: false,
          isMedicalExemption: false,
          isDirty: true,
          validationError: error,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleToggleAbsent = (enrollmentId: string) => {
    setDrafts((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;
      const nextAbsent = !current.isAbsent;
      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          isAbsent: nextAbsent,
          isMedicalExemption: false,
          score: nextAbsent ? '' : current.score,
          isDirty: true,
          validationError: undefined,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleToggleExemption = (enrollmentId: string) => {
    setDrafts((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;
      const nextExempt = !current.isMedicalExemption;
      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          isMedicalExemption: nextExempt,
          isAbsent: false,
          score: nextExempt ? '' : current.score,
          isDirty: true,
          validationError: undefined,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleRemarksChange = (enrollmentId: string, remarks: string) => {
    setDrafts((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;
      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          teacherRemarks: remarks,
          isDirty: true,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleClearScore = async (enrollmentId: string) => {
    setDrafts((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;
      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          score: '',
          isAbsent: false,
          isMedicalExemption: false,
          teacherRemarks: '',
          isDirty: true,
          validationError: undefined,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = enrolledStudents[currentIndex + 1];
      if (nextStudent && inputRefs.current[nextStudent.enrollment.id]) {
        inputRefs.current[nextStudent.enrollment.id]?.focus();
        inputRefs.current[nextStudent.enrollment.id]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = enrolledStudents[currentIndex - 1];
      if (prevStudent && inputRefs.current[prevStudent.enrollment.id]) {
        inputRefs.current[prevStudent.enrollment.id]?.focus();
        inputRefs.current[prevStudent.enrollment.id]?.select();
      }
    }
  };

  // Check if any draft has validation error
  const hasValidationErrors = Object.values(drafts).some((d) => Boolean(d.validationError));
  const dirtyDraftsCount = Object.values(drafts).filter((d) => d.isDirty).length;

  const handleSaveAll = async () => {
    if (hasValidationErrors) {
      setSaveError('Please resolve all validation errors before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const entriesToSave: GradeEntry[] = [];

      for (const item of enrolledStudents) {
        const draft = drafts[item.enrollment.id];
        if (!draft) continue;

        let parsedScore: number | null = null;
        if (!draft.isAbsent && !draft.isMedicalExemption && draft.score.trim() !== '') {
          parsedScore = parseFloat(draft.score);
        }

        // If score is empty and not absent/exempt and no remarks, we can still record or clear
        const existing = initialGrades.find(
          (g) => g.studentEnrollmentId === item.enrollment.id && g.assessmentId === assessment.id
        );

        const entry: GradeEntry = {
          id: existing?.id || `grd-${Date.now()}-${item.enrollment.id.substr(0, 6)}`,
          assessmentId: assessment.id,
          studentEnrollmentId: item.enrollment.id,
          score: parsedScore,
          isAbsent: draft.isAbsent,
          isMedicalExemption: draft.isMedicalExemption,
          teacherRemarks: draft.teacherRemarks.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };

        entriesToSave.push(entry);
      }

      await gradeRepository.saveBatch(assessment.id, entriesToSave);
      setSaveSuccess(true);
      onGradesSaved();
    } catch (err: unknown) {
      console.error('[GradebookRosterEntry] Save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save grades.');
    } finally {
      setIsSaving(false);
    }
  };

  // Convert current drafts to synthetic GradeEntries for real-time live statistics
  const currentGradesForStats: GradeEntry[] = enrolledStudents.map((item) => {
    const draft = drafts[item.enrollment.id];
    let score: number | null = null;
    if (draft && !draft.isAbsent && !draft.isMedicalExemption && draft.score.trim() !== '') {
      const num = parseFloat(draft.score);
      if (!isNaN(num) && num >= 0 && num <= assessment.maxScore) {
        score = num;
      }
    }
    return {
      id: '',
      assessmentId: assessment.id,
      studentEnrollmentId: item.enrollment.id,
      score,
      isAbsent: Boolean(draft?.isAbsent),
      isMedicalExemption: Boolean(draft?.isMedicalExemption),
      updatedAt: '',
    };
  });

  const liveStats = gradingCalculationService.calculateAssessmentStatistics(
    assessment,
    currentGradesForStats,
    enrolledStudents.length
  );

  const isLockedOrReadOnly = isReadOnly || assessment.isLocked;

  return (
    <div className="space-y-4">
      {/* Assessment Header & Quick Stats */}
      <Card className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                {assessment.title}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Max {assessment.maxScore} pts
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                Coefficient {assessment.coefficient}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Date: {assessment.date}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target class: <strong className="text-slate-800 dark:text-slate-200">{schoolClass.name}</strong> •{' '}
              {enrolledStudents.length} actively enrolled student(s).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isReadOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onToggleLock(assessment)}
                className="flex items-center gap-1.5 text-xs"
              >
                {assessment.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock Evaluation</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Evaluation</span>
                  </>
                )}
              </Button>
            )}

            {!isLockedOrReadOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving || hasValidationErrors || dirtyDraftsCount === 0}
                className="flex items-center gap-1.5 text-xs shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : dirtyDraftsCount > 0 ? `Save (${dirtyDraftsCount})` : 'Saved'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Performance Strip */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center text-xs">
          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">Graded</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {liveStats.enteredCount} / {liveStats.totalEnrolled}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">Pending</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {liveStats.missingCount}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">Mean Raw</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {liveStats.averageScore !== null ? `${liveStats.averageScore}/${assessment.maxScore}` : '—'}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">Mean / 20</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {liveStats.averageNormalizedScore !== null ? `${liveStats.averageNormalizedScore}` : '—'}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">High / Low</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {liveStats.highestScore ?? '—'} / {liveStats.lowestScore ?? '—'}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase">Pass Rate</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {liveStats.passRatePercentage}%
            </span>
          </div>
        </div>
      </Card>

      {/* Save Alerts */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>All student grades and remarks were successfully saved to IndexedDB.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      {isLockedOrReadOnly && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
          <Lock className="w-4 h-4" />
          <span>This evaluation is locked or belongs to an archived period. Score modifications are disabled.</span>
        </div>
      )}

      {/* Roster Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold w-12 text-center">N°</th>
                <th className="py-2.5 px-3 font-semibold min-w-[180px]">Student Name</th>
                <th className="py-2.5 px-3 font-semibold w-40">
                  Score (/ {assessment.maxScore})
                </th>
                <th className="py-2.5 px-3 font-semibold w-36 text-center">Status Flags</th>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Teacher Remarks</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-center">Clear</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {enrolledStudents.map((item, index) => {
                const draft = drafts[item.enrollment.id] || {
                  studentEnrollmentId: item.enrollment.id,
                  score: '',
                  isAbsent: false,
                  isMedicalExemption: false,
                  teacherRemarks: '',
                  isDirty: false,
                };

                const isScoreEntered = draft.score.trim() !== '';
                const isPassing = isScoreEntered && parseFloat(draft.score) >= assessment.maxScore / 2;

                return (
                  <tr
                    key={item.enrollment.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                      draft.isDirty ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Register Number */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                      {item.enrollment.registerNumber}
                    </td>

                    {/* Student Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.person.lastNameLatin.toUpperCase()} {item.person.firstNameLatin}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.person.nationalIdNumber || '—'}
                      </div>
                    </td>

                    {/* Numerical Score Input */}
                    <td className="py-2 px-3">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            inputRefs.current[item.enrollment.id] = el;
                          }}
                          type="number"
                          step="0.25"
                          min="0"
                          max={assessment.maxScore}
                          value={draft.score}
                          disabled={isLockedOrReadOnly || draft.isAbsent || draft.isMedicalExemption}
                          placeholder={
                            draft.isAbsent ? 'Absent (0)' : draft.isMedicalExemption ? 'Exempt' : '—'
                          }
                          onChange={(e) => handleScoreChange(item.enrollment.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          className={`w-full px-2.5 py-1.5 text-sm font-semibold rounded-lg border text-center transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 ${
                            draft.validationError
                              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                              : isScoreEntered
                              ? isPassing
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200'
                                : 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                          }`}
                        />
                      </div>
                      {draft.validationError && (
                        <span className="block text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                          {draft.validationError}
                        </span>
                      )}
                    </td>

                    {/* Absent / Medical Exemption Toggles */}
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={isLockedOrReadOnly}
                          onClick={() => handleToggleAbsent(item.enrollment.id)}
                          title="Toggle unexcused absence (treated as 0)"
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border ${
                            draft.isAbsent
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          <span>Abs</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLockedOrReadOnly}
                          onClick={() => handleToggleExemption(item.enrollment.id)}
                          title="Toggle medical / authorized exemption (excluded from weighted calculation)"
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border ${
                            draft.isMedicalExemption
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Disp</span>
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        disabled={isLockedOrReadOnly}
                        value={draft.teacherRemarks}
                        placeholder="Pedagogical feedback..."
                        onChange={(e) => handleRemarksChange(item.enrollment.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      />
                    </td>

                    {/* Clear Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        disabled={isLockedOrReadOnly || (!isScoreEntered && !draft.isAbsent && !draft.isMedicalExemption && !draft.teacherRemarks)}
                        onClick={() => handleClearScore(item.enrollment.id)}
                        title="Clear score and reset"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
