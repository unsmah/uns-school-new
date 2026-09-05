/**
 * UNS SCHOOL — Enroll Student Modal
 * Enrolls an existing StudentPerson into a Class for the active Academic Year.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Alert } from '../ui';
import { studentEnrollmentRepository, classRepository } from '../../db/repositories';
import type { StudentPerson, SchoolClass, StudentEnrollment } from '../../types';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrolled?: (enrollment: StudentEnrollment) => void;
  person: StudentPerson;
  academicYearId: string;
  defaultClassId?: string;
}

export const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({
  isOpen,
  onClose,
  onEnrolled,
  person,
  academicYearId,
  defaultClassId,
}) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [registerNumber, setRegisterNumber] = useState<number>(1);
  const [isRepeating, setIsRepeating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    async function loadAvailableClasses() {
      if (!academicYearId) return;
      setIsLoading(true);
      try {
        const yearClasses = await classRepository.listByAcademicYear(academicYearId);
        setClasses(yearClasses);
        if (defaultClassId && yearClasses.some((c) => c.id === defaultClassId)) {
          setSelectedClassId(defaultClassId);
        } else if (yearClasses.length > 0) {
          setSelectedClassId(yearClasses[0].id);
        }
      } catch (err) {
        console.error('Failed to load classes for enrollment:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (isOpen) {
      loadAvailableClasses();
      setError(null);
      setIsRepeating(false);
    }
  }, [academicYearId, defaultClassId, isOpen]);

  useEffect(() => {
    async function suggestRegisterNumber() {
      if (!selectedClassId) return;
      try {
        const enrolled = await studentEnrollmentRepository.listByClass(selectedClassId);
        const existingNumbers = enrolled.map((e) => e.enrollment.registerNumber);
        let nextNum = 1;
        while (existingNumbers.includes(nextNum)) {
          nextNum++;
        }
        setRegisterNumber(nextNum);
      } catch (err) {
        console.error('Failed to calculate next register number:', err);
      }
    }
    if (selectedClassId) {
      suggestRegisterNumber();
    }
  }, [selectedClassId]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError('Please select a target class.');
      return;
    }
    if (registerNumber <= 0 || !Number.isInteger(registerNumber)) {
      setError('Register number must be a positive integer.');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const enrollment: StudentEnrollment = {
        id: crypto.randomUUID(),
        studentPersonId: person.id,
        academicYearId,
        classId: selectedClassId,
        registerNumber,
        isRepeating,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await studentEnrollmentRepository.enroll(enrollment);
      if (onEnrolled) {
        onEnrolled(enrollment);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll Student in Class"
      description={`Enroll ${person.firstNameLatin} ${person.lastNameLatin} into the active academic year.`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isEnrolling}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleEnroll}
            isLoading={isEnrolling}
            disabled={classes.length === 0}
          >
            Confirm Enrollment
          </Button>
        </>
      }
    >
      <form onSubmit={handleEnroll} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Enrollment Error">
            {error}
          </Alert>
        )}

        {classes.length === 0 ? (
          <Alert variant="warning" title="No Classes Available">
            There are no classes created in the selected academic year. Please create a class first.
          </Alert>
        ) : (
          <>
            <Select
              label="Target Class (الفوج التربوي)"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              options={classes.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.levelCode}) ${c.roomNumber ? `— ${c.roomNumber}` : ''}`,
              }))}
            />

            <Input
              label="Register Number / Numéro d'ordre (رقم القيد)"
              type="number"
              min={1}
              value={registerNumber}
              onChange={(e) => setRegisterNumber(parseInt(e.target.value, 10) || 1)}
              helperText="Unique sequential number of the student within this class roster."
              required
            />

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Repeating Student (Redoublant / معيد)
                </span>
              </label>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 ms-6">
                Marks that this student is repeating this academic level.
              </p>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
