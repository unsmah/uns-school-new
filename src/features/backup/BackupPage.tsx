/**
 * UNS SCHOOL — Backup & Restore Workspace
 * High-integrity local backup generation and defensive database restoration interface.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal } from '../../components/ui';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { db } from '../../db/database';
import {
  createBackupPackage,
  triggerBrowserDownload,
  validateBackupArchive,
  executeRestore,
  type ValidationReport,
  type BackupPackage,
  type RestoreProgress,
} from '../../services/backup';
import {
  Download,
  Upload,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileJson,
  RefreshCw,
  HardDrive,
  Database,
  Users,
  BookOpen,
  FolderArchive,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { school, selectedAcademicYear, refreshAcademicYears, refreshSchool } = useAcademicYear();

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // Live Workspace Summary State
  const [workspaceStats, setWorkspaceStats] = useState<{
    studentsCount: number;
    classesCount: number;
    lessonsCount: number;
    assessmentsCount: number;
    resourcesCount: number;
    resourcesSizeBytes: number;
    storageUsedBytes?: number;
    storageQuotaBytes?: number;
  }>({
    studentsCount: 0,
    classesCount: 0,
    lessonsCount: 0,
    assessmentsCount: 0,
    resourcesCount: 0,
    resourcesSizeBytes: 0,
  });

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [backupPackage, setBackupPackage] = useState<BackupPackage | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  // Load live database telemetry
  const loadWorkspaceTelemetry = async () => {
    try {
      const [
        studentsCount,
        classesCount,
        lessonsCount,
        assessmentsCount,
        resources,
      ] = await Promise.all([
        db.studentPersons.count(),
        db.classes.count(),
        db.lessons.count(),
        db.assessments.count(),
        db.resources.toArray(),
      ]);

      let resourcesSizeBytes = 0;
      for (const r of resources) {
        if (r.fileBlob) {
          resourcesSizeBytes += r.fileBlob.size;
        } else if (r.fileSizeBytes) {
          resourcesSizeBytes += r.fileSizeBytes;
        }
      }

      let storageUsedBytes: number | undefined = undefined;
      let storageQuotaBytes: number | undefined = undefined;

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        storageUsedBytes = est.usage;
        storageQuotaBytes = est.quota;
      }

      setWorkspaceStats({
        studentsCount,
        classesCount,
        lessonsCount,
        assessmentsCount,
        resourcesCount: resources.length,
        resourcesSizeBytes,
        storageUsedBytes,
        storageQuotaBytes,
      });
    } catch (err) {
      console.error('Failed to load database telemetry:', err);
    }
  };

  useEffect(() => {
    loadWorkspaceTelemetry();
  }, []);

  // Handle Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    setExportErrorMsg(null);

    try {
      const { zipUint8Array, filename } = await createBackupPackage();
      triggerBrowserDownload(zipUint8Array, filename);
      setExportSuccessMsg(`Backup package "${filename}" successfully generated and downloaded.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExportErrorMsg(`Failed to generate backup: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsInspecting(true);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const u8Data = new Uint8Array(arrayBuffer);

      const { report, backupPackage: pkg } = await validateBackupArchive(u8Data);

      setValidationReport(report);
      setBackupPackage(pkg);
      setShowRestoreModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRestoreErrorMsg(`Failed to inspect backup file: ${msg}`);
    } finally {
      setIsInspecting(false);
    }
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!backupPackage) return;

    setIsRestoring(true);
    setRestoreErrorMsg(null);

    try {
      await executeRestore(backupPackage, (progress) => {
        setRestoreProgress(progress);
      });

      setRestoreSuccessMsg('Database restore completed successfully! All workspace records refreshed.');
      setShowRestoreModal(false);
      setSelectedFile(null);

      // Refresh local UI state
      await Promise.all([refreshSchool(), refreshAcademicYears(), loadWorkspaceTelemetry()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRestoreErrorMsg(msg);
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <span>Backup & Data Recovery</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Local-only .unsschool package creation, archive validation, and atomic database restoration.
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local Device Sovereignty</span>
        </div>
      </div>

      <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs leading-relaxed space-y-1">
        <div className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Offline-First Protection Model</span>
        </div>
        <p>
          UNS SCHOOL operates strictly inside your local web browser using IndexedDB. No student
          records, grades, or journals are ever uploaded to any cloud server or third-party service. Creating
          regular <strong>.unsschool</strong> backup archives protects your data against device changes or browser clears.
        </p>
      </div>

      {/* Global Notifications */}
      {exportSuccessMsg && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {exportErrorMsg && (
        <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{exportErrorMsg}</span>
        </div>
      )}

      {restoreSuccessMsg && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{restoreSuccessMsg}</span>
        </div>
      )}

      {restoreErrorMsg && (
        <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{restoreErrorMsg}</span>
        </div>
      )}

      {/* Workspace Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Students</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {workspaceStats.studentsCount}
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lessons</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {workspaceStats.lessonsCount}
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Resources</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {workspaceStats.resourcesCount} <span className="text-xs font-normal text-slate-400">({formatBytes(workspaceStats.resourcesSizeBytes)})</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>IndexedDB Storage</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatBytes(workspaceStats.storageUsedBytes)}
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export .unsschool Backup</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Generates a portable, SHA-256 verified <strong>.unsschool</strong> ZIP container
              containing deterministic JSON database tables, school metadata, and local resource files.
            </p>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">School Profile:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {school?.name || 'Standard Profile'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Academic Year:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedAcademicYear?.label || 'Not Selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Format Specification:</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  v1.0.0 (.unsschool)
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleExportBackup}
              isLoading={isExporting}
              className="w-full justify-center"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Create & Download .unsschool Package</span>
            </Button>
          </div>
        </Card>

        {/* Restore Card */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Restore Workspace from .unsschool</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Select an exported <strong>.unsschool</strong> backup file to inspect manifest integrity,
              verify SHA-256 checksums, and perform a defensive database restoration.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".unsschool,.zip"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg text-center bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <FileJson className="w-7 h-7 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {selectedFile ? selectedFile.name : 'Click to select or drop .unsschool package'}
              </p>
              <p className="text-[10px] text-slate-400">
                Supports format v1.x.x with SHA-256 verification
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 pointer-events-none"
                isLoading={isInspecting}
              >
                Browse Backup Archive
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Specifications Card */}
      <Card
        header={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Architecture & Integrity Principles</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">1. Portable ZIP Container</h4>
            <p>
              Backups are standard ZIP archives holding inspectable, key-sorted JSON table definitions
              and raw resource binary blobs.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">2. SHA-256 Cryptographic Digest</h4>
            <p>
              Every table JSON file and resource blob is hashed independently to verify manifest structure
              and reject tampered files.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">3. Atomic Safety Rollback</h4>
            <p>
              Restoration automatically creates a pre-restore safety snapshot in memory. Any verification
              failure instantly reverts original live data.
            </p>
          </div>
        </div>
      </Card>

      {/* Restore Inspection & Confirmation Modal */}
      {showRestoreModal && validationReport && (
        <Modal
          isOpen={showRestoreModal}
          onClose={() => !isRestoring && setShowRestoreModal(false)}
          title="Backup Archive Verification & Restore Preview"
        >
          <div className="space-y-4 text-xs">
            {/* Status Header */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {validationReport.manifest?.appName || 'UNS SCHOOL'} Package
                </div>
                <div className="text-[11px] text-slate-500">
                  Format Version: {validationReport.formatVersion} | Created: {validationReport.createdAt ? new Date(validationReport.createdAt).toLocaleString() : 'Unknown'}
                </div>
              </div>

              {validationReport.isValid ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Integrity Verified</span>
                </span>
              ) : validationReport.unsupportedFutureFormat ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unsupported Version</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Verification Failed</span>
                </span>
              )}
            </div>

            {/* Error or Warning Callouts */}
            {validationReport.errors.length > 0 && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md text-rose-800 dark:text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Archive Validation Errors ({validationReport.errors.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationReport.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationReport.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-md text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Warnings / Integrity Insights</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationReport.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Archive Summary Table Breakdown */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white text-xs border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Database Tables to Restore ({Object.keys(validationReport.tableCounts).length})</span>
                <span>Record Count</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {Object.entries(validationReport.tableCounts).map(([table, count]) => (
                  <div key={table} className="px-3 py-1.5 flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-slate-500">{table}</span>
                    <span className="font-bold">{count} records</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Attached Media & Resources:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {validationReport.resourceCount} files ({formatBytes(validationReport.totalResourceSizeBytes)})
              </span>
            </div>

            {/* Destructive Action Warning */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-md space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Restoration Safety Notice</span>
              </div>
              <p>
                Restoring this package will replace all current workspace data in your browser's local IndexedDB database.
                A safety snapshot of your current database will be created automatically before restore begins.
              </p>
            </div>

            {/* Progress Bar during Restore */}
            {isRestoring && restoreProgress && (
              <div className="space-y-1.5 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex justify-between text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                  <span>{restoreProgress.message}</span>
                  <span>{restoreProgress.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${restoreProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRestore}
                disabled={!validationReport.isValid || isRestoring}
                isLoading={isRestoring}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                <span>Confirm & Execute Restore</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BackupPage;
