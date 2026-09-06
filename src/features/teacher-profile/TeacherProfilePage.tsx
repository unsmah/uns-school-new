/**
 * UNS SCHOOL — Teacher Profile Management View
 * Concept: "Digital Teacher's Administrative & Pedagogical Identity"
 * Provides comprehensive viewing, editing, and official printable sheet generation.
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
  Calendar,
  Layers,
  FileText,
  Shield,
  Edit3,
  Printer,
  School as SchoolIcon,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useI18n } from '../../i18n/I18nContext';
import { teacherRepository, classRepository, studentEnrollmentRepository, lessonRepository } from '../../db/repositories';
import type { TeacherProfile, SchoolClass } from '../../types';
import { TeacherProfileModal } from '../../components/teacher/TeacherProfileModal';
import { TeacherInfoSheetPrint } from '../../components/teacher/TeacherInfoSheetPrint';
import { Link } from 'react-router-dom';

export const TeacherProfilePage: React.FC = () => {
  const { school, selectedAcademicYear } = useAcademicYear();
  const { language, direction } = useI18n();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState<number>(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState<number>(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await teacherRepository.getOrCreate();
      setProfile(p);

      if (selectedAcademicYear) {
        const [yearClasses, enrollments, lessons] = await Promise.all([
          classRepository.listByAcademicYear(selectedAcademicYear.id),
          studentEnrollmentRepository.listByAcademicYear(selectedAcademicYear.id),
          lessonRepository.listByAcademicYear(selectedAcademicYear.id),
        ]);
        setClasses(yearClasses);
        setActiveStudentsCount(enrollments.filter((e) => e.status === 'active').length);
        setTotalLessonsCount(lessons.length);
      }
    } catch (err) {
      console.error('Failed to load teacher profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAcademicYear]);

  const handleProfileUpdated = (updated: TeacherProfile) => {
    setProfile(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Printable Sheet View (Visible only during print) */}
      <div className="hidden print:block">
        <TeacherInfoSheetPrint
          teacher={profile}
          school={school}
          academicYear={selectedAcademicYear}
          classes={classes}
        />
      </div>

      {/* Main Screen Layout (Hidden during print) */}
      <div className="print:hidden space-y-6">
        {/* Page Top Actions Header */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {language === 'ar' ? 'الملف المهني للأستاذ' : language === 'fr' ? "Profil de l'Enseignant" : "Teacher's Profile & Dossier"}
              </h2>
              <Badge variant="success">
                {language === 'ar' ? 'أستاذ مرسم' : 'PEM Middle School'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'إدارة الحالة المدنية، المراجع الإدارية، الحجم الساعي والمطبوعات الرسمية للأستاذ.'
                : 'Manage administrative credentials, teaching assignments, and export official ministerial information sheets.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="border-slate-300 dark:border-slate-700"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-600 dark:text-slate-400" />
              <span>{language === 'ar' ? 'بطاقة المعلومات (طباعة)' : language === 'fr' ? 'Fiche de renseignement' : 'Official Sheet'}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              <span>{language === 'ar' ? 'تعديل البيانات' : language === 'fr' ? 'Modifier le profil' : 'Edit Profile'}</span>
            </Button>
          </div>
        </div>

        {/* Hero Identity Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 text-white shadow-md p-5 sm:p-7">
          {/* Background subtle decorative pattern */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-emerald-600/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6">
            {/* Avatar Profile Box */}
            <div className="relative group shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullNameLatin}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-3 border-emerald-400/80 shadow-md ring-4 ring-white/10"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-md ring-4 ring-white/10">
                  {profile.fullNameLatin ? profile.fullNameLatin.charAt(0).toUpperCase() : 'T'}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Change photo / edit profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Info & Core Badges */}
            <div className="flex-1 text-center md:text-start space-y-2.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {profile.fullNameLatin || 'Teacher of English'}
                  </h3>
                  {profile.fullNameArabic && (
                    <span className="text-base sm:text-lg font-arabic text-emerald-200 font-semibold" dir="rtl">
                      ({profile.fullNameArabic})
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                  {profile.corpsRank || "Professeur d'Enseignement Moyen (PEM)"} • {profile.subject || 'English Language (اللغة الإنجليزية)'}
                </p>
              </div>

              {/* Badges Ribbon */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {language === 'ar'
                      ? `الدرجة: ${profile.echelon !== undefined && profile.echelon !== null && profile.echelon !== '' ? profile.echelon : 3}`
                      : `Échelon: ${profile.echelon !== undefined && profile.echelon !== null && profile.echelon !== '' ? profile.echelon : 3}`}
                  </span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5">
                  <SchoolIcon className="w-3.5 h-3.5 text-emerald-300" />
                  <span>
                    {school?.name || profile.assignedSchoolName || 'CEM Middle School'}
                  </span>
                </span>

                {profile.wilaya && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-300" />
                    <span>{profile.wilaya}</span>
                  </span>
                )}

                {profile.inspectorDistrict && (
                  <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-300" />
                    <span>{profile.inspectorDistrict}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Tile */}
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <span className="text-lg font-bold block">{profile.weeklyHoursQuota || 18}h</span>
                <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">
                  {language === 'ar' ? 'ساعات الأسبوع' : 'Weekly Hours'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <span className="text-lg font-bold block">{classes.length}</span>
                <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">
                  {language === 'ar' ? 'الأفواج المسندة' : 'Classes'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Personal & Civil Identification */}
          <Card
            header={
              <div className="flex items-center justify-between text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-sm">
                    {language === 'ar' ? 'الهوية والحالة المدنية' : 'Civil & Identity Details'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </button>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الاسم باللاتينية:' : 'Full Name (Latin):'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.fullNameLatin || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الاسم بالعربية:' : 'Full Name (Arabic):'}</span>
                <span className="font-semibold font-arabic text-slate-800 dark:text-slate-200">{profile.fullNameArabic || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الجنس:' : 'Gender:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.gender === 'female' ? (language === 'ar' ? 'أنثى' : 'Female') : (language === 'ar' ? 'ذكر' : 'Male')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'تاريخ ومكان الميلاد:' : 'Date & Place of Birth:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.dateOfBirth ? `${profile.dateOfBirth}` : '—'} {profile.placeOfBirth ? `(${profile.placeOfBirth})` : ''}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'رقم التعريف الوطني (NIN):' : 'National ID (NIN):'}</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.nationalIdNumber || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'رقم الضمان الاجتماعي / Matricule:' : 'Social Security / Matricule:'}</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.nationalRegistrationNumber || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'رقم التأجير المالي:' : 'Financial Code:'}</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.financialRegistrationNumber || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Column 2: Professional Status & Administrative Career */}
          <Card
            header={
              <div className="flex items-center justify-between text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-sm">
                    {language === 'ar' ? 'الوضعية المهنية والإدارية' : 'Career & Administrative'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </button>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الرتبة في السلك:' : 'Corps & Rank:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.corpsRank || "PEM"}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الدرجة وتاريخ السريان:' : 'Echelon & Date:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'ar' ? 'الدرجة' : 'Échelon'} {profile.echelon !== undefined && profile.echelon !== null && profile.echelon !== '' ? profile.echelon : 3} {profile.echelonDate ? `(${profile.echelonDate})` : ''}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'تاريخ أول تعيين:' : 'First Recruitment:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.firstAppointmentDate || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'تاريخ التنصيب بالمؤسسة:' : 'Current Installation:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.currentSchoolInstallationDate || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'المؤهل العلمي / الشهادة:' : 'Qualification:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.qualificationDegree || "Licence d'Anglais"}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'المقاطعة التفتيشية:' : 'Inspection District:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.inspectorDistrict || '—'}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'اسم السيد المفتش:' : 'Inspector Name:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.inspectorName || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Column 3: Contact Details & Teaching Bio */}
          <div className="space-y-5">
            <Card
              header={
                <div className="flex items-center justify-between text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-sm">
                      {language === 'ar' ? 'معلومات الاتصال والعنوان' : 'Contact & Address'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                </div>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 py-1 text-slate-700 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium">{profile.phone || (language === 'ar' ? 'لم يُحدد الهاتف' : 'No phone specified')}</span>
                </div>

                <div className="flex items-center gap-2.5 py-1 text-slate-700 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-medium">{profile.email || (language === 'ar' ? 'لم يُحدد البريد الإلكتروني' : 'No email specified')}</span>
                </div>

                <div className="flex items-start gap-2.5 py-1 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium">
                    {[profile.address, profile.commune, profile.wilaya].filter(Boolean).join(', ') ||
                      (language === 'ar' ? 'لم يُحدد العنوان' : 'No address specified')}
                  </span>
                </div>
              </div>
            </Card>

            {/* Pedagogical Statement & Notes */}
            <Card
              header={
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-sm">
                    {language === 'ar' ? 'الرؤية والملاحظات البيداغوجية' : 'Pedagogical Philosophy & Notes'}
                  </span>
                </div>
              }
            >
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {profile.pedagogicalNotes || (
                  <span className="text-slate-400 dark:text-slate-500 not-italic">
                    {language === 'ar'
                      ? 'لا توجد ملاحظات بيداغوجية مسجلة. انقر على تعديل لإضافة أهدافك ورؤيتك التعليمية.'
                      : 'No pedagogical statement recorded. Click edit to customize your teaching philosophy and yearly objectives.'}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Assigned Classes & Operational Workspace Summary */}
        <Card
          header={
            <div className="flex items-center justify-between text-slate-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm">
                  {language === 'ar'
                    ? `الأفواج التربوية المسندة للأستاذ (${selectedAcademicYear?.label || '2026-2027'})`
                    : `Assigned Classes & Divisions (${selectedAcademicYear?.label || '2026-2027'})`}
                </span>
              </div>
              <Link
                to="/classes"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <span>{language === 'ar' ? 'إدارة الأفواج' : 'Manage Classes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          }
        >
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/classes/${cls.id}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      {cls.name}
                    </span>
                    <Badge variant="default">{cls.levelCode}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cls.roomNumber ? `Room: ${cls.roomNumber}` : 'Middle School Division'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
              <p>{language === 'ar' ? 'لم يتم إنشاء أفواج تربوية بعد لهذا الموسم.' : 'No classes configured for the active academic year.'}</p>
              <Link to="/classes" className="inline-block mt-2 text-emerald-600 font-semibold hover:underline">
                {language === 'ar' ? '+ إنشاء أول فوج تربوي' : '+ Create your first class'}
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Profile Modal */}
      {profile && (
        <TeacherProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Print Preview Modal */}
      {isPrintModalOpen && profile && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {language === 'ar' ? 'معاينة بطاقة معلومات الأستاذ الرسمية' : 'Official Teacher Sheet Print Preview'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  <span>{language === 'ar' ? 'طباعة المستند' : 'Print Document'}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div className="shadow-lg bg-white rounded-lg">
                <TeacherInfoSheetPrint
                  teacher={profile}
                  school={school}
                  academicYear={selectedAcademicYear}
                  classes={classes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
