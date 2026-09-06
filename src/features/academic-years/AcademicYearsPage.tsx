/**
 * UNS SCHOOL — Academic Years Management Page
 * Complete administration for academic year lifecycles, active switching, and historical archiving.
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Archive,
  RefreshCw,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
  Building2,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { academicYearRepository, classRepository, studentEnrollmentRepository } from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState, Modal } from '../../components/ui';
import { AcademicYearModal } from '../../components/academic-year/AcademicYearModal';
import { AcademicYearSelector } from '../../components/academic-year/AcademicYearSelector';
import { SchoolModal } from '../../components/school/SchoolModal';
import type { AcademicYear } from '../../types';

export const AcademicYearsPage: React.FC = () => {
  const { school, academicYears, refreshAcademicYears, refreshSchool, selectYearId, selectedYearId } =
    useAcademicYear();

  const [yearStats, setYearStats] = useState<Record<string, { classCount: number; studentCount: number }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadStats() {
      const statsMap: Record<string, { classCount: number; studentCount: number }> = {};
      for (const year of academicYears) {
        try {
          const classes = await classRepository.listByAcademicYear(year.id);
          const enrollments = await studentEnrollmentRepository.listByAcademicYear(year.id);
          statsMap[year.id] = {
            classCount: classes.length,
            studentCount: enrollments.length,
          };
        } catch (err) {
          console.error(`Failed to load stats for year ${year.id}:`, err);
        }
      }
      setYearStats(statsMap);
    }
    if (academicYears.length > 0) {
      loadStats();
    }
  }, [academicYears]);

  const handleCreateNew = () => {
    setEditingYear(null);
    setIsModalOpen(true);
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setIsModalOpen(true);
  };

  const handleSetCurrent = async (year: AcademicYear) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await academicYearRepository.update(year.id, { isCurrent: true, isArchived: false });
      await refreshAcademicYears();
      selectYearId(year.id);
      setActionSuccess(`Academic year "${year.label}" is now set as current active year.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to set current academic year.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async (year: AcademicYear) => {
    if (!confirm(`Are you sure you want to archive academic year "${year.label}"? Archived years become read-only historical records.`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await academicYearRepository.archive(year.id);
      await refreshAcademicYears();
      setActionSuccess(`Academic year "${year.label}" has been archived.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to archive academic year.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnarchive = async (year: AcademicYear) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await academicYearRepository.unarchive(year.id);
      await refreshAcademicYears();
      setActionSuccess(`Academic year "${year.label}" has been unarchived.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to unarchive academic year.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (year: AcademicYear) => {
    setYearToDelete(year);
  };

  const handleConfirmDelete = async () => {
    if (!yearToDelete) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await academicYearRepository.deleteIfEmpty(yearToDelete.id);
      const label = yearToDelete.label;
      setYearToDelete(null);
      await refreshAcademicYears();
      setActionSuccess(`Academic year "${label}" was deleted.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Cannot delete academic year.');
      setYearToDelete(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Academic Years & School Setup</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">
            Manage your school profile, active session context, academic calendar periods, and historical year archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Academic Year Viewing Context */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Active Context:
            </span>
            <AcademicYearSelector />
          </div>

          <Button variant="outline" size="sm" onClick={() => setIsSchoolModalOpen(true)}>
            <Building2 className="w-4 h-4" />
            <span>School Profile</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreateNew}>
            <Plus className="w-4 h-4" />
            <span>New Academic Year</span>
          </Button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <Alert variant="error" title="Action Failed">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* School Overview Card */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Middle School Profile (CEM)
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsSchoolModalOpen(true)}>
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        }
      >
        {school ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-slate-500 font-medium">School Name</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {school.name}
              </div>
              {school.nameArabic && (
                <div className="text-slate-600 dark:text-slate-400 mt-0.5" dir="rtl">
                  {school.nameArabic}
                </div>
              )}
            </div>

            <div>
              <div className="text-slate-500 font-medium">Location</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {school.commune}, {school.wilaya}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">School Code / Matricule</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                {school.schoolCode || '—'}
              </div>
            </div>

            <div>
              <div className="text-slate-500 font-medium">Inspector District</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {school.inspectorDistrict || '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs py-2">
            <span className="text-slate-500">School profile not configured yet.</span>
            <Button variant="primary" size="sm" onClick={() => setIsSchoolModalOpen(true)}>
              Configure School
            </Button>
          </div>
        )}
      </Card>

      {/* Academic Years List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Academic Years Registry ({academicYears.length})
        </h2>

        {academicYears.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-10 h-10" />}
            title="No Academic Years Configured"
            description="Create your first academic year to establish classes and enroll students."
            action={
              <Button variant="primary" size="sm" onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                Create Academic Year
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {academicYears.map((year) => {
              const stats = yearStats[year.id] || { classCount: 0, studentCount: 0 };
              const isSelected = year.id === selectedYearId;

              return (
                <Card
                  key={year.id}
                  className={`transition-all ${
                    isSelected ? 'ring-2 ring-emerald-600 dark:ring-emerald-500' : ''
                  }`}
                  header={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          {year.label}
                        </span>
                        {year.isCurrent && (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Current Active
                          </Badge>
                        )}
                        {year.isArchived && (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            Archived (Read-Only)
                          </Badge>
                        )}
                        {!year.isCurrent && !year.isArchived && (
                          <Badge variant="neutral">Historical</Badge>
                        )}
                      </div>

                      {isSelected && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Active Viewing Context
                        </span>
                      )}
                    </div>
                  }
                  footer={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {!isSelected && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => selectYearId(year.id)}
                          >
                            View this Year
                          </Button>
                        )}
                        {!year.isCurrent && !year.isArchived && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetCurrent(year)}
                            disabled={isProcessing}
                          >
                            Set as Current
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(year)}
                          disabled={isProcessing}
                          title="Edit year"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        {!year.isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(year)}
                            disabled={isProcessing || year.isCurrent}
                            title={year.isCurrent ? 'Cannot archive current active year' : 'Archive year'}
                          >
                            <Archive className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnarchive(year)}
                            disabled={isProcessing}
                            title="Unarchive year"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                        )}

                        {stats.classCount === 0 && stats.studentCount === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(year)}
                            disabled={isProcessing}
                            title="Delete empty year"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-3 text-xs">
                    {/* Period & Dates */}
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Period:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {year.startDate} → {year.endDate}
                      </span>
                    </div>

                    {/* Stats counters */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500">Classes</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {stats.classCount}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500">Enrolled Students</div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {stats.studentCount}
                        </div>
                      </div>
                    </div>

                    {/* Trimesters breakdown */}
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Trimester Schedule:
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-500">
                        {year.terms.map((t) => (
                          <div
                            key={t.id || t.termNumber}
                            className="p-1.5 rounded bg-slate-100/60 dark:bg-slate-800/60 font-mono text-center"
                          >
                            <div className="font-bold text-slate-700 dark:text-slate-300">
                              T{t.termNumber}
                            </div>
                            <div>{t.startDate.slice(5)}</div>
                            <div>{t.endDate.slice(5)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* School Modal */}
      <SchoolModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        existingSchool={school}
        onSaved={async () => {
          await refreshSchool();
          setActionSuccess('School profile saved successfully.');
        }}
      />

      {/* Academic Year Modal */}
      {school && (
        <AcademicYearModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingYear(null);
          }}
          schoolId={school.id}
          existingYear={editingYear}
          onSaved={async (savedYear) => {
            await refreshAcademicYears();
            selectYearId(savedYear.id);
            setActionSuccess(
              editingYear
                ? `Academic year "${savedYear.label}" updated.`
                : `Academic year "${savedYear.label}" created successfully.`
            );
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {yearToDelete && (
        <Modal
          isOpen={Boolean(yearToDelete)}
          onClose={() => setYearToDelete(null)}
          title="Delete Academic Year"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete empty academic year{' '}
              <strong className="text-slate-900 dark:text-slate-100">{yearToDelete.label}</strong>?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setYearToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isProcessing}>
                Delete Academic Year
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
