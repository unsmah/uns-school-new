/**
 * UNS SCHOOL — Student Person Identity Modal
 * Manages the permanent human identity of students across their school career.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Alert } from '../ui';
import { useI18n } from '../../i18n/I18nContext';
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
  const { language } = useI18n();
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
      title={
        existingPerson
          ? language === 'ar'
            ? 'تعديل الملف الشخصي للتلميذ'
            : language === 'fr'
            ? "Modifier le profil de l'élève"
            : 'Edit Student Profile'
          : language === 'ar'
          ? 'تسجيل هوية تلميذ جديد'
          : language === 'fr'
          ? 'Inscrire un nouvel élève'
          : 'Register New Student Identity'
      }
      description={
        language === 'ar'
          ? 'سجل الحالة المدنية الدائم والمحفوظ عبر جميع السنوات الدراسية.'
          : language === 'fr'
          ? 'Dossier permanent d’état civil conservé sur l’ensemble du parcours scolaire.'
          : 'Permanent civil status record preserved across all academic years.'
      }
      maxWidth="2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            {existingPerson
              ? language === 'ar'
                ? 'تحديث الملف'
                : language === 'fr'
                ? 'Mettre à jour'
                : 'Update Profile'
              : language === 'ar'
              ? 'تسجيل التلميذ'
              : language === 'fr'
              ? 'Enregistrer'
              : 'Register Student'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title={language === 'ar' ? 'خطأ في الإدخال' : 'Validation Error'}>
            {error}
          </Alert>
        )}

        {/* Latin & Arabic Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={language === 'ar' ? 'الاسم باللاتينية' : language === 'fr' ? 'Prénom (latin)' : 'First Name (Latin)'}
            placeholder="e.g. Youcef"
            value={firstNameLatin}
            onChange={(e) => setFirstNameLatin(e.target.value)}
            required
          />
          <Input
            label={language === 'ar' ? 'اللقب باللاتينية' : language === 'fr' ? 'Nom (latin)' : 'Last Name (Latin)'}
            placeholder="e.g. Benali"
            value={lastNameLatin}
            onChange={(e) => setLastNameLatin(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={language === 'ar' ? 'الاسم بالعربية' : language === 'fr' ? 'Prénom (arabe)' : 'First Name (Arabic)'}
            placeholder="مثال: يوسف"
            value={firstNameArabic}
            onChange={(e) => setFirstNameArabic(e.target.value)}
            dir="rtl"
          />
          <Input
            label={language === 'ar' ? 'اللقب بالعربية' : language === 'fr' ? 'Nom (arabe)' : 'Last Name (Arabic)'}
            placeholder="مثال: بن علي"
            value={lastNameArabic}
            onChange={(e) => setLastNameArabic(e.target.value)}
            dir="rtl"
          />
        </div>

        {/* Civil status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label={language === 'ar' ? 'تاريخ الميلاد' : language === 'fr' ? 'Date de naissance' : 'Date of Birth'}
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <Input
            label={language === 'ar' ? 'مكان الميلاد' : language === 'fr' ? 'Lieu de naissance' : 'Place of Birth'}
            placeholder={language === 'ar' ? 'مثال: الجزائر الوسطى' : 'e.g. Alger Centre'}
            value={placeOfBirth}
            onChange={(e) => setPlaceOfBirth(e.target.value)}
          />

          <Select
            label={language === 'ar' ? 'الجنس' : language === 'fr' ? 'Genre' : 'Gender'}
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F')}
            options={[
              { value: 'M', label: language === 'ar' ? 'ذكر' : language === 'fr' ? 'Garçon' : 'Male' },
              { value: 'F', label: language === 'ar' ? 'أنثى' : language === 'fr' ? 'Fille' : 'Female' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={language === 'ar' ? 'رقم التعريف الوطني (NIN)' : language === 'fr' ? "Numéro d'identification national (NIN)" : 'National ID Number (NIN)'}
            placeholder="e.g. 201216010012345"
            value={nationalIdNumber}
            onChange={(e) => setNationalIdNumber(e.target.value)}
          />

          <Select
            label={language === 'ar' ? 'صفة الولي' : language === 'fr' ? 'Lien de parenté du tuteur' : 'Guardian Relationship'}
            value={guardianRelationship}
            onChange={(e) => setGuardianRelationship(e.target.value)}
            options={[
              { value: 'Father', label: language === 'ar' ? 'الأب' : language === 'fr' ? 'Père' : 'Father' },
              { value: 'Mother', label: language === 'ar' ? 'الأم' : language === 'fr' ? 'Mère' : 'Mother' },
              { value: 'Legal Guardian', label: language === 'ar' ? 'الولي الشرعي' : language === 'fr' ? 'Tuteur légal' : 'Legal Guardian' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={language === 'ar' ? 'اسم الولي' : language === 'fr' ? 'Nom du tuteur' : 'Guardian Name'}
            placeholder={language === 'ar' ? 'مثال: محمد بن علي' : 'e.g. Mohamed Benali'}
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />

          <Input
            label={language === 'ar' ? 'رقم هاتف الولي' : language === 'fr' ? 'Téléphone du tuteur' : 'Guardian Phone'}
            placeholder="e.g. 0550 12 34 56"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'تنبيهات صحية وحساسيات' : language === 'fr' ? 'Alertes médicales / Allergies' : 'Medical Alerts / Allergies'}
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              rows={2}
              placeholder={language === 'ar' ? 'مثال: يعاني من الربو، حساسية شديدة...' : 'e.g. Asthma inhaler required, severe nut allergy'}
              value={medicalAlerts}
              onChange={(e) => setMedicalAlerts(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'ملاحظات بيداغوجية عامة' : language === 'fr' ? 'Notes pédagogiques générales' : 'General Pedagogical Notes'}
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              rows={2}
              placeholder={language === 'ar' ? 'مثال: يُفضل جلوسه في الصف الأمامي لضعف البصر' : 'e.g. Front row seating recommended for vision'}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
