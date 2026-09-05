/**
 * UNS SCHOOL — School Profile Modal
 * Configure or edit the official middle school identity (singleton per device).
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert } from '../ui';
import { schoolRepository } from '../../db/repositories';
import type { School } from '../../types';

interface SchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (school: School) => void;
  existingSchool?: School | null;
}

export const SchoolModal: React.FC<SchoolModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  existingSchool,
}) => {
  const [name, setName] = useState('');
  const [nameArabic, setNameArabic] = useState('');
  const [commune, setCommune] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [inspectorDistrict, setInspectorDistrict] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingSchool) {
      setName(existingSchool.name);
      setNameArabic(existingSchool.nameArabic || '');
      setCommune(existingSchool.commune);
      setWilaya(existingSchool.wilaya);
      setSchoolCode(existingSchool.schoolCode || '');
      setInspectorDistrict(existingSchool.inspectorDistrict || '');
    } else {
      setName('');
      setNameArabic('');
      setCommune('');
      setWilaya('');
      setSchoolCode('');
      setInspectorDistrict('');
    }
    setError(null);
  }, [existingSchool, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('School name is required (e.g. CEM Frères Bouchami).');
      return;
    }
    if (!commune.trim()) {
      setError('Commune is required.');
      return;
    }
    if (!wilaya.trim()) {
      setError('Wilaya is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const schoolData: School = {
        id: existingSchool?.id || crypto.randomUUID(),
        name: name.trim(),
        nameArabic: nameArabic.trim() || undefined,
        commune: commune.trim(),
        wilaya: wilaya.trim(),
        schoolCode: schoolCode.trim() || undefined,
        inspectorDistrict: inspectorDistrict.trim() || undefined,
        createdAt: existingSchool?.createdAt || now,
        updatedAt: now,
      };

      await schoolRepository.save(schoolData);
      if (onSaved) {
        onSaved(schoolData);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save school profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSchool ? 'Edit Middle School Profile' : 'Configure Middle School Profile'}
      description="Official administrative profile for your middle school (CEM) in Algeria."
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            Save School
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="School Name (Latin / Français)"
            placeholder="e.g. CEM Frères Bouchami"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="School Name (العربية)"
            placeholder="e.g. متوسطة الإخوة بوشامي"
            value={nameArabic}
            onChange={(e) => setNameArabic(e.target.value)}
            dir="rtl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Commune (البلدية)"
            placeholder="e.g. Bir Mourad Raïs"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            required
          />

          <Input
            label="Wilaya (الولاية)"
            placeholder="e.g. 16 - Alger"
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="School Code / Matricule (Optional)"
            placeholder="e.g. 16CEM042"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
          />

          <Input
            label="Inspector District / Circonscription (Optional)"
            placeholder="e.g. Circonscription 04 - Alger Centre"
            value={inspectorDistrict}
            onChange={(e) => setInspectorDistrict(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
