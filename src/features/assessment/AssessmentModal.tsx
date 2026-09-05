/**
 * UNS SCHOOL — Assessment Create & Edit Modal
 * Form for defining pedagogical evaluations with scheme binding and component snapshotting.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { assessmentRepository } from '../../db/repositories/assessmentRepository';
import { classRepository } from '../../db/repositories/classRepository';
import { curriculumRepository } from '../../db/repositories/curriculumRepository';
import { db } from '../../db/database';
import type { Assessment, SchoolClass, GradingScheme, CurriculumSequence } from '../../types';
import { Calendar, Award, BookOpen, AlertCircle, Lock } from 'lucide-react';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  academicYearId: string;
  defaultClassId?: string;
  defaultTerm?: 1 | 2 | 3;
  assessmentToEdit?: Assessment | null;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  academicYearId,
  defaultClassId,
  defaultTerm = 1,
  assessmentToEdit,
}) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [classId, setClassId] = useState<string>('');
  const [termNumber, setTermNumber] = useState<1 | 2 | 3>(defaultTerm);
  const [gradingSchemeId, setGradingSchemeId] = useState<string>('');
  const [componentKey, setComponentKey] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [maxScore, setMaxScore] = useState<number>(20);
  const [coefficient, setCoefficient] = useState<number>(1);
  const [curriculumSequenceId, setCurriculumSequenceId] = useState<string>('');

  useEffect(() => {
    async function loadFormData() {
      if (!academicYearId) return;
      try {
        const [loadedClasses, loadedSchemes] = await Promise.all([
          classRepository.listByAcademicYear(academicYearId),
          db.gradingSchemes.toArray(),
        ]);

        const activeClasses = loadedClasses.filter((c) => !c.isArchived);
        setClasses(activeClasses);
        setSchemes(loadedSchemes);

        if (assessmentToEdit) {
          setClassId(assessmentToEdit.classId);
          setTermNumber(assessmentToEdit.termNumber);
          setGradingSchemeId(assessmentToEdit.gradingSchemeId);
          setComponentKey(assessmentToEdit.componentKey);
          setTitle(assessmentToEdit.title);
          setDescription(assessmentToEdit.description || '');
          setDate(assessmentToEdit.date);
          setMaxScore(assessmentToEdit.maxScore);
          setCoefficient(assessmentToEdit.coefficient);
          setCurriculumSequenceId(assessmentToEdit.curriculumSequenceId || '');
        } else {
          const selectedClass = activeClasses.find((c) => c.id === defaultClassId) || activeClasses[0];
          if (selectedClass) {
            setClassId(selectedClass.id);
          }
          setTermNumber(defaultTerm);

          const defaultScheme = loadedSchemes.find((s) => s.isOfficial) || loadedSchemes[0];
          if (defaultScheme) {
            setGradingSchemeId(defaultScheme.id);
            if (defaultScheme.components.length > 0) {
              const defaultComp = defaultScheme.components[1] || defaultScheme.components[0];
              setComponentKey(defaultComp.componentKey);
              setMaxScore(defaultComp.maxScore);
              setCoefficient(defaultComp.coefficient);
              setTitle(`${defaultComp.label} - T${defaultTerm}`);
            }
          }
          setDate(new Date().toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('[AssessmentModal] Failed to load data:', err);
      }
    }

    if (isOpen) {
      loadFormData();
      setError(null);
    }
  }, [isOpen, academicYearId, defaultClassId, defaultTerm, assessmentToEdit]);

  // Load sequences for selected class level
  useEffect(() => {
    async function loadSequences() {
      const selectedClass = classes.find((c) => c.id === classId);
      if (!selectedClass) {
        setSequences([]);
        return;
      }
      try {
        const activeCurriculum = await curriculumRepository.getActiveVersion();
        if (activeCurriculum) {
          const loadedSequences = await curriculumRepository.listSequences(
            activeCurriculum.id,
            selectedClass.levelCode
          );
          setSequences(loadedSequences);
        } else {
          setSequences([]);
        }
      } catch (err) {
        console.error('[AssessmentModal] Failed to load sequences:', err);
      }
    }
    if (classId) {
      loadSequences();
    }
  }, [classId, classes]);

  const handleSchemeOrComponentChange = (newSchemeId: string, newCompKey: string) => {
    setGradingSchemeId(newSchemeId);
    setComponentKey(newCompKey);

    const currentScheme = schemes.find((s) => s.id === newSchemeId);
    if (currentScheme) {
      const comp = currentScheme.components.find((c) => c.componentKey === newCompKey);
      if (comp) {
        setMaxScore(comp.maxScore);
        setCoefficient(comp.coefficient);
        if (!assessmentToEdit) {
          setTitle(`${comp.label} - T${termNumber}`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide an assessment title.');
      return;
    }
    if (!classId) {
      setError('Please select a target class.');
      return;
    }
    if (!gradingSchemeId || !componentKey) {
      setError('Please select a valid grading scheme and component.');
      return;
    }
    if (maxScore <= 0) {
      setError('Maximum score must be greater than zero.');
      return;
    }
    if (coefficient <= 0) {
      setError('Coefficient must be greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      const selectedScheme = schemes.find((s) => s.id === gradingSchemeId);
      const componentSnapshot = selectedScheme?.components.find((c) => c.componentKey === componentKey);

      if (assessmentToEdit) {
        await assessmentRepository.update(assessmentToEdit.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          maxScore: Number(maxScore),
          coefficient: Number(coefficient),
          curriculumSequenceId: curriculumSequenceId || undefined,
        });
      } else {
        const newAssessment: Assessment = {
          id: `ass-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          academicYearId,
          classId,
          gradingSchemeId,
          componentKey,
          termNumber,
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          maxScore: Number(maxScore),
          coefficient: Number(coefficient),
          curriculumSequenceId: curriculumSequenceId || undefined,
          isLocked: false,
          componentSnapshot,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await assessmentRepository.create(newAssessment);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedScheme = schemes.find((s) => s.id === gradingSchemeId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assessmentToEdit ? 'Edit Assessment' : 'New Assessment Evaluation'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {assessmentToEdit?.isLocked && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center gap-2.5 text-amber-800 dark:text-amber-200 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>This assessment is locked. Unlock it before modifying configuration.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Class selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={classId}
              disabled={Boolean(assessmentToEdit)}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.levelCode})
                </option>
              ))}
            </select>
          </div>

          {/* Term Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Term
            </label>
            <select
              value={termNumber}
              disabled={Boolean(assessmentToEdit)}
              onChange={(e) => setTermNumber(Number(e.target.value) as 1 | 2 | 3)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value={1}>Term 1 (Premier Trimestre)</option>
              <option value={2}>Term 2 (Deuxième Trimestre)</option>
              <option value={3}>Term 3 (Troisième Trimestre)</option>
            </select>
          </div>
        </div>

        {/* Grading Scheme & Component */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Grading Framework
            </label>
            <select
              value={gradingSchemeId}
              disabled={Boolean(assessmentToEdit)}
              onChange={(e) => {
                const nextScheme = schemes.find((s) => s.id === e.target.value);
                const nextCompKey = nextScheme?.components[0]?.componentKey || '';
                handleSchemeOrComponentChange(e.target.value, nextCompKey);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isOfficial ? '(Official)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Component Type
            </label>
            <select
              value={componentKey}
              disabled={Boolean(assessmentToEdit)}
              onChange={(e) => handleSchemeOrComponentChange(gradingSchemeId, e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {selectedScheme?.components.map((c) => (
                <option key={c.componentKey} value={c.componentKey}>
                  {c.label} (Max {c.maxScore}, Coeff {c.coefficient})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <Input
          id="assessment-title"
          label="Assessment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Devoir Surveillé N°1 du 1er Trimestre"
          required
        />

        {/* Date, Max Score, Coefficient */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Max Score
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.5"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
                required
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
              />
              <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Coefficient
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={coefficient}
              onChange={(e) => setCoefficient(parseFloat(e.target.value) || 1)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Optional Curriculum Sequence Link */}
        {sequences.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Curriculum Sequence Link (Optional)
            </label>
            <div className="relative">
              <select
                value={curriculumSequenceId}
                onChange={(e) => setCurriculumSequenceId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">-- No specific sequence link --</option>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    Seq {s.order}: {s.title}
                  </option>
                ))}
              </select>
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Optional Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Teacher Notes / Instructions (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Assessment topics covered, classroom instructions, oral criteria..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading || assessmentToEdit?.isLocked}>
            {isLoading ? 'Saving...' : assessmentToEdit ? 'Save Changes' : 'Create Assessment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
