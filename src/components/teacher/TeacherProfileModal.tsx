/**
 * UNS SCHOOL — Teacher Profile Management Modal
 * Allows the teacher to update all personal, civil, contact,
 * professional status, installation dates, and pedagogical preferences.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Upload,
  Camera,
  Calendar,
  Layers,
  FileText,
  Shield,
  Save,
  Trash2,
} from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import type { TeacherProfile } from '../../types';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import { useI18n } from '../../i18n/I18nContext';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TeacherProfile;
  onProfileUpdated: (updated: TeacherProfile) => void;
}

type TabKey = 'personal' | 'contact' | 'professional' | 'pedagogy';

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const { language } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<TeacherProfile>({ ...profile });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...profile });
      setError(null);
      setActiveTab('personal');
    }
  }, [isOpen, profile]);

  const handleChange = (field: keyof TeacherProfile, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLevelToggle = (level: string) => {
    const current = formData.assignedLevels || [];
    const updated = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    handleChange('assignedLevels', updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميغابايت' : 'Image size must not exceed 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('avatarUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    handleChange('avatarUrl', undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullNameLatin.trim()) {
      setError(language === 'ar' ? 'الاسم باللاتينية مطلوب' : 'Full Name (Latin) is required');
      setActiveTab('personal');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await teacherRepository.update({
        ...formData,
        fullNameLatin: formData.fullNameLatin.trim(),
        fullNameArabic: formData.fullNameArabic?.trim(),
        email: formData.email?.trim(),
        phone: formData.phone?.trim(),
      });
      onProfileUpdated(updated);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save teacher profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    {
      key: 'personal',
      label: language === 'ar' ? 'الهوية والحالة المدنية' : language === 'fr' ? 'Identité & État civil' : 'Personal & Civil',
      icon: User,
    },
    {
      key: 'professional',
      label: language === 'ar' ? 'الوضعية المهنية والإدارية' : language === 'fr' ? 'Statut professionnel' : 'Professional & Admin',
      icon: Briefcase,
    },
    {
      key: 'contact',
      label: language === 'ar' ? 'العنوان والاتصال' : language === 'fr' ? 'Coordonnées & Adresse' : 'Contact & Address',
      icon: Phone,
    },
    {
      key: 'pedagogy',
      label: language === 'ar' ? 'الصورة والملاحظات التربوية' : language === 'fr' ? 'Photo & Pédagogie' : 'Photo & Bio',
      icon: GraduationCap,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'إدارة الملف المهني للأستاذ' : language === 'fr' ? "Gérer le profil de l'enseignant" : 'Manage Teacher Profile'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar'
                ? 'تعديل البيانات الشخصية، المهنية والإدارية للأستاذ'
                : 'Configure administrative status, qualifications, and personal details'}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {error && <span className="text-rose-600 dark:text-rose-400 font-medium">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-1.5" />
              <span>{language === 'ar' ? 'حفظ التغييرات' : language === 'fr' ? 'Enregistrer' : 'Save Changes'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Personal & Civil Details */}
        {activeTab === 'personal' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label={language === 'ar' ? 'الاسم واللقب باللاتينية *' : 'Full Name (Latin / Official) *'}
                value={formData.fullNameLatin || ''}
                onChange={(e) => handleChange('fullNameLatin', e.target.value)}
                placeholder="e.g., BENALI Mohamed"
                required
              />

              <Input
                label={language === 'ar' ? 'الاسم واللقب بالعربية' : 'Full Name (Arabic)'}
                value={formData.fullNameArabic || ''}
                onChange={(e) => handleChange('fullNameArabic', e.target.value)}
                placeholder="مثال: بن علي محمد"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Select
                label={language === 'ar' ? 'الجنس' : 'Gender'}
                value={formData.gender || 'male'}
                onChange={(e) => handleChange('gender', e.target.value as 'male' | 'female')}
                options={[
                  { value: 'male', label: language === 'ar' ? 'ذكر' : language === 'fr' ? 'Masculin' : 'Male' },
                  { value: 'female', label: language === 'ar' ? 'أنثى' : language === 'fr' ? 'Féminin' : 'Female' },
                ]}
              />

              <Input
                type="date"
                label={language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
                value={formData.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />

              <Input
                label={language === 'ar' ? 'مكان الميلاد' : 'Place of Birth'}
                value={formData.placeOfBirth || ''}
                onChange={(e) => handleChange('placeOfBirth', e.target.value)}
                placeholder="e.g. Algiers / الجزائر"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'ar' ? 'أرقام الهوية والتسجيل الرسمية' : 'Official Identification & Registration Numbers'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  label={language === 'ar' ? 'رقم التعريف الوطني (NIN)' : 'National ID (NIN)'}
                  value={formData.nationalIdNumber || ''}
                  onChange={(e) => handleChange('nationalIdNumber', e.target.value)}
                  placeholder="18-digit national ID"
                />

                <Input
                  label={language === 'ar' ? 'رقم الضمان الاجتماعي / Matricule' : 'Social Security / Registration N°'}
                  value={formData.nationalRegistrationNumber || ''}
                  onChange={(e) => handleChange('nationalRegistrationNumber', e.target.value)}
                  placeholder="e.g., 880415160012"
                />

                <Input
                  label={language === 'ar' ? 'رقم التأجير / Matricule Financier' : 'Financial Code / N° Financier'}
                  value={formData.financialRegistrationNumber || ''}
                  onChange={(e) => handleChange('financialRegistrationNumber', e.target.value)}
                  placeholder="e.g., FIN-94821"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Professional & Administrative */}
        {activeTab === 'professional' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={language === 'ar' ? 'المادة المُدرّسة' : 'Teaching Subject'}
                value={formData.subject || 'English Language (اللغة الإنجليزية)'}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="English Language"
              />

              <Select
                label={
                  language === 'ar'
                    ? 'الرتبة في السلك (المرسوم التنفيذي 25-54)'
                    : language === 'fr'
                    ? 'Corps & Grade (Décret Exécutif 25-54)'
                    : 'Teaching Rank & Tier (Decree 25-54)'
                }
                value={formData.corpsRank || "Professeur d'Enseignement Moyen (PEM)"}
                onChange={(e) => handleChange('corpsRank', e.target.value)}
                groups={[
                  {
                    label:
                      language === 'ar'
                        ? '🏫 سلك أساتذة التعليم المتوسط (المرسوم 25-54)'
                        : language === 'fr'
                        ? '🏫 Corps des Professeurs d’Enseignement Moyen (Décret 25-54)'
                        : '🏫 Middle School Teaching Corps (Decree 25-54)',
                    options: [
                      {
                        value: "Professeur d'Enseignement Moyen (PEM) / أستاذ التعليم المتوسط",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم المتوسط — الصنف 12 (الرتبة القاعدية)'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Moyen — Catégorie 12 (Grade de base)"
                            : 'Middle School Teacher — Category 12 (Baseline rank)',
                      },
                      {
                        value: "Professeur d'Enseignement Moyen - Classe 1 / أستاذ التعليم المتوسط قسم أول",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم المتوسط قسم أول — الصنف 13'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Moyen - Classe 1 — Catégorie 13"
                            : 'Middle School Teacher - Class 1 — Category 13',
                      },
                      {
                        value: "Professeur d'Enseignement Moyen - Classe 2 / أستاذ التعليم المتوسط قسم ثان",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم المتوسط قسم ثان — الصنف 15'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Moyen - Classe 2 — Catégorie 15"
                            : 'Middle School Teacher - Class 2 — Category 15',
                      },
                      {
                        value: 'Professeur Émérite en Enseignement Moyen (PEM) / أستاذ مميز في التعليم المتوسط',
                        label:
                          language === 'ar'
                            ? 'أستاذ مميز في التعليم المتوسط — الصنف 16'
                            : language === 'fr'
                            ? 'Professeur Émérite en Enseignement Moyen — Catégorie 16'
                            : 'Distinguished Middle School Teacher — Category 16',
                      },
                    ],
                  },
                  {
                    label:
                      language === 'ar'
                        ? '🎒 سلك أساتذة التعليم الابتدائي (المرسوم 25-54)'
                        : language === 'fr'
                        ? '🎒 Corps des Professeurs de l’École Primaire (Décret 25-54)'
                        : '🎒 Primary School Teaching Corps (Decree 25-54)',
                    options: [
                      {
                        value: "Professeur de l'École Primaire (PEP) / أستاذ المدرسة الابتدائية",
                        label:
                          language === 'ar'
                            ? 'أستاذ المدرسة الابتدائية — الصنف 11 (الرتبة القاعدية)'
                            : language === 'fr'
                            ? "Professeur de l'École Primaire — Catégorie 11 (Grade de base)"
                            : 'Primary School Teacher — Category 11 (Baseline rank)',
                      },
                      {
                        value: "Professeur de l'École Primaire - Classe 1 / أستاذ المدرسة الابتدائية قسم أول",
                        label:
                          language === 'ar'
                            ? 'أستاذ المدرسة الابتدائية قسم أول — الصنف 12'
                            : language === 'fr'
                            ? "Professeur de l'École Primaire - Classe 1 — Catégorie 12"
                            : 'Primary School Teacher - Class 1 — Category 12',
                      },
                      {
                        value: "Professeur de l'École Primaire - Classe 2 / أستاذ المدرسة الابتدائية قسم ثان",
                        label:
                          language === 'ar'
                            ? 'أستاذ المدرسة الابتدائية قسم ثان — الصنف 14'
                            : language === 'fr'
                            ? "Professeur de l'École Primaire - Classe 2 — Catégorie 14"
                            : 'Primary School Teacher - Class 2 — Category 14',
                      },
                      {
                        value: "Professeur Émérite de l'École Primaire (PEP) / أستاذ مميز في المدرسة الابتدائية",
                        label:
                          language === 'ar'
                            ? 'أستاذ مميز في المدرسة الابتدائية — الصنف 15'
                            : language === 'fr'
                            ? "Professeur Émérite de l'École Primaire — Catégorie 15"
                            : 'Distinguished Primary School Teacher — Category 15',
                      },
                    ],
                  },
                  {
                    label:
                      language === 'ar'
                        ? '🎓 سلك أساتذة التعليم الثانوي (المرسوم 25-54)'
                        : language === 'fr'
                        ? '🎓 Corps des Professeurs d’Enseignement Secondaire (Décret 25-54)'
                        : '🎓 Secondary School Teaching Corps (Decree 25-54)',
                    options: [
                      {
                        value: "Professeur d'Enseignement Secondaire (PES) / أستاذ التعليم الثانوي",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم الثانوي — الصنف 13 (الرتبة القاعدية)'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Secondaire — Catégorie 13 (Grade de base)"
                            : 'Secondary School Teacher — Category 13 (Baseline rank)',
                      },
                      {
                        value: "Professeur d'Enseignement Secondaire - Classe 1 / أستاذ التعليم الثانوي قسم أول",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم الثانوي قسم أول — الصنف 14'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Secondaire - Classe 1 — Catégorie 14"
                            : 'Secondary School Teacher - Class 1 — Category 14',
                      },
                      {
                        value: "Professeur d'Enseignement Secondaire - Classe 2 / أستاذ التعليم الثانوي قسم ثان",
                        label:
                          language === 'ar'
                            ? 'أستاذ التعليم الثانوي قسم ثان — الصنف 16'
                            : language === 'fr'
                            ? "Professeur d'Enseignement Secondaire - Classe 2 — Catégorie 16"
                            : 'Secondary School Teacher - Class 2 — Category 16',
                      },
                      {
                        value: 'Professeur Émérite en Enseignement Secondaire (PES) / أستاذ مميز في التعليم الثانوي',
                        label:
                          language === 'ar'
                            ? 'أستاذ مميز في التعليم الثانوي — الصنف 17'
                            : language === 'fr'
                            ? 'Professeur Émérite en Enseignement Secondaire — Catégorie 17'
                            : 'Distinguished Secondary School Teacher — Category 17',
                      },
                      {
                        value: 'Professeur Agrégé (PES) / أستاذ مبرز في التعليم الثانوي',
                        label:
                          language === 'ar'
                            ? 'أستاذ مبرز في التعليم الثانوي — الصنف 16/17'
                            : language === 'fr'
                            ? 'Professeur Agrégé (PES) — Catégorie 16/17'
                            : 'Certified Agrégé Master — Category 16/17',
                      },
                    ],
                  },
                  {
                    label:
                      language === 'ar'
                        ? '📋 المهام البيداغوجية والوضعيات القانونية (مرسوم 25-54)'
                        : language === 'fr'
                        ? '📋 Fonctions Pédagogiques & Statuts Spécifiques (Décret 25-54)'
                        : '📋 Pedagogical Roles & Legal Status (Decree 25-54)',
                    options: [
                      {
                        value: 'Professeur Coordonnateur de Matière / أستاذ منسق للمادة',
                        label:
                          language === 'ar'
                            ? 'أستاذ منسق للمادة (تكليف بيداغوجي وتنسيق)'
                            : language === 'fr'
                            ? 'Professeur Coordonnateur de Matière'
                            : 'Subject Coordinator Teacher',
                      },
                      {
                        value: 'Professeur Stagiaire / أستاذ متربص',
                        label:
                          language === 'ar'
                            ? 'أستاذ متربص (قيد التربص القانوني والترسيم)'
                            : language === 'fr'
                            ? 'Professeur Stagiaire (Période de stage)'
                            : 'Probationary / Trainee Teacher',
                      },
                      {
                        value: 'Professeur Contractuel / أستاذ متعاقد',
                        label:
                          language === 'ar'
                            ? 'أستاذ متعاقد (عقد مؤقت)'
                            : language === 'fr'
                            ? 'Professeur Contractuel (Contractuel/Vacataire)'
                            : 'Contract Teacher',
                      },
                      {
                        value: 'Professeur Remplaçant / أستاذ مستخلف',
                        label:
                          language === 'ar'
                            ? 'أستاذ مستخلف (استخلاف على عطلة/منصب)'
                            : language === 'fr'
                            ? 'Professeur Remplaçant'
                            : 'Substitute / Replacement Teacher',
                      },
                    ],
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Select
                label={
                  language === 'ar'
                    ? 'الدرجة (0 - 12)'
                    : language === 'fr'
                    ? 'Échelon (0 - 12)'
                    : 'Echelon (0 - 12)'
                }
                value={formData.echelon !== undefined && formData.echelon !== null && formData.echelon !== '' ? String(formData.echelon) : '3'}
                onChange={(e) => handleChange('echelon', Number(e.target.value))}
                options={Array.from({ length: 13 }, (_, i) => {
                  const val = i; // 0 to 12
                  let labelText = '';
                  if (val === 0) {
                    labelText = language === 'ar'
                      ? 'الدرجة 0 (متربص جديد)'
                      : language === 'fr'
                      ? 'Échelon 0 (Stagiaire)'
                      : 'Echelon 0 (New Employee)';
                  } else {
                    labelText = language === 'ar'
                      ? `الدرجة ${val}`
                      : language === 'fr'
                      ? `Échelon ${val}`
                      : `Echelon ${val}`;
                  }
                  return {
                    value: String(val),
                    label: labelText,
                  };
                })}
              />

              <Input
                type="date"
                label={language === 'ar' ? 'تاريخ الترقية إلى الدرجة الحالية' : 'Echelon Promotion Date'}
                value={formData.echelonDate || ''}
                onChange={(e) => handleChange('echelonDate', e.target.value)}
              />

              <Input
                type="number"
                min={1}
                max={40}
                label={language === 'ar' ? 'الحجم الساعي الأسبوعي (ساعة)' : 'Weekly Teaching Hours'}
                value={formData.weeklyHoursQuota || 18}
                onChange={(e) => handleChange('weeklyHoursQuota', Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                type="date"
                label={language === 'ar' ? 'تاريخ أول تعيين في قطاع التربية' : 'First Appointment Date'}
                value={formData.firstAppointmentDate || ''}
                onChange={(e) => handleChange('firstAppointmentDate', e.target.value)}
              />

              <Input
                type="date"
                label={language === 'ar' ? 'تاريخ التنصيب بالمؤسسة الحالية' : 'Current School Installation Date'}
                value={formData.currentSchoolInstallationDate || ''}
                onChange={(e) => handleChange('currentSchoolInstallationDate', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={language === 'ar' ? 'المؤهل العلمي / الشهادة' : 'Degree & Academic Qualification'}
                value={formData.qualificationDegree || ''}
                onChange={(e) => handleChange('qualificationDegree', e.target.value)}
                placeholder="Licence d'Anglais / ENS Kouba / Master"
              />

              <Input
                label={language === 'ar' ? 'المؤسسة التعليمية الحالية' : 'Current School Name'}
                value={formData.assignedSchoolName || ''}
                onChange={(e) => handleChange('assignedSchoolName', e.target.value)}
                placeholder="e.g. CEM Frères Bouchami"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={language === 'ar' ? 'المقاطعة التفتيشية' : 'Inspection District'}
                value={formData.inspectorDistrict || ''}
                onChange={(e) => handleChange('inspectorDistrict', e.target.value)}
                placeholder="e.g. Circonscription Alger Centre 01"
              />

              <Input
                label={language === 'ar' ? 'اسم السيد المفتش' : "Inspector's Name"}
                value={formData.inspectorName || ''}
                onChange={(e) => handleChange('inspectorName', e.target.value)}
                placeholder="e.g. M. Inspecteur de l'Éducation Nationale"
              />
            </div>

            {/* Assigned Middle School Levels */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'ar' ? 'المستويات المسندة للتدريس' : 'Assigned Teaching Levels'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { code: '1MS', labelAr: '1 متوسط (1AM)', labelEn: '1st Year (1MS)' },
                  { code: '2MS', labelAr: '2 متوسط (2AM)', labelEn: '2nd Year (2MS)' },
                  { code: '3MS', labelAr: '3 متوسط (3AM)', labelEn: '3rd Year (3MS)' },
                  { code: '4MS', labelAr: '4 متوسط (4AM - BEM)', labelEn: '4th Year (4MS - BEM)' },
                ].map((lvl) => {
                  const isChecked = (formData.assignedLevels || []).includes(lvl.code);
                  return (
                    <button
                      key={lvl.code}
                      type="button"
                      onClick={() => handleLevelToggle(lvl.code)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      <span>{language === 'ar' ? lvl.labelAr : lvl.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Contact & Address */}
        {activeTab === 'contact' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                type="email"
                label={language === 'ar' ? 'البريد الإلكتروني المهني / الشخصي' : 'Email Address'}
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="teacher@education.dz"
              />

              <Input
                type="tel"
                label={language === 'ar' ? 'رقم الهاتف المحمول' : 'Mobile Phone Number'}
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="06XX XX XX XX"
              />
            </div>

            <Input
              label={language === 'ar' ? 'عنوان الإقامة الشخصي' : 'Personal Residential Address'}
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Rue, Cité, N° Bâtiment"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={language === 'ar' ? 'البلدية' : 'Commune'}
                value={formData.commune || ''}
                onChange={(e) => handleChange('commune', e.target.value)}
                placeholder="e.g. Bab El Oued"
              />

              <Input
                label={language === 'ar' ? 'الولاية' : 'Wilaya'}
                value={formData.wilaya || ''}
                onChange={(e) => handleChange('wilaya', e.target.value)}
                placeholder="e.g. 16 - Alger"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Photo & Pedagogical Bio */}
        {activeTab === 'pedagogy' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            {/* Avatar & Photo Picker */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt={formData.fullNameLatin}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                    {formData.fullNameLatin ? formData.fullNameLatin.charAt(0).toUpperCase() : 'T'}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-start">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'ar' ? 'الصورة الشخصية للأستاذ' : 'Teacher Profile Photograph'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ar'
                    ? 'يتم تخزين الصورة محلياً على جهازك وتظهر في البطاقات والمطبوعات الرسمية.'
                    : 'Stored privately and locally in offline IndexedDB for official sheets and ID cards.'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'رفع صورة جديدة' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium text-xs flex items-center gap-1.5 hover:bg-rose-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'حذف الصورة' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pedagogical Statement & Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'ar' ? 'الملاحظات والرؤية البيداغوجية للأستاذ' : 'Pedagogical Statement & Teaching Philosophy'}
              </label>
              <textarea
                rows={4}
                value={formData.pedagogicalNotes || ''}
                onChange={(e) => handleChange('pedagogicalNotes', e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'اكتب هنا أهدافك التربوية السنوية، توجيهات المادة، أو أية ملاحظات تود الاحتفاظ بها...'
                    : 'Enter your pedagogical approach, communicative language teaching goals, or personal teacher notes...'
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 leading-relaxed"
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
