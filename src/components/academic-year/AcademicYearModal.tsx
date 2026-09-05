/**
 * UNS SCHOOL — Academic Year Modal
 * Create or edit an Academic Year with term definitions and current status.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert } from '../ui';
import { academicYearRepository } from '../../db/repositories';
import type { AcademicYear, TermPeriod } from '../../types';

interface AcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (year: AcademicYear) => void;
  schoolId: string;
  existingYear?: AcademicYear | null;
}

export const AcademicYearModal: React.FC<AcademicYearModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  schoolId,
  existingYear,
}) => {
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [term1Start, setTerm1Start] = useState('');
  const [term1End, setTerm1End] = useState('');
  const [term2Start, setTerm2Start] = useState('');
  const [term2End, setTerm2End] = useState('');
  const [term3Start, setTerm3Start] = useState('');
  const [term3End, setTerm3End] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingYear) {
      setLabel(existingYear.label);
      setStartDate(existingYear.startDate);
      setEndDate(existingYear.endDate);
      setIsCurrent(existingYear.isCurrent);
      const t1 = existingYear.terms.find((t) => t.termNumber === 1);
      const t2 = existingYear.terms.find((t) => t.termNumber === 2);
      const t3 = existingYear.terms.find((t) => t.termNumber === 3);
      setTerm1Start(t1?.startDate || '');
      setTerm1End(t1?.endDate || '');
      setTerm2Start(t2?.startDate || '');
      setTerm2End(t2?.endDate || '');
      setTerm3Start(t3?.startDate || '');
      setTerm3End(t3?.endDate || '');
    } else {
      // Default to standard Algerian school year: e.g. 2026-2027
      const currentYearNum = new Date().getFullYear();
      setLabel(`${currentYearNum}-${currentYearNum + 1}`);
      setStartDate(`${currentYearNum}-09-01`);
      setEndDate(`${currentYearNum + 1}-06-30`);
      setIsCurrent(true);
      setTerm1Start(`${currentYearNum}-09-01`);
      setTerm1End(`${currentYearNum}-12-15`);
      setTerm2Start(`${currentYearNum + 1}-01-05`);
      setTerm2End(`${currentYearNum + 1}-03-15`);
      setTerm3Start(`${currentYearNum + 1}-04-01`);
      setTerm3End(`${currentYearNum + 1}-06-30`);
    }
    setError(null);
  }, [existingYear, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Academic year label is required (e.g. 2026-2027).');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (startDate >= endDate) {
      setError('Start date must be before end date.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const terms: TermPeriod[] = [
        {
          id: existingYear?.terms?.[0]?.id || crypto.randomUUID(),
          termNumber: 1,
          name: '1st Trimester / الفصل الأول',
          startDate: term1Start || startDate,
          endDate: term1End || `${startDate.slice(0, 4)}-12-15`,
        },
        {
          id: existingYear?.terms?.[1]?.id || crypto.randomUUID(),
          termNumber: 2,
          name: '2nd Trimester / الفصل الثاني',
          startDate: term2Start || `${endDate.slice(0, 4)}-01-05`,
          endDate: term2End || `${endDate.slice(0, 4)}-03-15`,
        },
        {
          id: existingYear?.terms?.[2]?.id || crypto.randomUUID(),
          termNumber: 3,
          name: '3rd Trimester / الفصل الثالث',
          startDate: term3Start || `${endDate.slice(0, 4)}-04-01`,
          endDate: term3End || endDate,
        },
      ];

      const yearData: AcademicYear = {
        id: existingYear?.id || crypto.randomUUID(),
        schoolId,
        label: label.trim(),
        startDate,
        endDate,
        isCurrent,
        isArchived: existingYear?.isArchived || false,
        terms,
        createdAt: existingYear?.createdAt || now,
        updatedAt: now,
      };

      if (existingYear) {
        await academicYearRepository.update(existingYear.id, yearData);
      } else {
        await academicYearRepository.create(yearData);
      }

      if (onSaved) {
        onSaved(yearData);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save academic year.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingYear ? 'Edit Academic Year' : 'Create Academic Year'}
      description="Define the academic calendar period and ministerial trimesters."
      maxWidth="xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            {existingYear ? 'Update Academic Year' : 'Create Academic Year'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Year Label"
            placeholder="e.g. 2026-2027"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Set as active / current academic year
            </span>
          </label>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 ms-6">
            Setting this as the current year will automatically demote any previously active year for this school.
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
            Trimester Schedule (الفصول الثلاثة)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">1st Trimester</span>
              <Input
                label="Start"
                type="date"
                value={term1Start}
                onChange={(e) => setTerm1Start(e.target.value)}
              />
              <Input
                label="End"
                type="date"
                value={term1End}
                onChange={(e) => setTerm1End(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">2nd Trimester</span>
              <Input
                label="Start"
                type="date"
                value={term2Start}
                onChange={(e) => setTerm2Start(e.target.value)}
              />
              <Input
                label="End"
                type="date"
                value={term2End}
                onChange={(e) => setTerm2End(e.target.value)}
              />
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">3rd Trimester</span>
              <Input
                label="Start"
                type="date"
                value={term3Start}
                onChange={(e) => setTerm3Start(e.target.value)}
              />
              <Input
                label="End"
                type="date"
                value={term3End}
                onChange={(e) => setTerm3End(e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
