/**
 * UNS SCHOOL — Planning & Pacing (Phase 5)
 * Teacher planning and pacing cockpit derived deterministically from authoritative Lesson records.
 * Full academic year and class isolation, zero fake percentages, zero mock data.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  Plus,
  Compass,
  AlertTriangle,
  BookOpen,
  Filter,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, Button, Badge, Alert } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useI18n } from '../../i18n/I18nContext';
import { classRepository } from '../../db/repositories/classRepository';
import { lessonRepository } from '../../db/repositories/lessonRepository';
import { curriculumRepository } from '../../db/repositories/curriculumRepository';
import {
  computeClassPlanningOverview,
  computeCompetencyCoverage,
  computeObjectiveCoverage,
  type ClassPlanningOverview,
  type SequenceProgressMetrics,
  type CompetencyCoverageMetrics,
  type ObjectiveCoverageMetrics,
} from '../../services/planningCalculationService';
import { LessonModal } from '../../components/lessons/LessonModal';
import type {
  SchoolClass,
  Lesson,
  CurriculumVersion,
  CurriculumSequence,
  CompetencyDefinition,
  LearningObjectiveDefinition,
  SessionRubricDefinition,
} from '../../types';

export const PlanningPage: React.FC = () => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();
  const { language } = useI18n();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [curriculumVersion, setCurriculumVersion] = useState<CurriculumVersion | null>(null);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyDefinition[]>([]);
  const [objectives, setObjectives] = useState<LearningObjectiveDefinition[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [activeTab, setActiveTab] = useState<'sequences' | 'competencies' | 'objectives'>('sequences');
  const [expandedSequenceId, setExpandedSequenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson Modal State
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [modalDefaultSequenceId, setModalDefaultSequenceId] = useState<string | undefined>(undefined);

  // 1. Load Classes for Current Academic Year
  const loadClasses = useCallback(async () => {
    if (!selectedAcademicYear) return;
    try {
      const clsList = await classRepository.listByAcademicYear(selectedAcademicYear.id);
      setClasses(clsList);
      if (clsList.length > 0 && (!selectedClassId || !clsList.some((c) => c.id === selectedClassId))) {
        setSelectedClassId(clsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes for planning:', err);
      setError('Failed to load classes.');
    }
  }, [selectedAcademicYear, selectedClassId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Selected Class
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  // 2. Load Curriculum Context and Class Lessons
  const loadPlanningData = useCallback(async () => {
    if (!selectedAcademicYear || !selectedClass) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Find active or appropriate curriculum version
      let curr = await curriculumRepository.getActiveVersion();
      if (!curr) {
        const allVersions = await curriculumRepository.listVersions();
        curr = allVersions[0];
      }
      setCurriculumVersion(curr || null);

      if (curr) {
        const [seqList, compList, rubList, allObjs, classLessons] = await Promise.all([
          curriculumRepository.listSequences(curr.id, selectedClass.levelCode),
          curriculumRepository.listCompetencies(curr.id, selectedClass.levelCode),
          curriculumRepository.listRubrics(curr.id),
          curriculumRepository.listObjectivesByCurriculumVersion(curr.id),
          lessonRepository.listByClass(selectedClass.id),
        ]);

        setSequences(seqList);
        setCompetencies(compList);
        setRubrics(rubList);
        setObjectives(allObjs);

        // Filter lessons strictly by current academic year
        const yearScopedLessons = classLessons.filter(
          (l) => l.academicYearId === selectedAcademicYear.id
        );
        setLessons(yearScopedLessons);

        if (seqList.length > 0 && !expandedSequenceId) {
          setExpandedSequenceId(seqList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load planning data:', err);
      setError('Failed to load planning information.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear, selectedClass]);

  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Derived Overview & Calculations
  const classOverview: ClassPlanningOverview | null = useMemo(() => {
    if (!selectedClass || !selectedAcademicYear) return null;
    return computeClassPlanningOverview({
      classId: selectedClass.id,
      academicYearId: selectedAcademicYear.id,
      levelCode: selectedClass.levelCode,
      sequences,
      lessons,
    });
  }, [selectedClass, selectedAcademicYear, sequences, lessons]);

  const competencyMetrics: CompetencyCoverageMetrics[] = useMemo(() => {
    return computeCompetencyCoverage(competencies, lessons);
  }, [competencies, lessons]);

  const sequencesMap = useMemo(() => {
    const map = new Map<string, CurriculumSequence>();
    for (const s of sequences) {
      map.set(s.id, s);
    }
    return map;
  }, [sequences]);

  const objectiveMetrics: ObjectiveCoverageMetrics[] = useMemo(() => {
    return computeObjectiveCoverage(objectives, lessons, sequencesMap);
  }, [objectives, lessons, sequencesMap]);

  const rubricsMap = useMemo(() => {
    const map = new Map<string, SessionRubricDefinition>();
    for (const r of rubrics) {
      map.set(r.id, r);
    }
    return map;
  }, [rubrics]);

  // Handlers for Lesson Modal
  const handleOpenNewLesson = (sequenceId?: string) => {
    setEditingLesson(null);
    setModalDefaultSequenceId(sequenceId);
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setModalDefaultSequenceId(lesson.sequenceId);
    setIsLessonModalOpen(true);
  };

  const handleLessonSaved = () => {
    setIsLessonModalOpen(false);
    setEditingLesson(null);
    loadPlanningData();
  };

  if (!selectedAcademicYear) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Please select or activate an academic year first.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white break-words">
              {language === 'ar' ? 'التخطيط والتقدم البيداغوجي' : language === 'fr' ? 'Planification & Progression' : 'Planning & Pacing'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">
            {language === 'ar'
              ? 'متابعة وتيرة تقدم المنهاج، إنجاز المقاطع والكفاءات انطلاقاً من حصص دفتر النصوص المسجلة.'
              : 'Authoritative progress tracking, sequence pacing, and competency coverage derived from recorded lessons.'}
          </p>
        </div>

        {/* Class Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'الفوج:' : language === 'fr' ? 'Classe:' : 'Class:'}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-bold text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.levelCode})
                </option>
              ))}
            </select>
          </div>

          {!isArchived && (
            <Button
              onClick={() => handleOpenNewLesson()}
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Plan / Record Lesson</span>
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert variant="warning" className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This academic year is archived. Planning data is displayed in historical read-only mode.</span>
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {classes.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p className="text-sm font-semibold">No classes configured for this academic year.</p>
          <p className="text-xs mt-1">Please create classes in the Settings or Classes view.</p>
        </Card>
      ) : (
        <>
          {/* Class Banner & Progress Cockpit */}
          {selectedClass && classOverview && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Card 1: Context */}
              <Card className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Class Context
                </span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedClass.name}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {selectedClass.levelCode}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Year: {selectedAcademicYear.label}</span>
                  {curriculumVersion && (
                    <span className="block truncate mt-0.5">
                      Curriculum: {curriculumVersion.title}
                    </span>
                  )}
                </div>
              </Card>

              {/* Card 2: Planned vs Recorded Sessions */}
              <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Session Execution
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {classOverview.totalCompletedLessons}
                  </span>
                  <span className="text-xs text-slate-500">
                    {classOverview.isPlannedTargetConfigured
                      ? `/ ${classOverview.totalPlannedSessions} planned sessions`
                      : 'completed (target unconfigured)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{classOverview.totalRecordedLessons} total recorded logs</span>
                </div>
              </Card>

              {/* Card 3: Overall Completion Progress */}
              <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Syllabus Coverage Progress
                  </span>
                  {classOverview.overallProgressPercentage !== null ? (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {classOverview.overallProgressPercentage}% Complete
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      Target Unconfigured
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 dark:bg-emerald-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${classOverview.overallProgressPercentage ?? 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>{sequences.length} Sequences</span>
                  {classOverview.isPlannedTargetConfigured ? (
                    <span>
                      {Math.max(0, classOverview.totalPlannedSessions - classOverview.totalCompletedLessons)} Sessions Remaining
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No session targets defined</span>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Sub-Tabs: Sequences, Competencies, Objectives */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('sequences')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'sequences'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'المقاطع والوتيرة' : language === 'fr' ? 'Séquences & Progression' : 'Sequences & Pacing'}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'sequences'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {sequences.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('competencies')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'competencies'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'مصفوفة الكفاءات' : language === 'fr' ? 'Matrice des compétences' : 'Competency Matrix'}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'competencies'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {competencies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'objectives'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'الأهداف التعلمية' : language === 'fr' ? 'Objectifs d’apprentissage' : 'Learning Objectives'}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'objectives'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {objectives.length}
              </span>
            </button>
          </div>

          {/* TAB 1: Sequences & Lesson Pacing */}
          {activeTab === 'sequences' && classOverview && (
            <div className="space-y-4">
              {classOverview.sequencesMetrics.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold">No sequences available for {selectedClass?.levelCode}.</p>
                </Card>
              ) : (
                classOverview.sequencesMetrics.map((seqMetric) => {
                  const seq = seqMetric.sequence;
                  const isExpanded = expandedSequenceId === seq.id;

                  return (
                    <div
                      key={seq.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Sequence Summary Row */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div
                          onClick={() => setExpandedSequenceId(isExpanded ? null : seq.id)}
                          className="flex items-start gap-3 cursor-pointer flex-1"
                        >
                          <span className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            S{seq.sequenceNumber}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {seq.title}
                              </h3>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                {seqMetric.isPlannedTargetConfigured
                                  ? `${seqMetric.completedLessonsCount} / ${seqMetric.plannedSessionsCount} completed`
                                  : `${seqMetric.completedLessonsCount} completed (target unconfigured)`}
                              </span>
                            </div>

                            {seq.communicativeObjective && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Goal: </span>
                                {seq.communicativeObjective}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Progress Meter & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          {seqMetric.isPlannedTargetConfigured ? (
                            <div className="w-32 hidden sm:block text-right">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                <span>Progress</span>
                                <span>{seqMetric.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${seqMetric.completionPercentage}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 hidden sm:block text-right text-[11px] text-slate-400 italic">
                              Target unconfigured
                            </div>
                          )}

                          {!isArchived && (
                            <Button
                              onClick={() => handleOpenNewLesson(seq.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Add Lesson</span>
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedSequenceId(isExpanded ? null : seq.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Sequence Expanded Details & Lessons Table */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                          {/* Project Work Card */}
                          {seq.projectWorkTitle && (
                            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 text-xs flex items-center gap-2">
                              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <div>
                                <span className="font-semibold text-amber-900 dark:text-amber-300">
                                  Project Work:{' '}
                                </span>
                                <span className="text-amber-950 dark:text-amber-200">
                                  {seq.projectWorkTitle}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Recorded Lessons in this Sequence */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                Recorded Sessions for {selectedClass?.name} ({seqMetric.lessons.length})
                              </span>
                              {seqMetric.firstLessonDate && seqMetric.lastLessonDate && (
                                <span className="text-[11px] text-slate-500">
                                  Pacing span: {seqMetric.firstLessonDate} to {seqMetric.lastLessonDate}
                                </span>
                              )}
                            </div>

                            {seqMetric.lessons.length === 0 ? (
                              <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                                No lessons recorded for this sequence in this class yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {seqMetric.lessons.map((lesson) => {
                                  const rubric = rubricsMap.get(lesson.rubricId);
                                  return (
                                    <div
                                      key={lesson.id}
                                      onClick={() => handleEditLesson(lesson)}
                                      className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="text-center shrink-0 w-16 px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700">
                                          <span className="block font-bold text-slate-900 dark:text-white text-[11px]">
                                            {lesson.date}
                                          </span>
                                          <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                            {lesson.startTime || '08:00'}
                                          </span>
                                        </div>

                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                              {lesson.title}
                                            </span>
                                            {lesson.sessionNumberInSequence && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                                Session #{lesson.sessionNumberInSequence}
                                              </span>
                                            )}
                                          </div>

                                          {rubric && (
                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
                                              {rubric.name} ({rubric.pedagogicalStage})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {lesson.isCompleted ? (
                                          <Badge variant="success" className="text-[10px]">
                                            Completed
                                          </Badge>
                                        ) : (
                                          <Badge variant="warning" className="text-[10px]">
                                            Planned
                                          </Badge>
                                        )}
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Competency Matrix */}
          {activeTab === 'competencies' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Final Competency Coverage:
                </span>{' '}
                Tracks how many recorded sessions in this class have explicitly targeted national competencies (C1, C2, C3).
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {competencyMetrics.map((metric) => {
                  const comp = metric.competency;
                  const isTargeted = metric.targetedLessonsCount > 0;

                  return (
                    <Card key={comp.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                          {comp.code}
                        </span>
                        <Badge variant={isTargeted ? 'success' : 'neutral'} className="text-[10px]">
                          {metric.targetedLessonsCount} session(s)
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {comp.name}
                        </h3>
                        {comp.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">
                            {comp.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        {isTargeted ? (
                          <span>
                            Active from {metric.firstTargetedDate} to {metric.lastTargetedDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not yet targeted in recorded lessons.</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Learning Objectives Alignment */}
          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Curriculum Objectives Alignment:
                </span>{' '}
                Direct correlation between official syllabus learning objectives and classroom lessons recorded for {selectedClass?.name}.
              </div>

              {objectiveMetrics.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm font-semibold">No discrete objectives found for this syllabus.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {objectiveMetrics.map((metric) => {
                    const obj = metric.objective;
                    const isAddressed = metric.addressedInLessonsCount > 0;

                    return (
                      <div
                        key={obj.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {metric.sequenceTitle && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {metric.sequenceTitle}
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-slate-500">
                              {obj.type}
                            </span>
                          </div>
                          <p className="text-slate-900 dark:text-slate-100 font-medium">
                            {obj.description}
                          </p>
                        </div>

                        <div className="shrink-0 self-end sm:self-center">
                          {isAddressed ? (
                            <Badge variant="success" className="text-[10px]">
                              Addressed ({metric.addressedInLessonsCount}x)
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Unified Lesson Modal */}
      {selectedClass && selectedAcademicYear && (
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          academicYearId={selectedAcademicYear.id}
          classes={classes}
          existingLesson={editingLesson}
          defaultClassId={selectedClass.id}
          defaultSequenceId={modalDefaultSequenceId}
          onSaved={handleLessonSaved}
        />
      )}
    </div>
  );
};
