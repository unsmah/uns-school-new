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
  const rawResourceIds = new Set(rawResourceRecords.map((r) => r.id));
  const expectedResourceZipPaths = new Set<string>();

  for (const resMeta of rawResourceRecords) {
    const resourceId = resMeta.id;
    const manifestResItem = manifest.resourceSummary?.items?.[resourceId];

    const expectsBinary = Boolean(
      manifestResItem || resMeta.fileHashSHA256 || (resMeta.fileSizeBytes && resMeta.fileSizeBytes > 0)
    );

    if (expectsBinary) {
      const zipPath = manifestResItem?.zipPath || `resources/${resourceId}.bin`;
      expectedResourceZipPaths.add(zipPath);

      const blobBytes = zipEntries[zipPath];

      if (!blobBytes) {
        errors.push(`Missing resource binary file in archive for resource "${resMeta.fileName || resourceId}": ${zipPath}`);
        continue;
      }

      const computedBlobSha = await computeSHA256ForBuffer(blobBytes);
      computedResourceSummaries[resourceId] = { sha256: computedBlobSha };

      if (manifestResItem) {
        if (computedBlobSha !== manifestResItem.fileHashSHA256) {
          errors.push(
            `Resource checksum mismatch against manifest for "${resMeta.fileName || resourceId}". Expected ${manifestResItem.fileHashSHA256}, calculated ${computedBlobSha}.`
          );
        }
      }

      if (resMeta.fileHashSHA256 && computedBlobSha !== resMeta.fileHashSHA256) {
        errors.push(
          `Resource checksum mismatch against metadata for "${resMeta.fileName || resourceId}". Expected ${resMeta.fileHashSHA256}, calculated ${computedBlobSha}.`
        );
      }

      if (resMeta.fileSizeBytes && resMeta.fileSizeBytes !== blobBytes.byteLength) {
        errors.push(
          `Resource file size mismatch for "${resMeta.fileName || resourceId}". Metadata states ${resMeta.fileSizeBytes} bytes, found ${blobBytes.byteLength} bytes.`
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

  // Validate manifest resource summary items against resource metadata records
  const manifestResourceItems = manifest.resourceSummary?.items || {};
  for (const [manifestResId, manifestItem] of Object.entries(manifestResourceItems)) {
    if (!rawResourceIds.has(manifestResId)) {
      errors.push(
        `Manifest resource summary contains item "${manifestResId}" (${manifestItem.fileName}) that does not exist in resources table.`
      );
    }
  }

  // Validate manifest resource summary counts and byte totals
  if (manifest.resourceSummary) {
    if (manifest.resourceSummary.totalCount !== resourceCount) {
      errors.push(
        `Manifest resource total count mismatch: manifest declares ${manifest.resourceSummary.totalCount}, found ${resourceCount} valid resource binaries.`
      );
    }
    if (manifest.resourceSummary.totalSizeBytes !== totalResourceSizeBytes) {
      errors.push(
        `Manifest resource total size mismatch: manifest declares ${manifest.resourceSummary.totalSizeBytes} bytes, found ${totalResourceSizeBytes} bytes.`
      );
    }
  }

  // Detect orphan resource binaries in ZIP entries under resources/
  for (const zipKey of Object.keys(zipEntries)) {
    if (zipKey.startsWith('resources/') && zipKey !== 'resources/') {
      if (!expectedResourceZipPaths.has(zipKey)) {
        errors.push(`Unexpected orphan resource binary in archive: ${zipKey}`);
      }
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
    // Referential-integrity violations MUST contribute to errors to block restoration of invalid archives
    refReport.details.forEach((det) => errors.push(det));
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
  const schoolIds = new Set((tables[DB_TABLES.SCHOOLS] || []).map((s) => s.id));
  const academicYearIds = new Set((tables[DB_TABLES.ACADEMIC_YEARS] || []).map((y) => y.id));
  const classIds = new Set((tables[DB_TABLES.CLASSES] || []).map((c) => c.id));
  const studentPersonIds = new Set((tables[DB_TABLES.STUDENT_PERSONS] || []).map((sp) => sp.id));
  const studentEnrollmentIds = new Set((tables[DB_TABLES.STUDENT_ENROLLMENTS] || []).map((e) => e.id));
  const gradingSchemeIds = new Set((tables[DB_TABLES.GRADING_SCHEMES] || []).map((gs) => gs.id));
  const curriculumVersionIds = new Set((tables[DB_TABLES.CURRICULUM_VERSIONS] || []).map((cv) => cv.id));
  const competencyIds = new Set((tables[DB_TABLES.COMPETENCIES] || []).map((comp) => comp.id));
  const sessionRubricIds = new Set((tables[DB_TABLES.SESSION_RUBRICS] || []).map((sr) => sr.id));
  const sequenceIds = new Set((tables[DB_TABLES.CURRICULUM_SEQUENCES] || []).map((seq) => seq.id));
  const lessonIds = new Set((tables[DB_TABLES.LESSONS] || []).map((l) => l.id));
  const assessmentIds = new Set((tables[DB_TABLES.ASSESSMENTS] || []).map((a) => a.id));

  const hasSchools = schoolIds.size > 0;
  const details: string[] = [];

  let orphanAttendanceCount = 0;
  let orphanGradesCount = 0;
  let orphanHomeworkCount = 0;
  let orphanObservationsCount = 0;
  let orphanRemediationCount = 0;
  let orphanEnrollmentsCount = 0;
  let invalidClassesCount = 0;
  let invalidLessonsCount = 0;
  let invalidAssessmentsCount = 0;
  let invalidTimetableSlotsCount = 0;
  let invalidCurriculumRefsCount = 0;

  // 1. StudentEnrollment -> StudentPerson / AcademicYear / Class
  for (const enr of tables[DB_TABLES.STUDENT_ENROLLMENTS] || []) {
    if (!studentPersonIds.has(enr.studentPersonId)) {
      orphanEnrollmentsCount++;
      details.push(`StudentEnrollment ${enr.id} references non-existent StudentPerson (${enr.studentPersonId}).`);
    }
    if (!academicYearIds.has(enr.academicYearId)) {
      orphanEnrollmentsCount++;
      details.push(`StudentEnrollment ${enr.id} references non-existent AcademicYear (${enr.academicYearId}).`);
    }
    if (!classIds.has(enr.classId)) {
      orphanEnrollmentsCount++;
      details.push(`StudentEnrollment ${enr.id} references non-existent Class (${enr.classId}).`);
    }
  }

  // 2. Class -> AcademicYear / School
  for (const cls of tables[DB_TABLES.CLASSES] || []) {
    if (!academicYearIds.has(cls.academicYearId)) {
      invalidClassesCount++;
      details.push(`Class ${cls.id} (${cls.name || cls.id}) references non-existent AcademicYear (${cls.academicYearId}).`);
    }
    if (hasSchools && cls.schoolId && !schoolIds.has(cls.schoolId)) {
      invalidClassesCount++;
      details.push(`Class ${cls.id} (${cls.name || cls.id}) references non-existent School (${cls.schoolId}).`);
    }
  }

  // 3. GradingScheme -> AcademicYear
  for (const gs of tables[DB_TABLES.GRADING_SCHEMES] || []) {
    if (gs.academicYearId && !academicYearIds.has(gs.academicYearId)) {
      invalidAssessmentsCount++;
      details.push(`GradingScheme ${gs.id} references non-existent AcademicYear (${gs.academicYearId}).`);
    }
  }

  // 4. Lesson -> AcademicYear / Class / CurriculumSequence / SessionRubric / CurriculumVersion
  for (const les of tables[DB_TABLES.LESSONS] || []) {
    if (!academicYearIds.has(les.academicYearId)) {
      invalidLessonsCount++;
      details.push(`Lesson ${les.id} references non-existent AcademicYear (${les.academicYearId}).`);
    }
    if (!classIds.has(les.classId)) {
      invalidLessonsCount++;
      details.push(`Lesson ${les.id} references non-existent Class (${les.classId}).`);
    }
    if (les.sequenceId && !sequenceIds.has(les.sequenceId)) {
      invalidLessonsCount++;
      details.push(`Lesson ${les.id} references non-existent CurriculumSequence (${les.sequenceId}).`);
    }
    if (les.rubricId && !sessionRubricIds.has(les.rubricId)) {
      invalidLessonsCount++;
      details.push(`Lesson ${les.id} references non-existent SessionRubric (${les.rubricId}).`);
    }
    if (les.curriculumVersionId && !curriculumVersionIds.has(les.curriculumVersionId)) {
      invalidLessonsCount++;
      details.push(`Lesson ${les.id} references non-existent CurriculumVersion (${les.curriculumVersionId}).`);
    }
  }

  // 5. Attendance -> Lesson / StudentEnrollment / Class
  for (const att of tables[DB_TABLES.ATTENDANCE] || []) {
    if (!lessonIds.has(att.lessonId)) {
      orphanAttendanceCount++;
      details.push(`Attendance ${att.id} references non-existent Lesson (${att.lessonId}).`);
    }
    if (!studentEnrollmentIds.has(att.studentEnrollmentId)) {
      orphanAttendanceCount++;
      details.push(`Attendance ${att.id} references non-existent StudentEnrollment (${att.studentEnrollmentId}).`);
    }
    if (att.classId && !classIds.has(att.classId)) {
      orphanAttendanceCount++;
      details.push(`Attendance ${att.id} references non-existent Class (${att.classId}).`);
    }
  }

  // 6. Assessment -> AcademicYear / Class / GradingScheme / CurriculumSequence
  for (const ast of tables[DB_TABLES.ASSESSMENTS] || []) {
    if (!academicYearIds.has(ast.academicYearId)) {
      invalidAssessmentsCount++;
      details.push(`Assessment ${ast.id} references non-existent AcademicYear (${ast.academicYearId}).`);
    }
    if (!classIds.has(ast.classId)) {
      invalidAssessmentsCount++;
      details.push(`Assessment ${ast.id} references non-existent Class (${ast.classId}).`);
    }
    if (ast.gradingSchemeId && !gradingSchemeIds.has(ast.gradingSchemeId)) {
      invalidAssessmentsCount++;
      details.push(`Assessment ${ast.id} references non-existent GradingScheme (${ast.gradingSchemeId}).`);
    }
    if (ast.curriculumSequenceId && !sequenceIds.has(ast.curriculumSequenceId)) {
      invalidAssessmentsCount++;
      details.push(`Assessment ${ast.id} references non-existent CurriculumSequence (${ast.curriculumSequenceId}).`);
    }
  }

  // 7. GradeEntry -> Assessment / StudentEnrollment
  for (const g of tables[DB_TABLES.GRADES] || []) {
    if (!assessmentIds.has(g.assessmentId)) {
      orphanGradesCount++;
      details.push(`GradeEntry ${g.id} references non-existent Assessment (${g.assessmentId}).`);
    }
    if (!studentEnrollmentIds.has(g.studentEnrollmentId)) {
      orphanGradesCount++;
      details.push(`GradeEntry ${g.id} references non-existent StudentEnrollment (${g.studentEnrollmentId}).`);
    }
  }

  // 8. Homework -> Class / AcademicYear / Lesson
  for (const hw of tables[DB_TABLES.HOMEWORK] || []) {
    if (!classIds.has(hw.classId)) {
      orphanHomeworkCount++;
      details.push(`Homework ${hw.id} references non-existent Class (${hw.classId}).`);
    }
    if (hw.academicYearId && !academicYearIds.has(hw.academicYearId)) {
      orphanHomeworkCount++;
      details.push(`Homework ${hw.id} references non-existent AcademicYear (${hw.academicYearId}).`);
    }
    if (hw.lessonId && !lessonIds.has(hw.lessonId)) {
      orphanHomeworkCount++;
      details.push(`Homework ${hw.id} references non-existent Lesson (${hw.lessonId}).`);
    }
  }

  // 9. Observation -> StudentEnrollment / StudentPerson / Class / AcademicYear
  for (const obs of tables[DB_TABLES.OBSERVATIONS] || []) {
    if (!studentEnrollmentIds.has(obs.studentEnrollmentId)) {
      orphanObservationsCount++;
      details.push(`StudentObservation ${obs.id} references non-existent StudentEnrollment (${obs.studentEnrollmentId}).`);
    }
    if (obs.studentPersonId && !studentPersonIds.has(obs.studentPersonId)) {
      orphanObservationsCount++;
      details.push(`StudentObservation ${obs.id} references non-existent StudentPerson (${obs.studentPersonId}).`);
    }
    if (obs.classId && !classIds.has(obs.classId)) {
      orphanObservationsCount++;
      details.push(`StudentObservation ${obs.id} references non-existent Class (${obs.classId}).`);
    }
    if (obs.academicYearId && !academicYearIds.has(obs.academicYearId)) {
      orphanObservationsCount++;
      details.push(`StudentObservation ${obs.id} references non-existent AcademicYear (${obs.academicYearId}).`);
    }
  }

  // 10. Remediation -> AcademicYear / Class / Sequence / Competency / TargetedEnrollments
  for (const rem of tables[DB_TABLES.REMEDIATION] || []) {
    if (!classIds.has(rem.classId)) {
      orphanRemediationCount++;
      details.push(`RemediationSession ${rem.id} references non-existent Class (${rem.classId}).`);
    }
    if (rem.academicYearId && !academicYearIds.has(rem.academicYearId)) {
      orphanRemediationCount++;
      details.push(`RemediationSession ${rem.id} references non-existent AcademicYear (${rem.academicYearId}).`);
    }
    if (rem.sequenceId && !sequenceIds.has(rem.sequenceId)) {
      orphanRemediationCount++;
      details.push(`RemediationSession ${rem.id} references non-existent CurriculumSequence (${rem.sequenceId}).`);
    }
    if (rem.competencyId && !competencyIds.has(rem.competencyId)) {
      orphanRemediationCount++;
      details.push(`RemediationSession ${rem.id} references non-existent Competency (${rem.competencyId}).`);
    }
    if (Array.isArray(rem.targetedStudentEnrollmentIds)) {
      for (const enrId of rem.targetedStudentEnrollmentIds) {
        if (!studentEnrollmentIds.has(enrId)) {
          orphanRemediationCount++;
          details.push(`RemediationSession ${rem.id} references non-existent targeted StudentEnrollment (${enrId}).`);
        }
      }
    }
  }

  // 11. Timetable -> AcademicYear / Class / School
  for (const slot of tables[DB_TABLES.TIMETABLE] || []) {
    if (!academicYearIds.has(slot.academicYearId)) {
      invalidTimetableSlotsCount++;
      details.push(`TimetableSlot ${slot.id} references non-existent AcademicYear (${slot.academicYearId}).`);
    }
    if (!classIds.has(slot.classId)) {
      invalidTimetableSlotsCount++;
      details.push(`TimetableSlot ${slot.id} references non-existent Class (${slot.classId}).`);
    }
    if (hasSchools && slot.schoolId && !schoolIds.has(slot.schoolId)) {
      invalidTimetableSlotsCount++;
      details.push(`TimetableSlot ${slot.id} references non-existent School (${slot.schoolId}).`);
    }
  }

  // 12. CurriculumLevel -> CurriculumVersion
  for (const lvl of tables[DB_TABLES.CURRICULUM_LEVELS] || []) {
    if (!curriculumVersionIds.has(lvl.curriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`CurriculumLevel ${lvl.id} references non-existent CurriculumVersion (${lvl.curriculumVersionId}).`);
    }
  }

  // 13. Competency -> CurriculumVersion
  for (const comp of tables[DB_TABLES.COMPETENCIES] || []) {
    if (!curriculumVersionIds.has(comp.curriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`Competency ${comp.id} references non-existent CurriculumVersion (${comp.curriculumVersionId}).`);
    }
  }

  // 14. SessionRubric -> CurriculumVersion
  for (const rub of tables[DB_TABLES.SESSION_RUBRICS] || []) {
    if (!curriculumVersionIds.has(rub.curriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`SessionRubric ${rub.id} references non-existent CurriculumVersion (${rub.curriculumVersionId}).`);
    }
  }

  // 15. CurriculumSequence -> CurriculumVersion / Competency
  for (const seq of tables[DB_TABLES.CURRICULUM_SEQUENCES] || []) {
    if (!curriculumVersionIds.has(seq.curriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`CurriculumSequence ${seq.id} references non-existent CurriculumVersion (${seq.curriculumVersionId}).`);
    }
    if (Array.isArray(seq.targetedCompetencyIds)) {
      for (const compId of seq.targetedCompetencyIds) {
        if (!competencyIds.has(compId)) {
          invalidCurriculumRefsCount++;
          details.push(`CurriculumSequence ${seq.id} references non-existent targeted Competency (${compId}).`);
        }
      }
    }
  }

  // 16. LearningObjective -> CurriculumSequence / CurriculumVersion
  for (const obj of tables[DB_TABLES.LEARNING_OBJECTIVES] || []) {
    if (!sequenceIds.has(obj.sequenceId)) {
      invalidCurriculumRefsCount++;
      details.push(`LearningObjective ${obj.id} references non-existent CurriculumSequence (${obj.sequenceId}).`);
    }
    if (obj.curriculumVersionId && !curriculumVersionIds.has(obj.curriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`LearningObjective ${obj.id} references non-existent CurriculumVersion (${obj.curriculumVersionId}).`);
    }
  }

  // 17. AcademicYear -> School / CurriculumVersion / GradingScheme
  for (const ay of tables[DB_TABLES.ACADEMIC_YEARS] || []) {
    if (hasSchools && ay.schoolId && !schoolIds.has(ay.schoolId)) {
      invalidClassesCount++;
      details.push(`AcademicYear ${ay.id} references non-existent School (${ay.schoolId}).`);
    }
    if (ay.activeCurriculumVersionId && !curriculumVersionIds.has(ay.activeCurriculumVersionId)) {
      invalidCurriculumRefsCount++;
      details.push(`AcademicYear ${ay.id} references non-existent active CurriculumVersion (${ay.activeCurriculumVersionId}).`);
    }
    if (ay.activeGradingSchemeId && !gradingSchemeIds.has(ay.activeGradingSchemeId)) {
      invalidAssessmentsCount++;
      details.push(`AcademicYear ${ay.id} references non-existent active GradingScheme (${ay.activeGradingSchemeId}).`);
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
    invalidCurriculumRefsCount,
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
    invalidCurriculumRefsCount: 0,
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
