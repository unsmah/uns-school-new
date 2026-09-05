/**
 * UNS SCHOOL — Dashboard
 * Overview of the digital teacher's desk with active academic year metrics and operational shortcuts.
 */

import React, { useEffect, useState } from 'react';
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
  Activity
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  classRepository,
  studentEnrollmentRepository,
  studentPersonRepository,
  timetableRepository,
  lessonRepository,
  attendanceRepository,
} from '../../db/repositories';
import { checkStorageTelemetry, type StorageTelemetry } from '../../services/storageTelemetryService';
import type { TimetableSlot, Lesson } from '../../types';

export const DashboardPage: React.FC = () => {
  const { school, selectedAcademicYear, isArchived } = useAcademicYear();
  const [telemetry, setTelemetry] = useState<StorageTelemetry | null>(null);
  const [classCount, setClassCount] = useState<number>(0);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [timetableSlotsCount, setTimetableSlotsCount] = useState<number>(0);
  const [lessonsCount, setLessonsCount] = useState<number>(0);

  useEffect(() => {
    checkStorageTelemetry().then(setTelemetry);
  }, []);

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
        setClassCount(yearClasses.length);
        setEnrolledCount(yearEnrollments.filter((e) => e.status === 'active').length);
        setTotalStudentsCount(allPersons.length);
        setTimetableSlotsCount(yearSlots.length);
        setLessonsCount(yearLessons.length);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      }
    }
    loadYearStats();
  }, [selectedAcademicYear]);

  const coreModules = [
    { to: '/timetable', title: 'Timetable', icon: CalendarDays, desc: 'Weekly schedule & period management (Sun-Thu)', status: 'Phase 3 Live', highlight: true },
    { to: '/lessons', title: 'Lessons & Sessions', icon: BookOpen, desc: 'Pedagogical sessions & Cahier Journal inspection view', status: 'Phase 3 Live', highlight: true },
    { to: '/attendance', title: 'Attendance Register', icon: UserCheck, desc: 'Lesson-anchored roll call & class statistics', status: 'Phase 3 Live', highlight: true },
    { to: '/homework', title: 'Homework', icon: PenTool, desc: 'Student assignments & due dates', status: 'Phase 7 Live', highlight: true },
    { to: '/observations', title: 'Observations', icon: MessageSquare, desc: 'Pedagogical notes & behaviour tracking', status: 'Phase 7 Live', highlight: true },
    { to: '/remediation', title: 'Remediation', icon: Activity, desc: 'Targeted support sessions & interventions', status: 'Phase 7 Live', highlight: true },
    { to: '/classes', title: 'Classes & Workspaces', icon: Users, desc: 'School classes, level divisions & class workspaces', status: 'Phase 3 Live', highlight: true },
    { to: '/students', title: 'Students', icon: GraduationCap, desc: 'StudentPerson & multi-year historical context', status: 'Phase 2 Live', highlight: true },
    { to: '/academic-years', title: 'Academic Years', icon: Calendar, desc: 'School profile & academic year lifecycle', status: 'Phase 2 Live', highlight: true },
    { to: '/cahier-journal', title: 'Cahier Journal', icon: ClipboardList, desc: 'Derived daily inspection logbook', status: 'Phase 3 Live', highlight: true },
    { to: '/cahier-textes', title: 'Cahier de Textes', icon: FileText, desc: 'Derived chronological class register', status: 'Foundation' },
    { to: '/planning', title: 'Planning', icon: CalendarDays, desc: 'Yearly progression & sequence tracker', status: 'Foundation' },
    { to: '/curriculum', title: 'Curriculum', icon: Layers, desc: 'Data-driven versioned Algerian syllabus', status: 'Foundation' },
    { to: '/assessment', title: 'Assessments', icon: Award, desc: 'Continuous assessments, tests & exams', status: 'Foundation' },
    { to: '/gradebook', title: 'Gradebook', icon: BookMarked, desc: 'Configurable grading engine & averages', status: 'Foundation' },
    { to: '/resources', title: 'Resources', icon: FolderOpen, desc: 'Local offline teaching materials', status: 'Foundation' },
    { to: '/reports', title: 'Reports', icon: Printer, desc: 'Printable deliberation sheets & transcripts', status: 'Foundation' },
    { to: '/backup', title: 'Backup & Restore', icon: DatabaseBackup, desc: 'Portable .unsschool package exporter', status: 'Foundation' },
    { to: '/settings', title: 'Settings', icon: Settings, desc: 'School identity, grading & storage diagnostics', status: 'Foundation' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-[11px] font-semibold tracking-wide uppercase">
                Digital Teacher&apos;s Desk
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-medium">
                Phase 3 Classroom Operations Live
              </span>
              {isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/80 text-[11px] font-semibold">
                  Archived Year (Read-Only)
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {school ? school.name : 'UNS SCHOOL'}
            </h2>
            <p className="mt-1 text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
              Active Academic Year:{' '}
              <strong className="text-white font-semibold">
                {selectedAcademicYear ? selectedAcademicYear.label : 'None Configured'}
              </strong>
              {school?.wilaya ? ` • Wilaya: ${school.wilaya}` : ''}
              {school?.commune ? ` • Commune: ${school.commune}` : ''}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              to="/timetable"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-emerald-900 text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <span>Weekly Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Classes</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{classCount}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                {enrolledCount} active students
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Weekly Slots</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{timetableSlotsCount} hrs</h3>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                Sun–Thu schedule
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sessions Logged</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lessonsCount}</h3>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-0.5">
                Cahier journal records
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Storage Quota</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {telemetry ? telemetry.formattedUsage : 'Checking...'}
              </h3>
              <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium mt-0.5">
                {telemetry?.persistenceState === 'PERSISTENCE_GRANTED' ? 'Persistent' : 'Browser Storage'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modules Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Workspace Modules
          </h3>
          <Badge variant="default">Phase 3 Live</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {coreModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.to}
                to={module.to}
                className={`p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all shadow-xs group flex flex-col justify-between ${
                  module.highlight
                    ? 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        module.highlight
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant={module.highlight ? 'success' : 'neutral'}>
                      {module.status}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {module.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {module.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-[10px] truncate max-w-[180px]">
                    Open {module.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
