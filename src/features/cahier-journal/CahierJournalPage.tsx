/**
 * UNS SCHOOL — Cahier Journal (دفتر اليومية)
 * Authoritative derived inspection logbook dynamically generated from Lesson records.
 * Complies strictly with Algerian Middle School English Inspectorate standards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Calendar,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  lessonRepository,
  classRepository,
  curriculumRepository,
  attendanceRepository,
  studentEnrollmentRepository,
} from '../../db/repositories';
import { Card, Button, Badge, LoadingState, EmptyState } from '../../components/ui';
import { LessonModal } from '../../components/lessons/LessonModal';
import type {
  Lesson,
  SchoolClass,
  SessionRubricDefinition,
} from '../../types';

interface JournalSessionItem {
  lesson: Lesson;
  schoolClass?: SchoolClass;
  rubric?: SessionRubricDefinition;
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    absentNames: string[];
  };
}

export const CahierJournalPage: React.FC = () => {
  const navigate = useNavigate();
  const { school, selectedAcademicYear, isArchived } = useAcademicYear();

  // Current selected inspection date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [journalSessions, setJournalSessions] = useState<JournalSessionItem[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load classes and list all unique lesson dates in this academic year
  useEffect(() => {
    async function loadYearData() {
      if (!selectedAcademicYear) {
        setIsLoading(false);
        return;
      }

      try {
        const [yearClasses, allLessons] = await Promise.all([
          classRepository.listByAcademicYear(selectedAcademicYear.id),
          lessonRepository.listByAcademicYear(selectedAcademicYear.id),
        ]);

        setClasses(yearClasses);

        const uniqueDates = Array.from(new Set(allLessons.map((l) => l.date))).sort(
          (a, b) => b.localeCompare(a)
        );
        setAvailableDates(uniqueDates);

        // If today is not in uniqueDates, but there are dates, select the most recent lesson date
        if (uniqueDates.length > 0 && !uniqueDates.includes(selectedDate)) {
          setSelectedDate(uniqueDates[0]);
        }
      } catch (err) {
        console.error('Failed to load initial Cahier Journal data:', err);
      }
    }
    loadYearData();
  }, [selectedAcademicYear]);

  // 2. Load sessions for the selected date
  const loadDateSessions = useCallback(async () => {
    if (!selectedAcademicYear || !selectedDate) {
      setJournalSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const lessons = await lessonRepository.listByDateAndAcademicYear(
        selectedDate,
        selectedAcademicYear.id
      );

      // Fetch classes, rubrics, and attendance for each lesson
      const items: JournalSessionItem[] = [];

      for (const les of lessons) {
        const [schoolClass, rubric, attRecords, enrolledItems] = await Promise.all([
          classRepository.getById(les.classId),
          les.rubricId ? curriculumRepository.getRubricById(les.rubricId) : Promise.resolve(null),
          attendanceRepository.listByLesson(les.id),
          studentEnrollmentRepository.listByClass(les.classId),
        ]);

        // Find absent student names
        const absentEnrollmentIds = new Set(
          attRecords.filter((r) => r.status === 'Absent').map((r) => r.studentEnrollmentId)
        );

        const absentPersons: string[] = [];
        for (const { enrollment, person } of enrolledItems) {
          if (absentEnrollmentIds.has(enrollment.id)) {
            absentPersons.push(`${person.lastNameLatin} ${person.firstNameLatin}`);
          }
        }

        const presentCount = attRecords.filter((r) => r.status === 'Present').length;
        const absentCount = attRecords.filter((r) => r.status === 'Absent').length;
        const lateCount = attRecords.filter((r) => r.status === 'Late').length;
        const excusedCount = attRecords.filter((r) => r.status === 'Excused').length;

        items.push({
          lesson: les,
          schoolClass: schoolClass || undefined,
          rubric: rubric || undefined,
          attendanceStats: {
            total: enrolledItems.filter((i) => i.enrollment.status === 'active').length,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            excused: excusedCount,
            absentNames: absentPersons,
          },
        });
      }

      // Sort chronologically by startTime
      items.sort((a, b) => a.lesson.startTime.localeCompare(b.lesson.startTime));
      setJournalSessions(items);
    } catch (err) {
      console.error('Failed to load date sessions for Cahier Journal:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedAcademicYear]);

  useEffect(() => {
    loadDateSessions();
  }, [loadDateSessions]);

  const handlePrint = () => {
    window.print();
  };

  const getDayOfWeekName = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            Cahier Journal (دفتر اليومية للتفتيش)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative daily pedagogical inspection logbook dynamically derived from lesson
            records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLessonModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Log Session
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            disabled={journalSessions.length === 0}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Daily Sheet
          </Button>
        </div>
      </div>

      {/* Date Navigation & Controls Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden text-xs">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Inspection Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs cursor-pointer"
          />
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {getDayOfWeekName(selectedDate)}
          </span>
        </div>

        {availableDates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Jump to logged date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} ({getDayOfWeekName(d)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Official Cahier Journal Printable Document Sheet */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Inspection Official Document Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                People&apos;s Democratic Republic of Algeria • Ministry of National Education
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {school?.name || 'Middle School'} • Middle School English Teaching Workspace
              </div>
            </div>

            <div className="text-right sm:text-right">
              <div className="text-base font-bold font-serif text-slate-900 dark:text-white">
                CAHIER JOURNAL (دفتر اليومية)
              </div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                Academic Year: {selectedAcademicYear?.label}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
            <span>
              Date:{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{selectedDate}</strong> (
              {getDayOfWeekName(selectedDate)})
            </span>
            <span>
              Teacher: <strong className="text-slate-900 dark:text-white">English Teacher</strong>
            </span>
          </div>
        </div>

        {/* Daily Sessions List */}
        {isLoading ? (
          <LoadingState message="Compiling daily inspection journal..." />
        ) : journalSessions.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title={`No Pedagogical Sessions Logged on ${selectedDate}`}
            description="No sessions were recorded on this date. Log a session or pick another date from your schedule."
            action={
              !isArchived ? (
                <Button variant="primary" size="sm" onClick={() => setIsLessonModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Log Session for {selectedDate}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {journalSessions.map(({ lesson, schoolClass, rubric, attendanceStats }, idx) => (
              <div
                key={lesson.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 page-break-inside-avoid"
              >
                {/* Session Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {lesson.startTime} – {lesson.endTime}
                    </span>
                    <Badge variant="default" className="font-bold">
                      {schoolClass?.name || 'Class'} ({lesson.levelCode})
                    </Badge>
                    {rubric && (
                      <Badge variant="neutral" className="text-[10px]">
                        {rubric.name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-mono">
                      Attendance:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {attendanceStats.present + attendanceStats.late}/{attendanceStats.total}
                      </strong>
                    </span>
                    {attendanceStats.absent > 0 && (
                      <span className="text-rose-600 font-semibold">
                        ({attendanceStats.absent} absent)
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/attendance?lessonId=${lesson.id}`)}
                      className="print:hidden text-emerald-700"
                    >
                      Roll Call
                    </Button>
                  </div>
                </div>

                {/* Pedagogical Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Lesson Topic & Objectives */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Session Topic / Focus
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {lesson.title}
                      </p>
                    </div>

                    {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Specific Pedagogical Objectives (الأهداف التعلمية)
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                          {lesson.specificObjectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Materials, Homework & Roll Call Note */}
                  <div className="space-y-2">
                    {lesson.materialsAndAids && lesson.materialsAndAids.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Didactic Aids & Materials (الوسائل التعليمية)
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {lesson.materialsAndAids.join(', ')}
                        </p>
                      </div>
                    )}

                    {attendanceStats.absentNames.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Absentees (الغياب)
                        </span>
                        <p className="text-rose-700 dark:text-rose-400 font-medium">
                          {attendanceStats.absentNames.join(', ')}
                        </p>
                      </div>
                    )}

                    {(lesson.assignedHomeworkTitle || lesson.assignedHomeworkInstructions) && (
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Assigned Work / Homework (العمل المنزلي)
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 italic">
                          {lesson.assignedHomeworkTitle}
                          {lesson.assignedHomeworkInstructions && ` — ${lesson.assignedHomeworkInstructions}`}
                        </p>
                      </div>
                    )}

                    {lesson.teacherReflectionNotes && (
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Pedagogical Observations (ملاحظات الأستاذ)
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {lesson.teacherReflectionNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Checkbox / Status */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    Status: {lesson.isCompleted ? 'Completed (تم إنجاز الحصة)' : 'Pending / Planned'}
                  </span>
                  <span className="font-mono text-[10px]">Session ID: {lesson.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inspector Signature Box at bottom */}
        <div className="mt-8 pt-6 border-t-2 border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-12">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Teacher Signature</p>
            <div className="border-b border-dashed border-slate-400 w-40 mx-auto" />
          </div>

          <div className="space-y-12">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Inspector / Principal Visa & Stamp
            </p>
            <div className="border-b border-dashed border-slate-400 w-40 mx-auto" />
          </div>
        </div>
      </div>

      {/* Session Modal */}
      {selectedAcademicYear && (
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          defaultDate={selectedDate}
          onSaved={() => {
            loadDateSessions();
          }}
        />
      )}
    </div>
  );
};
