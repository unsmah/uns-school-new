/**
 * UNS SCHOOL — Main Application Root
 * Sets up ErrorBoundary, I18nProvider, ThemeProvider, and React Router DOM.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ThemeProvider } from './theme/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { AppLayout } from './components/layout/AppLayout';

import { db } from './db/database';
import { seedInitialData } from './db/seeds';

// Feature Views
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AcademicYearsPage } from './features/academic-years/AcademicYearsPage';
import { ClassesPage } from './features/classes/ClassesPage';
import { StudentsPage } from './features/students/StudentsPage';
import { TimetablePage } from './features/timetable/TimetablePage';
import { PlanningPage } from './features/planning/PlanningPage';
import { LessonsPage } from './features/lessons/LessonsPage';
import { CahierJournalPage } from './features/cahier-journal/CahierJournalPage';
import { CahierTextesPage } from './features/cahier-textes/CahierTextesPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { AssessmentPage } from './features/assessment/AssessmentPage';
import { GradebookPage } from './features/gradebook/GradebookPage';
import { CurriculumPage } from './features/curriculum/CurriculumPage';
import { ResourcesPage } from './features/resources/ResourcesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TeacherProfilePage } from './features/teacher-profile/TeacherProfilePage';
import { BackupPage } from './features/backup/BackupPage';

import { HomeworkPage } from './features/homework/HomeworkPage';
import { ObservationsPage } from './features/observations/ObservationsPage';
import { RemediationPage } from './features/remediation/RemediationPage';

function InitializationGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const initializeApp = React.useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      await seedInitialData(db);
      setStatus('ready');
    } catch (err: unknown) {
      console.error('[UNS SCHOOL] Application initialization error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize local IndexedDB storage.');
    }
  }, []);

  React.useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-800 dark:slate-100">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            UNS SCHOOL
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Initializing offline database and verifying curriculum schema...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-800 dark:slate-100">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400 mb-3">
            <span className="text-2xl font-bold">⚠️</span>
            <h2 className="text-lg font-bold">Initialization Error</h2>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            UNS SCHOOL encountered an issue while initializing local IndexedDB storage:
          </p>
          <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg text-xs font-mono text-rose-800 dark:text-rose-300 mb-5 break-words">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={initializeApp}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Retry Database Initialization
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <InitializationGate>
            <AcademicYearProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="academic-years" element={<AcademicYearsPage />} />
                    <Route path="classes" element={<ClassesPage />} />
                    <Route path="classes/:classId" element={<ClassesPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="timetable" element={<TimetablePage />} />
                    <Route path="planning" element={<PlanningPage />} />
                    <Route path="lessons" element={<LessonsPage />} />
                    <Route path="cahier-journal" element={<CahierJournalPage />} />
                    <Route path="cahier-textes" element={<CahierTextesPage />} />
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="assessment" element={<AssessmentPage />} />
                    <Route path="assessments" element={<Navigate to="/assessment" replace />} />
                    <Route path="gradebook" element={<GradebookPage />} />
                    <Route path="homework" element={<HomeworkPage />} />
                    <Route path="observations" element={<ObservationsPage />} />
                    <Route path="remediation" element={<RemediationPage />} />
                    <Route path="curriculum" element={<CurriculumPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="teacher-profile" element={<TeacherProfilePage />} />
                    <Route path="profile" element={<TeacherProfilePage />} />
                    <Route path="backup" element={<BackupPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AcademicYearProvider>
          </InitializationGate>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
