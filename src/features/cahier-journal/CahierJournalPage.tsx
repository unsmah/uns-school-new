/**
 * UNS SCHOOL — Cahier Journal (دفتر اليومية)
 * Official Algerian Middle School English Inspectorate compliance view.
 * STRICTLY DERIVED: Read-only projection populated dynamically from authoritative Lesson records,
 * linked attendance tallies, curriculum sequences, session rubrics, and homework tasks.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Calendar,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Edit2,
  Plus,
  BookOpen,
  Award,
  Layers,
  PenTool,
  CheckCircle2,
  FileText,
  Filter,
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
  Select,
  LoadingState,
  EmptyState,
} from '../../components/ui';
import { LessonModal } from '../../components/lessons/LessonModal';
import type {
  Lesson,
  SchoolClass,
  CurriculumSequence,
  SessionRubricDefinition,
  CurriculumCompetency,
  AttendanceRecord,
} from '../../types';

export const CahierJournalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedAcademicYear, isArchived } = useAcademicYear();

  // Date and Class filters
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get('date') || new Date().toISOString().slice(0, 10)
  );
  const [classFilter, setClassFilter] = useState<string>(
    searchParams.get('classId') || 'ALL'
  );

  // Loaded DB data
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [competencies, setCompetencies] = useState<CurriculumCompetency[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());

  // Modal for editing authoritative lesson shell
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Load all required reference and lesson data for the active year
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
        const [rubricList, seqs1, seqs2, seqs3, seqs4, comps] = await Promise.all([
          curriculumRepository.listRubrics(activeCurr.id),
          curriculumRepository.listSequences(activeCurr.id, '1MS'),
          curriculumRepository.listSequences(activeCurr.id, '2MS'),
          curriculumRepository.listSequences(activeCurr.id, '3MS'),
          curriculumRepository.listSequences(activeCurr.id, '4MS'),
          curriculumRepository.listCompetencies(activeCurr.id),
        ]);
        setRubrics(rubricList);
        setSequences([...seqs1, ...seqs2, ...seqs3, ...seqs4]);
        setCompetencies(comps);
      }

      // Load attendance for today's lessons
      const dateLessons = yearLessons.filter((l) => l.date === selectedDate);
      const attMap = new Map<string, AttendanceRecord[]>();
      await Promise.all(
        dateLessons.map(async (l) => {
          const records = await attendanceRepository.listByLesson(l.id);
          attMap.set(l.id, records);
        })
      );
      setAttendanceMap(attMap);
    } catch (err) {
      console.error('Failed to load Cahier Journal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize URL parameters
  const updateFilters = (newDate: string, newClassId: string) => {
    setSelectedDate(newDate);
    setClassFilter(newClassId);
    setSearchParams({ date: newDate, classId: newClassId });
  };

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    updateFilters(d.toISOString().slice(0, 10), classFilter);
  };

  const setToday = () => {
    updateFilters(new Date().toISOString().slice(0, 10), classFilter);
  };

  // Fast entity lookup maps
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const rubricMap = useMemo(() => new Map(rubrics.map((r) => [r.id, r])), [rubrics]);
  const sequenceMap = useMemo(() => new Map(sequences.map((s) => [s.id, s])), [sequences]);
  const competencyMap = useMemo(() => new Map(competencies.map((c) => [c.id, c])), [competencies]);

  // Lessons for the selected day and optional class filter
  const dayLessons = useMemo(() => {
    return lessons
      .filter((l) => {
        if (l.date !== selectedDate) return false;
        if (classFilter !== 'ALL' && l.classId !== classFilter) return false;
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [lessons, selectedDate, classFilter]);

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  const handleCreateLessonForDate = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Formatted date string in English, French, and Arabic
  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(`${selectedDate}T00:00:00`);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  if (isLoading) {
    return <LoadingState message="Deriving Cahier Journal from pedagogical sessions..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Header & Inspection Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Cahier Journal (دفتر اليومية)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Derived View
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative daily log of pedagogical activities, didactic plans, and attendance tallies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
            title="Print daily inspection sheet"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Print Sheet (A4)</span>
          </Button>

          {!isArchived && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateLessonForDate}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Session</span>
            </Button>
          )}
        </div>
      </div>

      {/* Date & Filter Navigation Bar */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Date Stepper */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shiftDate(-1)}
            aria-label="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => updateFilters(e.target.value, classFilter)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button variant="outline" size="sm" onClick={setToday}>
              Today
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => shiftDate(1)}
            aria-label="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Class:</span>
          <select
            value={classFilter}
            onChange={(e) => updateFilters(selectedDate, e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Classes (جميع الأفواج)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.levelCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Official Inspection Printable Header (Visible on print and page) */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-1">
        <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
          People's Democratic Republic of Algeria — Ministry of National Education
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          CAHIER JOURNAL — DAILY PEDAGOGICAL RECORD
        </h2>
        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          {formattedDateTitle}
        </div>
      </div>

      {/* Daily Sessions List */}
      {dayLessons.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            title="No Pedagogical Sessions on this Date"
            description={`No lessons recorded for ${formattedDateTitle}${
              classFilter !== 'ALL' ? ' in the selected class' : ''
            }.`}
            action={
              !isArchived ? (
                <Button variant="primary" size="sm" onClick={handleCreateLessonForDate}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Plan Session for {selectedDate}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {dayLessons.map((lesson, index) => {
            const schoolClass = classMap.get(lesson.classId);
            const rubric = rubricMap.get(lesson.rubricId);
            const sequence = lesson.sequenceId ? sequenceMap.get(lesson.sequenceId) : null;
            const records = attendanceMap.get(lesson.id) || [];
            const presentCount = records.filter((r) => r.status === 'Present').length;
            const absentCount = records.filter((r) => r.status === 'Absent').length;
            const lateCount = records.filter((r) => r.status === 'Late').length;

            return (
              <div
                key={lesson.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden print:border-slate-400 print:shadow-none"
              >
                {/* Session Top Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Time Slot Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lesson.startTime} — {lesson.endTime}</span>
                    </div>

                    {/* Class Badge */}
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                      {schoolClass ? schoolClass.name : lesson.levelCode}
                    </span>

                    {/* Sequence Badge */}
                    {sequence ? (
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold">
                        Seq {sequence.sequenceNumber}: {sequence.title} (Session #{lesson.sessionNumberInSequence})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs">
                        Session #{lesson.sessionNumberInSequence}
                      </span>
                    )}

                    {/* Rubric Badge */}
                    {rubric && (
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-medium">
                        {rubric.name} ({rubric.pedagogicalStage})
                      </span>
                    )}
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/attendance?lessonId=${lesson.id}`)}
                      className="text-xs h-7 flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Roll Call</span>
                    </Button>

                    {!isArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLesson(lesson)}
                        className="text-xs h-7 flex items-center gap-1"
                        title="Edit Authoritative Lesson"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Session Main Body */}
                <div className="p-4 space-y-4 text-xs">
                  {/* Title & Objectives */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                      {lesson.title}
                    </h3>

                    {/* Targeted Competencies */}
                    {lesson.targetedCompetencyIds && lesson.targetedCompetencyIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-500" />
                          Competencies:
                        </span>
                        {lesson.targetedCompetencyIds.map((cId) => {
                          const c = competencyMap.get(cId);
                          return (
                            <span
                              key={cId}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              {c ? `${c.code}: ${c.name}` : cId}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Objectives */}
                    {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 block">
                          Specific Learning Objectives (الأهداف التعلمية):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                          {lesson.specificObjectives.map((obj, idx) => (
                            <li key={idx}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Didactic Activity Plan Table */}
                  {lesson.activitySteps && lesson.activitySteps.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Didactic Activity Flow (سير الحصة التعلمية):</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-2 w-10 text-center">#</th>
                              <th className="p-2 w-36">Phase</th>
                              <th className="p-2 w-16 text-center">Time</th>
                              <th className="p-2 w-28">Interaction</th>
                              <th className="p-2">Teacher's Role & Instructions</th>
                              <th className="p-2">Pupil's Task & Activity</th>
                              <th className="p-2 w-32">Aids / Media</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {lesson.activitySteps.map((step) => (
                              <tr key={step.id || step.stepNumber} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                                <td className="p-2 text-center font-bold text-slate-500">
                                  {step.stepNumber}
                                </td>
                                <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                                  {step.phaseName}
                                </td>
                                <td className="p-2 text-center text-slate-600 dark:text-slate-400">
                                  {step.allocatedMinutes}m
                                </td>
                                <td className="p-2 text-slate-600 dark:text-slate-400 text-[11px]">
                                  {step.interactionPattern}
                                </td>
                                <td className="p-2 text-slate-700 dark:text-slate-300">
                                  {step.teacherRoleAndInstructions || '—'}
                                </td>
                                <td className="p-2 text-slate-700 dark:text-slate-300">
                                  {step.studentRoleAndTasks || '—'}
                                </td>
                                <td className="p-2 text-slate-500 text-[11px]">
                                  {step.materialsAndAids || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bottom Strip: Materials, Attendance & Homework */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Materials */}
                    <div>
                      <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Materials & Aids (الوسائل):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {lesson.materialsAndAids && lesson.materialsAndAids.length > 0 ? (
                          lesson.materialsAndAids.map((m, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None specified</span>
                        )}
                      </div>
                    </div>

                    {/* Attendance Record */}
                    <div>
                      <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Attendance Status (الحضور والغياب):
                      </span>
                      {records.length > 0 ? (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-600 font-semibold">
                            {presentCount} Present
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className={absentCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                            {absentCount} Absent
                          </span>
                          {lateCount > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span className="text-amber-600 font-semibold">{lateCount} Late</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not recorded yet</span>
                      )}
                    </div>

                    {/* Homework */}
                    <div>
                      <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Assigned Homework (الواجب المنزلي):
                      </span>
                      {lesson.assignedHomeworkTitle ? (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] space-y-0.5">
                          <div className="font-bold text-amber-900 dark:text-amber-200">
                            {lesson.assignedHomeworkTitle}
                          </div>
                          {lesson.assignedHomeworkDueDate && (
                            <div className="text-amber-700 dark:text-amber-300 text-[10px]">
                              Due: {lesson.assignedHomeworkDueDate}
                            </div>
                          )}
                          {lesson.assignedHomeworkInstructions && (
                            <div className="text-slate-600 dark:text-slate-400 text-[10px] line-clamp-1">
                              {lesson.assignedHomeworkInstructions}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No homework assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Reflection Notes */}
                  {lesson.teacherReflectionNotes && (
                    <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs">
                      <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-0.5">
                        Teacher's Pedagogical Reflection:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{lesson.teacherReflectionNotes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson Modal for Editing Authoritative Shell */}
      {isModalOpen && selectedAcademicYear && (
        <LessonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          existingLesson={editingLesson}
          defaultDate={selectedDate}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
