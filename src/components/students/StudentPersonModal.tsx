/**
 * UNS SCHOOL — Student Person Identity Modal
 * Manages the permanent human identity of students across their school career.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Alert } from '../ui';
import { studentPersonRepository } from '../../db/repositories';
import type { StudentPerson } from '../../types';

interface StudentPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (person: StudentPerson) => void;
  existingPerson?: StudentPerson | null;
}

export const StudentPersonModal: React.FC<StudentPersonModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  existingPerson,
}) => {
  const [firstNameLatin, setFirstNameLatin] = useState('');
  const [lastNameLatin, setLastNameLatin] = useState('');
  const [firstNameArabic, setFirstNameArabic] = useState('');
  const [lastNameArabic, setLastNameArabic] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<string>('Father');
  const [medicalAlerts, setMedicalAlerts] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingPerson) {
      setFirstNameLatin(existingPerson.firstNameLatin);
      setLastNameLatin(existingPerson.lastNameLatin);
      setFirstNameArabic(existingPerson.firstNameArabic || '');
      setLastNameArabic(existingPerson.lastNameArabic || '');
      setDateOfBirth(existingPerson.dateOfBirth || '');
      setPlaceOfBirth(existingPerson.placeOfBirth || '');
      setGender(existingPerson.gender);
      setNationalIdNumber(existingPerson.nationalIdNumber || '');
      setGuardianName(existingPerson.guardianName || '');
      setGuardianPhone(existingPerson.guardianPhone || '');
      setGuardianRelationship(existingPerson.guardianRelationship || 'Father');
      setMedicalAlerts(existingPerson.medicalAlerts || '');
      setGeneralNotes(existingPerson.generalNotes || '');
    } else {
      setFirstNameLatin('');
      setLastNameLatin('');
      setFirstNameArabic('');
      setLastNameArabic('');
      setDateOfBirth('');
      setPlaceOfBirth('');
      setGender('M');
      setNationalIdNumber('');
      setGuardianName('');
      setGuardianPhone('');
      setGuardianRelationship('Father');
      setMedicalAlerts('');
      setGeneralNotes('');
    }
    setError(null);
  }, [existingPerson, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstNameLatin.trim() || !lastNameLatin.trim()) {
      setError('First name and Last name (Latin) are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const personData: StudentPerson = {
        id: existingPerson?.id || crypto.randomUUID(),
        firstNameLatin: firstNameLatin.trim(),
        lastNameLatin: lastNameLatin.trim(),
        firstNameArabic: firstNameArabic.trim() || undefined,
        lastNameArabic: lastNameArabic.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        gender,
        nationalIdNumber: nationalIdNumber.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        guardianRelationship: (guardianRelationship as 'Father' | 'Mother' | 'Legal Guardian') || undefined,
        medicalAlerts: medicalAlerts.trim() || undefined,
        generalNotes: generalNotes.trim() || undefined,
        createdAt: existingPerson?.createdAt || now,
        updatedAt: now,
      };

      if (existingPerson) {
        await studentPersonRepository.update(existingPerson.id, personData);
      } else {
        await studentPersonRepository.create(personData);
      }

      if (onSaved) {
        onSaved(personData);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPerson ? 'Edit Student Profile' : 'Register New Student Identity'}
      description="Permanent civil status record preserved across all academic years."
      maxWidth="2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            {existingPerson ? 'Update Profile' : 'Register Student'}
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

        {/* Latin & Arabic Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="First Name (Latin / Français)"
            placeholder="e.g. Youcef"
            value={firstNameLatin}
            onChange={(e) => setFirstNameLatin(e.target.value)}
            required
          />
          <Input
            label="Last Name (Latin / Français)"
            placeholder="e.g. Benali"
            value={lastNameLatin}
            onChange={(e) => setLastNameLatin(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="First Name (الاسم بالعربية)"
            placeholder="e.g. يوسف"
            value={firstNameArabic}
            onChange={(e) => setFirstNameArabic(e.target.value)}
            dir="rtl"
          />
          <Input
            label="Last Name (اللقب بالعربية)"
            placeholder="e.g. بن علي"
            value={lastNameArabic}
            onChange={(e) => setLastNameArabic(e.target.value)}
            dir="rtl"
          />
        </div>

        {/* Civil status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Date of Birth (تاريخ الميلاد)"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <Input
            label="Place of Birth (مكان الميلاد)"
            placeholder="e.g. Alger Centre"
            value={placeOfBirth}
            onChange={(e) => setPlaceOfBirth(e.target.value)}
          />

          <Select
            label="Gender (الجنس)"
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F')}
            options={[
              { value: 'M', label: 'Male / Garçon (ذكر)' },
              { value: 'F', label: 'Female / Fille (أنثى)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="National ID Number (NIN / رقم التعريف الوطني)"
            placeholder="e.g. 201216010012345"
            value={nationalIdNumber}
            onChange={(e) => setNationalIdNumber(e.target.value)}
          />

          <Select
            label="Guardian Relationship (صفة الولي)"
            value={guardianRelationship}
            onChange={(e) => setGuardianRelationship(e.target.value)}
            options={[
              { value: 'Father', label: 'Father (الأب)' },
              { value: 'Mother', label: 'Mother (الأم)' },
              { value: 'Legal Guardian', label: 'Legal Guardian (الولي الشرعي)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Guardian Name (اسم الولي)"
            placeholder="e.g. Mohamed Benali"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />

          <Input
            label="Guardian Phone (هاتف الولي)"
            placeholder="e.g. 0550 12 34 56"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Medical Alerts / Allergies (تنبيهات صحية)
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              rows={2}
              placeholder="e.g. Asthma inhaler required, severe nut allergy"
              value={medicalAlerts}
              onChange={(e) => setMedicalAlerts(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              General Pedagogical Notes (ملاحظات عامة)
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              rows={2}
              placeholder="e.g. Front row seating recommended for vision"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
