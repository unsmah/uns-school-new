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
import { BackupPage } from './features/backup/BackupPage';

export function App() {
  React.useEffect(() => {
    seedInitialData(db).catch((err) => {
      console.error('[UNS SCHOOL] Initial seeding warning:', err);
    });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
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
                  <Route path="gradebook" element={<GradebookPage />} />
                  <Route path="curriculum" element={<CurriculumPage />} />
                  <Route path="resources" element={<ResourcesPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="backup" element={<BackupPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AcademicYearProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
