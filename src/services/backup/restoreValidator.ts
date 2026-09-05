/**
 * UNS SCHOOL — Restore Validation Service
 * Inspects and validates .unsschool backup packages prior to restoration.
 * Enforces manifest integrity, SHA-256 checksums, format versioning, and referential integrity.
 */

import { unzipSync } from 'fflate';
import { DB_TABLES, type DbTableName } from '../../db/schema';
import type { LocalResource } from '../../types';
import {
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type BackupPackage,
  type ValidationReport,
  type ReferentialIntegrityReport,
} from './backupTypes';
import {
  computeSHA256ForText,
  computeSHA256ForBuffer,
  computeManifestPayloadChecksum,
} from './checksumService';

export async function validateBackupArchive(
  zipUint8Array: Uint8Array
): Promise<{ report: ValidationReport; backupPackage: BackupPackage | null }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tableCounts: Record<string, number> = {};

  let zipEntries: Record<string, Uint8Array>;
  try {
    zipEntries = unzipSync(zipUint8Array);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      report: createFailedReport([`Invalid or corrupted .unsschool ZIP archive: ${errorMsg}`]),
      backupPackage: null,
    };
  }

  // 1. Locate and parse manifest.json
  const manifestBytes = zipEntries['manifest.json'];
  if (!manifestBytes) {
    return {
      report: createFailedReport(['Missing manifest.json inside backup archive.']),
      backupPackage: null,
    };
  }

  let manifestText = '';
  let manifest: BackupManifest;
  try {
    manifestText = new TextDecoder().decode(manifestBytes);
    manifest = JSON.parse(manifestText);
  } catch {
    return {
      report: createFailedReport(['Malformed manifest.json: Unable to parse JSON structure.']),
      backupPackage: null,
    };
  }

  // 2. Validate format version compatibility
  const formatVersion = manifest.backupFormatVersion || '0.0.0';
  const majorVersion = parseInt(formatVersion.split('.')[0] || '0', 10);
  const currentMajorVersion = parseInt(BACKUP_FORMAT_VERSION.split('.')[0] || '1', 10);

  if (majorVersion > currentMajorVersion) {
    return {
      report: {
        isValid: false,
        isCompatibleFormat: false,
        unsupportedFutureFormat: true,
        formatVersion,
        createdAt: manifest.createdAt || null,
        manifest,
        errors: [
          `Unsupported future backup format version (${formatVersion}). This application supports format v${currentMajorVersion}.x.x. Please update UNS SCHOOL to restore this backup.`,
        ],
        warnings: [],
        tableCounts: {},
        resourceCount: 0,
        totalResourceSizeBytes: 0,
        referentialIntegrity: emptyReferentialIntegrityReport(),
        estimatedStorageRequiredBytes: 0,
        hasEnoughStorageSpace: true,
      },
      backupPackage: null,
    };
  }

  // 3. Inspect Table JSON Payloads & Checksums
  const parsedTables: Record<string, any[]> = {} as any;
  const computedTableSummaries: Record<string, { sha256: string }> = {};

  const requiredTables = Object.values(DB_TABLES) as DbTableName[];

  for (const tableName of requiredTables) {
    const zipPath = `tables/${tableName}.json`;
    const tableBytes = zipEntries[zipPath];

    if (!tableBytes) {
      errors.push(`Missing table payload in archive: ${zipPath}`);
      continue;
    }

    const tableJsonText = new TextDecoder().decode(tableBytes);
    let tableRecords: any[];

    try {
      tableRecords = JSON.parse(tableJsonText);
      if (!Array.isArray(tableRecords)) {
        errors.push(`Table payload ${tableName} is not a valid JSON array.`);
        continue;
      }
    } catch {
      errors.push(`Failed to parse JSON for table ${tableName}.`);
      continue;
    }

    parsedTables[tableName] = tableRecords;
    tableCounts[tableName] = tableRecords.length;

    // Verify record count against manifest
    const expectedSummary = manifest.tableSummary?.[tableName];
    if (!expectedSummary) {
      errors.push(`Manifest table summary missing for table: ${tableName}`);
      continue;
    }

    if (expectedSummary.recordCount !== tableRecords.length) {
      errors.push(
        `Record count mismatch for ${tableName}: manifest expects ${expectedSummary.recordCount}, found ${tableRecords.length}.`
      );
    }

    // Verify SHA-256 checksum over exact JSON text
    const computedSha = await computeSHA256ForText(tableJsonText);
    computedTableSummaries[tableName] = { sha256: computedSha };

    if (computedSha !== expectedSummary.sha256) {
      errors.push(
        `Checksum mismatch for table payload ${tableName}. Expected ${expectedSummary.sha256}, calculated ${computedSha}. Backup may be corrupted or tampered.`
      );
    }
  }

  // 4. Inspect Resource Blobs & Checksums
  const parsedResources: Record<
    string,
    { metadata: LocalResource; blobData?: Uint8Array; sha256?: string }
  > = {};
  const computedResourceSummaries: Record<string, { sha256: string }> = {};

  let totalResourceSizeBytes = 0;
  let resourceCount = 0;

  const rawResourceRecords: LocalResource[] = parsedTables[DB_TABLES.RESOURCES] || [];

  for (const resMeta of rawResourceRecords) {
    const resourceId = resMeta.id;
    const manifestResItem = manifest.resourceSummary?.items?.[resourceId];

    if (manifestResItem) {
      const zipPath = manifestResItem.zipPath || `resources/${resourceId}.bin`;
      const blobBytes = zipEntries[zipPath];

      if (!blobBytes) {
        errors.push(`Missing resource binary file in archive: ${zipPath}`);
        continue;
      }

      const computedBlobSha = await computeSHA256ForBuffer(blobBytes);
      computedResourceSummaries[resourceId] = { sha256: computedBlobSha };

      if (computedBlobSha !== manifestResItem.fileHashSHA256) {
        errors.push(
          `Resource checksum mismatch for ${resMeta.fileName || resourceId}. Expected ${manifestResItem.fileHashSHA256}, calculated ${computedBlobSha}.`
        );
      }

      totalResourceSizeBytes += blobBytes.byteLength;
      resourceCount++;

      parsedResources[resourceId] = {
        metadata: resMeta,
        blobData: blobBytes,
        sha256: computedBlobSha,
      };
    } else {
      parsedResources[resourceId] = {
        metadata: resMeta,
      };
    }
  }

  // 5. Verify Master Composite Checksum
  if (manifest.payloadsChecksumSHA256) {
    const computedMasterChecksum = await computeManifestPayloadChecksum(
      computedTableSummaries,
      computedResourceSummaries
    );

    if (computedMasterChecksum !== manifest.payloadsChecksumSHA256) {
      errors.push(
        `Master archive payload checksum verification failed. The backup manifest does not match the actual data payloads.`
      );
    }
  }

  // 6. Perform Referential Integrity Inspection (Dry Run)
  const refReport = checkReferentialIntegrity(parsedTables);
  if (refReport.details.length > 0) {
    // Add warnings or errors if severe
    refReport.details.forEach((det) => warnings.push(det));
  }

  // 7. Estimate Storage Requirements
  const estimatedStorageRequiredBytes =
    zipUint8Array.byteLength * 1.5 + totalResourceSizeBytes;
  let availableStorageEstimateBytes: number | undefined = undefined;
  let hasEnoughStorageSpace = true;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.usage) {
        const available = estimate.quota - estimate.usage;
        availableStorageEstimateBytes = available;
        if (available < estimatedStorageRequiredBytes) {
          hasEnoughStorageSpace = false;
          warnings.push(
            `Estimated required storage (${(estimatedStorageRequiredBytes / 1024 / 1024).toFixed(1)} MB) may exceed remaining browser storage quota (${(available / 1024 / 1024).toFixed(1)} MB).`
          );
        }
      }
    } catch {
      // Storage estimation API unsupported or non-fatal
    }
  }

  const isValid = errors.length === 0;

  const report: ValidationReport = {
    isValid,
    isCompatibleFormat: true,
    unsupportedFutureFormat: false,
    formatVersion,
    createdAt: manifest.createdAt || null,
    manifest,
    errors,
    warnings,
    tableCounts,
    resourceCount,
    totalResourceSizeBytes,
    referentialIntegrity: refReport,
    estimatedStorageRequiredBytes,
    hasEnoughStorageSpace,
    availableStorageEstimateBytes,
  };

  const backupPackage: BackupPackage | null = isValid
    ? {
        manifest,
        tables: parsedTables as Record<DbTableName, any[]>,
        resources: parsedResources,
      }
    : null;

  return { report, backupPackage };
}

