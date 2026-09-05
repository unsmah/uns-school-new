/**
 * UNS SCHOOL — Lessons & Classroom Sessions Feature Page
 * Authoritative pedagogical sessions management and Cahier Journal viewer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  CircleDashed,
  UserCheck,
  Edit2,
  Trash2,
  Filter,
  Search,
  FileSpreadsheet,
  AlertCircle,
  Tag,
  Layers,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  lessonRepository,
  classRepository,
  curriculumRepository,
  attendanceRepository,
} from '../../db/repositories';
import {
  Card,
  Button,
  Badge,
  Alert,
  LoadingState,
  EmptyState,
  Input,
  Modal,
} from '../../components/ui';
import { LessonModal } from '../../components/lessons/LessonModal';
import type {
  Lesson,
  SchoolClass,
  CurriculumSequence,
  SessionRubricDefinition,
} from '../../types';

export const LessonsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClassFilter = searchParams.get('classId') || 'ALL';

  const { selectedAcademicYear, isArchived } = useAcademicYear();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);

  // Filters
  const [classFilter, setClassFilter] = useState<string>(initialClassFilter);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedAcademicYear) {
      setLessons([]);
      setClasses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [yearLessons, yearClasses, activeCurr] = await Promise.all([
        lessonRepository.listByAcademicYear(selectedAcademicYear.id),
        classRepository.listByAcademicYear(selectedAcademicYear.id),
        curriculumRepository.getActiveVersion(),
      ]);

      setLessons(yearLessons);
      setClasses(yearClasses);

      if (activeCurr) {
        const [rubricList, seqList1, seqList2, seqList3, seqList4] = await Promise.all([
          curriculumRepository.listRubrics(activeCurr.id),
          curriculumRepository.listSequences(activeCurr.id, '1MS'),
          curriculumRepository.listSequences(activeCurr.id, '2MS'),
          curriculumRepository.listSequences(activeCurr.id, '3MS'),
          curriculumRepository.listSequences(activeCurr.id, '4MS'),
        ]);
        setRubrics(rubricList);
        setSequences([...seqList1, ...seqList2, ...seqList3, ...seqList4]);
      }
    } catch (err) {
      console.error('Failed to load lessons data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLesson = () => {
    if (isArchived) return;
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    if (isArchived) return;
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  const handleToggleComplete = async (lesson: Lesson) => {
    if (isArchived) return;
    try {
      await lessonRepository.update(lesson.id, { isCompleted: !lesson.isCompleted });
      await loadData();
      setFeedbackSuccess(
        !lesson.isCompleted
          ? `Marked "${lesson.title}" as completed.`
          : `Marked "${lesson.title}" as pending.`
      );
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to update lesson.');
    }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    if (isArchived) return;
    setLessonToDelete(lesson);
  };

  const handleConfirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    try {
      await lessonRepository.delete(lessonToDelete.id);
      setLessonToDelete(null);
      await loadData();
      setFeedbackSuccess(`Lesson and associated attendance records deleted.`);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to delete lesson.');
      setLessonToDelete(null);
    }
  };

  const handleTakeAttendance = (lessonId: string) => {
    navigate(`/attendance?lessonId=${lessonId}`);
  };

  // Maps for fast display
  const classMap = React.useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const rubricMap = React.useMemo(() => {
    const map = new Map<string, SessionRubricDefinition>();
    for (const r of rubrics) map.set(r.id, r);
    return map;
  }, [rubrics]);

  const sequenceMap = React.useMemo(() => {
    const map = new Map<string, CurriculumSequence>();
    for (const s of sequences) map.set(s.id, s);
    return map;
  }, [sequences]);

  // Filtering
  const filteredLessons = lessons.filter((l) => {
    if (classFilter !== 'ALL' && l.classId !== classFilter) return false;
    if (statusFilter === 'COMPLETED' && !l.isCompleted) return false;
    if (statusFilter === 'PENDING' && l.isCompleted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchObj = l.specificObjectives.some((o) => o.toLowerCase().includes(q));
      if (!matchTitle && !matchObj) return false;
    }
    return true;
  });

  // Sort descending by date, then startTime
  const sortedLessons = [...filteredLessons].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.startTime.localeCompare(a.startTime);
  });

  const totalCompleted = lessons.filter((l) => l.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Classroom Sessions & Lessons (دفتر النصوص والحصص)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative session shells, pedagogical rubrics, and attendance anchors for{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAcademicYear?.label || 'None'}
            </strong>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          {classes.length > 0 && !isArchived && (
            <Button variant="primary" size="sm" onClick={handleCreateLesson}>
              <Plus className="w-4 h-4" />
              Plan / Log Session
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert variant="warning" title="Archived Academic Year (Read-Only)">
          Past lessons and session shells are preserved in read-only mode.
        </Alert>
      )}

      {feedbackSuccess && (
        <Alert variant="success" title="Success">
          {feedbackSuccess}
        </Alert>
      )}
      {feedbackError && (
        <Alert variant="error" title="Error">
          {feedbackError}
        </Alert>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Sessions Logged</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {lessons.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Taught & Completed</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {totalCompleted}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({lessons.length > 0 ? Math.round((totalCompleted / lessons.length) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Classes Engaged</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {new Set(lessons.map((l) => l.classId)).size} / {classes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="ALL">All Classes (جميع الأفواج)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.levelCode})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="ALL">All Sessions</option>
              <option value="COMPLETED">Completed Only (تمت)</option>
              <option value="PENDING">Pending / Upcoming (مقررة)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by title or objective..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Lessons List */}
      {isLoading ? (
        <LoadingState message="Loading classroom sessions..." />
      ) : sortedLessons.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title={
            searchQuery || classFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No Matching Lessons'
              : 'No Classroom Sessions Logged'
          }
          description={
            searchQuery || classFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your filters or search terms.'
              : 'Start logging pedagogical sessions to anchor your attendance roll calls and Cahier Journal.'
          }
          action={
            !isArchived && classes.length > 0 ? (
              <Button variant="primary" size="sm" onClick={handleCreateLesson}>
                <Plus className="w-4 h-4" />
                Plan / Log First Session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedLessons.map((lesson) => {
            const cls = classMap.get(lesson.classId);
            const rubric = rubricMap.get(lesson.rubricId);
            const seq = lesson.sequenceId ? sequenceMap.get(lesson.sequenceId) : undefined;

            return (
              <div
                key={lesson.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left Column: Metadata & Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="font-semibold text-xs">
                        {cls?.name || 'Class'} ({lesson.levelCode})
                      </Badge>

                      <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lesson.date}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {lesson.startTime} – {lesson.endTime}
                        </span>
                      </div>

                      {rubric && (
                        <Badge variant="neutral" className="text-[10px]">
                          {rubric.name} ({rubric.pedagogicalStage})
                        </Badge>
                      )}

                      {lesson.isCompleted ? (
                        <Badge variant="success" className="text-[10px]">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lesson.title}
                      </h3>
                      {seq && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Sequence {seq.sequenceNumber}: {seq.title}
                          {lesson.sessionNumberInSequence
                            ? ` (Session ${lesson.sessionNumberInSequence})`
                            : ''}
                        </p>
                      )}
                    </div>

                    {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                      <div className="space-y-0.5 mt-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Objectives:
                        </span>
                        <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-[11px] space-y-0.5">
                          {lesson.specificObjectives.map((obj, i) => (
                            <li key={i} className="line-clamp-1">
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lesson.materialsAndAids && lesson.materialsAndAids.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">Aids:</span>
                        {lesson.materialsAndAids.map((aid, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]"
                          >
                            {aid}
                          </span>
                        ))}
                      </div>
                    )}

                    {lesson.assignedHomeworkTitle && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50 inline-block mt-1">
                        <strong>Homework:</strong> {lesson.assignedHomeworkTitle}{' '}
                        {lesson.assignedHomeworkDueDate ? `(Due: ${lesson.assignedHomeworkDueDate})` : ''}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTakeAttendance(lesson.id)}
                      className="gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Take Attendance
                    </Button>

                    {!isArchived && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleComplete(lesson)}
                          title={lesson.isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        >
                          {lesson.isCompleted ? (
                            <CircleDashed className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          title="Edit Lesson"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLesson(lesson)}
                          title="Delete Lesson"
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson Modal */}
      {selectedAcademicYear && (
        <LessonModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLesson(null);
          }}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          existingLesson={editingLesson}
          defaultClassId={classFilter !== 'ALL' ? classFilter : undefined}
          onSaved={() => {
            loadData();
            setFeedbackSuccess(
              editingLesson ? 'Lesson updated successfully.' : 'New session shell recorded.'
            );
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {lessonToDelete && (
        <Modal
          isOpen={Boolean(lessonToDelete)}
          onClose={() => setLessonToDelete(null)}
          title="Delete Lesson Session"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete lesson{' '}
              <strong className="text-slate-900 dark:text-slate-100">{lessonToDelete.title}</strong> ({lessonToDelete.date})? This will also remove any attendance records taken for this session.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setLessonToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteLesson}>
                Delete Lesson
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
