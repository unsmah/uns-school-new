/**
 * UNS SCHOOL — Gradebook & Term Evaluation Page
 * Central hub for entering student scores, auditing component evaluations, and reviewing deterministic term deliberation averages.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { studentEnrollmentRepository, EnrolledStudentItem } from '../../db/repositories/studentEnrollmentRepository';
import { assessmentRepository } from '../../db/repositories/assessmentRepository';
import { gradeRepository } from '../../db/repositories/gradeRepository';
import { db } from '../../db/database';
import { GradebookRosterEntry } from './GradebookRosterEntry';
import { GradebookMatrixView } from './GradebookMatrixView';
import { AssessmentModal } from '../assessment/AssessmentModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { SchoolClass, Assessment, GradeEntry, GradingScheme } from '../../types';
import {
  FileSpreadsheet,
  Plus,
  Table,
  CheckSquare,
  Award,
  AlertCircle,
} from 'lucide-react';

export const GradebookPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYearId, isArchived } = useAcademicYear();

  // State
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudentItem[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const selectedClassId = searchParams.get('classId') || '';
  const selectedTermParam = searchParams.get('term');
  const termNumber: 1 | 2 | 3 = selectedTermParam ? (Number(selectedTermParam) as 1 | 2 | 3) : 1;
  const selectedAssessmentId = searchParams.get('assessmentId') || '';
  const activeView = (searchParams.get('view') as 'roster' | 'matrix') || 'roster';

  // Modal
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const loadClassesAndSchemes = useCallback(async () => {
    if (!selectedYearId) return;
    try {
      const [allClasses, allSchemes] = await Promise.all([
        classRepository.listByAcademicYear(selectedYearId),
        db.gradingSchemes.toArray(),
      ]);
      const activeClasses = allClasses.filter((c) => !c.isArchived);
      setClasses(activeClasses);
      setSchemes(allSchemes);

      // Default class selection if none in query
      if (!selectedClassId && activeClasses.length > 0) {
        updateParam('classId', activeClasses[0].id);
      }
    } catch (err: unknown) {
      console.error('[GradebookPage] Failed to load classes/schemes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load initial data.');
    }
  }, [selectedYearId, selectedClassId]);

  const loadClassData = useCallback(async () => {
    if (!selectedClassId) {
      setEnrolledStudents([]);
      setAssessments([]);
      setGrades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [students, termAssessments, classGrades] = await Promise.all([
        studentEnrollmentRepository.listByClass(selectedClassId),
        assessmentRepository.listByClassAndTerm(selectedClassId, termNumber),
        gradeRepository.listByClassAndTerm(selectedYearId || '', selectedClassId, termNumber),
      ]);

      const activeStudents = students.filter((s) => s.enrollment.status === 'active');
      setEnrolledStudents(activeStudents);
      setAssessments(termAssessments);
      setGrades(classGrades);

      // Auto-select first assessment if current selection is invalid
      if (termAssessments.length > 0) {
        if (!selectedAssessmentId || !termAssessments.some((a) => a.id === selectedAssessmentId)) {
          updateParam('assessmentId', termAssessments[0].id);
        }
      }
    } catch (err: unknown) {
      console.error('[GradebookPage] Failed to load class data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gradebook data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, termNumber, selectedAssessmentId]);

  useEffect(() => {
    loadClassesAndSchemes();
  }, [loadClassesAndSchemes]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const defaultScheme = schemes.find((s) => s.isOfficial) || schemes[0];

  const handleToggleLock = async (assessment: Assessment) => {
    try {
      if (assessment.isLocked) {
        await assessmentRepository.unlockAssessment(assessment.id);
      } else {
        await assessmentRepository.lockAssessment(assessment.id);
      }
      await loadClassData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle lock status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Teacher Gradebook</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record continuous assessment scores, monitor completion, and compute weighted term averages.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => updateParam('view', 'roster')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeView === 'roster'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Roster Grade Entry</span>
          </button>

          <button
            onClick={() => updateParam('view', 'matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeView === 'matrix'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Term Deliberation Matrix</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Navigation Strip */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Class Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Selected Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => updateParam('classId', e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.levelCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Term Pills */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Term Period
              </label>
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => updateParam('term', '1')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    termNumber === 1
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Term 1
                </button>
                <button
                  onClick={() => updateParam('term', '2')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    termNumber === 2
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Term 2
                </button>
                <button
                  onClick={() => updateParam('term', '3')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    termNumber === 3
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Term 3
                </button>
              </div>
            </div>

            {/* Assessment Selector (when in Roster Entry View) */}
            {activeView === 'roster' && assessments.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Evaluation Task
                </label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => updateParam('assessmentId', e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.componentSnapshot?.label || a.componentKey} • Coeff {a.coefficient})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!isArchived && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAssessmentModalOpen(true)}
              className="flex items-center gap-1.5 text-xs self-start md:self-end"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Evaluation</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Main View Area */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Loading student roster, evaluation tasks, and grading records...
        </div>
      ) : !currentClass ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No Classes Available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Please create and configure classes before accessing the gradebook.
          </p>
        </Card>
      ) : enrolledStudents.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No Students Enrolled
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Class <strong className="text-slate-900 dark:text-slate-100">{currentClass.name}</strong> has no active enrolled students.
          </p>
        </Card>
      ) : activeView === 'matrix' ? (
        /* Matrix View */
        defaultScheme ? (
          <GradebookMatrixView
            schoolClass={currentClass}
            termNumber={termNumber}
            scheme={defaultScheme}
            assessments={assessments}
            enrolledStudents={enrolledStudents}
            grades={grades}
            onSelectAssessment={(assId) => {
              updateParam('assessmentId', assId);
              updateParam('view', 'roster');
            }}
          />
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No active grading scheme found for calculation.
          </div>
        )
      ) : (
        /* Roster Entry View */
        assessments.length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No Evaluations Scheduled for Term {termNumber}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Schedule continuous assessment tests, devoirs, or exam compositions for {currentClass.name} to start entering grades.
            </p>
            {!isArchived && (
              <Button
                variant="primary"
                onClick={() => setIsAssessmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Term {termNumber} Assessment</span>
              </Button>
            )}
          </Card>
        ) : currentAssessment ? (
          <GradebookRosterEntry
            assessment={currentAssessment}
            schoolClass={currentClass}
            enrolledStudents={enrolledStudents}
            initialGrades={grades.filter((g) => g.assessmentId === currentAssessment.id)}
            isReadOnly={isArchived}
            onGradesSaved={loadClassData}
            onToggleLock={handleToggleLock}
          />
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            Please select an assessment to record student grades.
          </div>
        )
      )}

      {/* Assessment Modal */}
      {isAssessmentModalOpen && (
        <AssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={() => setIsAssessmentModalOpen(false)}
          onSaved={loadClassData}
          academicYearId={selectedYearId}
          defaultClassId={selectedClassId}
          defaultTerm={termNumber}
        />
      )}
    </div>
  );
};