/**
 * Checks foreign key and domain referential integrity rules across extracted JSON tables.
 */
function checkReferentialIntegrity(tables: Record<string, any[]>): ReferentialIntegrityReport {
  const academicYearIds = new Set((tables[DB_TABLES.ACADEMIC_YEARS] || []).map((y) => y.id));
  const classIds = new Set((tables[DB_TABLES.CLASSES] || []).map((c) => c.id));
  const studentPersonIds = new Set((tables[DB_TABLES.STUDENT_PERSONS] || []).map((sp) => sp.id));
  const enrollmentIds = new Set((tables[DB_TABLES.STUDENT_ENROLLMENTS] || []).map((e) => e.id));
  const lessonIds = new Set((tables[DB_TABLES.LESSONS] || []).map((l) => l.id));
  const assessmentIds = new Set((tables[DB_TABLES.ASSESSMENTS] || []).map((a) => a.id));

  const details: string[] = [];

  // 1. Attendance -> Lessons, Enrollments, Classes
  let orphanAttendanceCount = 0;
  for (const att of tables[DB_TABLES.ATTENDANCE] || []) {
    if (!lessonIds.has(att.lessonId)) {
      orphanAttendanceCount++;
    }
    if (!enrollmentIds.has(att.studentEnrollmentId)) {
      orphanAttendanceCount++;
    }
  }
  if (orphanAttendanceCount > 0) {
    details.push(`Found ${orphanAttendanceCount} attendance records referencing missing lessons or student enrollments.`);
  }

  // 2. Grades -> Assessments, Enrollments
  let orphanGradesCount = 0;
  for (const g of tables[DB_TABLES.GRADES] || []) {
    if (!assessmentIds.has(g.assessmentId)) {
      orphanGradesCount++;
    }
    if (!enrollmentIds.has(g.studentEnrollmentId)) {
      orphanGradesCount++;
    }
  }
  if (orphanGradesCount > 0) {
    details.push(`Found ${orphanGradesCount} grade entries referencing missing assessments or student enrollments.`);
  }

  // 3. Enrollments -> StudentPersons, AcademicYears, Classes
  let orphanEnrollmentsCount = 0;
  for (const enr of tables[DB_TABLES.STUDENT_ENROLLMENTS] || []) {
    if (!studentPersonIds.has(enr.studentPersonId) || !academicYearIds.has(enr.academicYearId) || !classIds.has(enr.classId)) {
      orphanEnrollmentsCount++;
    }
  }
  if (orphanEnrollmentsCount > 0) {
    details.push(`Found ${orphanEnrollmentsCount} student enrollments referencing missing student persons, years, or classes.`);
  }

  // 4. Classes -> AcademicYears
  let invalidClassesCount = 0;
  for (const cls of tables[DB_TABLES.CLASSES] || []) {
    if (!academicYearIds.has(cls.academicYearId)) {
      invalidClassesCount++;
    }
  }

  // 5. Lessons -> AcademicYears, Classes
  let invalidLessonsCount = 0;
  for (const les of tables[DB_TABLES.LESSONS] || []) {
    if (!academicYearIds.has(les.academicYearId) || !classIds.has(les.classId)) {
      invalidLessonsCount++;
    }
  }

  // 6. Assessments -> AcademicYears, Classes
  let invalidAssessmentsCount = 0;
  for (const ast of tables[DB_TABLES.ASSESSMENTS] || []) {
    if (!academicYearIds.has(ast.academicYearId) || !classIds.has(ast.classId)) {
      invalidAssessmentsCount++;
    }
  }

  // 7. Homework -> Classes
  let orphanHomeworkCount = 0;
  for (const hw of tables[DB_TABLES.HOMEWORK] || []) {
    if (!classIds.has(hw.classId)) {
      orphanHomeworkCount++;
    }
  }

  // 8. Observations -> Enrollments
  let orphanObservationsCount = 0;
  for (const obs of tables[DB_TABLES.OBSERVATIONS] || []) {
    if (!enrollmentIds.has(obs.studentEnrollmentId)) {
      orphanObservationsCount++;
    }
  }

  // 9. Remediation -> Classes
  let orphanRemediationCount = 0;
  for (const rem of tables[DB_TABLES.REMEDIATION] || []) {
    if (!classIds.has(rem.classId)) {
      orphanRemediationCount++;
    }
  }

  // 10. Timetable -> Classes
  let invalidTimetableSlotsCount = 0;
  for (const slot of tables[DB_TABLES.TIMETABLE] || []) {
    if (!classIds.has(slot.classId)) {
      invalidTimetableSlotsCount++;
    }
  }

  return {
    orphanAttendanceCount,
    orphanGradesCount,
    orphanHomeworkCount,
    orphanObservationsCount,
    orphanRemediationCount,
    orphanEnrollmentsCount,
    invalidClassesCount,
    invalidLessonsCount,
    invalidAssessmentsCount,
    invalidTimetableSlotsCount,
    details,
  };
}

function emptyReferentialIntegrityReport(): ReferentialIntegrityReport {
  return {
    orphanAttendanceCount: 0,
    orphanGradesCount: 0,
    orphanHomeworkCount: 0,
    orphanObservationsCount: 0,
    orphanRemediationCount: 0,
    orphanEnrollmentsCount: 0,
    invalidClassesCount: 0,
    invalidLessonsCount: 0,
    invalidAssessmentsCount: 0,
    invalidTimetableSlotsCount: 0,
    details: [],
  };
}

function createFailedReport(errors: string[]): ValidationReport {
  return {
    isValid: false,
    isCompatibleFormat: false,
    unsupportedFutureFormat: false,
    formatVersion: 'unknown',
    createdAt: null,
    manifest: null,
    errors,
    warnings: [],
    tableCounts: {},
    resourceCount: 0,
    totalResourceSizeBytes: 0,
    referentialIntegrity: emptyReferentialIntegrityReport(),
    estimatedStorageRequiredBytes: 0,
    hasEnoughStorageSpace: true,
  };
}
