/**
 * UNS SCHOOL — Lesson Activity Steps Editor
 * Rich interactive editor for pedagogical lesson phases and interaction patterns
 * aligned with Algerian Middle School English Inspectorate standards.
 */

import React from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  Users,
  Layers,
} from 'lucide-react';
import { Button, Input, Select } from '../ui';
import type { LessonActivityPlan, InteractionPattern } from '../../types';

interface ActivityStepsEditorProps {
  steps: LessonActivityPlan[];
  onChange: (steps: LessonActivityPlan[]) => void;
  lessonDurationMinutes: number;
}

const STANDARD_PHASE_SUGGESTIONS = [
  'Warm-up / Review',
  'Presentation / Input',
  'Controlled Practice',
  'Free Production / Project',
  'Wrap-up / Reflection',
];

const INTERACTION_OPTIONS: { value: InteractionPattern; label: string }[] = [
  { value: 'Teacher-Pupil', label: 'Teacher-Pupil (T-P)' },
  { value: 'Pupil-Pupil', label: 'Pupil-Pupil / Pairwork (P-P)' },
  { value: 'Individual', label: 'Individual Work (Indiv)' },
  { value: 'Group', label: 'Groupwork (Groups)' },
  { value: 'Plenary', label: 'Plenary / Whole Class (Plenary)' },
];

