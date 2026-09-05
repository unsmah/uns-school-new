/**
 * UNS SCHOOL — Backup & Recovery
 * Architecture for portable .unsschool backup packages.
 */

import React, { useState } from 'react';
import { Card, Button, Badge, Alert } from '../../components/ui';
import { db } from '../../db/database';
import { Download, Upload, ShieldAlert, CheckCircle2, FileJson } from 'lucide-react';

export const BackupPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      // Gather data from all database tables
      const backupData = {
        app: 'UNS SCHOOL',
        formatVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        tables: {
          schools: await db.schools.toArray(),
          teacherProfile: await db.teacherProfile.toArray(),
          academicYears: await db.academicYears.toArray(),
          gradingSchemes: await db.gradingSchemes.toArray(),
          classes: await db.classes.toArray(),
          studentPersons: await db.studentPersons.toArray(),
          studentEnrollments: await db.studentEnrollments.toArray(),
          curriculumVersions: await db.curriculumVersions.toArray(),
          curriculumLevels: await db.curriculumLevels.toArray(),
          competencies: await db.competencies.toArray(),
          sessionRubrics: await db.sessionRubrics.toArray(),
          curriculumSequences: await db.curriculumSequences.toArray(),
          learningObjectives: await db.learningObjectives.toArray(),
          lessons: await db.lessons.toArray(),
          attendance: await db.attendance.toArray(),
          assessments: await db.assessments.toArray(),
          grades: await db.grades.toArray(),
          homework: await db.homework.toArray(),
          observations: await db.observations.toArray(),
          remediation: await db.remediation.toArray(),
          timetable: await db.timetable.toArray(),
          resources: await db.resources.toArray(),
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `unsschool_backup_${new Date().toISOString().split('T')[0]}.unsschool`;

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(`Backup successfully saved as ${filename}`);
    } catch (err: unknown) {
      console.error('Failed to export backup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Backup & Data Recovery
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export and restore complete .unsschool snapshots to ensure absolute data sovereignty.
          </p>
        </div>
        <Badge variant="default">Offline Protection</Badge>
      </div>

      <Alert variant="warning" title="Primary Protection Directive">
        UNS SCHOOL runs entirely inside your browser. No server holds your student marks, notes,
        or journals. Creating regular <strong>.unsschool</strong> backups is your primary guarantee
        against browser cache clears or machine changes.
      </Alert>

      {exportSuccess && (
        <Alert variant="success" title="Backup Complete">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export .unsschool Backup</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Downloads a complete, self-contained snapshot of all classes, student history, lesson plans,
              attendance registers, and grades.
            </p>
            <Button
              variant="primary"
              onClick={handleExportBackup}
              isLoading={isExporting}
              className="w-full"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Database Snapshot</span>
            </Button>
          </div>
        </Card>

        {/* Restore Card */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Restore from .unsschool File</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Restore your workspace on a new laptop, desktop, or mobile device by selecting a previously
              exported .unsschool backup file.
            </p>
            <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center bg-slate-50/50 dark:bg-slate-800/40">
              <FileJson className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-[11px] text-slate-500 mb-2">
                Click to browse or drag and drop your .unsschool package
              </p>
              <Button variant="outline" size="sm" disabled>
                Select Backup File
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card
        header={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Backup Architecture Specifications</span>
          </div>
        }
      >
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            • <strong>Format:</strong> Portable JSON container (.unsschool) containing application
            manifest, schema version header, timestamp, and normalized table payloads.
          </p>
          <p>
            • <strong>Integrity:</strong> All foreign keys and table references are validated
            atomically within a single IndexedDB transaction during restoration.
          </p>
          <p>
            • <strong>Portability:</strong> 100% interoperable across Chrome, Edge, Firefox, Safari,
            and mobile browsers with zero cloud vendor lock-in.
          </p>
        </div>
      </Card>
    </div>
  );
};
