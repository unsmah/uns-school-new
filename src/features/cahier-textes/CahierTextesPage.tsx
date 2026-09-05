/**
 * UNS SCHOOL — Cahier de Textes (دفتر النصوص)
 * Class Pedagogical Register.
 * STRICTLY DERIVED: Read-only projection per class populated dynamically
 * from authoritative Lesson and linked Homework records.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Printer,
  Calendar,
  Clock,
  BookOpen,
  PenTool,
  CheckCircle2,
  CircleDashed,
  Award,
  Filter,
  Layers,
  Plus,
  Edit2,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  lessonRepository,
  classRepository,
  curriculumRepository,
  homeworkRepository,
} from '../../db/repositories';
import {
  Card,
  Button,
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
  HomeworkTask,
} from '../../types';

export const CahierTextesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedAcademicYear, isArchived } = useAcademicYear();

  // Class and sequence filters
  const [selectedClassId, setSelectedClassId] = useState<string>(
    searchParams.get('classId') || ''
  );
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('ALL');

  // Loaded DB data
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);

  // Modal for editing authoritative lesson shell
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Load classes and curriculum reference data
  const loadData = useCallback(async () => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setLessons([]);
      setHomeworkTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [yearClasses, activeCurr] = await Promise.all([
        classRepository.listByAcademicYear(selectedAcademicYear.id),
        curriculumRepository.getActiveVersion(),
      ]);

      setClasses(yearClasses);

      // Default to first class if not set
      let targetClassId = selectedClassId;
      if (!targetClassId && yearClasses.length > 0) {
        targetClassId = yearClasses[0].id;
        setSelectedClassId(targetClassId);
      }

      let classLessons: Lesson[] = [];
      let classHomework: HomeworkTask[] = [];

      if (targetClassId) {
        [classLessons, classHomework] = await Promise.all([
          lessonRepository.listByClassAndAcademicYear(targetClassId, selectedAcademicYear.id),
          homeworkRepository.listByClassAndAcademicYear(targetClassId, selectedAcademicYear.id),
        ]);
        setLessons(classLessons);
        setHomeworkTasks(classHomework);
      } else {
        setLessons([]);
        setHomeworkTasks([]);
      }

      // Collect all curriculum versions needed:
      // Active version + any version referenced by lessons
      const versionIds = new Set<string>();
      if (activeCurr) versionIds.add(activeCurr.id);
      for (const l of classLessons) {
        if (l.curriculumVersionId) versionIds.add(l.curriculumVersionId);
      }

      const currentClass = yearClasses.find((c) => c.id === targetClassId);

      // Load rubrics and sequences for all referenced curriculum versions
      const allRubricsMap = new Map<string, SessionRubricDefinition>();
      const allSequencesMap = new Map<string, CurriculumSequence>();

      for (const vId of versionIds) {
        const vRubrics = await curriculumRepository.listRubrics(vId);
        vRubrics.forEach((r) => allRubricsMap.set(r.id, r));

        if (currentClass) {
          const vSeqs = await curriculumRepository.listSequences(vId, currentClass.levelCode);
          vSeqs.forEach((s) => allSequencesMap.set(s.id, s));
        }
      }

      // Ensure every lesson's specific sequence and rubric are resolved even if not in the level list
      for (const l of classLessons) {
        if (l.rubricId && !allRubricsMap.has(l.rubricId)) {
          const r = await curriculumRepository.getRubricById(l.rubricId);
          if (r) allRubricsMap.set(r.id, r);
        }
        if (l.sequenceId && !allSequencesMap.has(l.sequenceId)) {
          const s = await curriculumRepository.getSequenceById(l.sequenceId);
          if (s) allSequencesMap.set(s.id, s);
        }
      }

      setRubrics(Array.from(allRubricsMap.values()));
      setSequences(Array.from(allSequencesMap.values()));
    } catch (err) {
      console.error('Failed to load Cahier de Textes data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear, selectedClassId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle class change
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    setSelectedSequenceId('ALL');
    setSearchParams({ classId: newClassId });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  const handleCreateLesson = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  // Selected School Class entity
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  // Maps for fast entity lookup
  const rubricMap = useMemo(() => new Map(rubrics.map((r) => [r.id, r])), [rubrics]);
  const sequenceMap = useMemo(() => new Map(sequences.map((s) => [s.id, s])), [sequences]);
  const homeworkByLessonMap = useMemo(() => {
    const map = new Map<string, HomeworkTask>();
    for (const h of homeworkTasks) {
      if (h.lessonId) map.set(h.lessonId, h);
    }
    return map;
  }, [homeworkTasks]);

  // Filter lessons by sequence
  const filteredLessons = useMemo(() => {
    return lessons
      .filter((l) => {
        if (selectedSequenceId !== 'ALL' && l.sequenceId !== selectedSequenceId) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [lessons, selectedSequenceId]);

  // Metric counts
  const totalSessionsCount = lessons.length;
  const completedSessionsCount = lessons.filter((l) => l.isCompleted).length;
  const totalHomeworkCount = homeworkTasks.length;

  if (isLoading) {
    return <LoadingState message="Compiling class Cahier de Textes register..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Cahier de Textes (دفتر النصوص)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Derived Register
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chronological log of sessions taught, learning points, and assigned homework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
            title="Print log"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Print Log</span>
          </Button>

          {!isArchived && selectedClassId && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateLesson}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Session</span>
            </Button>
          )}
        </div>
      </div>

      {/* Control Bar: Class Division & Sequence Filters */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Class Division (الفوج):
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.levelCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 font-medium">Sequence:</label>
            <select
              value={selectedSequenceId}
              onChange={(e) => setSelectedSequenceId(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="ALL">All Sequences (جميع المقاطع)</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  Seq {s.sequenceNumber}: {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Register Progress Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Sessions: <strong>{totalSessionsCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Taught: <strong>{completedSessionsCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
            <PenTool className="w-3.5 h-3.5" />
            <span>Homework: <strong>{totalHomeworkCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Class Pedagogical Log Header */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          CAHIER DE TEXTES — CLASS PEDAGOGICAL LOG (دفتر النصوص)
        </h2>
        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Class: {selectedClass ? `${selectedClass.name} (${selectedClass.levelCode})` : '—'} | Academic Year: {selectedAcademicYear?.label || '—'}
        </div>
      </div>

      {/* Chronological Class Sessions Register */}
      {filteredLessons.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            title="No Sessions Recorded for this Class"
            description={
              selectedClass
                ? `No lessons have been scheduled or logged for ${selectedClass.name} yet.`
                : 'Please select a class to view its pedagogical log.'
            }
            action={
              !isArchived && selectedClassId ? (
                <Button variant="primary" size="sm" onClick={handleCreateLesson}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Log First Session for {selectedClass?.name}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:border-slate-400 print:shadow-none">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-14 text-center">#</th>
                <th className="p-3 w-32">Date & Time</th>
                <th className="p-3 w-48">Sequence & Session</th>
                <th className="p-3 w-36">Rubric / Stage</th>
                <th className="p-3">Content / Topic Covered</th>
                <th className="p-3 w-64">Assigned Homework</th>
                <th className="p-3 w-16 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLessons.map((lesson, idx) => {
                const rubric = rubricMap.get(lesson.rubricId);
                const sequence = lesson.sequenceId ? sequenceMap.get(lesson.sequenceId) : null;
                const hw = homeworkByLessonMap.get(lesson.id) || (lesson.assignedHomeworkTitle ? {
                  id: `hw-${lesson.id}`,
                  title: lesson.assignedHomeworkTitle,
                  instructions: lesson.assignedHomeworkInstructions,
                  dueDate: lesson.assignedHomeworkDueDate,
                  isCompleted: false,
                } : null);

                return (
                  <tr
                    key={lesson.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    {/* Session Sequence Index */}
                    <td className="p-3 text-center font-bold text-slate-500 dark:text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {lesson.date}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{lesson.startTime} - {lesson.endTime}</span>
                      </div>
                    </td>

                    {/* Sequence & Session Number */}
                    <td className="p-3">
                      {sequence ? (
                        <div>
                          <span className="font-bold text-blue-900 dark:text-blue-300">
                            Seq {sequence.sequenceNumber}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate">
                            {sequence.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Session #{lesson.sessionNumberInSequence}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">General Session #{lesson.sessionNumberInSequence}</span>
                      )}
                    </td>

                    {/* Rubric / Pedagogical Stage */}
                    <td className="p-3">
                      {rubric ? (
                        <div>
                          <div className="font-medium text-purple-900 dark:text-purple-300">
                            {rubric.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {rubric.pedagogicalStage}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Content / Objectives */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                        {lesson.title}
                      </div>
                      {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                          {lesson.specificObjectives.map((obj, oIdx) => (
                            <li key={oIdx} className="line-clamp-1">
                              • {obj}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>

                    {/* Assigned Homework (Derived from HomeworkTask / Lesson) */}
                    <td className="p-3">
                      {hw ? (
                        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] space-y-0.5">
                          <div className="font-bold text-amber-900 dark:text-amber-200">
                            {hw.title}
                          </div>
                          {hw.dueDate && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-300">
                              Due: {hw.dueDate}
                            </div>
                          )}
                          {hw.instructions && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">
                              {hw.instructions}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center print:hidden">
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => handleEditLesson(lesson)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Edit Session Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lesson Modal for Editing Authoritative Shell */}
      {isModalOpen && selectedAcademicYear && (
        <LessonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          defaultClassId={selectedClassId}
          existingLesson={editingLesson}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
