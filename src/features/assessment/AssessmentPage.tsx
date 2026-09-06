/**
 * UNS SCHOOL — Assessment Management Page
 * Main dashboard for pedagogical evaluation setup, component binding, and historical integrity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { assessmentRepository } from '../../db/repositories/assessmentRepository';
import { classRepository } from '../../db/repositories/classRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import { gradeRepository } from '../../db/repositories/gradeRepository';
import { gradingCalculationService } from '../../services/gradingCalculationService';
import { AssessmentModal } from './AssessmentModal';
import { AssessmentCard } from './AssessmentCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import type { Assessment, SchoolClass, AssessmentStatistics, GradeEntry } from '../../types';
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';

export const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYearId, selectedAcademicYear, isArchived } = useAcademicYear();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [statisticsMap, setStatisticsMap] = useState<Record<string, AssessmentStatistics>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const selectedClassId = searchParams.get('classId') || '';
  const selectedTermParam = searchParams.get('term');
  const selectedTerm: 1 | 2 | 3 | 0 = selectedTermParam ? (Number(selectedTermParam) as 1 | 2 | 3) : 0;
  const selectedComponent = searchParams.get('component') || '';

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedYearId) {
      setClasses([]);
      setAssessments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setActionError(null);
    try {
      const [allClasses, allAssessments] = await Promise.all([
        classRepository.listByAcademicYear(selectedYearId),
        assessmentRepository.listByAcademicYear(selectedYearId),
      ]);

      const activeClasses = allClasses.filter((c) => !c.isArchived);
      setClasses(activeClasses);
      setAssessments(allAssessments);

      // Load statistics for all assessments
      const statsObj: Record<string, AssessmentStatistics> = {};
      for (const ass of allAssessments) {
        const [assGrades, enrollments] = await Promise.all([
          gradeRepository.listByAssessment(ass.id),
          studentEnrollmentRepository.listByClass(ass.classId),
        ]);
        const activeEnrollments = enrollments.filter((e) => e.enrollment.status === 'active');
        const stats = gradingCalculationService.calculateAssessmentStatistics(
          ass,
          assGrades,
          activeEnrollments.length
        );
        statsObj[ass.id] = stats;
      }
      setStatisticsMap(statsObj);
    } catch (err: unknown) {
      console.error('[AssessmentPage] Failed to load data:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to load assessments.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateFilters = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === '0') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const filteredAssessments = assessments.filter((a) => {
    if (selectedClassId && a.classId !== selectedClassId) return false;
    if (selectedTerm !== 0 && a.termNumber !== selectedTerm) return false;
    if (selectedComponent && a.componentKey !== selectedComponent) return false;
    return true;
  });

  const handleToggleLock = async (assessment: Assessment) => {
    try {
      if (assessment.isLocked) {
        await assessmentRepository.unlockAssessment(assessment.id);
      } else {
        await assessmentRepository.lockAssessment(assessment.id);
      }
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle assessment lock status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!assessmentToDelete) return;
    try {
      await assessmentRepository.delete(assessmentToDelete.id);
      setAssessmentToDelete(null);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete assessment.');
    }
  };

  const handleOpenGradebook = (assessment: Assessment) => {
    navigate(`/gradebook?classId=${assessment.classId}&term=${assessment.termNumber}&assessmentId=${assessment.id}`);
  };

  // KPI Calculations
  const totalAssessments = filteredAssessments.length;
  const completedAssessments = filteredAssessments.filter(
    (a) => statisticsMap[a.id]?.totalEnrolled > 0 && statisticsMap[a.id]?.missingCount === 0
  ).length;
  const pendingAssessments = totalAssessments - completedAssessments;

  const validAverages = filteredAssessments
    .map((a) => statisticsMap[a.id]?.averageNormalizedScore)
    .filter((s): s is number => s !== null && s !== undefined);
  const globalAverage = validAverages.length > 0
    ? parseFloat((validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(2))
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2 sm:gap-2.5 break-words">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Continuous Assessments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 break-words">
            Create, manage, and monitor curriculum evaluations, tests, and official exams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            variant="secondary"
            onClick={() => navigate('/gradebook')}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Open Gradebook</span>
          </Button>

          {!isArchived && (
            <Button
              variant="primary"
              onClick={() => {
                setAssessmentToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs sm:text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Assessment</span>
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Action Failed</p>
            <p className="text-xs mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Evaluations
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {totalAssessments}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Fully Graded
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {completedAssessments}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Grades
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {pendingAssessments}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Mean Score
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {globalAverage !== null ? `${globalAverage} / 20` : '—'}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter by:
            </span>

            {/* Class Filter */}
            <select
              value={selectedClassId || 'all'}
              onChange={(e) => updateFilters('classId', e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.levelCode})
                </option>
              ))}
            </select>

            {/* Term Filter */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => updateFilters('term', '0')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedTerm === 0
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Terms
              </button>
              <button
                onClick={() => updateFilters('term', '1')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedTerm === 1
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                T1
              </button>
              <button
                onClick={() => updateFilters('term', '2')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedTerm === 2
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                T2
              </button>
              <button
                onClick={() => updateFilters('term', '3')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedTerm === 3
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                T3
              </button>
            </div>

            {/* Component Filter */}
            <select
              value={selectedComponent || 'all'}
              onChange={(e) => updateFilters('component', e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Components</option>
              <option value="continuous_assessment">Évaluation continue</option>
              <option value="term_test">Devoir surveillé</option>
              <option value="exam_composition">Composition (Exam)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredAssessments.length}</strong> assessment(s)
          </div>
        </div>
      </Card>

      {/* Assessment Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Loading assessments and performance analytics...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No Assessments Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {assessments.length === 0
              ? 'No continuous assessment evaluations have been scheduled for this academic year.'
              : 'No assessments match the selected class and term filters.'}
          </p>
          {!isArchived && (
            <Button
              variant="primary"
              onClick={() => {
                setAssessmentToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Assessment</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((assessment) => {
            const schoolClass = classes.find((c) => c.id === assessment.classId);
            const stats = statisticsMap[assessment.id];
            return (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                schoolClass={schoolClass}
                statistics={stats}
                isReadOnly={isArchived}
                onEdit={(a) => {
                  setAssessmentToEdit(a);
                  setIsCreateModalOpen(true);
                }}
                onDelete={(a) => setAssessmentToDelete(a)}
                onToggleLock={handleToggleLock}
                onOpenGradebook={handleOpenGradebook}
              />
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <AssessmentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setAssessmentToEdit(null);
          }}
          onSaved={loadData}
          academicYearId={selectedYearId}
          defaultClassId={selectedClassId || undefined}
          defaultTerm={selectedTerm !== 0 ? selectedTerm : 1}
          assessmentToEdit={assessmentToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {assessmentToDelete && (
        <Modal
          isOpen={Boolean(assessmentToDelete)}
          onClose={() => setAssessmentToDelete(null)}
          title="Delete Assessment"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 dark:text-slate-100">{assessmentToDelete.title}</strong>?
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300">
              Warning: Deleting this assessment will also permanently remove all recorded student grades for this evaluation.
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setAssessmentToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Delete Assessment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