export const ActivityStepsEditor: React.FC<ActivityStepsEditorProps> = ({
  steps,
  onChange,
  lessonDurationMinutes,
}) => {
  const totalAllocatedMinutes = steps.reduce((sum, s) => sum + (Number(s.allocatedMinutes) || 0), 0);

  const handleAddStep = () => {
    const nextStepNumber = steps.length + 1;
    const defaultPhase = STANDARD_PHASE_SUGGESTIONS[Math.min(steps.length, STANDARD_PHASE_SUGGESTIONS.length - 1)] || `Step ${nextStepNumber}`;
    const newStep: LessonActivityPlan = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stepNumber: nextStepNumber,
      phaseName: defaultPhase,
      allocatedMinutes: 10,
      teacherRoleAndInstructions: '',
      studentRoleAndTasks: '',
      interactionPattern: 'Teacher-Pupil',
      materialsAndAids: '',
    };
    onChange([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, updates: Partial<LessonActivityPlan>) => {
    const updated = steps.map((step, i) => (i === index ? { ...step, ...updates } : step));
    onChange(updated);
  };

  const handleRemoveStep = (index: number) => {
    const remaining = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange(remaining);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    onChange(newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    onChange(newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleLoadAlgerianTemplate = () => {
    const template: LessonActivityPlan[] = [
      {
        id: `act-${Date.now()}-1`,
        stepNumber: 1,
        phaseName: 'Warm-up / Review',
        allocatedMinutes: 5,
        teacherRoleAndInstructions: 'Greets learners, reviews prior lexical items through a quick quiz or visual prompt.',
        studentRoleAndTasks: 'Respond to greetings, recall vocabulary and activate background knowledge.',
        interactionPattern: 'Teacher-Pupil',
        materialsAndAids: 'Flashcards / Whiteboard',
      },
      {
        id: `act-${Date.now()}-2`,
        stepNumber: 2,
        phaseName: 'Presentation / Input',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Sets the communicative context, presents target exponents/structures in meaningful text.',
        studentRoleAndTasks: 'Listen, observe visual cues, deduce meaning from context, repeat key phrases.',
        interactionPattern: 'Teacher-Pupil',
        materialsAndAids: 'Coursebook / Audio Track',
      },
      {
        id: `act-${Date.now()}-3`,
        stepNumber: 3,
        phaseName: 'Controlled Practice',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Monitors practice exercises, provides immediate corrective feedback and guidance.',
        studentRoleAndTasks: 'Complete guided tasks, match pairs, fill gaps, practice oral dialogue in pairs.',
        interactionPattern: 'Pupil-Pupil',
        materialsAndAids: 'Worksheet / Coursebook Activity',
      },
      {
        id: `act-${Date.now()}-4`,
        stepNumber: 4,
        phaseName: 'Free Production / Project',
        allocatedMinutes: 15,
        teacherRoleAndInstructions: 'Facilitates communicative exchange, observes fluency, notes errors for delayed feedback.',
        studentRoleAndTasks: 'Create their own dialogues or short paragraphs applying target exponents autonomously.',
        interactionPattern: 'Group',
        materialsAndAids: 'Notebooks / Realia',
      },
      {
        id: `act-${Date.now()}-5`,
        stepNumber: 5,
        phaseName: 'Consolidation / Wrap-up',
        allocatedMinutes: 10,
        teacherRoleAndInstructions: 'Summarizes key learning points, conducts quick formative check, assigns homework.',
        studentRoleAndTasks: 'Self-evaluate learning progress, note homework instructions in Cahier de Textes.',
        interactionPattern: 'Plenary',
        materialsAndAids: 'Whiteboard',
      },
    ];
    onChange(template);
  };

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            Didactic Activity Plan (خطة سير الحصة التعلمية)
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration Balance Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              totalAllocatedMinutes === lessonDurationMinutes
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : totalAllocatedMinutes > lessonDurationMinutes
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              Planned: {totalAllocatedMinutes} / {lessonDurationMinutes} min
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadAlgerianTemplate}
            className="text-[11px] h-7"
            title="Load standard 5-phase Algerian middle school pedagogical structure"
          >
            <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
            Standard Plan
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddStep}
            className="text-[11px] h-7"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Steps List */}
      {steps.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            No activity steps defined yet for this pedagogical session.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadAlgerianTemplate}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Load Algerian 5-Phase Structure
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleAddStep}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create First Step
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 text-xs"
            >
              {/* Step Header Row */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                    {step.stepNumber}
                  </span>

                  <input
                    type="text"
                    value={step.phaseName}
                    onChange={(e) => handleUpdateStep(idx, { phaseName: e.target.value })}
                    placeholder="Phase name (e.g. Warm-up, Presentation, Practice)"
                    className="font-medium text-xs text-slate-900 dark:text-slate-100 bg-transparent border-0 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:ring-0 px-1 py-0.5 w-48"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={step.allocatedMinutes}
                      onChange={(e) => handleUpdateStep(idx, { allocatedMinutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-12 text-center text-xs py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">min</span>
                  </div>

                  <select
                    value={step.interactionPattern}
                    onChange={(e) => handleUpdateStep(idx, { interactionPattern: e.target.value as InteractionPattern })}
                    className="text-[11px] py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {INTERACTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Move Step Up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === steps.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Move Step Down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    title="Delete Step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Roles: Teacher & Student */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                    Teacher's Role & Instructions (دور الأستاذ):
                  </label>
                  <textarea
                    rows={2}
                    value={step.teacherRoleAndInstructions}
                    onChange={(e) => handleUpdateStep(idx, { teacherRoleAndInstructions: e.target.value })}
                    placeholder="e.g. Models the pronunciation, sets pairwork task, checks understanding..."
                    className="w-full text-[11px] p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                    Learners' Tasks & Expected Output (نشاط التلميذ):
                  </label>
                  <textarea
                    rows={2}
                    value={step.studentRoleAndTasks}
                    onChange={(e) => handleUpdateStep(idx, { studentRoleAndTasks: e.target.value })}
                    placeholder="e.g. Listen and repeat, act out dialogue in pairs, write answers..."
                    className="w-full text-[11px] p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Aids/Materials for this specific step */}
              <div>
                <input
                  type="text"
                  value={step.materialsAndAids || ''}
                  onChange={(e) => handleUpdateStep(idx, { materialsAndAids: e.target.value })}
                  placeholder="Aids used in this step (e.g. Flashcards, Audio track 2, Coursebook p.15)"
                  className="w-full text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
