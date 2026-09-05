/**
 * UNS SCHOOL — Class Workspace View
 * Comprehensive classroom operational workspace for a selected class division.
 * Combines Overview, Roster, Class Timetable, Lessons, and Attendance Log.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Users,
  CalendarDays,
  BookOpen,
  UserCheck,
  Plus,
  DoorOpen,
  History,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import {
  studentEnrollmentRepository,
  timetableRepository,
  lessonRepository,
  attendanceRepository,
} from '../../db/repositories';
import { Button, Badge, LoadingState, EmptyState } from '../ui';
import { ClassRosterView } from '../../features/classes/ClassRosterView';
import { TimetableSlotModal } from '../timetable/TimetableSlotModal';
import { LessonModal } from '../lessons/LessonModal';
import type {
  SchoolClass,
  AcademicYear,
  StudentEnrollment,
  StudentPerson,
  TimetableSlot,
  Lesson,
} from '../../types';
import type { EnrolledStudentItem } from '../../db/repositories/studentEnrollmentRepository';

interface ClassWorkspaceViewProps {
  schoolClass: SchoolClass;
  academicYear: AcademicYear;
  schoolId: string;
  isReadOnly: boolean;
  onBack: () => void;
  onViewStudentProfile?: (studentId: string) => void;
}

type WorkspaceTab = 'overview' | 'roster' | 'timetable' | 'lessons' | 'attendance';

const DAYS_OF_WEEK: TimetableSlot['dayOfWeek'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

export const ClassWorkspaceView: React.FC<ClassWorkspaceViewProps> = ({
  schoolClass,
  academicYear,
  schoolId,
  isReadOnly,
  onBack,
  onViewStudentProfile,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Class Operational Data
  const [enrolledItems, setEnrolledItems] = useState<EnrolledStudentItem[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    totalSessions: number;
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    averageRate: number;
  }>({
    totalSessions: 0,
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    averageRate: 100,
  });

  // Modals
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const loadClassData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, slotsList, lessonsList, attStats] = await Promise.all([
        studentEnrollmentRepository.listByClass(schoolClass.id),
        timetableRepository.listByClass(schoolClass.id),
        lessonRepository.listByClassAndAcademicYear(schoolClass.id, academicYear.id),
        attendanceRepository.getAttendanceStatsForClass(academicYear.id, schoolClass.id),
      ]);

      setEnrolledItems(items);
      setTimetableSlots(slotsList);
      setLessons(lessonsList.sort((a, b) => b.date.localeCompare(a.date)));
      setAttendanceStats(attStats);
    } catch (err) {
      console.error('Failed to load class workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolClass.id, academicYear.id]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  const activeEnrollments = enrolledItems.filter((item) => item.enrollment.status === 'active');
  const repeatingCount = enrolledItems.filter((item) => item.enrollment.isRepeating).length;
  const completedLessonsCount = lessons.filter((l) => l.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} title="Back to classes list">
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {schoolClass.name}
              </h1>
              <Badge variant="default" className="text-xs">
                {schoolClass.levelCode}
              </Badge>
              {schoolClass.roomNumber && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <DoorOpen className="w-3.5 h-3.5" />
                  {schoolClass.roomNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Class Workspace • Academic Year{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {academicYear.label}
              </strong>
            </p>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/cahier-textes?classId=${schoolClass.id}`)}
            className="gap-1 text-xs"
            title="Open official Cahier de Textes register for this class"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            Cahier de Textes
          </Button>

          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLessonModalOpen(true)}
                className="gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Log Session
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/attendance?classId=${schoolClass.id}`)}
                className="gap-1 text-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Take Attendance
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 text-xs">
        {[
          { key: 'overview', label: 'Overview (نظرة عامة)', icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { key: 'roster', label: `Student Roster (${activeEnrollments.length})`, icon: <Users className="w-3.5 h-3.5" /> },
          { key: 'timetable', label: `Class Timetable (${timetableSlots.length}h)`, icon: <CalendarDays className="w-3.5 h-3.5" /> },
          { key: 'lessons', label: `Pedagogical Sessions (${lessons.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
          { key: 'attendance', label: `Attendance Log (${attendanceStats.averageRate}%)`, icon: <History className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as WorkspaceTab)}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <LoadingState message="Loading class workspace..." />
      ) : activeTab === 'overview' ? (
        <div className="space-y-6 text-xs">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-xs">Enrolled Students</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                {activeEnrollments.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {repeatingCount} repeating (معيد)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-xs">Weekly Workload</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                {timetableSlots.length} hrs / week
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Sunday to Thursday</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-xs">Sessions Taught</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                {completedLessonsCount} / {lessons.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {lessons.length > 0
                  ? `${Math.round((completedLessonsCount / lessons.length) * 100)}% completed`
                  : 'No sessions logged'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <div className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                Average Attendance
              </div>
              <div className="text-lg font-bold text-emerald-950 dark:text-emerald-100 font-mono mt-1">
                {attendanceStats.averageRate}%
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                {attendanceStats.totalRecords} attendance checks
              </div>
            </div>
          </div>

          {/* Quick Schedule & Recent Lessons Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Timetable Snippet */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  Weekly Teaching Slots
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('timetable')}
                >
                  Manage Schedule
                </Button>
              </div>

              {timetableSlots.length === 0 ? (
                <p className="text-slate-400 italic py-3 text-center">
                  No weekly timetable slots assigned to this class yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = timetableSlots.filter((s) => s.dayOfWeek === day);
                    if (daySlots.length === 0) return null;

                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {day}
                        </span>
                        <div className="flex items-center gap-2">
                          {daySlots.map((s) => (
                            <Badge key={s.id} variant="neutral" className="font-mono text-[11px]">
                              P{s.periodNumber} ({s.startTime}–{s.endTime})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Pedagogical Sessions */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Recent Lessons & Sessions
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('lessons')}
                >
                  View All ({lessons.length})
                </Button>
              </div>

              {lessons.length === 0 ? (
                <p className="text-slate-400 italic py-3 text-center">
                  No pedagogical sessions recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {lessons.slice(0, 3).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span>{lesson.date}</span>
                          <span>•</span>
                          <span>
                            {lesson.startTime}–{lesson.endTime}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                          {lesson.title}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/attendance?lessonId=${lesson.id}`)}
                        className="shrink-0 text-xs"
                      >
                        Roll Call
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'roster' ? (
        <ClassRosterView
          schoolClass={schoolClass}
          academicYear={academicYear}
          schoolId={schoolId}
          isReadOnly={isReadOnly}
          onBack={onBack}
          onViewStudentProfile={onViewStudentProfile}
        />
      ) : activeTab === 'timetable' ? (
        /* Class Timetable Sub-view */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Weekly Timetable for {schoolClass.name}
            </h3>
            {!isReadOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsTimetableModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Slot
              </Button>
            )}
          </div>

          {timetableSlots.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-10 h-10" />}
              title="No Timetable Slots for this Class"
              description="Add teaching slots for this class during the Sunday–Thursday week."
              action={
                !isReadOnly ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsTimetableModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add First Slot
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {timetableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {slot.dayOfWeek} (P{slot.periodNumber})
                    </div>
                    <div className="font-mono text-slate-500 mt-0.5">
                      {slot.startTime} – {slot.endTime}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      {slot.roomNumber || schoolClass.roomNumber || 'Room —'}
                    </div>
                  </div>

                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Delete slot on ${slot.dayOfWeek} P${slot.periodNumber}?`)) {
                          await timetableRepository.delete(slot.id);
                          loadClassData();
                        }
                      }}
                      className="text-rose-500 hover:text-rose-700 text-xs"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'lessons' ? (
        /* Lessons Sub-view */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pedagogical Sessions Taught in {schoolClass.name}
            </h3>
            {!isReadOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsLessonModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Log Session
              </Button>
            )}
          </div>

          {lessons.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-10 h-10" />}
              title="No Sessions Logged"
              description="Start recording lessons for this class."
              action={
                !isReadOnly ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsLessonModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Log First Session
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2 text-xs">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {lesson.date}
                      </span>
                      <span className="text-slate-400 font-mono">
                        ({lesson.startTime}–{lesson.endTime})
                      </span>
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
                    <div className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                      {lesson.title}
                    </div>
                    {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                      <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                        Objectives: {lesson.specificObjectives.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/attendance?lessonId=${lesson.id}`)}
                      className="gap-1 text-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Take Attendance
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Attendance Sub-view */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cumulative Attendance Log for {schoolClass.name}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/attendance?classId=${schoolClass.id}`)}
            >
              Open Active Register
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Sessions</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {attendanceStats.totalSessions}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <div className="text-emerald-700 dark:text-emerald-400 text-[10px] uppercase font-bold">
                  Present
                </div>
                <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {attendanceStats.presentCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50">
                <div className="text-rose-700 dark:text-rose-400 text-[10px] uppercase font-bold">
                  Absent
                </div>
                <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                  {attendanceStats.absentCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50">
                <div className="text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold">
                  Late
                </div>
                <div className="text-base font-bold font-mono text-amber-700 dark:text-amber-300">
                  {attendanceStats.lateCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 col-span-2 sm:col-span-1">
                <div className="text-emerald-900 dark:text-emerald-200 text-[10px] uppercase font-bold">
                  Overall Rate
                </div>
                <div className="text-base font-bold font-mono text-emerald-950 dark:text-emerald-100">
                  {attendanceStats.averageRate}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Helpers */}
      <TimetableSlotModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        academicYearId={academicYear.id}
        schoolId={schoolId}
        classes={[schoolClass]}
        onSaved={() => {
          loadClassData();
        }}
      />

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        academicYearId={academicYear.id}
        classes={[schoolClass]}
        defaultClassId={schoolClass.id}
        onSaved={() => {
          loadClassData();
        }}
      />
    </div>
  );
};
