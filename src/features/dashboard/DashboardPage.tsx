/**
 * UNS SCHOOL — Dashboard
 * Overview of the digital teacher's desk with active academic year metrics,
 * mobile-first quick operational shortcuts, and filtered workspace modules.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CalendarDays,
  BookOpen,
  ClipboardList,
  FileText,
  UserCheck,
  Award,
  BookMarked,
  FolderOpen,
  Printer,
  Calendar,
  Settings,
  DatabaseBackup,
  Database,
  Layers,
  ArrowRight,
  School as SchoolIcon,
  CheckCircle2,
  Clock,
  PenTool,
  MessageSquare,
  Activity,
  PlusCircle,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
  Droplets,
  MapPin,
  User,
  Edit3,
  Briefcase,
  ShieldCheck,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  classRepository,
  studentEnrollmentRepository,
  studentPersonRepository,
  timetableRepository,
  lessonRepository,
  attendanceRepository,
} from '../../db/repositories';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import { checkStorageTelemetry, type StorageTelemetry } from '../../services/storageTelemetryService';
import { fetchCityWeather, type WeatherData } from '../../services/weatherService';
import { TeacherProfileModal } from '../../components/teacher/TeacherProfileModal';
import type { TimetableSlot, Lesson, TeacherProfile, SchoolClass } from '../../types';

export const DashboardPage: React.FC = () => {
  const { school, selectedAcademicYear, isArchived } = useAcademicYear();
  const { t, language, direction } = useI18n();
  const [telemetry, setTelemetry] = useState<StorageTelemetry | null>(null);
  
  // Stats
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classCount, setClassCount] = useState<number>(0);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [timetableSlotsCount, setTimetableSlotsCount] = useState<number>(0);
  const [lessonsCount, setLessonsCount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TEACHING' | 'STUDENTS' | 'ASSESSMENT' | 'ADMIN'>('ALL');

  // Teacher Profile & Weather & Time
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live Clock Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Telemetry & Teacher Profile
  useEffect(() => {
    checkStorageTelemetry().then(setTelemetry);
    teacherRepository.getOrCreate().then(setTeacherProfile);
  }, []);

  // Weather Loading based on School City / Wilaya / Commune
  const loadWeather = React.useCallback(async () => {
    setIsWeatherLoading(true);
    try {
      const cityQuery = school?.commune || school?.wilaya || 'Algiers';
      const data = await fetchCityWeather(cityQuery);
      setWeather(data);
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  }, [school?.commune, school?.wilaya]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // Year Stats
  useEffect(() => {
    async function loadYearStats() {
      if (!selectedAcademicYear) return;
      try {
        const [yearClasses, yearEnrollments, allPersons, yearSlots, yearLessons] = await Promise.all([
          classRepository.listByAcademicYear(selectedAcademicYear.id),
          studentEnrollmentRepository.listByAcademicYear(selectedAcademicYear.id),
          studentPersonRepository.listAll(),
          timetableRepository.listByAcademicYear(selectedAcademicYear.id),
          lessonRepository.listByAcademicYear(selectedAcademicYear.id),
        ]);
        setClasses(yearClasses);
        setClassCount(yearClasses.length);
        setEnrolledCount(yearEnrollments.filter((e) => e.status === 'active').length);
        setTotalStudentsCount(allPersons.length);
        setTimetableSlots(yearSlots);
        setTimetableSlotsCount(yearSlots.length);
        setLessonsCount(yearLessons.length);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      }
    }
    loadYearStats();
  }, [selectedAcademicYear]);

  // Compute Today's Sessions (Algerian Sunday=0 to Thursday=4)
  const todayJsDay = currentTime.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const algerianDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;
  const isAlgerianSchoolDay = todayJsDay >= 0 && todayJsDay <= 4;
  const todayDayName = isAlgerianSchoolDay ? algerianDays[todayJsDay] : null;
  const todaySlots = useMemo(() => {
    if (!todayDayName) return [];
    return timetableSlots.filter((slot) => slot.dayOfWeek === todayDayName);
  }, [timetableSlots, todayDayName]);

  // Compute Classes Grouped by Level
  const classesByLevel = useMemo(() => {
    const map: Record<string, SchoolClass[]> = {
      '1MS': [],
      '2MS': [],
      '3MS': [],
      '4MS': [],
    };
    classes.forEach((c) => {
      const code = c.levelCode || '1MS';
      if (!map[code]) map[code] = [];
      map[code].push(c);
    });
    return map;
  }, [classes]);

  // Format Date String in Arabic / French / English
  const formattedDate = useMemo(() => {
    const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
    return currentTime.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime, language]);

  // Formatted Time
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [currentTime]);

  // Time-of-day dynamic greeting (morning, afternoon, evening, night)
  const greetingPhrase = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return {
        en: 'Good morning',
        ar: 'صباح الخير',
        fr: 'Bonjour',
        icon: Sun,
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        en: 'Good afternoon',
        ar: 'مساء الخير',
        fr: 'Bon après-midi',
        icon: CloudSun,
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        en: 'Good evening',
        ar: 'مساء النور',
        fr: 'Bonsoir',
        icon: CloudSun,
      };
    } else {
      return {
        en: 'Good night',
        ar: 'طابت ليلتك',
        fr: 'Bonne nuit',
        icon: Moon,
      };
    }
  }, [currentTime]);

  // Teacher Display Name strictly in selected language
  const teacherDisplayName = useMemo(() => {
    if (!teacherProfile) {
      return language === 'ar' ? 'أستاذ(ة) المادة' : language === 'fr' ? 'Professeur' : 'Teacher';
    }
    if (language === 'ar') {
      const honorific = teacherProfile.gender === 'female' ? 'الأستاذة' : 'الأستاذ';
      const name = teacherProfile.fullNameArabic || teacherProfile.fullNameLatin || '';
      return `${honorific} ${name}`.trim();
    }
    const honorific = teacherProfile.gender === 'female' ? (language === 'fr' ? 'Mme.' : 'Ms.') : (language === 'fr' ? 'M.' : 'Mr.');
    const name = teacherProfile.fullNameLatin || teacherProfile.fullNameArabic || '';
    return `${honorific} ${name}`.trim();
  }, [teacherProfile, language]);

  // Localized Subject strictly in selected language
  const localizedSubject = useMemo(() => {
    const raw = teacherProfile?.subject?.trim() || '';
    if (!raw) {
      return language === 'ar' ? 'مادة اللغة الإنجليزية' : language === 'fr' ? 'Langue Anglaise' : 'English Language';
    }
    // Handle standard English / Middle School subject defaults
    const isEnglishSubject =
      raw.toLowerCase().includes('english') ||
      raw.includes('إنجليزية') ||
      raw.toLowerCase().includes('anglais') ||
      raw.includes('PEM');

    if (isEnglishSubject) {
      if (language === 'ar') return 'مادة اللغة الإنجليزية';
      if (language === 'fr') return 'Langue Anglaise';
      return 'English Language';
    }

    // Filter bilingual formatted custom subjects e.g. "Subject (مادة)"
    if (language === 'ar') {
      const arabicMatch = raw.match(/[\u0600-\u06FF\s0-9]+/);
      if (arabicMatch && arabicMatch[0].trim().length > 1) {
        return arabicMatch[0].trim();
      }
    } else {
      const parts = raw.split(/[\/\(\)]/).map((p) => p.trim()).filter(Boolean);
      const latinParts = parts.filter((p) => !/[\u0600-\u06FF]/.test(p));
      if (latinParts.length > 0) return latinParts[0];
    }

    return raw;
  }, [teacherProfile?.subject, language]);

  // School Establishment Name strictly in selected language
  const displaySchoolName = useMemo(() => {
    if (!school) {
      return language === 'ar' ? 'متوسطة التعليم المتوسط' : language === 'fr' ? 'Collège CEM' : 'UNS Middle School';
    }
    if (language === 'ar' && school.nameArabic) {
      return school.nameArabic;
    }
    return school.name;
  }, [school, language]);

  // Teacher Rank / Grade strictly in selected language (Executive Decree 25-54)
  const teacherRankDisplay = useMemo(() => {
    const raw = teacherProfile?.corpsRank || "Professeur d'Enseignement Moyen (PEM)";
    const echelon = teacherProfile?.echelon;

    // Detect educational cycle (Primary PEP, Middle PEM, Secondary PES)
    const isPrimary = raw.includes('Primaire') || raw.includes('الابتدائية') || raw.includes('PEP');
    const isSecondary = raw.includes('Secondaire') || raw.includes('الثانوي') || raw.includes('PES');
    const cycleSuffixAr = isPrimary ? ' (PEP)' : isSecondary ? ' (PES)' : ' (PEM)';
    const cycleSuffixFr = isPrimary ? ' (PEP)' : isSecondary ? ' (PES)' : ' (PEM)';
    const cycleSuffixEn = isPrimary ? ' (PEP)' : isSecondary ? ' (PES)' : ' (PEM)';

    let rankName = '';
    if (raw.includes('Coordonnateur') || raw.includes('منسق')) {
      rankName = language === 'ar' ? 'أستاذ منسق للمادة' : language === 'fr' ? 'Professeur Coordonnateur' : 'Subject Coordinator';
    } else if (raw.includes('Agrégé') || raw.includes('مبرز')) {
      rankName = language === 'ar' ? `أستاذ مبرز${cycleSuffixAr}` : language === 'fr' ? `Professeur Agrégé${cycleSuffixFr}` : `Certified Agrégé${cycleSuffixEn}`;
    } else if (raw.includes('Émérite') || raw.includes('Distingué') || raw.includes('مميز')) {
      if (isPrimary) {
        rankName = language === 'ar' ? 'أستاذ مميز في المدرسة الابتدائية' : language === 'fr' ? "Professeur Émérite de l'École Primaire" : 'Distinguished Primary Teacher';
      } else if (isSecondary) {
        rankName = language === 'ar' ? 'أستاذ مميز في التعليم الثانوي' : language === 'fr' ? 'Professeur Émérite en Enseignement Secondaire' : 'Distinguished Secondary Teacher';
      } else {
        rankName = language === 'ar' ? 'أستاذ مميز في التعليم المتوسط' : language === 'fr' ? "Professeur Émérite en Enseignement Moyen" : 'Distinguished Middle School Teacher';
      }
    } else if (raw.includes('Classe 2') || raw.includes('قسم ثان') || raw.includes('Formateur') || raw.includes('مكون')) {
      if (isPrimary) {
        rankName = language === 'ar' ? 'أستاذ المدرسة الابتدائية قسم ثان' : language === 'fr' ? "Professeur de l'École Primaire - Classe 2" : 'Primary School Teacher - Class 2';
      } else if (isSecondary) {
        rankName = language === 'ar' ? 'أستاذ التعليم الثانوي قسم ثان' : language === 'fr' ? "Professeur d'Enseignement Secondaire - Classe 2" : 'Secondary School Teacher - Class 2';
      } else {
        rankName = language === 'ar' ? 'أستاذ التعليم المتوسط قسم ثان' : language === 'fr' ? "Professeur d'Enseignement Moyen - Classe 2" : 'Middle School Teacher - Class 2';
      }
    } else if (raw.includes('Classe 1') || raw.includes('قسم أول') || raw.includes('Principal') || raw.includes('رئيسي')) {
      if (isPrimary) {
        rankName = language === 'ar' ? 'أستاذ المدرسة الابتدائية قسم أول' : language === 'fr' ? "Professeur de l'École Primaire - Classe 1" : 'Primary School Teacher - Class 1';
      } else if (isSecondary) {
        rankName = language === 'ar' ? 'أستاذ التعليم الثانوي قسم أول' : language === 'fr' ? "Professeur d'Enseignement Secondaire - Classe 1" : 'Secondary School Teacher - Class 1';
      } else {
        rankName = language === 'ar' ? 'أستاذ التعليم المتوسط قسم أول' : language === 'fr' ? "Professeur d'Enseignement Moyen - Classe 1" : 'Middle School Teacher - Class 1';
      }
    } else if (raw.includes('Stagiaire') || raw.includes('متربص')) {
      rankName = language === 'ar' ? 'أستاذ متربص' : language === 'fr' ? 'Professeur Stagiaire' : 'Trainee Teacher';
    } else if (raw.includes('Contractuel') || raw.includes('متعاقد')) {
      rankName = language === 'ar' ? 'أستاذ متعاقد' : language === 'fr' ? 'Professeur Contractuel' : 'Contract Teacher';
    } else if (raw.includes('Remplaçant') || raw.includes('مستخلف')) {
      rankName = language === 'ar' ? 'أستاذ مستخلف' : language === 'fr' ? 'Professeur Remplaçant' : 'Substitute Teacher';
    } else {
      if (isPrimary) {
        rankName = language === 'ar' ? 'أستاذ المدرسة الابتدائية' : language === 'fr' ? "Professeur de l'École Primaire" : 'Primary School Teacher';
      } else if (isSecondary) {
        rankName = language === 'ar' ? 'أستاذ التعليم الثانوي' : language === 'fr' ? "Professeur d'Enseignement Secondaire" : 'Secondary School Teacher';
      } else {
        rankName = language === 'ar' ? 'أستاذ التعليم المتوسط' : language === 'fr' ? "Professeur d'Enseignement Moyen" : 'Middle School Teacher';
      }
    }

    if (echelon) {
      const echelonLabel = language === 'ar' ? `الدرجة ${echelon}` : language === 'fr' ? `Échelon ${echelon}` : `Step ${echelon}`;
      return `${rankName} • ${echelonLabel}`;
    }

    return rankName;
  }, [teacherProfile?.corpsRank, teacherProfile?.echelon, language]);

  // Compute Current Term (Trimestre) based on selected academic year & active calendar date
  const currentTerm = useMemo(() => {
    if (!selectedAcademicYear?.terms || selectedAcademicYear.terms.length === 0) {
      return {
        termNumber: 1,
        label: language === 'ar' ? 'الفصل الأول' : language === 'fr' ? '1er Trimestre' : 'Term 1',
      };
    }
    const todayIso = currentTime.toISOString().split('T')[0];
    const found = selectedAcademicYear.terms.find((t) => todayIso >= t.startDate && todayIso <= t.endDate);
    if (found) {
      const label = language === 'ar'
        ? (found.termNumber === 1 ? 'الفصل الأول' : found.termNumber === 2 ? 'الفصل الثاني' : 'الفصل الثالث')
        : language === 'fr'
        ? (found.termNumber === 1 ? '1er Trimestre' : found.termNumber === 2 ? '2ème Trimestre' : '3ème Trimestre')
        : `Term ${found.termNumber}`;
      return { termNumber: found.termNumber, label };
    }
    const first = selectedAcademicYear.terms[0];
    const label = language === 'ar'
      ? (first.termNumber === 1 ? 'الفصل الأول' : first.termNumber === 2 ? 'الفصل الثاني' : 'الفصل الثالث')
      : language === 'fr'
      ? (first.termNumber === 1 ? '1er Trimestre' : first.termNumber === 2 ? '2ème Trimestre' : '3ème Trimestre')
      : `Term ${first.termNumber}`;
    return { termNumber: first.termNumber, label };
  }, [selectedAcademicYear, currentTime, language]);

  // Weather Icon Component
  const renderWeatherIcon = (iconType: WeatherData['iconType'] | undefined) => {
    switch (iconType) {
      case 'sunny':
        return <Sun className="w-7 h-7 text-amber-400 drop-shadow-sm animate-spin-slow" />;
      case 'partly-cloudy':
        return <CloudSun className="w-7 h-7 text-amber-300 drop-shadow-sm" />;
      case 'cloudy':
        return <Cloud className="w-7 h-7 text-slate-300 drop-shadow-sm" />;
      case 'rain':
        return <CloudRain className="w-7 h-7 text-blue-300 drop-shadow-sm" />;
      case 'thunder':
        return <CloudLightning className="w-7 h-7 text-yellow-300 drop-shadow-sm" />;
      case 'snow':
        return <Snowflake className="w-7 h-7 text-cyan-200 drop-shadow-sm" />;
      case 'fog':
        return <CloudFog className="w-7 h-7 text-slate-300 drop-shadow-sm" />;
      default:
        return <Sun className="w-7 h-7 text-amber-400 drop-shadow-sm" />;
    }
  };

  const coreModules = [
    // Teaching & Journal
    { to: '/timetable', title: 'Timetable', titleAr: 'التوقيت الأسبوعي', category: 'TEACHING', icon: CalendarDays, desc: 'Weekly schedule & period management (Sun-Thu)', descAr: 'جدول الحصص والتوزيع الأسبوعي (الأحد – الخميس)', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/lessons', title: 'Lessons & Sessions', titleAr: 'الدروس والحصص', category: 'TEACHING', icon: BookOpen, desc: 'Pedagogical sessions & inspection log view', descAr: 'الحصص التعليمية وسجل التفتيش التربوي', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/cahier-journal', title: 'Cahier Journal', titleAr: 'دفتر اليومية', category: 'TEACHING', icon: ClipboardList, desc: 'Official inspection day-log derived from lessons', descAr: 'سجل التفتيش اليومي الرسمي المستخرج من الحصص', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/cahier-textes', title: 'Cahier de Textes', titleAr: 'دفتر النصوص', category: 'TEACHING', icon: FileText, desc: 'Chronological class register and homework link', descAr: 'السجل الزمني للأقسام والواجبات المدرسية', status: 'Live', statusAr: 'جاهز' },
    { to: '/planning', title: 'Planning & Pacing', titleAr: 'التدرج السنوي والمخطط', category: 'TEACHING', icon: Calendar, desc: 'Yearly progression & curriculum sequence tracker', descAr: 'التدرج البيداغوجي السنوي وتتبع المقاطع التعليمية', status: 'Live', statusAr: 'جاهز' },
    { to: '/curriculum', title: 'Curriculum Explorer', titleAr: 'المنهاج والبرامج الرسمية', category: 'TEACHING', icon: Layers, desc: 'Algerian MEN middle school syllabus (1AM-4AM)', descAr: 'مناهج التعليم المتوسط لوزارة التربية الوطنية (1م - 4م)', status: 'Live', statusAr: 'جاهز' },

    // Students & Classes
    { to: '/classes', title: 'Classes & Workspaces', titleAr: 'الأفواج التربوية', category: 'STUDENTS', icon: Users, desc: 'School classes, divisions & class rosters', descAr: 'إدارة الأفواج المدرسية وقوائم التلاميذ', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/students', title: 'Students Registry', titleAr: 'سجل التلاميذ', category: 'STUDENTS', icon: GraduationCap, desc: 'Permanent student registry & matricule tracking', descAr: 'القيد الدائم للتلاميذ وأرقام التعريف المدرسية', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/attendance', title: 'Attendance Register', titleAr: 'سجل الحضور والغياب', category: 'STUDENTS', icon: UserCheck, desc: 'Lesson-anchored roll call & attendance grids', descAr: 'تسجيل المناداة اليومية وشبكات الغياب والحضور', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/observations', title: 'Observations', titleAr: 'الملاحظات والتقويم', category: 'STUDENTS', icon: MessageSquare, desc: 'Behavioral logs & pedagogical notes', descAr: 'السجل السلوكي والملاحظات البيداغوجية للتلميذ', status: 'Live', statusAr: 'جاهز', highlight: true },

    // Assessment & Progress
    { to: '/assessment', title: 'Assessments', titleAr: 'التقويمات والفروض', category: 'ASSESSMENT', icon: Award, desc: 'Continuous evaluations, tests & official exams', descAr: 'المراقبة المستمرة، الفروض والامتحانات الرسمية', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/gradebook', title: 'Teacher Gradebook', titleAr: 'دفتر النقاط والعلامات', category: 'ASSESSMENT', icon: BookMarked, desc: 'Term averages, evaluation sheets & score sheets', descAr: 'حساب المعدلات الفصلية وكشوف النقاط التفصيلية', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/homework', title: 'Homework Assignments', titleAr: 'الواجبات والأنشطة', category: 'ASSESSMENT', icon: PenTool, desc: 'Class homework, exercises & due dates', descAr: 'الواجبات المنزلية، التمارين ومواعيد التسليم', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/remediation', title: 'Remediation', titleAr: 'المعالجة البيداغوجية', category: 'ASSESSMENT', icon: Activity, desc: 'Targeted support sessions & intervention plans', descAr: 'حصص الدعم والاستدراك التربوي وخطط التدخل', status: 'Live', statusAr: 'جاهز', highlight: true },

    // School Administration
    { to: '/academic-years', title: 'Academic Years', titleAr: 'السنوات الدراسية', category: 'ADMIN', icon: Calendar, desc: 'School profile & academic term calendar', descAr: 'ملف المؤسسة ورزنامة الفصول الدراسية', status: 'Live', statusAr: 'جاهز', highlight: true },
    { to: '/calendar', title: 'Academic Calendar', titleAr: 'الرزنامة المدرسية', category: 'ADMIN', icon: CalendarDays, desc: 'Trimester dates, official exams & holidays', descAr: 'تواريخ الفصول، العطل المدرسية والامتحانات الرسمية', status: 'Live', statusAr: 'جاهز' },
    { to: '/resources', title: 'Teaching Resources', titleAr: 'الموارد التعليمية', category: 'ADMIN', icon: FolderOpen, desc: 'Offline lesson plans, worksheets & grammar cards', descAr: 'المذكرات، أوراق العمل وبطاقات القواعد دون إنترنت', status: 'Live', statusAr: 'جاهز' },
    { to: '/reports', title: 'Official Reports', titleAr: 'التقارير والمطبوعات', category: 'ADMIN', icon: Printer, desc: 'Printable rosters, transcripts & inspection records', descAr: 'طباعة القوائم الاسمية، الكشوف واستمارات التفتيش', status: 'Live', statusAr: 'جاهز' },
    { to: '/backup', title: 'Backup & Restore', titleAr: 'النسخ الاحتياطي', category: 'ADMIN', icon: DatabaseBackup, desc: 'Local .unsschool package creation & restoration', descAr: 'تصدير واستيراد حزمة البيانات المحلية الآمنة', status: 'Live', statusAr: 'جاهز' },
    { to: '/settings', title: 'Settings & Diagnostics', titleAr: 'الإعدادات والتشخيص', category: 'ADMIN', icon: Settings, desc: 'Storage persistence & diagnostic telemetry', descAr: 'التحقق من التخزين الدائم والتشخيص التقني', status: 'Live', statusAr: 'جاهز' },
  ];

  const filteredModules = useMemo(() => {
    if (selectedCategory === 'ALL') return coreModules;
    return coreModules.filter((m) => m.category === selectedCategory);
  }, [selectedCategory, coreModules]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Teacher Welcome, Dynamic Day/Time Greeting, Real-Time Weather & School Setup Card */}
      <div
        id="dashboard-teacher-welcome-card"
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white shadow-xl border border-emerald-600/30 p-4 sm:p-6 lg:p-7"
      >
        {/* Subtle background ambient geometric accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          {/* Main Greeting, Identity & Pedagogical Context */}
          <div className="space-y-3 max-w-2xl flex-1">
            {/* Top Status Row: Time-of-Day Greeting & School Day Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-semibold backdrop-blur-md shadow-xs">
                {React.createElement(greetingPhrase.icon, { className: 'w-3.5 h-3.5 text-amber-300 shrink-0' })}
                <span>{greetingPhrase[language] || greetingPhrase.en}</span>
              </div>

              {/* School Day Status Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs border ${
                  todaySlots.length > 0
                    ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                    : 'bg-amber-500/25 border-amber-400/40 text-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${todaySlots.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>
                  {todaySlots.length > 0
                    ? language === 'ar'
                      ? 'يوم دراسي'
                      : language === 'fr'
                      ? 'Jour Scolaire Actif'
                      : 'Active School Day'
                    : language === 'ar'
                    ? 'يوم راحة'
                    : language === 'fr'
                    ? 'Jour de Congé'
                    : 'Day Off'}
                </span>
              </div>
            </div>

            {/* Teacher Name Heading */}
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                <span className="text-white">{teacherDisplayName}</span>
              </h1>

              {/* Under the Name: Clean Badge Hierarchy (Subject, Rank, School) */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Subject Pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-[11px] sm:text-xs font-semibold text-emerald-200 backdrop-blur-sm shadow-xs">
                  <Sparkles className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span>{localizedSubject}</span>
                </span>

                {/* Teacher Corps Rank & Echelon Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-black/20 border border-white/10 text-[11px] sm:text-xs font-medium text-emerald-200/90 backdrop-blur-sm shadow-xs">
                  <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{teacherRankDisplay}</span>
                </div>

                {/* School Establishment Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-black/30 border border-white/10 text-[11px] sm:text-xs font-medium text-white backdrop-blur-sm shadow-xs">
                  <SchoolIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{displaySchoolName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Container: Current Term + Academic Year + Live Date & Time + Weather */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-3.5 sm:p-4 text-white shadow-xl space-y-3 shrink-0 lg:w-80">
            {/* Row 1: Academic Year & Current Term Badges */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              {/* Current Term Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-xs">
                <BookMarked className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{currentTerm.label}</span>
              </div>

              {/* Academic Year Badge */}
              {isArchived ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/90 text-slate-950 text-xs font-bold shadow-xs">
                  {language === 'ar' ? 'موسم مؤرشف' : 'Archived Year'}
                </span>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-emerald-100 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{selectedAcademicYear?.label || '2026/2027'}</span>
                </div>
              )}
            </div>

            {/* Row 2: Live Algerian Date & Digital Clock */}
            <div className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-black text-white tracking-wider leading-none">
                    {formattedTime}
                  </div>
                  <div className="text-[11px] text-emerald-200/90 font-medium mt-1 capitalize flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Real-Time Weather Forecast & Atmosphere */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-xl bg-white/15 shrink-0 flex items-center justify-center">
                  {renderWeatherIcon(weather?.iconType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-white tracking-tight">
                      {weather?.temperature !== undefined ? `${weather.temperature}°C` : '--°C'}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-200 truncate max-w-[95px]">
                      {weather ? (weather.conditionLabel[language] || weather.conditionLabel.en) : 'Algeria'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-200/80 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Droplets className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
                      {weather?.humidity || 55}%
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                      {weather?.windSpeed || 12} km/h
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={loadWeather}
                disabled={isWeatherLoading}
                title={language === 'ar' ? 'تحديث الطقس المباشر' : 'Refresh Weather'}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Teacher Workload & Pedagogical Overview Card */}
      <div
        id="dashboard-teacher-work-overview-card"
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar'
                  ? 'بيانات العمل والتوزيع البيداغوجي للأستاذ'
                  : language === 'fr'
                  ? 'Aperçu du Travail et Répartition Pédagogique'
                  : 'Teacher Workload & Pedagogical Overview'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'الأفواج المسندة، تعداد التلاميذ، الحجم الساعي الأسبوعي، والبرنامج اليومي'
                  : 'Assigned divisions, student enrollment, weekly timetable quota, and daily schedule'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/teacher-profile"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>{language === 'ar' ? 'استمارة معلومات الأستاذ' : 'Full Teacher Dossier'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Main 4 Core Workload Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Pillar 1: Classes & Level Distribution */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'الأفواج التربوية المسندة' : 'Assigned Classes'}
                </span>
                <Badge variant="default" className="text-[10px]">
                  {classCount} {language === 'ar' ? 'أفواج' : 'Classes'}
                </Badge>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                {classCount}
              </div>

              {/* Levels Breakdown Badges */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(classesByLevel).map(([lvl, lvlClasses]) =>
                  lvlClasses.length > 0 ? (
                    <span
                      key={lvl}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200"
                    >
                      {lvl}: {lvlClasses.map((c) => c.name).join(', ')}
                    </span>
                  ) : null
                )}
                {classCount === 0 && (
                  <span className="text-[11px] text-slate-400 italic">
                    {language === 'ar' ? 'لم تسند أقسام بعد' : 'No classes assigned'}
                  </span>
                )}
              </div>
            </div>

            <Link
              to="/classes"
              className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>{language === 'ar' ? 'إدارة الأفواج والقوائم' : 'Manage Class Rosters'}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
          </div>

          {/* Pillar 2: Total Students Enrolled */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'تعداد التلاميذ الإجمالي' : 'Total Students'}
                </span>
                <Badge variant="success" className="text-[10px]">
                  {enrolledCount} {language === 'ar' ? 'نشط' : 'Active'}
                </Badge>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                {enrolledCount}{' '}
                <span className="text-xs font-medium text-slate-500">
                  ({totalStudentsCount} {language === 'ar' ? 'في السجل' : 'registered'})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {classCount > 0
                  ? language === 'ar'
                    ? `معدل الكثافة: حوالي ${Math.round(enrolledCount / classCount)} تلميذ لكل فوج`
                    : `Average: ~${Math.round(enrolledCount / classCount)} students per class`
                  : language === 'ar'
                  ? 'جاهز لقيد التلاميذ'
                  : 'Ready for student enrollment'}
              </p>
            </div>

            <Link
              to="/students"
              className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>{language === 'ar' ? 'سجل التلاميذ الدائم' : 'Student Registry'}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
          </div>

          {/* Pillar 3: Weekly Workload & Quota */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'الحجم الساعي الأسبوعي' : 'Weekly Teaching Hours'}
                </span>
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                  {timetableSlotsCount}h / {teacherProfile?.weeklyHoursQuota || 18}h
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                {timetableSlotsCount}{' '}
                <span className="text-xs font-medium text-slate-500">
                  {language === 'ar' ? 'ساعة / أسبوع' : 'hours / week'}
                </span>
              </div>

              {/* Quota Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      timetableSlotsCount >= (teacherProfile?.weeklyHoursQuota || 18)
                        ? 'bg-emerald-500'
                        : 'bg-teal-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (timetableSlotsCount / (teacherProfile?.weeklyHoursQuota || 18)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>
                    {language === 'ar' ? 'النصاب القانوني:' : 'Statutory Quota:'}{' '}
                    {teacherProfile?.weeklyHoursQuota || 18}h
                  </span>
                  <span>
                    {Math.round(
                      (timetableSlotsCount / (teacherProfile?.weeklyHoursQuota || 18)) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/timetable"
              className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>{language === 'ar' ? 'عرض التوقيت الأسبوعي' : 'View Timetable'}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
          </div>

          {/* Pillar 4: Today's Schedule & Journal Progress */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'ar' ? 'حصص اليوم' : "Today's Schedule"}
                </span>
                <Badge variant={todaySlots.length > 0 ? 'default' : 'neutral'} className="text-[10px]">
                  {isAlgerianSchoolDay
                    ? todaySlots.length > 0
                      ? `${todaySlots.length} ${language === 'ar' ? 'حصص' : 'classes'}`
                      : language === 'ar'
                      ? 'لا حصص'
                      : 'Free'
                    : language === 'ar'
                    ? 'عطلة'
                    : 'Weekend'}
                </Badge>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {todaySlots.length}{' '}
                <span className="text-xs font-medium text-slate-500">
                  {language === 'ar' ? 'حصص مبرمجة' : 'sessions scheduled'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lessonsCount}{' '}
                {language === 'ar' ? 'حصة مسجلة في دفتر اليومية' : 'sessions logged in Cahier Journal'}
              </p>
            </div>

            <Link
              to="/lessons"
              className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>{language === 'ar' ? 'تسجيل دفتر اليومية' : 'Log Daily Lesson'}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Administrative & Status Footer Ribbon */}
        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'الرتبة:' : 'Corps & Rank:'}
                </strong>{' '}
                {teacherProfile?.corpsRank || "Professeur d'Enseignement Moyen (PEM)"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'الدرجة:' : 'Échelon:'}
                </strong>{' '}
                {teacherProfile?.echelon
                  ? `${language === 'ar' ? 'الدرجة ' : 'Échelon '}${teacherProfile.echelon}`
                  : 'Échelon 3'}
              </span>
            </div>

            {teacherProfile?.inspectorDistrict && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'المقاطعة التفتيشية:' : 'Inspection District:'}
                  </strong>{' '}
                  {teacherProfile.inspectorDistrict}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/reports"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'المطبوعات الرسمية' : 'Official Printouts'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Teacher Quick Actions Strip (Mobile-Optimized 1-Tap Shortcuts) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          {language === 'ar' ? 'العمليات السريعة اليومية' : language === 'fr' ? 'Actions Rapides Quotidiennes' : 'Daily Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Link
            to="/attendance"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs hover:border-emerald-500 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 leading-tight">
                {language === 'ar' ? 'تسجيل الغياب' : language === 'fr' ? "Faire l'appel" : 'Take Roll Call'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {language === 'ar' ? 'مناداة الحصة' : language === 'fr' ? 'Présence du cours' : 'Mark attendance'}
              </div>
            </div>
          </Link>

          <Link
            to="/lessons"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-2xs hover:border-blue-500 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 leading-tight">
                {language === 'ar' ? 'تسجيل درس' : language === 'fr' ? 'Consigner cours' : 'Log Lesson'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {language === 'ar' ? 'دفتر اليومية' : 'Cahier journal'}
              </div>
            </div>
          </Link>

          <Link
            to="/timetable"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 shadow-2xs hover:border-teal-500 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 leading-tight">
                {language === 'ar' ? 'التوقيت الأسبوعي' : language === 'fr' ? 'Emploi du temps' : 'Timetable'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {language === 'ar' ? 'حصص اليوم' : language === 'fr' ? "Cours d'aujourd'hui" : "Today's classes"}
              </div>
            </div>
          </Link>

          <Link
            to="/gradebook"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-2xs hover:border-purple-500 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
              <BookMarked className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 leading-tight">
                {language === 'ar' ? 'دفتر النقاط' : language === 'fr' ? 'Carnet de notes' : 'Gradebook'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {language === 'ar' ? 'رصد العلامات' : language === 'fr' ? 'Saisir les notes' : 'Enter scores'}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Metrics Cards (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card bodyClassName="p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'الأفواج التربوية' : language === 'fr' ? 'Classes' : 'Classes'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
              {classCount}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {enrolledCount} {language === 'ar' ? 'تلميذ مسجل' : language === 'fr' ? 'élèves inscrits' : 'students enrolled'}
              </span>
            </p>
          </div>
        </Card>

        <Card bodyClassName="p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'الحجم الساعي' : language === 'fr' ? 'Charge horaire' : 'Weekly Load'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
              {timetableSlotsCount} <span className="text-sm sm:text-base font-semibold text-slate-500">{language === 'ar' ? 'سا' : 'hrs'}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              <span>
                {language === 'ar' ? 'توقيت الأحد – الخميس' : language === 'fr' ? 'Emploi Dim–Jeu' : 'Sun–Thu timetable'}
              </span>
            </p>
          </div>
        </Card>

        <Card bodyClassName="p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'الدروس المسجلة' : language === 'fr' ? 'Séances consignées' : 'Lessons Logged'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
              {lessonsCount}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>
                {language === 'ar' ? 'قيود دفتر اليومية' : language === 'fr' ? 'Entrées journal' : 'Journal entries'}
              </span>
            </p>
          </div>
        </Card>

        <Card bodyClassName="p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'التخزين المحلي' : language === 'fr' ? 'Stockage local' : 'Local Storage'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
              {telemetry ? telemetry.formattedUsage : (language === 'ar' ? 'محلي' : 'Local')}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>
                {telemetry?.persistenceState === 'PERSISTENCE_GRANTED'
                  ? (language === 'ar' ? 'تخزين دائم ومرخص' : 'Persistent Storage')
                  : (language === 'ar' ? 'قاعدة بيانات محلية' : 'IndexedDB Local')}
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* Modules Directory with Category Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'وحدات مساحة العمل' : language === 'fr' ? 'Modules Espace de Travail' : 'Workspace Modules'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'ar' ? 'جميع أدوات أستاذ التعليم المتوسط للغة الإنجليزية' : 'All tools for Algerian middle school English instruction'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {(
              [
                { id: 'ALL', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
                { id: 'TEACHING', label: language === 'ar' ? 'التدريس' : language === 'fr' ? 'Enseignement' : 'Teaching' },
                { id: 'STUDENTS', label: language === 'ar' ? 'التلاميذ' : language === 'fr' ? 'Élèves' : 'Students' },
                { id: 'ASSESSMENT', label: language === 'ar' ? 'التقويم' : language === 'fr' ? 'Évaluation' : 'Assessment' },
                { id: 'ADMIN', label: language === 'ar' ? 'الإدارة' : language === 'fr' ? 'Administration' : 'Admin' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedCategory(filter.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === filter.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
          {filteredModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.to}
                to={module.to}
                className={`p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all shadow-2xs group flex flex-col justify-between ${
                  module.highlight
                    ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 ring-1 ring-emerald-500/15'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors ${
                        module.highlight
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <Badge variant={module.highlight ? 'success' : 'neutral'} className="text-[10px]">
                      {language === 'ar' ? module.statusAr : module.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {language === 'ar' ? module.titleAr : module.title}
                  </h4>
                  <p className="mt-0.5 sm:mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {language === 'ar' ? module.descAr : module.desc}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">
                    {language === 'ar' ? `فتح ${module.titleAr}` : `Open ${module.title}`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-transform text-emerald-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Teacher Profile Management Modal */}
      {isProfileModalOpen && teacherProfile && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          profile={teacherProfile}
          onClose={() => setIsProfileModalOpen(false)}
          onProfileUpdated={(updated) => {
            setTeacherProfile(updated);
          }}
        />
      )}
    </div>
  );
};
