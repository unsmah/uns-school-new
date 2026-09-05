/**
 * UNS SCHOOL — Application Shell Layout
 * Concept: "Digital Teacher's Desk"
 * Elegant, focused workspace for Algerian middle school English teachers.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';
import { StorageIndicator } from '../storage/StorageIndicator';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { AcademicYearSelector } from '../academic-year/AcademicYearSelector';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, language, setLanguage } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();

  const navigationItems = [
    { to: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/academic-years', label: t('nav_academic_years'), icon: Calendar },
    { to: '/classes', label: t('nav_classes'), icon: Users },
    { to: '/students', label: t('nav_students'), icon: GraduationCap },
    { to: '/planning', label: t('nav_planning'), icon: CalendarDays },
    { to: '/lessons', label: t('nav_lessons'), icon: BookOpen },
    { to: '/cahier-journal', label: t('nav_cahier_journal'), icon: ClipboardList },
    { to: '/cahier-textes', label: t('nav_cahier_textes'), icon: FileText },
    { to: '/attendance', label: t('nav_attendance'), icon: UserCheck },
    { to: '/assessment', label: t('nav_assessment'), icon: Award },
    { to: '/gradebook', label: t('nav_gradebook'), icon: BookMarked },
    { to: '/curriculum', label: t('nav_curriculum'), icon: BookOpen },
    { to: '/resources', label: t('nav_resources'), icon: FolderOpen },
    { to: '/reports', label: t('nav_reports'), icon: Printer },
    { to: '/calendar', label: t('nav_calendar'), icon: Calendar },
    { to: '/settings', label: t('nav_settings'), icon: Settings },
    { to: '/backup', label: t('nav_backup'), icon: DatabaseBackup },
  ];

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'fr' | 'ar');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Toggle navigation sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              UNS
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                {t('app_title')}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {t('app_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AcademicYearSelector />
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
              <option value="en">English (EN)</option>
              <option value="fr">Français (FR)</option>
              <option value="ar">العربية (AR)</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`fixed inset-y-14 start-0 z-30 w-64 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'
          }`}
        >
          <div className="p-3 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Workspaces
          </div>
          <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Local-First PWA</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
              v1.0.0
            </span>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
};
