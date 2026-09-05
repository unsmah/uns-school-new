/**
 * UNS SCHOOL — Classes Management Page
 * Organizes Algerian middle school classes (1MS, 2MS, 3MS, 4MS) scoped to the active academic year.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Users,
  DoorOpen,
  Edit2,
  Trash2,
  AlertCircle,
  Archive,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository, studentEnrollmentRepository } from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState } from '../../components/ui';
import { ClassModal } from '../../components/classes/ClassModal';
import { ClassRosterView } from './ClassRosterView';
import { StudentCsvImportModal } from '../../components/import/StudentCsvImportModal';
import type { SchoolClass } from '../../types';

interface ClassesPageProps {
  onNavigateToStudentProfile?: (studentId: string) => void;
}

const LEVEL_TABS = [
  { key: 'ALL', label: 'All Levels (جميع المستويات)' },
  { key: '1MS', label: '1MS (1AM)' },
  { key: '2MS', label: '2MS (2AM)' },
  { key: '3MS', label: '3MS (3AM)' },
  { key: '4MS', label: '4MS (4AM - BEM)' },
];

export const ClassesPage: React.FC<ClassesPageProps> = ({ onNavigateToStudentProfile }) => {
  const { school, selectedAcademicYear, isArchived, isHistorical } = useAcademicYear();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classStudentCounts, setClassStudentCounts] = useState<Record<string, number>>({});
  const [activeLevelTab, setActiveLevelTab] = useState('ALL');
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<SchoolClass | null>(null);

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [importTargetClass, setImportTargetClass] = useState<SchoolClass | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const yearClasses = await classRepository.listByAcademicYear(selectedAcademicYear.id);
      setClasses(yearClasses);

      // Load enrolled student counts
      const counts: Record<string, number> = {};
      for (const c of yearClasses) {
        const enrolled = await studentEnrollmentRepository.listByClass(c.id);
        counts[c.id] = enrolled.length;
      }
      setClassStudentCounts(counts);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    loadClasses();
    setSelectedClassForRoster(null);
  }, [loadClasses]);

  const handleCreateClass = () => {
    if (isArchived) return;
    setEditingClass(null);
    setIsClassModalOpen(true);
  };

  const handleEditClass = (cls: SchoolClass) => {
    if (isArchived) return;
    setEditingClass(cls);
    setIsClassModalOpen(true);
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    if (isArchived) return;
    const count = classStudentCounts[cls.id] || 0;
    if (count > 0) {
      setFeedbackError(`Cannot delete class "${cls.name}" because it contains ${count} enrolled students. Unenroll or transfer them first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete empty class "${cls.name}"?`)) {
      return;
    }

    try {
      await classRepository.deleteIfEmpty(cls.id);
      await loadClasses();
      setFeedbackSuccess(`Class "${cls.name}" was deleted.`);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to delete class.');
    }
  };

  // If teacher is viewing a class roster
  if (selectedClassForRoster && selectedAcademicYear && school) {
    return (
      <ClassRosterView
        schoolClass={selectedClassForRoster}
        academicYear={selectedAcademicYear}
        schoolId={school.id}
        isReadOnly={isArchived}
        onBack={() => {
          setSelectedClassForRoster(null);
          loadClasses();
        }}
        onViewStudentProfile={(studentId) => {
          if (onNavigateToStudentProfile) {
            onNavigateToStudentProfile(studentId);
          }
        }}
      />
    );
  }

  const filteredClasses = classes.filter((c) =>
    activeLevelTab === 'ALL' ? true : c.levelCode === activeLevelTab
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            Classes & Divisions (الأفواج التربوية)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your English teaching class divisions for academic year{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAcademicYear ? selectedAcademicYear.label : 'None'}
            </strong>
            .
          </p>
        </div>

        {selectedAcademicYear && !isArchived && (
          <Button variant="primary" size="sm" onClick={handleCreateClass}>
            <Plus className="w-4 h-4" />
            New Class
          </Button>
        )}
      </div>

      {/* Historical / Archived warning banner */}
      {isArchived && (
        <Alert variant="warning" title="Archived Academic Year (Read-Only)">
          You are viewing an archived academic year. Historical records and class rosters are protected against administrative modifications.
        </Alert>
      )}

      {feedbackError && (
        <Alert variant="error" title="Error">
          {feedbackError}
        </Alert>
      )}
      {feedbackSuccess && (
        <Alert variant="success" title="Success">
          {feedbackSuccess}
        </Alert>
      )}

      {/* Middle School Level Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs">
        {LEVEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveLevelTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeLevelTab === tab.key
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <LoadingState message="Loading classes..." />
      ) : !selectedAcademicYear ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="No Academic Year Selected"
          description="Please select or configure an academic year to manage class divisions."
        />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-10 h-10" />}
          title={
            activeLevelTab === 'ALL'
              ? 'No Classes in this Academic Year'
              : `No ${activeLevelTab} Classes Found`
          }
          description="Create your class divisions to begin importing student rosters and tracking attendance."
          action={
            !isArchived ? (
              <Button variant="primary" size="sm" onClick={handleCreateClass}>
                <Plus className="w-4 h-4" />
                Create First Class
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const studentCount = classStudentCounts[cls.id] || 0;

            return (
              <Card
                key={cls.id}
                className="hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                header={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {cls.name}
                      </span>
                      <Badge variant="default">{cls.levelCode}</Badge>
                    </div>

                    {!isArchived && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClass(cls)}
                          title="Edit class details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {studentCount === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClass(cls)}
                            title="Delete empty class"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                }
                footer={
                  <div className="flex items-center justify-between gap-2">
                    {!isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportTargetClass(cls)}
                        className="text-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        Import CSV
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedClassForRoster(cls)}
                      className="ms-auto"
                    >
                      <span>View Roster</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4 text-slate-400" />
                      Room / Salle:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {cls.roomNumber || 'Not assigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      Enrolled Students:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {studentCount}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class Creation / Edit Modal */}
      {selectedAcademicYear && school && (
        <ClassModal
          isOpen={isClassModalOpen}
          onClose={() => {
            setIsClassModalOpen(false);
            setEditingClass(null);
          }}
          schoolId={school.id}
          academicYearId={selectedAcademicYear.id}
          existingClass={editingClass}
          onSaved={async (savedClass) => {
            await loadClasses();
            setFeedbackSuccess(
              editingClass
                ? `Class "${savedClass.name}" updated.`
                : `Class "${savedClass.name}" created successfully.`
            );
          }}
        />
      )}

      {/* Quick CSV Import Modal */}
      {importTargetClass && selectedAcademicYear && school && (
        <StudentCsvImportModal
          isOpen={Boolean(importTargetClass)}
          onClose={() => setImportTargetClass(null)}
          schoolId={school.id}
          academicYearId={selectedAcademicYear.id}
          targetClass={importTargetClass}
          onImportComplete={() => {
            loadClasses();
            setFeedbackSuccess(`Student roster imported into ${importTargetClass.name}.`);
          }}
        />
      )}
    </div>
  );
};
