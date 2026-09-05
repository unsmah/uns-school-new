/**
 * UNS SCHOOL — Backup & Restore System Types
 * Format specification version 1.0.0 (.unsschool ZIP package)
 */

import type { DbTableName } from '../../db/schema';
import type { LocalResource } from '../../types';

export const BACKUP_FORMAT_VERSION = '1.0.0';
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'UNS SCHOOL';
export const BACKUP_FILE_EXTENSION = '.unsschool';

export interface TableSummaryItem {
  recordCount: number;
  sha256: string;
}

export interface ResourceSummaryItem {
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  fileHashSHA256: string;
  zipPath: string;
}

export interface BackupManifest {
  backupFormatVersion: string; // e.g. "1.0.0"
  appVersion: string;         // e.g. "1.0.0"
  appName: string;            // "UNS SCHOOL"
  createdAt: string;          // ISO 8601
  dbSchemaVersion: number;    // e.g. 1
  schoolMetadata?: {
    schoolName?: string;
    wilaya?: string;
    commune?: string;
  };
  activeAcademicYear?: {
    id?: string;
    label?: string;
  };
  tableSummary: Record<string, TableSummaryItem>;
  resourceSummary: {
    totalCount: number;
    totalSizeBytes: number;
    items: Record<string, ResourceSummaryItem>;
  };
  payloadsChecksumSHA256: string; // Combined SHA-256 hash across all table JSON hashes and resource hashes
}

export interface BackupPackage {
  manifest: BackupManifest;
  tables: Record<DbTableName, any[]>;
  resources: Record<string, {
    metadata: LocalResource;
    blobData?: Uint8Array;
    sha256?: string;
  }>;
}

export interface ReferentialIntegrityReport {
  orphanAttendanceCount: number;
  orphanGradesCount: number;
  orphanHomeworkCount: number;
  orphanObservationsCount: number;
  orphanRemediationCount: number;
  orphanEnrollmentsCount: number;
  invalidClassesCount: number;
  invalidLessonsCount: number;
  invalidAssessmentsCount: number;
  invalidTimetableSlotsCount: number;
  invalidCurriculumRefsCount: number;
  details: string[];
}

export interface ValidationReport {
  isValid: boolean;
  isCompatibleFormat: boolean;
  unsupportedFutureFormat: boolean;
  formatVersion: string;
  createdAt: string | null;
  manifest: BackupManifest | null;
  errors: string[];
  warnings: string[];
  tableCounts: Record<string, number>;
  resourceCount: number;
  totalResourceSizeBytes: number;
  referentialIntegrity: ReferentialIntegrityReport;
  estimatedStorageRequiredBytes: number;
  hasEnoughStorageSpace: boolean;
  availableStorageEstimateBytes?: number;
}

export interface RestoreProgress {
  stage:
    | 'idle'
    | 'parsing_zip'
    | 'validating_manifest'
    | 'verifying_checksums'
    | 'validating_schema'
    | 'checking_referential_integrity'
    | 'creating_safety_snapshot'
    | 'restoring_database'
    | 'restoring_resources'
    | 'verifying_restored'
    | 'complete'
    | 'failed';
  message: string;
  percentage: number;
}

export interface SafetySnapshot {
  timestamp: string;
  tables: Record<string, any[]>;
}
