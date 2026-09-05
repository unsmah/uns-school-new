/**
 * UNS SCHOOL — Lesson / Pedagogical Session Modal
 * Authoritative lesson creator and editor supporting full curriculum context,
 * didactic activity plan, competencies,
 * learning objectives, materials & local resources, and homework task anchoring.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Tag,
  FileText,
  HelpCircle,
  Plus,
  X,
  Layers,
  Award,
  Target,
  FolderOpen,
  PenTool,
} from 'lucide-react';
import { Modal, Button, Input, Select, Alert } from '../ui';
import { ActivityStepsEditor } from './ActivityStepsEditor';
import { lessonRepository, curriculumRepository, resourceRepository } from '../../db/repositories';
import type {
  Lesson,
  LessonActivityPlan,
  SchoolClass,
  CurriculumSequence,
  SessionRubricDefinition,
  CurriculumVersion,
  CurriculumCompetency,
  CurriculumObjective,
  LocalResource,
} from '../../types';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: string;
  classes: SchoolClass[];
  existingLesson?: Lesson | null;
  defaultClassId?: string;
  defaultSequenceId?: string;
  defaultDate?: string;
  onSaved: (lesson: Lesson) => void;
}

const COMMON_MATERIALS = [
  'Coursebook (كتاب مدرسي)',
  'Whiteboard & Markers',
  'Audio Track / Player',
  'Flashcards / Pictures',
  'Data Show / Projector',
  'Worksheet / Handout',
  'Real Objects / Realia',
];

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  academicYearId,
  classes,
  existingLesson,
  defaultClassId,
  defaultSequenceId,
  defaultDate,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'core' | 'objectives' | 'activities' | 'materials_homework' | 'reflection'>('core');

  const [classId, setClassId] = useState<string>('');
  const [curriculumVersion, setCurriculumVersion] = useState<CurriculumVersion | null>(null);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [availableCompetencies, setAvailableCompetencies] = useState<CurriculumCompetency[]>([]);
  const [sequenceObjectives, setSequenceObjectives] = useState<CurriculumObjective[]>([]);
  const [availableResources, setAvailableResources] = useState<LocalResource[]>([]);

  // Form Fields
  const [sequenceId, setSequenceId] = useState<string>('');
  const [rubricId, setRubricId] = useState<string>('');
  const [sessionNumberInSequence, setSessionNumberInSequence] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:00');
  const [title, setTitle] = useState<string>('');
  const [targetedCompetencyIds, setTargetedCompetencyIds] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState<string>('');
  const [activitySteps, setActivitySteps] = useState<LessonActivityPlan[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([
    'Coursebook (كتاب مدرسي)',
    'Whiteboard & Markers',
  ]);
  const [customMaterial, setCustomMaterial] = useState<string>('');
  const [homeworkTitle, setHomeworkTitle] = useState<string>('');
  const [homeworkInstructions, setHomeworkInstructions] = useState<string>('');
  const [homeworkDueDate, setHomeworkDueDate] = useState<string>('');
  const [teacherReflectionNotes, setTeacherReflectionNotes] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Class
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);

  // Calculate lesson duration in minutes
  const lessonDurationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 60;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 60;
  }, [startTime, endTime]);

  // Load Curriculum and initial rubrics/resources
  useEffect(() => {
    async function loadCurriculumData() {
      setIsLoadingCurriculum(true);
      try {
        let curr: CurriculumVersion | undefined;
        if (existingLesson?.curriculumVersionId) {
          curr = await curriculumRepository.getVersionById(existingLesson.curriculumVersionId);
        }
        if (!curr) {
          curr = await curriculumRepository.getActiveVersion();
        }
        const resources = await resourceRepository.listAll();
        if (curr) {
          setCurriculumVersion(curr);
          const allRubrics = await curriculumRepository.listRubrics(curr.id);
          setRubrics(allRubrics);
        }
        setAvailableResources(resources);
      } catch (err) {
        console.error('Failed to load curriculum data:', err);
      } finally {
        setIsLoadingCurriculum(false);
      }
    }
    loadCurriculumData();
  }, [existingLesson]);

  // Update sequences & competencies whenever class changes
  useEffect(() => {
    async function loadClassCurriculumData() {
      if (!curriculumVersion || !classId) return;
      const cls = classes.find((c) => c.id === classId);
      if (!cls) return;

      try {
        const [seqs, comps] = await Promise.all([
          curriculumRepository.listSequences(curriculumVersion.id, cls.levelCode),
          curriculumRepository.listCompetencies(curriculumVersion.id, cls.levelCode),
        ]);
        setSequences(seqs);
        setAvailableCompetencies(comps);

        if (seqs.length > 0 && !sequenceId) {
          const matchedDefault = defaultSequenceId && seqs.some((s) => s.id === defaultSequenceId)
            ? defaultSequenceId
            : seqs[0].id;
          setSequenceId(matchedDefault);
        }
      } catch (err) {
        console.error('Failed to load sequences/competencies for class:', err);
      }
    }
    loadClassCurriculumData();
  }, [curriculumVersion, classId, classes, defaultSequenceId]);

  // Update sequence objectives when sequenceId changes
  useEffect(() => {
    async function loadSequenceObjectives() {
      if (!sequenceId) {
        setSequenceObjectives([]);
        return;
      }
      try {
        const objs = await curriculumRepository.listObjectives(sequenceId);
        setSequenceObjectives(objs);
      } catch (err) {
        console.error('Failed to load sequence objectives:', err);
      }
    }
    loadSequenceObjectives();
  }, [sequenceId]);

  // Initialize form state
  useEffect(() => {
    if (existingLesson) {
      setClassId(existingLesson.classId);
      setSequenceId(existingLesson.sequenceId || '');
      setRubricId(existingLesson.rubricId);
      setSessionNumberInSequence(existingLesson.sessionNumberInSequence || 1);
      setDate(existingLesson.date);
      setStartTime(existingLesson.startTime);
      setEndTime(existingLesson.endTime);
      setTitle(existingLesson.title);
      setTargetedCompetencyIds(existingLesson.targetedCompetencyIds || []);
      setObjectives(existingLesson.specificObjectives || []);
      setActivitySteps(existingLesson.activitySteps || []);
      setSelectedMaterials(existingLesson.materialsAndAids || []);
      setHomeworkTitle(existingLesson.assignedHomeworkTitle || '');
      setHomeworkInstructions(existingLesson.assignedHomeworkInstructions || '');
      setHomeworkDueDate(existingLesson.assignedHomeworkDueDate || '');
      setTeacherReflectionNotes(existingLesson.teacherReflectionNotes || '');
      setIsCompleted(existingLesson.isCompleted);
    } else {
      const initialClassId = defaultClassId || classes[0]?.id || '';
      setClassId(initialClassId);
      setSequenceId(defaultSequenceId || '');
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('08:00');
      setEndTime('09:00');
      setSessionNumberInSequence(1);
      setTitle('');
      setTargetedCompetencyIds([]);
      setObjectives([]);
      setActivitySteps([]);
      setSelectedMaterials(['Coursebook (كتاب مدرسي)', 'Whiteboard & Markers']);
      setHomeworkTitle('');
      setHomeworkInstructions('');
      setHomeworkDueDate('');
      setTeacherReflectionNotes('');
      setIsCompleted(false);
    }
    setActiveTab('core');
    setError(null);
  }, [existingLesson, defaultClassId, defaultSequenceId, defaultDate, classes, isOpen]);

  // Set default rubric if empty
  useEffect(() => {
    if (rubrics.length > 0 && !rubricId) {
      setRubricId(rubrics[0].id);
    }
  }, [rubrics, rubricId]);

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    if (!objectives.includes(newObjective.trim())) {
      setObjectives([...objectives, newObjective.trim()]);
    }
    setNewObjective('');
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleToggleCompetency = (compId: string) => {
    if (targetedCompetencyIds.includes(compId)) {
      setTargetedCompetencyIds(targetedCompetencyIds.filter((id) => id !== compId));
    } else {
      setTargetedCompetencyIds([...targetedCompetencyIds, compId]);
    }
  };

  const handleAddCurriculumObjective = (desc: string) => {
    if (!objectives.includes(desc)) {
      setObjectives([...objectives, desc]);
    }
  };

  const toggleMaterial = (mat: string) => {
    if (selectedMaterials.includes(mat)) {
      setSelectedMaterials(selectedMaterials.filter((m) => m !== mat));
    } else {
      setSelectedMaterials([...selectedMaterials, mat]);
    }
  };

  const handleAddCustomMaterial = () => {
    if (!customMaterial.trim()) return;
    if (!selectedMaterials.includes(customMaterial.trim())) {
      setSelectedMaterials([...selectedMaterials, customMaterial.trim()]);
    }
    setCustomMaterial('');
  };

  const handleRubricChange = (selectedRubricId: string) => {
    setRubricId(selectedRubricId);
    const rub = rubrics.find((r) => r.id === selectedRubricId);
    if (rub && !title) {
      setTitle(rub.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClass) {
      setError('Please select a class division for this lesson.');
      return;
    }

    if (!curriculumVersion) {
      setError('Curriculum version definition not loaded.');
      return;
    }

    if (!rubricId) {
      setError('Please select a pedagogical session rubric.');
      return;
    }

    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }

    if (startTime >= endTime) {
      setError(`Start time (${startTime}) must be earlier than end time (${endTime}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingLesson) {
        await lessonRepository.update(existingLesson.id, {
          classId,
          levelCode: selectedClass.levelCode,
          sequenceId: sequenceId || undefined,
          rubricId,
          sessionNumberInSequence,
          date,
          startTime,
          endTime,
          title: title.trim(),
          targetedCompetencyIds,
          specificObjectives: objectives,
          activitySteps,
          materialsAndAids: selectedMaterials,
          assignedHomeworkTitle: homeworkTitle.trim() || undefined,
          assignedHomeworkInstructions: homeworkInstructions.trim() || undefined,
          assignedHomeworkDueDate: homeworkDueDate || undefined,
          teacherReflectionNotes: teacherReflectionNotes.trim() || undefined,
          isCompleted,
        });
        const updated = await lessonRepository.getById(existingLesson.id);
        if (updated) onSaved(updated);
      } else {
        const newLesson: Lesson = {
          id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          academicYearId,
          classId,
          levelCode: selectedClass.levelCode,
          curriculumVersionId: curriculumVersion.id,
          sequenceId: sequenceId || undefined,
          rubricId,
          sessionNumberInSequence,
          date,
          startTime,
          endTime,
          title: title.trim(),
          specificObjectives: objectives,
          targetedCompetencyIds,
          materialsAndAids: selectedMaterials,
          activitySteps,
          assignedHomeworkTitle: homeworkTitle.trim() || undefined,
          assignedHomeworkInstructions: homeworkInstructions.trim() || undefined,
          assignedHomeworkDueDate: homeworkDueDate || undefined,
          teacherReflectionNotes: teacherReflectionNotes.trim() || undefined,
          isCompleted,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await lessonRepository.create(newLesson);
        onSaved(newLesson);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save pedagogical lesson.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span>{existingLesson ? 'Edit Pedagogical Session' : 'Plan / Log Pedagogical Session'}</span>
        </div>
      }
      description="Authoritative pedagogical session shell — generates the Cahier Journal and Cahier de Textes."
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span>Mark session as completed (تم تدريس الحصة)</span>
          </label>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : existingLesson ? 'Save Changes' : 'Record Session'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('core')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'core'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            1. Core Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('objectives')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'objectives'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            2. Objectives & Competencies
            {objectives.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {objectives.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            3. Activity Plan
            {activitySteps.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activitySteps.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials_homework')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'materials_homework'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            4. Aids & Homework
            {homeworkTitle && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reflection')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'reflection'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            5. Teacher Reflection
          </button>
        </div>

        {/* TAB 1: CORE SESSION INFO */}
        {activeTab === 'core' && (
          <div className="space-y-4">
            {/* Row 1: Class, Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select
                label="Class Division (الفوج)"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.levelCode})`,
                }))}
              />

              <Input
                label="Date (تاريخ الحصة)"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />

              <Input
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            {/* Row 2: Curriculum Sequence & Rubric & Session Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Curriculum Sequence (المقطع التعلمي)"
                value={sequenceId}
                onChange={(e) => setSequenceId(e.target.value)}
                options={[
                  { value: '', label: 'General / No specific sequence' },
                  ...sequences.map((s) => ({
                    value: s.id,
                    label: `Seq ${s.sequenceNumber}: ${s.title}`,
                  })),
                ]}
              />

              <Select
                label="Pedagogical Rubric (الروبريك)"
                value={rubricId}
                onChange={(e) => handleRubricChange(e.target.value)}
                options={rubrics.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.pedagogicalStage})`,
                }))}
              />

              <Input
                label="Session # in Sequence (رقم الحصة)"
                type="number"
                min="1"
                max="30"
                value={sessionNumberInSequence.toString()}
                onChange={(e) => setSessionNumberInSequence(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            {/* Row 3: Lesson Title */}
            <Input
              label="Lesson Title (عنوان الحصة / الدرس)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Oral Interaction: Greeting and Introducing Friends"
              required
            />
          </div>
        )}

        {/* TAB 2: OBJECTIVES & COMPETENCIES */}
        {activeTab === 'objectives' && (
          <div className="space-y-4">
            {/* Competency Badges Selection */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Targeted Competencies (الكفاءات المستهدفة):
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Select the curriculum competency domains activated in this session.
              </p>

              {availableCompetencies.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No competencies configured for this level.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availableCompetencies.map((comp) => {
                    const isSelected = targetedCompetencyIds.includes(comp.id);
                    return (
                      <button
                        type="button"
                        key={comp.id}
                        onClick={() => handleToggleCompetency(comp.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-200'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Award
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isSelected ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-[11px]">{comp.code}</div>
                          <div className="text-[10px] line-clamp-2">{comp.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sequence Predefined Objectives (from Curriculum DB) */}
            {sequenceObjectives.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Curriculum Sequence Objectives (Click to add):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sequenceObjectives.map((obj) => (
                    <button
                      type="button"
                      key={obj.id}
                      onClick={() => handleAddCurriculumObjective(obj.description)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left cursor-pointer"
                    >
                      + {obj.description}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Learning Objectives list & entry */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Specific Learning Objectives (الأهداف التعلمية الإجرائية):
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="e.g. By the end of the lesson, learners will be able to introduce themselves orally"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddObjective();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddObjective}
                  className="shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>

              {objectives.length > 0 ? (
                <ul className="space-y-1 mt-2">
                  {objectives.map((obj, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200">• {obj}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No objectives added yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITY PLAN */}
        {activeTab === 'activities' && (
          <ActivityStepsEditor
            steps={activitySteps}
            onChange={setActivitySteps}
            lessonDurationMinutes={lessonDurationMinutes}
          />
        )}

        {/* TAB 4: MATERIALS & HOMEWORK */}
        {activeTab === 'materials_homework' && (
          <div className="space-y-4">
            {/* Materials & Aids */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Materials & Aids (الوسائل التعليمية):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MATERIALS.map((mat) => {
                  const isSelected = selectedMaterials.includes(mat);
                  return (
                    <button
                      type="button"
                      key={mat}
                      onClick={() => toggleMaterial(mat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {mat}
                    </button>
                  );
                })}
              </div>

              {/* Linked Local Teaching Resources */}
              {availableResources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
                    Select from Stored Local Resources:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableResources.map((res) => {
                      const resLabel = `Resource: ${res.title}`;
                      const isSelected = selectedMaterials.includes(resLabel);
                      return (
                        <button
                          type="button"
                          key={res.id}
                          onClick={() => toggleMaterial(resLabel)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <FolderOpen className="w-3 h-3 text-blue-500" />
                          {res.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={customMaterial}
                  onChange={(e) => setCustomMaterial(e.target.value)}
                  placeholder="Add custom aid (e.g. Map of Algeria, puppet, realia)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomMaterial();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomMaterial}
                  className="shrink-0"
                >
                  Add Aid
                </Button>
              </div>
            </div>

            {/* Assigned Homework Task */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <PenTool className="w-4 h-4 text-emerald-600" />
                <span>Assigned Homework Task (الواجب المنزلي):</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Homework saved here is automatically registered in the class Cahier de Textes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Homework Task / Title"
                  placeholder="e.g. Activity 4 p. 26 in Coursebook"
                  value={homeworkTitle}
                  onChange={(e) => setHomeworkTitle(e.target.value)}
                />

                <Input
                  label="Submission Due Date"
                  type="date"
                  value={homeworkDueDate}
                  onChange={(e) => setHomeworkDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Specific Instructions / Work Steps:
                </label>
                <textarea
                  rows={2}
                  value={homeworkInstructions}
                  onChange={(e) => setHomeworkInstructions(e.target.value)}
                  placeholder="e.g. Write 4 full sentences describing what your family members do on weekends."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TEACHER REFLECTION */}
        {activeTab === 'reflection' && (
          <div className="space-y-3">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Teacher Reflection & Pedagogical Notes (ملاحظات تربوية واستدراك):
            </label>
            <p className="text-[11px] text-slate-500">
              Record post-lesson evaluation: timing adjustments, phonological or syntactic obstacles encountered by pupils, and remediation pointers for subsequent sessions.
            </p>
            <textarea
              rows={5}
              value={teacherReflectionNotes}
              onChange={(e) => setTeacherReflectionNotes(e.target.value)}
              placeholder="e.g. Learners grasped greeting exponents quickly. Weakness observed in /θ/ vs /s/ pronunciation. Allocate 5 min drill in next session..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
