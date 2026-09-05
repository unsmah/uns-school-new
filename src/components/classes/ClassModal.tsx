/**
 * UNS SCHOOL — Class Creation / Edit Modal
 * Supports Algerian middle-school level tracks (1MS / 1AM to 4MS / 4AM).
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Alert } from '../ui';
import { classRepository } from '../../db/repositories';
import type { SchoolClass } from '../../types';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (schoolClass: SchoolClass) => void;
  schoolId: string;
  academicYearId: string;
  existingClass?: SchoolClass | null;
}

const LEVEL_OPTIONS = [
  { value: '1MS', label: '1MS (1AM) — 1st Year Middle School' },
  { value: '2MS', label: '2MS (2AM) — 2nd Year Middle School' },
  { value: '3MS', label: '3MS (3AM) — 3rd Year Middle School' },
  { value: '4MS', label: '4MS (4AM) — 4th Year Middle School (BEM Candidate)' },
];

const COLOR_TAGS = [
  { label: 'Emerald', value: 'emerald' },
  { label: 'Blue', value: 'blue' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Amber', value: 'amber' },
  { label: 'Purple', value: 'purple' },
  { label: 'Rose', value: 'rose' },
];

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  schoolId,
  academicYearId,
  existingClass,
}) => {
  const [levelCode, setLevelCode] = useState('1MS');
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [colorTag, setColorTag] = useState('emerald');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingClass) {
      setLevelCode(existingClass.levelCode);
      setName(existingClass.name);
      setRoomNumber(existingClass.roomNumber || '');
      setColorTag(existingClass.colorTag || 'emerald');
    } else {
      setLevelCode('1MS');
      setName('1MS 1');
      setRoomNumber('');
      setColorTag('emerald');
    }
    setError(null);
  }, [existingClass, isOpen]);

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setLevelCode(newLevel);
    // If name matches default pattern like '1MS 1', suggest corresponding name for new level
    if (!existingClass) {
      setName(`${newLevel} 1`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Class name is required (e.g. 1MS 1).');
      return;
    }
    if (!academicYearId) {
      setError('No active academic year selected.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const classData: SchoolClass = {
        id: existingClass?.id || crypto.randomUUID(),
        academicYearId,
        schoolId,
        levelCode,
        name: name.trim(),
        roomNumber: roomNumber.trim() || undefined,
        colorTag,
        isArchived: existingClass?.isArchived || false,
        createdAt: existingClass?.createdAt || now,
        updatedAt: now,
      };

      if (existingClass) {
        await classRepository.update(existingClass.id, classData);
      } else {
        await classRepository.create(classData);
      }

      if (onSaved) {
        onSaved(classData);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingClass ? 'Edit Class' : 'Create Middle School Class'}
      description="Define class division and attach it to the active academic year."
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            {existingClass ? 'Update Class' : 'Create Class'}
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

        <Select
          label="Middle School Level (المستوى الدراسي)"
          value={levelCode}
          onChange={handleLevelChange}
          options={LEVEL_OPTIONS}
        />

        <Input
          label="Class Name / Division (اسم الفوج التربوي)"
          placeholder="e.g. 1MS 1, 2MS 3, 4MS 2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Room Number / Salle (Optional)"
          placeholder="e.g. Room 12 / Salle 12"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Color Tag (Identification Badge)
          </label>
          <div className="flex items-center gap-2">
            {COLOR_TAGS.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => setColorTag(tag.value)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                  colorTag === tag.value ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110' : 'opacity-80'
                } bg-${tag.value}-500`}
                style={{
                  backgroundColor:
                    tag.value === 'emerald'
                      ? '#10b981'
                      : tag.value === 'blue'
                        ? '#3b82f6'
                        : tag.value === 'indigo'
                          ? '#6366f1'
                          : tag.value === 'amber'
                            ? '#f59e0b'
                            : tag.value === 'purple'
                              ? '#a855f7'
                              : '#f43f5e',
                }}
                title={tag.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
