/**
 * UNS SCHOOL — Application Shell Layout
 * Concept: "Digital Teacher's Desk"
 * Mobile-first responsive architecture tailored for Algerian middle school English teachers.
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
  Menu,
  X,
  Sun,
  Moon,
  Languages,
  PenTool,
  MessageSquare,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  User,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';
import { StorageIndicator } from '../storage/StorageIndicator';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { AcademicYearSelector } from '../academic-year/AcademicYearSelector';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { TeacherProfile } from '../../types';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobilePrefsOpen, setMobilePrefsOpen] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const { t, language, setLanguage, direction } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    teacherRepository.get().then((p) => {
      if (p) setTeacherProfile(p);
    });
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navigationGroups = [
    {
      title: language === 'ar' ? 'التدريس واليومية' : language === 'fr' ? 'Enseignement & Journal' : 'Daily Teaching & Logs',
      items: [
        { to: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
        { to: '/timetable', label: t('nav_timetable'), icon: CalendarDays },
        { to: '/lessons', label: t('nav_lessons'), icon: BookOpen },
        { to: '/cahier-journal', label: t('nav_cahier_journal'), icon: ClipboardList },
        { to: '/cahier-textes', label: t('nav_cahier_textes'), icon: FileText },
        { to: '/planning', label: t('nav_planning'), icon: Calendar },
      ],
    },
    {
      title: language === 'ar' ? 'التلاميذ والأفواج' : language === 'fr' ? 'Élèves & Classes' : 'Students & Classes',
      items: [
        { to: '/classes', label: t('nav_classes'), icon: Users },
        { to: '/students', label: t('nav_students'), icon: GraduationCap },
        { to: '/attendance', label: t('nav_attendance'), icon: UserCheck },
        { to: '/observations', label: language === 'ar' ? 'الملاحظات التربوية' : 'Observations', icon: MessageSquare },
      ],
    },
    {
      title: language === 'ar' ? 'التقويم والمنهاج' : language === 'fr' ? 'Évaluation & Programme' : 'Assessment & Curriculum',
      items: [
        { to: '/assessment', label: t('nav_assessment'), icon: Award },
        { to: '/gradebook', label: t('nav_gradebook'), icon: BookMarked },
        { to: '/homework', label: language === 'ar' ? 'الواجبات المنزلية' : language === 'fr' ? 'Devoirs' : 'Homework', icon: PenTool },
        { to: '/remediation', label: language === 'ar' ? 'المعالجة البيداغوجية' : language === 'fr' ? 'Remédiation' : 'Remediation', icon: Activity },
        { to: '/curriculum', label: t('nav_curriculum'), icon: Layers },
      ],
    },
    {
      title: language === 'ar' ? 'الإدارة المدرسية والوسائل' : language === 'fr' ? 'Administration & Outils' : 'School Administration & Tools',
      items: [
        { to: '/academic-years', label: t('nav_academic_years'), icon: Calendar },
        { to: '/calendar', label: t('nav_calendar'), icon: CalendarDays },
        { to: '/resources', label: t('nav_resources'), icon: FolderOpen },
        { to: '/reports', label: t('nav_reports'), icon: Printer },
        { to: '/teacher-profile', label: t('nav_teacher_profile'), icon: User },
        { to: '/backup', label: t('nav_backup'), icon: DatabaseBackup },
        { to: '/settings', label: t('nav_settings'), icon: Settings },
      ],
    },
  ];

  const primaryBottomTabs = [
    { to: '/timetable', label: language === 'ar' ? 'التوقيت' : language === 'fr' ? 'Emploi' : 'Timetable', icon: CalendarDays },
    { to: '/classes', label: language === 'ar' ? 'الأفواج' : language === 'fr' ? 'Classes' : 'Classes', icon: Users },
    { to: '/attendance', label: language === 'ar' ? 'المناداة' : language === 'fr' ? 'Appel' : 'Roll Call', icon: UserCheck },
    { to: '/dashboard', label: language === 'ar' ? 'المكتب' : language === 'fr' ? 'Bureau' : 'Desk', icon: LayoutDashboard },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'fr' | 'ar');
  };

  const isMoreActive = !primaryBottomTabs.some((tab) => tab.to === location.pathname);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased selection:bg-emerald-500/20 overflow-hidden print:h-auto print:overflow-visible">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-lg font-medium text-xs shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top Application Header */}
      <header className="print:hidden sticky top-0 z-40 h-13 sm:h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-2.5 sm:px-6 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            aria-label="Toggle navigation sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <NavLink to="/dashboard" className="flex items-center gap-2 min-w-0 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              UNS
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                UNS SCHOOL
              </h1>
              <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {t('app_subtitle')}
              </p>
            </div>
          </NavLink>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Desktop Secondary Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <PWAInstallButton />
            <StorageIndicator />

            {/* Language Switcher */}
            <div className="relative flex items-center">
              <Languages className="w-3.5 h-3.5 absolute start-2 text-slate-400 pointer-events-none" />
              <select
                id="language-select"
                value={language}
                onChange={handleLanguageChange}
                className="ps-7 pe-2 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Select interface language"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Teacher Profile Quick Access */}
          <NavLink
            to="/teacher-profile"
            className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 dark:hover:ring-offset-slate-900 transition-all group cursor-pointer border border-slate-200/80 dark:border-slate-800"
            title={language === 'ar' ? 'الملف المهني للأستاذ' : 'Teacher Profile'}
            aria-label="Teacher Profile"
          >
            {teacherProfile?.avatarUrl ? (
              <img
                src={teacherProfile.avatarUrl}
                alt="Teacher"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-emerald-500"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {teacherProfile?.fullNameLatin ? teacherProfile.fullNameLatin.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
          </NavLink>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Desktop permanent + Mobile slide-over drawer) */}
        <aside
          className={`print:hidden fixed inset-y-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 ease-in-out shadow-2xl lg:shadow-none lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
            direction === 'rtl'
              ? `right-0 left-auto border-l border-slate-200 dark:border-slate-800 ${
                  sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                }`
              : `left-0 right-auto border-r border-slate-200 dark:border-slate-800 ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between lg:hidden bg-slate-50/80 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                UNS
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                  {t('app_title')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'التنقل في مساحة العمل' : language === 'fr' ? 'Navigation Espace' : 'Workspace Navigation'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label={t('action_close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Navigation Links */}
          <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto scrollbar-thin">
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all min-h-[38px] ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile Tools Section (Toggleable inside drawer on small screens) */}
          <div className="border-t border-slate-200 dark:border-slate-800 sm:hidden bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
            <button
              id="mobile-preferences-toggle"
              type="button"
              onClick={() => setMobilePrefsOpen(!mobilePrefsOpen)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              aria-expanded={mobilePrefsOpen}
              aria-controls="mobile-preferences-content"
            >
              <div className="flex items-center gap-2 uppercase tracking-wider">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'ar' ? 'التفضيلات والتخزين' : language === 'fr' ? 'Préférences & Stockage' : 'Preferences & Storage'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-normal">
                  {mobilePrefsOpen
                    ? (language === 'ar' ? 'إخفاء' : language === 'fr' ? 'Masquer' : 'Hide')
                    : (language === 'ar' ? 'إظهار' : language === 'fr' ? 'Afficher' : 'Show')}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    mobilePrefsOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
              </div>
            </button>

            {mobilePrefsOpen && (
              <div
                id="mobile-preferences-content"
                className="px-3 pb-3 pt-1 space-y-2.5 border-t border-slate-200/50 dark:border-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">
                    {language === 'ar' ? 'الموسم الدراسي:' : language === 'fr' ? 'Session Scolaire:' : 'Academic Session:'}
                  </span>
                  <AcademicYearSelector fullWidth showBadgeOnMobile />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'ar' ? 'اللغة:' : language === 'fr' ? 'Langue:' : 'Language:'}
                  </span>
                  <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value="en">English (EN)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ar">العربية (AR)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'ar' ? 'التخزين:' : language === 'fr' ? 'Stockage:' : 'Storage:'}
                  </span>
                  <StorageIndicator />
                </div>
                <PWAInstallButton />
              </div>
            )}
          </div>

          {/* Sidebar Teacher Identity Card */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
            <NavLink
              to="/teacher-profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
            >
              {teacherProfile?.avatarUrl ? (
                <img
                  src={teacherProfile.avatarUrl}
                  alt="Teacher"
                  className="w-8 h-8 rounded-lg object-cover border border-emerald-500 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
                  {teacherProfile?.fullNameLatin ? teacherProfile.fullNameLatin.charAt(0).toUpperCase() : 'T'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                  {teacherProfile?.fullNameLatin || 'Teacher Profile'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {language === 'ar' ? 'الملف المهني والمطبوعات' : 'Teacher Profile & Dossier'}
                </p>
              </div>
            </NavLink>
          </div>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{language === 'ar' ? 'تطبيق ويب محلي تقدمي' : 'Local-First PWA'}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">
              v1.0.0
            </span>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="print:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          />
        )}

        {/* Main Content View */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 pb-20 sm:pb-24 lg:pb-8 print:p-0 print:overflow-visible focus:outline-hidden"
        >
          <div className="max-w-6xl mx-auto print:max-w-none print:w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Hidden on desktop) */}
      <nav
        aria-label="Mobile Navigation"
        className="print:hidden lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-around px-1 py-1 pb-safe shadow-lg"
      >
        {/* "More / Menu" Toggle Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-colors min-h-[44px] cursor-pointer ${
            sidebarOpen || isMoreActive
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Open full workspace navigation"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'ar' ? 'المزيد' : language === 'fr' ? 'Plus' : 'More'}
          </span>
        </button>

        {primaryBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-colors min-h-[44px] cursor-pointer ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <OfflineIndicator />
    </div>
  );
};
