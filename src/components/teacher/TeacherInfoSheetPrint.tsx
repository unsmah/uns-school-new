/**
 * UNS SCHOOL — Printable Teacher Information Sheet
 * Official Algerian Ministry of National Education format:
 * "بطاقة معلومات الأستاذ / FICHE DE RENSEIGNEMENTS DE L'ENSEIGNANT"
 */

import React from 'react';
import type { TeacherProfile, School, AcademicYear, SchoolClass } from '../../types';

interface TeacherInfoSheetPrintProps {
  teacher: TeacherProfile;
  school?: School | null;
  academicYear?: AcademicYear | null;
  classes?: SchoolClass[];
}

export const TeacherInfoSheetPrint: React.FC<TeacherInfoSheetPrintProps> = ({
  teacher,
  school,
  academicYear,
  classes = [],
}) => {
  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto printable-sheet font-sans print:p-0 print:m-0 print:max-w-none text-xs leading-normal">
      {/* Official Header */}
      <div className="text-center space-y-1 pb-4 border-b-2 border-black">
        <p className="font-bold text-sm font-arabic tracking-wide">
          الجمهورية الجزائرية الديمقراطية الشعبية
        </p>
        <p className="text-xs uppercase tracking-widest font-serif font-semibold">
          RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
        </p>
        <p className="font-bold text-xs font-arabic">
          وزارة التربية الوطنية
        </p>
        <p className="text-xs font-serif">
          MINISTÈRE DE L'ÉDUCATION NATIONALE
        </p>

        <div className="flex justify-between items-center text-[11px] pt-3 px-2">
          <div className="text-start space-y-0.5">
            <p><strong>Direction de l'Éducation:</strong> {school?.wilaya ? `Wilaya de ${school.wilaya}` : '....................'}</p>
            <p><strong>Établissement (CEM):</strong> {school?.name || teacher.assignedSchoolName || '....................'}</p>
          </div>
          <div className="text-end space-y-0.5" dir="rtl">
            <p><strong>مديرية التربية لولاية:</strong> {school?.wilaya || '....................'}</p>
            <p><strong>المؤسسة:</strong> {school?.nameArabic || school?.name || teacher.assignedSchoolName || '....................'}</p>
          </div>
        </div>

        <div className="mt-3 py-1.5 px-4 bg-slate-100 border border-black inline-block rounded font-bold text-sm tracking-wider uppercase">
          بطاقة معلومات الأستاذ / FICHE DE RENSEIGNEMENTS DE L'ENSEIGNANT
          <div className="text-[10px] font-normal lowercase tracking-normal">
            Année Scolaire: {academicYear?.label || '2026-2027'} • Matière: {teacher.subject || 'Anglais (English)'}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="mt-5 space-y-4">
        {/* Photo Box & Identity Header */}
        <div className="flex gap-4 items-start">
          {/* Passport Photo Box */}
          <div className="w-28 h-32 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center p-1 text-center shrink-0 bg-gray-50 overflow-hidden">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt="Teacher Portrait"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] text-gray-500 uppercase font-semibold">
                Photo d'identité
                <br />
                صورة شمسية
              </span>
            )}
          </div>

          {/* Core Names */}
          <div className="flex-1 border border-black p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-600 block uppercase font-bold">Nom et Prénom (Français / Latin):</span>
                <span className="text-sm font-bold tracking-wide">{teacher.fullNameLatin || '—'}</span>
              </div>
              <div className="text-end" dir="rtl">
                <span className="text-[10px] text-gray-600 block font-bold">الاسم واللقب (بالعربية):</span>
                <span className="text-sm font-bold font-arabic">{teacher.fullNameArabic || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-300">
              <div>
                <span className="text-[10px] text-gray-600 block">Sexe / الجنس:</span>
                <span className="font-semibold">{teacher.gender === 'female' ? 'Féminin (أنثى)' : 'Masculin (ذكر)'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-600 block">Date de naissance:</span>
                <span className="font-semibold">{teacher.dateOfBirth || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-600 block">Lieu de naissance:</span>
                <span className="font-semibold">{teacher.placeOfBirth || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Identification Officielle */}
        <div className="border border-black">
          <div className="bg-gray-200 px-3 py-1 font-bold text-[11px] border-b border-black uppercase flex justify-between">
            <span>1. Numéros d'Identification & Références Administratives</span>
            <span dir="rtl">1. أرقام الهوية والمراجع الإدارية</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">N° Identification Nationale (NIN):</p>
              <p className="font-mono font-bold text-xs">{teacher.nationalIdNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">N° Sécurité Sociale / Matricule:</p>
              <p className="font-mono font-bold text-xs">{teacher.nationalRegistrationNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">N° Matricule Financier (CCP / Trésor):</p>
              <p className="font-mono font-bold text-xs">{teacher.financialRegistrationNumber || '—'}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Situation Professionnelle & Pédagogique */}
        <div className="border border-black">
          <div className="bg-gray-200 px-3 py-1 font-bold text-[11px] border-b border-black uppercase flex justify-between">
            <span>2. Situation Pédagogique & Carrière</span>
            <span dir="rtl">2. الوضعية البيداغوجية والمسار المهني</span>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Discipline / المادة:</p>
                <p className="font-bold">{teacher.subject || 'Anglais (English Language)'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Grade / الرتبة:</p>
                <p className="font-bold">{teacher.corpsRank || "Professeur d'Enseignement Moyen (PEM)"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Échelon & Date d'effet / الدرجة:</p>
                <p className="font-bold">
                  {teacher.echelon !== undefined && teacher.echelon !== null && teacher.echelon !== ''
                    ? `Échelon ${teacher.echelon}`
                    : '—'}{' '}
                  {teacher.echelonDate ? `(${teacher.echelonDate})` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200">
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Date de 1er Recrutement:</p>
                <p className="font-semibold">{teacher.firstAppointmentDate || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Date d'installation actuelle:</p>
                <p className="font-semibold">{teacher.currentSchoolInstallationDate || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Volume horaire hebdomadaire:</p>
                <p className="font-semibold">{teacher.weeklyHoursQuota || 18} Heures / أسبوعياً</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Diplôme le plus élevé / المؤهل العلمي:</p>
                <p className="font-semibold">{teacher.qualificationDegree || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">Circonscription & Inspecteur / المقاطعة والمفتش:</p>
                <p className="font-semibold">
                  {teacher.inspectorDistrict ? `${teacher.inspectorDistrict}` : ''}
                  {teacher.inspectorName ? ` (${teacher.inspectorName})` : ''}
                  {!teacher.inspectorDistrict && !teacher.inspectorName && '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Coordonnées de Contact */}
        <div className="border border-black">
          <div className="bg-gray-200 px-3 py-1 font-bold text-[11px] border-b border-black uppercase flex justify-between">
            <span>3. Coordonnées & Résidence</span>
            <span dir="rtl">3. العنوان الشخصي والاتصال</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">Téléphone / الهاتف:</p>
              <p className="font-bold">{teacher.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">Email / البريد الإلكتروني:</p>
              <p className="font-semibold">{teacher.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-semibold">Adresse / Commune / Wilaya:</p>
              <p className="font-semibold">
                {[teacher.address, teacher.commune, teacher.wilaya].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Répartition des Classes Prises en Charge */}
        <div className="border border-black">
          <div className="bg-gray-200 px-3 py-1 font-bold text-[11px] border-b border-black uppercase flex justify-between">
            <span>4. Classes et Divisions Assignées ({academicYear?.label || '2026-2027'})</span>
            <span dir="rtl">4. الأفواج التربوية المسندة</span>
          </div>
          <div className="p-3">
            {classes.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                {classes.map((cls) => (
                  <div key={cls.id} className="p-1.5 border border-gray-400 bg-gray-50 rounded">
                    <p className="font-bold text-xs">{cls.name}</p>
                    <p className="text-[10px] text-gray-600">Niveau: {cls.levelCode}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic text-center py-1">
                Niveaux déclarés: {(teacher.assignedLevels || ['1MS', '2MS', '3MS', '4MS']).join(' • ')}
              </div>
            )}
          </div>
        </div>

        {/* Signatures & Approvals */}
        <div className="pt-6 grid grid-cols-2 gap-8 text-center">
          <div className="border border-black p-4 h-28 flex flex-col justify-between">
            <p className="font-bold text-xs uppercase underline">Signature de l'Enseignant(e) / توقيع الأستاذ(ة)</p>
            <p className="text-[10px] text-gray-400 italic">Fait le ....................</p>
          </div>
          <div className="border border-black p-4 h-28 flex flex-col justify-between">
            <p className="font-bold text-xs uppercase underline">Visa et Cachet du Chef d'Établissement / تأشيرة السيد المدير</p>
            <p className="text-[10px] text-gray-400 italic">Fait à ...................., le ....................</p>
          </div>
        </div>
      </div>
    </div>
  );
};
