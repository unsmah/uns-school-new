/**
 * UNS SCHOOL — Lesson / Pedagogical Session Modal
 * Create or edit an authoritative pedagogical session shell.
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Modal, Button, Input, Select, Alert } from '../ui';
import { lessonRepository, curriculumRepository } from '../../db/repositories';
import type {
  Lesson,
  SchoolClass,
  CurriculumSequence,
  SessionRubricDefinition,
  CurriculumVersion,
} from '../../types';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: string;
  classes: SchoolClass[];
  existingLesson?: Lesson | null;
  defaultClassId?: string;
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
  defaultDate,
  onSaved,
}) => {
  const [classId, setClassId] = useState<string>('');
  const [curriculumVersion, setCurriculumVersion] = useState<CurriculumVersion | null>(null);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);

  // Form Fields
  const [sequenceId, setSequenceId] = useState<string>('');
  const [rubricId, setRubricId] = useState<string>('');
  const [sessionNumberInSequence, setSessionNumberInSequence] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:00');
  const [title, setTitle] = useState<string>('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState<string>('');
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

  // Load Curriculum and initial data
  useEffect(() => {
    async function loadCurriculumData() {
      setIsLoadingCurriculum(true);
      try {
        const activeCurr = await curriculumRepository.getActiveVersion();
        if (activeCurr) {
          setCurriculumVersion(activeCurr);
          const allRubrics = await curriculumRepository.listRubrics(activeCurr.id);
          setRubrics(allRubrics);
        }
      } catch (err) {
        console.error('Failed to load curriculum data:', err);
      } finally {
        setIsLoadingCurriculum(false);
      }
    }
    loadCurriculumData();
  }, []);

  // Update sequences whenever class changes
  useEffect(() => {
    async function loadSequencesForClass() {
      if (!curriculumVersion || !classId) return;
      const cls = classes.find((c) => c.id === classId);
      if (!cls) return;

      try {
        const seqs = await curriculumRepository.listSequences(curriculumVersion.id, cls.levelCode);
        setSequences(seqs);
        if (seqs.length > 0 && !sequenceId) {
          setSequenceId(seqs[0].id);
        }
      } catch (err) {
        console.error('Failed to load sequences:', err);
      }
    }
    loadSequencesForClass();
  }, [curriculumVersion, classId, classes, sequenceId]);

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
      setObjectives(existingLesson.specificObjectives || []);
      setSelectedMaterials(existingLesson.materialsAndAids || []);
      setHomeworkTitle(existingLesson.assignedHomeworkTitle || '');
      setHomeworkInstructions(existingLesson.assignedHomeworkInstructions || '');
      setHomeworkDueDate(existingLesson.assignedHomeworkDueDate || '');
      setTeacherReflectionNotes(existingLesson.teacherReflectionNotes || '');
      setIsCompleted(existingLesson.isCompleted);
    } else {
      const initialClassId = defaultClassId || classes[0]?.id || '';
      setClassId(initialClassId);
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('08:00');
      setEndTime('09:00');
      setSessionNumberInSequence(1);
      setTitle('');
      setObjectives([]);
      setSelectedMaterials(['Coursebook (كتاب مدرسي)', 'Whiteboard & Markers']);
      setHomeworkTitle('');
      setHomeworkInstructions('');
      setHomeworkDueDate('');
      setTeacherReflectionNotes('');
      setIsCompleted(false);
    }
    setError(null);
  }, [existingLesson, defaultClassId, defaultDate, classes, isOpen]);

  // Set default rubric if empty
  useEffect(() => {
    if (rubrics.length > 0 && !rubricId) {
      setRubricId(rubrics[0].id);
    }
  }, [rubrics, rubricId]);

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives([...objectives, newObjective.trim()]);
    setNewObjective('');
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
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

    const selectedClass = classes.find((c) => c.id === classId);
    if (!selectedClass) {
      setError('Please select a class for this lesson.');
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
          specificObjectives: objectives,
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
          targetedCompetencyIds: [],
          materialsAndAids: selectedMaterials,
          activitySteps: [],
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
      description="Record an authoritative classroom session shell (acts as anchor for roll call and Cahier Journal)."
      maxWidth="3xl"
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

        {/* Row 4: Specific Learning Objectives */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Specific Learning Objectives (الأهداف التعلمية الإجرائية):
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="e.g. By the end of lesson, learners will be able to ask for personal details"
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

          {objectives.length > 0 && (
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
          )}
        </div>

        {/* Row 5: Materials & Aids */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
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

          <div className="flex items-center gap-2 mt-2">
            <Input
              value={customMaterial}
              onChange={(e) => setCustomMaterial(e.target.value)}
              placeholder="Add other material (e.g. Map of Algeria, puppet)"
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

        {/* Row 6: Homework & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Assigned Homework (واجب منزلي):
            </label>
            <Input
              placeholder="Homework title / task (e.g. Activity 3 p. 24)"
              value={homeworkTitle}
              onChange={(e) => setHomeworkTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Homework Due Date:
            </label>
            <Input
              type="date"
              value={homeworkDueDate}
              onChange={(e) => setHomeworkDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Teacher Reflection & Remediation Notes (ملاحظات تربوية واستدراك):
          </label>
          <textarea
            rows={2}
            value={teacherReflectionNotes}
            onChange={(e) => setTeacherReflectionNotes(e.target.value)}
            placeholder="Post-lesson reflections, phonological difficulties noted, pace adjustments..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </form>
    </Modal>
  );
};
