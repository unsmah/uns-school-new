/**
 * UNS SCHOOL — Lesson-Anchored Attendance Register
 * Authoritative roll call anchored to a specific Lesson.
 * Strictly respects NIN privacy and enforces single session anchor model.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Save,
  BookOpen,
  Plus,
  History,
  Users,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  lessonRepository,
  attendanceRepository,
  classRepository,
  studentEnrollmentRepository,
  studentPersonRepository,
  curriculumRepository,
} from '../../db/repositories';
import {
  Card,
  Button,
  Badge,
  Alert,
  LoadingState,
  EmptyState,
  Select,
} from '../../components/ui';
import { LessonModal } from '../../components/lessons/LessonModal';
import type {
  Lesson,
  SchoolClass,
  StudentEnrollment,
  StudentPerson,
  AttendanceRecord,
  AttendanceStatus,
  SessionRubricDefinition,
} from '../../types';
import type { EnrolledStudentItem } from '../../db/repositories/studentEnrollmentRepository';

interface StudentRosterItem {
  enrollment: StudentEnrollment;
  person: StudentPerson;
  attendanceRecord?: AttendanceRecord;
}

export const AttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useI18n();

  const currentLessonIdParam = searchParams.get('lessonId') || '';
  const currentClassIdParam = searchParams.get('classId') || '';

  const { selectedAcademicYear, isArchived } = useAcademicYear();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassIdParam);
  const [lessonsForClass, setLessonsForClass] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(currentLessonIdParam);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeRubric, setActiveRubric] = useState<SessionRubricDefinition | null>(null);

  // Roll call state
  const [rosterItems, setRosterItems] = useState<StudentRosterItem[]>([]);
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, { status: AttendanceStatus; minutesLate?: number; remarks?: string }>
  >({});

  // Sub-view: "rollcall" or "history"
  const [viewMode, setViewMode] = useState<'rollcall' | 'history'>('rollcall');
  const [classAttendanceHistory, setClassAttendanceHistory] = useState<
    { lesson: Lesson; present: number; absent: number; late: number; excused: number; total: number }[]
  >([]);

  // Lesson modal state
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // 1. Initial load: classes for selected year
  useEffect(() => {
    async function loadClasses() {
      if (!selectedAcademicYear) {
        setClasses([]);
        setIsLoading(false);
        return;
      }

      try {
        const yearClasses = await classRepository.listByAcademicYear(selectedAcademicYear.id);
        setClasses(yearClasses);

        // If a classId isn't selected or valid, pick the first class
        if (!selectedClassId && yearClasses.length > 0) {
          setSelectedClassId(yearClasses[0].id);
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }
    loadClasses();
  }, [selectedAcademicYear, selectedClassId]);

  // 2. Load lessons when selectedClassId or selectedAcademicYear changes
  useEffect(() => {
    async function loadLessons() {
      if (!selectedAcademicYear || !selectedClassId) {
        setLessonsForClass([]);
        return;
      }

      try {
        const lessons = await lessonRepository.listByClassAndAcademicYear(
          selectedClassId,
          selectedAcademicYear.id
        );
        // Sort newest first
        const sorted = [...lessons].sort((a, b) => b.date.localeCompare(a.date));
        setLessonsForClass(sorted);

        // If selectedLessonId is in list, select it; otherwise select the most recent lesson or empty
        if (selectedLessonId && sorted.some((l) => l.id === selectedLessonId)) {
          // keep selectedLessonId
        } else if (sorted.length > 0) {
          setSelectedLessonId(sorted[0].id);
        } else {
          setSelectedLessonId('');
        }
      } catch (err) {
        console.error('Failed to load lessons for class:', err);
      }
    }
    loadLessons();
  }, [selectedAcademicYear, selectedClassId, selectedLessonId]);

  // 3. Load active lesson & roll call roster
  const loadRollCallData = useCallback(async () => {
    if (!selectedLessonId) {
      setActiveLesson(null);
      setRosterItems([]);
      setLocalStatuses({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const lesson = await lessonRepository.getById(selectedLessonId);
      if (!lesson) {
        setActiveLesson(null);
        setIsLoading(false);
        return;
      }

      setActiveLesson(lesson);

      // Load rubric for pedagogical context
      if (lesson.curriculumVersionId && lesson.rubricId) {
        const rubric = await curriculumRepository.getRubricById(lesson.rubricId);
        setActiveRubric(rubric || null);
      }

      // Load enrolled students for this class
      const [enrolledItems, existingAttendance] = await Promise.all([
        studentEnrollmentRepository.listByClass(lesson.classId),
        attendanceRepository.listByLesson(lesson.id),
      ]);

      // Filter active enrollments
      const activeEnrolledItems = enrolledItems.filter((i) => i.enrollment.status === 'active');

      const attendanceMap = new Map<string, AttendanceRecord>();
      for (const att of existingAttendance) {
        attendanceMap.set(att.studentEnrollmentId, att);
      }

      const items: StudentRosterItem[] = [];
      const initialLocalStatuses: Record<
        string,
        { status: AttendanceStatus; minutesLate?: number; remarks?: string }
      > = {};

      for (const { enrollment, person } of activeEnrolledItems) {
        const record = attendanceMap.get(enrollment.id);
        items.push({
          enrollment,
          person,
          attendanceRecord: record,
        });

        // Default to 'Present' if not yet recorded, or use existing status
        initialLocalStatuses[enrollment.id] = {
          status: record?.status || 'Present',
          minutesLate: record?.minutesLate,
          remarks: record?.remarks || '',
        };
      }

      // Sort by register number
      items.sort((a, b) => (a.enrollment.registerNumber || 999) - (b.enrollment.registerNumber || 999));

      setRosterItems(items);
      setLocalStatuses(initialLocalStatuses);
    } catch (err) {
      console.error('Failed to load roll call data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLessonId]);

  useEffect(() => {
    loadRollCallData();
  }, [loadRollCallData]);

  // 4. Load class attendance history when switching to history tab
  const loadClassHistory = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const lessons = await lessonRepository.listByClass(selectedClassId);
      const historyList = [];

      for (const les of lessons) {
        const stats = await attendanceRepository.getAttendanceStatsForLesson(les.id);
        historyList.push({
          lesson: les,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          excused: stats.excused,
          total: stats.total,
        });
      }

      historyList.sort((a, b) => b.lesson.date.localeCompare(a.lesson.date));
      setClassAttendanceHistory(historyList);
    } catch (err) {
      console.error('Failed to load class attendance history:', err);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (viewMode === 'history') {
      loadClassHistory();
    }
  }, [viewMode, loadClassHistory]);

  // Roll call status handlers
  const handleStatusChange = (enrollmentId: string, status: AttendanceStatus) => {
    if (isArchived) return;
    setLocalStatuses((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        status,
        minutesLate: status === 'Late' ? prev[enrollmentId]?.minutesLate || 10 : undefined,
      },
    }));
  };

  const handleMinutesLateChange = (enrollmentId: string, minutes: number) => {
    if (isArchived) return;
    setLocalStatuses((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        minutesLate: minutes,
      },
    }));
  };

  const handleRemarksChange = (enrollmentId: string, remarks: string) => {
    if (isArchived) return;
    setLocalStatuses((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        remarks,
      },
    }));
  };

  const handleMarkAllPresent = async () => {
    if (isArchived || !activeLesson) return;
    const enrollmentIds = rosterItems.map((item) => item.enrollment.id);

    try {
      await attendanceRepository.markAllPresent(activeLesson.id, enrollmentIds);
      const updatedStatuses: Record<
        string,
        { status: AttendanceStatus; minutesLate?: number; remarks?: string }
      > = {};
      for (const enrId of enrollmentIds) {
        updatedStatuses[enrId] = {
          status: 'Present',
          minutesLate: undefined,
          remarks: localStatuses[enrId]?.remarks || '',
        };
      }
      setLocalStatuses(updatedStatuses);
      setFeedbackSuccess('All enrolled students marked as Present.');
      await loadRollCallData();
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to mark all present.');
    }
  };

  const handleSaveAttendance = async () => {
    if (isArchived || !activeLesson) return;

    setIsSaving(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const recordsToSave: AttendanceRecord[] = rosterItems.map((item) => {
        const local = localStatuses[item.enrollment.id] || { status: 'Present' };
        return {
          id: item.attendanceRecord?.id || `att-${activeLesson.id}-${item.enrollment.id}`,
          lessonId: activeLesson.id,
          classId: activeLesson.classId,
          studentEnrollmentId: item.enrollment.id,
          date: activeLesson.date,
          status: local.status,
          minutesLate: local.minutesLate,
          remarks: local.remarks?.trim() || undefined,
          createdAt: item.attendanceRecord?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      await attendanceRepository.saveBatchForLesson(activeLesson.id, recordsToSave);
      setFeedbackSuccess('Roll call attendance saved successfully.');
      await loadRollCallData();
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute live roll call statistics
  const currentStats = React.useMemo(() => {
    const total = rosterItems.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const item of rosterItems) {
      const s = localStatuses[item.enrollment.id]?.status || 'Present';
      if (s === 'Present') present++;
      else if (s === 'Absent') absent++;
      else if (s === 'Late') late++;
      else if (s === 'Excused') excused++;
    }

    const attending = present + late;
    const rate = total > 0 ? Math.round((attending / total) * 100) : 100;

    return { total, present, absent, late, excused, rate };
  }, [rosterItems, localStatuses]);

  const activeClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words">
            <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{language === 'ar' ? 'سجل الحضور والغياب' : language === 'fr' ? 'Registre des présences' : 'Classroom Attendance & Roll Call'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">
            {language === 'ar'
              ? 'سجل الحضور المرتبط بالحصة المعتمدة للموسم الدراسي '
              : 'Lesson-anchored roll call register for academic year '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAcademicYear?.label || 'None'}
            </strong>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeClass && !isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLessonModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'تسجيل حصة جديدة' : language === 'fr' ? 'Nouvelle séance' : 'Log New Session'}</span>
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert variant="warning" title={language === 'ar' ? 'سنة دراسية مؤرشفة (للقراءة فقط)' : 'Archived Academic Year (Read-Only)'}>
          {language === 'ar'
            ? 'سجلات الحضور للسنوات الدراسية السابقة محفوظة في وضع القراءة فقط.'
            : 'Attendance records for past academic years are preserved in read-only mode.'}
        </Alert>
      )}

      {feedbackSuccess && (
        <Alert variant="success" title={language === 'ar' ? 'نجاح' : 'Success'}>
          {feedbackSuccess}
        </Alert>
      )}
      {feedbackError && (
        <Alert variant="error" title={language === 'ar' ? 'خطأ' : 'Error'}>
          {feedbackError}
        </Alert>
      )}

      {/* Class & Lesson Selectors Header Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Class Selector */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'ar' ? 'الفوج التربوي:' : language === 'fr' ? 'Classe:' : 'Select Class:'}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSearchParams({ classId: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.levelCode}) — {c.roomNumber || 'Room —'}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Selector */}
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {language === 'ar' ? 'الحصة التربوية المعتمدة:' : language === 'fr' ? 'Séance pédagogique:' : 'Select Lesson / Session Anchor:'}
            </label>
            {lessonsForClass.length > 0 ? (
              <select
                value={selectedLessonId}
                onChange={(e) => {
                  setSelectedLessonId(e.target.value);
                  setSearchParams({ classId: selectedClassId, lessonId: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium cursor-pointer"
              >
                {lessonsForClass.map((les) => (
                  <option key={les.id} value={les.id}>
                    {les.date} ({les.startTime}–{les.endTime}) — {les.title}{' '}
                    {les.isCompleted ? '✓' : '(Pending)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                <span>No pedagogical sessions logged yet for this class.</span>
                {!isArchived && (
                  <button
                    onClick={() => setIsLessonModalOpen(true)}
                    className="font-bold underline text-amber-900 dark:text-amber-200 hover:opacity-80 cursor-pointer"
                  >
                    + Create First Session
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setViewMode('rollcall')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'rollcall'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'سجل المناداة الفوري' : language === 'fr' ? 'Appel de la séance' : 'Active Roll Call Register'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'history'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'سجل الغيابات التاريخي للفوج' : language === 'fr' ? 'Historique des présences' : 'Class Attendance History'}</span>
          </button>
        </div>
      </div>

      {viewMode === 'rollcall' ? (
        <>
          {/* Active Lesson Context & Summary Stats Card */}
          {activeLesson && (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      {activeClass?.name} ({activeLesson.levelCode})
                    </Badge>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {activeLesson.date} • {activeLesson.startTime} – {activeLesson.endTime}
                    </span>
                    {activeRubric && (
                      <Badge variant="neutral" className="text-[10px]">
                        {activeRubric.name}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {activeLesson.title}
                  </h2>
                </div>

                {/* Mark All Present & Save Actions */}
                {!isArchived && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllPresent}
                      className="gap-1 bg-white dark:bg-slate-900 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Mark All Present
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveAttendance}
                      disabled={isSaving}
                      className="gap-1.5 text-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? 'Saving...' : 'Save Roll Call'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Stat Counters Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50 text-center">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">
                    {language === 'ar' ? 'إجمالي الفوج' : 'Total Roster'}
                  </div>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {currentStats.total}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">
                    {language === 'ar' ? 'حاضر' : language === 'fr' ? 'Présent' : 'Present'}
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {currentStats.present}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold">
                    {language === 'ar' ? 'غائب' : language === 'fr' ? 'Absent' : 'Absent'}
                  </div>
                  <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                    {currentStats.absent}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold">
                    {language === 'ar' ? 'متأخر' : language === 'fr' ? 'En retard' : 'Late'}
                  </div>
                  <div className="text-base font-bold font-mono text-amber-700 dark:text-amber-300">
                    {currentStats.late}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                  <div className="text-[10px] text-sky-700 dark:text-sky-400 uppercase font-bold">
                    {language === 'ar' ? 'مبرر' : language === 'fr' ? 'Excusé' : 'Excused'}
                  </div>
                  <div className="text-base font-bold font-mono text-sky-700 dark:text-sky-300">
                    {currentStats.excused}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
                  <div className="text-[10px] text-emerald-900 dark:text-emerald-200 uppercase font-bold">
                    {language === 'ar' ? 'نسبة الحضور' : 'Attendance Rate'}
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-950 dark:text-emerald-100">
                    {currentStats.rate}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Roll Call Table */}
          {!activeLesson ? (
            <EmptyState
              icon={<BookOpen className="w-10 h-10" />}
              title="No Lesson Selected"
              description="Please select or log a pedagogical session to take attendance."
              action={
                activeClass && !isArchived ? (
                  <Button variant="primary" size="sm" onClick={() => setIsLessonModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Log Session & Take Attendance
                  </Button>
                ) : undefined
              }
            />
          ) : rosterItems.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10" />}
              title="No Enrolled Students"
              description={`There are currently no active students enrolled in class ${activeClass?.name}. Please add students in the Students Roster.`}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full border-collapse text-start text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3 w-12 text-center font-mono font-bold">#</th>
                    <th className="py-3 px-4 font-bold">
                      {language === 'ar' ? 'الاسم واللقب' : language === 'fr' ? 'Nom et Prénom' : 'Student Name'}
                    </th>
                    <th className="py-3 px-4 w-72 text-center font-bold">
                      {language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}
                    </th>
                    <th className="py-3 px-3 w-28 text-center font-bold">
                      {language === 'ar' ? 'التأخر (دقائق)' : language === 'fr' ? 'Retard (min)' : 'Late (Mins)'}
                    </th>
                    <th className="py-3 px-4 font-bold">
                      {language === 'ar' ? 'الملاحظات والتبرير' : language === 'fr' ? 'Remarques / Justification' : 'Remarks / Justification'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rosterItems.map((item) => {
                    const local = localStatuses[item.enrollment.id] || { status: 'Present' };
                    const isLate = local.status === 'Late';

                    return (
                      <tr
                        key={item.enrollment.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Register # */}
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">
                          #{item.enrollment.registerNumber || '—'}
                        </td>

                        {/* Student Name */}
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.person.lastNameLatin?.toUpperCase()} {item.person.firstNameLatin}
                          </div>
                          {(item.person.lastNameArabic || item.person.firstNameArabic) && (
                            <div className="text-[11px] text-slate-400 font-arabic">
                              {item.person.lastNameArabic} {item.person.firstNameArabic}
                            </div>
                          )}
                          {item.enrollment.isRepeating && (
                            <Badge variant="warning" className="text-[9px] px-1 py-0 mt-0.5">
                              {language === 'ar' ? 'معيد' : language === 'fr' ? 'Redoublant' : 'Repeating'}
                            </Badge>
                          )}
                        </td>

                        {/* Status Buttons */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map((st) => {
                              const isSelected = local.status === st;
                              const colors = {
                                Present: isSelected
                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 hover:text-emerald-700 dark:text-slate-400',
                                Absent: isSelected
                                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 hover:text-rose-700 dark:text-slate-400',
                                Late: isSelected
                                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 hover:text-amber-700 dark:text-slate-400',
                                Excused: isSelected
                                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                                  : 'text-slate-600 hover:text-sky-700 dark:text-slate-400',
                              };

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={isArchived}
                                  onClick={() => handleStatusChange(item.enrollment.id, st)}
                                  className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${colors[st]}`}
                                >
                                  {st === 'Present' ? 'Present' : st === 'Absent' ? 'Absent' : st === 'Late' ? 'Late' : 'Excused'}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Minutes Late */}
                        <td className="py-2.5 px-3 text-center">
                          {isLate ? (
                            <input
                              type="number"
                              min="1"
                              max="60"
                              disabled={isArchived}
                              value={local.minutesLate || 10}
                              onChange={(e) =>
                                handleMinutesLateChange(
                                  item.enrollment.id,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-16 px-2 py-1 text-center font-mono rounded border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                            />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            disabled={isArchived}
                            placeholder="Optional notes..."
                            value={local.remarks || ''}
                            onChange={(e) => handleRemarksChange(item.enrollment.id, e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* History View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historical Attendance Log for {activeClass?.name}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {classAttendanceHistory.length} total sessions recorded
            </span>
          </div>

          {classAttendanceHistory.length === 0 ? (
            <EmptyState
              icon={<History className="w-10 h-10" />}
              title="No Attendance History"
              description={`No historical sessions with attendance records found for ${activeClass?.name}.`}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full border-collapse text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold">Date & Time</th>
                    <th className="py-3 px-4 font-bold">Session Title</th>
                    <th className="py-3 px-3 text-center font-bold text-emerald-700">Present</th>
                    <th className="py-3 px-3 text-center font-bold text-rose-700">Absent</th>
                    <th className="py-3 px-3 text-center font-bold text-amber-700">Late</th>
                    <th className="py-3 px-3 text-center font-bold text-sky-700">Excused</th>
                    <th className="py-3 px-3 text-center font-bold">Rate</th>
                    <th className="py-3 px-4 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classAttendanceHistory.map(({ lesson, present, absent, late, excused, total }) => {
                    const attending = present + late;
                    const rate = total > 0 ? Math.round((attending / total) * 100) : 100;

                    return (
                      <tr
                        key={lesson.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {lesson.date}{' '}
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({lesson.startTime}–{lesson.endTime})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                          {lesson.title}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                          {present}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                          {absent}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">
                          {late}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600">
                          {excused}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {rate}%
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              setViewMode('rollcall');
                            }}
                          >
                            Open Roll Call
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lesson Modal for Quick Logging */}
      {selectedAcademicYear && (
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          defaultClassId={selectedClassId}
          onSaved={(newLesson) => {
            setSelectedLessonId(newLesson.id);
            setFeedbackSuccess(`Created session "${newLesson.title}". You can now take attendance.`);
          }}
        />
      )}
    </div>
  );
};
