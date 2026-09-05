/**
 * UNS SCHOOL — Assessment Card Component
 * Displays evaluation metadata, grading progress, class performance analytics, and actions.
 */

import React from 'react';
import type { Assessment, AssessmentStatistics, SchoolClass } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  Award,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  ExternalLink,
} from 'lucide-react';

interface AssessmentCardProps {
  assessment: Assessment;
  schoolClass?: SchoolClass;
  statistics?: AssessmentStatistics;
  onEdit: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
  onToggleLock: (assessment: Assessment) => void;
  onOpenGradebook: (assessment: Assessment) => void;
  isReadOnly?: boolean;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  schoolClass,
  statistics,
  onEdit,
  onDelete,
  onToggleLock,
  onOpenGradebook,
  isReadOnly = false,
}) => {
  const getComponentBadge = (key: string) => {
    switch (key) {
      case 'continuous_assessment':
        return {
          label: 'Évaluation continue',
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        };
      case 'term_test':
        return {
          label: 'Devoir surveillé',
          className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        };
      case 'exam_composition':
        return {
          label: 'Composition (Exam)',
          className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        };
      default:
        return {
          label: assessment.componentSnapshot?.label || key,
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const badge = getComponentBadge(assessment.componentKey);
  const totalEnrolled = statistics?.totalEnrolled || 0;
  const enteredCount = statistics?.enteredCount || 0;
  const progressPercent = totalEnrolled > 0 ? Math.round((enteredCount / totalEnrolled) * 100) : 0;
  const isComplete = totalEnrolled > 0 && enteredCount >= totalEnrolled;

  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
      <div>
        {/* Header Badges & Lock State */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
              Term {assessment.termNumber}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-900">
              Coeff {assessment.coefficient}
            </span>
          </div>

          {assessment.isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-900">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>

        {/* Title & Metadata */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-1">
          {assessment.title}
        </h3>

        {assessment.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2.5">
            {assessment.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
          {schoolClass && (
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <Users className="w-3.5 h-3.5" />
              {schoolClass.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {assessment.date}
          </span>
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            Max {assessment.maxScore} pts
          </span>
        </div>

        {/* Progress & Entry Statistics */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
              {enteredCount} of {totalEnrolled} grades recorded
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete
                  ? 'bg-emerald-500'
                  : progressPercent > 0
                  ? 'bg-amber-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Metrics */}
          {statistics && statistics.enteredCount > 0 && (
            <div className="pt-1.5 grid grid-cols-3 gap-2 text-center border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Average</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {statistics.averageScore !== null ? `${statistics.averageScore}/${assessment.maxScore}` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">High / Low</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {statistics.highestScore ?? '—'} / {statistics.lowestScore ?? '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Pass Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {statistics.passRatePercentage}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenGradebook(assessment)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Gradebook</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Button>

        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleLock(assessment)}
              title={assessment.isLocked ? 'Unlock assessment' : 'Lock assessment'}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {assessment.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onEdit(assessment)}
              disabled={assessment.isLocked}
              title={assessment.isLocked ? 'Cannot edit locked assessment' : 'Edit assessment'}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(assessment)}
              disabled={assessment.isLocked}
              title={assessment.isLocked ? 'Cannot delete locked assessment' : 'Delete assessment'}
              className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
