/**
 * UNS SCHOOL — Phase 9 Backup & Restore Comprehensive Test Suite
 * Tests .unsschool package creation, SHA-256 integrity verification, format versioning,
 * safety snapshots, atomic restoration, and resource binary blob preservation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { db } from '../db/database';
import { DB_TABLES } from '../db/schema';
import {
  createBackupPackage,
  validateBackupArchive,
  executeRestore,
  createSafetySnapshot,
  restoreSafetySnapshot,
  computeSHA256ForText,
  computeSHA256ForBuffer,
  computeManifestPayloadChecksum,
  stringifyDeterministicJSON,
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
} from '../services/backup';
import type { School, AcademicYear, StudentPerson, StudentEnrollment, LocalResource } from '../types';

describe('Phase 9: Backup & Restore System', () => {
  beforeEach(async () => {
    // Clear all tables for a clean test state
    for (const table of db.tables) {
      await table.clear();
    }
  });

  it('generates a valid .unsschool ZIP package with manifest and SHA-256 digests without mutating live database', async () => {
    // 1. Seed test database records
    const school: School = {
      id: 'sch-1',
      name: 'Ibn Khaldoun Middle School',
      schoolCode: '16001',
      commune: 'Algiers Central',
      wilaya: '16-Algiers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.schools.add(school);

    const year: AcademicYear = {
      id: 'yr-2023',
      schoolId: 'sch-1',
      label: '2023-2024',
      startDate: '2023-09-01',
      endDate: '2024-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(year);

    const person: StudentPerson = {
      id: 'sp-1',
      nationalIdNumber: 'NID-001',
      firstNameLatin: 'Amina',
      lastNameLatin: 'Benali',
      gender: 'F',
      dateOfBirth: '2010-05-14',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(person);

    // 2. Create backup package
    const { zipUint8Array, filename, manifest } = await createBackupPackage();

    expect(filename).toContain('.unsschool');
    expect(manifest.backupFormatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(manifest.dbSchemaVersion).toBe(1);
    expect(manifest.tableSummary.schools.recordCount).toBe(1);
    expect(manifest.tableSummary.academicYears.recordCount).toBe(1);
    expect(manifest.tableSummary.studentPersons.recordCount).toBe(1);

    // 3. Inspect ZIP archive contents using fflate
    const unzipped = unzipSync(zipUint8Array);
    expect(unzipped['manifest.json']).toBeDefined();
    expect(unzipped['tables/schools.json']).toBeDefined();
    expect(unzipped['tables/academicYears.json']).toBeDefined();

    // Verify non-mutation of live database
    const liveSchoolCount = await db.schools.count();
    expect(liveSchoolCount).toBe(1);
  });

  it('preserves and restores LocalResource binary blobs with exact SHA-256 verification', async () => {
    // Seed resource with binary blob
    const binaryContent = new TextEncoder().encode('UNS SCHOOL PDF WORKSHEET CONTENT BINARY');
    const blob = new Blob([binaryContent], { type: 'application/pdf' });
    const expectedSha256 = await computeSHA256ForBuffer(binaryContent);

    const resource: LocalResource = {
      id: 'res-101',
      title: 'Grammar Worksheet 1AM',
      category: 'Worksheet',
      fileName: 'worksheet1.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: binaryContent.byteLength,
      fileHashSHA256: expectedSha256,
      fileBlob: blob,
      tags: ['grammar', '1AM'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.resources.add(resource);

    // Create backup package
    const { zipUint8Array } = await createBackupPackage();

    // Clear database to simulate clean environment
    for (const table of db.tables) {
      await table.clear();
    }
    expect(await db.resources.count()).toBe(0);

    // Validate and restore
    const { report, backupPackage } = await validateBackupArchive(zipUint8Array);
    expect(report.isValid).toBe(true);
    expect(report.resourceCount).toBe(1);
    expect(backupPackage).not.toBeNull();

    await executeRestore(backupPackage!);

    // Verify restored resource and binary blob
    const restoredRes = await db.resources.get('res-101');
    expect(restoredRes).toBeDefined();
    expect(restoredRes?.title).toBe('Grammar Worksheet 1AM');
    expect(restoredRes?.fileBlob).toBeDefined();

    const restoredBuffer = new Uint8Array(await restoredRes!.fileBlob!.arrayBuffer());
    expect(restoredBuffer).toEqual(binaryContent);
  });

  it('detects and rejects corrupted backup archives with SHA-256 mismatch', async () => {
    const school: School = {
      id: 'sch-1',
      name: 'Original School',
      schoolCode: '16001',
      commune: 'Algiers',
      wilaya: '16-Algiers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.schools.add(school);

    const { zipUint8Array } = await createBackupPackage();

    // Corrupt table JSON payload inside ZIP archive
    const unzipped = unzipSync(zipUint8Array);
    const tamperedSchoolText = JSON.stringify([
      { ...school, name: 'TAMPERED SCHOOL NAME' },
    ]);
    unzipped['tables/schools.json'] = new Uint8Array(new TextEncoder().encode(tamperedSchoolText)) as any;

    const tamperedZip = zipSync(unzipped as unknown as Record<string, Uint8Array>);

    // Validate tampered archive
    const { report, backupPackage } = await validateBackupArchive(tamperedZip);

    expect(report.isValid).toBe(false);
    expect(backupPackage).toBeNull();
    expect(report.errors.some((e) => e.includes('Checksum mismatch'))).toBe(true);
  });

  it('rejects unsupported future backup format versions safely', async () => {
    const manifest: BackupManifest = {
      backupFormatVersion: '2.0.0', // Future unsupported major version
      appVersion: '2.0.0',
      appName: 'UNS SCHOOL',
      createdAt: new Date().toISOString(),
      dbSchemaVersion: 2,
      tableSummary: {},
      resourceSummary: { totalCount: 0, totalSizeBytes: 0, items: {} },
      payloadsChecksumSHA256: 'dummy-sha',
    };

    const futureZipFiles: Record<string, Uint8Array> = {
      'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)),
    };
    const zipBytes = zipSync(futureZipFiles);

    const { report, backupPackage } = await validateBackupArchive(zipBytes);

    expect(report.isValid).toBe(false);
    expect(report.unsupportedFutureFormat).toBe(true);
    expect(backupPackage).toBeNull();
    expect(report.errors[0]).toContain('Unsupported future backup format version (2.0.0)');
  });

  it('creates pre-restore safety snapshots and rolls back on restore failure', async () => {
    // Seed original live database state
    const originalSchool: School = {
      id: 'sch-original',
      name: 'Live Intact School',
      schoolCode: '16000',
      commune: 'Oran',
      wilaya: '31-Oran',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.schools.add(originalSchool);

    // Create safety snapshot manually to test snapshot utility
    const snapshot = await createSafetySnapshot();
    expect(snapshot.tables.schools.length).toBe(1);
    expect(snapshot.tables.schools[0].name).toBe('Live Intact School');

    // Mutate live database
    await db.schools.clear();
    expect(await db.schools.count()).toBe(0);

    // Restore safety snapshot
    await restoreSafetySnapshot(snapshot);
    const restoredLive = await db.schools.get('sch-original');
    expect(restoredLive).toBeDefined();
    expect(restoredLive?.name).toBe('Live Intact School');
  });

  it('preserves archived academic years and historical records across backup and restore cycles', async () => {
    const archivedYear: AcademicYear = {
      id: 'yr-2022',
      schoolId: 'sch-1',
      label: '2022-2023',
      startDate: '2022-09-01',
      endDate: '2023-06-30',
      isCurrent: false,
      isArchived: true,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(archivedYear);

    const { zipUint8Array } = await createBackupPackage();

    await db.academicYears.clear();
    expect(await db.academicYears.count()).toBe(0);

    const { report, backupPackage } = await validateBackupArchive(zipUint8Array);
    expect(report.isValid).toBe(true);

    await executeRestore(backupPackage!);

    const restoredYear = await db.academicYears.get('yr-2022');
    expect(restoredYear).toBeDefined();
    expect(restoredYear?.isArchived).toBe(true);
    expect(restoredYear?.label).toBe('2022-2023');
  });

  it('executes restore failure and rolls back to pre-restore safety snapshot preserving all records and binary blobs', async () => {
    // 1. Seed realistic live database state across all core tables
    const school: School = {
      id: 'sch-live-1',
      name: 'Live Middle School',
      commune: 'Algiers',
      wilaya: '16-Algiers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.schools.add(school);

    const year: AcademicYear = {
      id: 'yr-live-1',
      schoolId: 'sch-live-1',
      label: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
      isArchived: false,
      terms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.academicYears.add(year);

    const curriculumVersion = {
      id: 'dz-cem-ang-2024',
      code: 'ANG-2024',
      title: 'English Middle School',
      status: 'active',
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.curriculumVersions.add(curriculumVersion as any);

    const sessionRubric = {
      id: 'rub-1',
      curriculumVersionId: 'dz-cem-ang-2024',
      code: 'R1',
      name: 'Rubric 1',
      pedagogicalStage: 'Practice',
      defaultDurationMinutes: 45,
      order: 1,
    };
    await db.sessionRubrics.add(sessionRubric as any);

    const gradingScheme = {
      id: 'gs-default',
      name: 'Default Scheme',
      academicYearId: 'yr-live-1',
      components: [],
      formulaType: 'weighted_average',
      maxOverallScore: 20,
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.gradingSchemes.add(gradingScheme as any);

    const schoolClass = {
      id: 'cls-live-1',
      academicYearId: 'yr-live-1',
      schoolId: 'sch-live-1',
      levelCode: '1MS',
      name: '1MS 1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.classes.add(schoolClass as any);

    const person: StudentPerson = {
      id: 'sp-live-1',
      firstNameLatin: 'Yacine',
      lastNameLatin: 'Brahimi',
      gender: 'M',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentPersons.add(person);

    const enrollment: StudentEnrollment = {
      id: 'enr-live-1',
      studentPersonId: 'sp-live-1',
      academicYearId: 'yr-live-1',
      classId: 'cls-live-1',
      registerNumber: 1,
      isRepeating: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.studentEnrollments.add(enrollment);

    const lesson = {
      id: 'les-live-1',
      academicYearId: 'yr-live-1',
      classId: 'cls-live-1',
      levelCode: '1MS',
      curriculumVersionId: 'dz-cem-ang-2024',
      rubricId: 'rub-1',
      sessionNumberInSequence: 1,
      date: '2026-10-01',
      startTime: '08:00',
      endTime: '09:00',
      title: 'Greeting and Introductions',
      specificObjectives: ['Greet peers'],
      targetedCompetencyIds: ['C1'],
      materialsAndAids: [],
      activitySteps: [],
      isCompleted: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.lessons.add(lesson as any);

    const attendance = {
      id: 'att-live-1',
      lessonId: 'les-live-1',
      classId: 'cls-live-1',
      studentEnrollmentId: 'enr-live-1',
      date: '2026-10-01',
      status: 'Present',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.attendance.add(attendance as any);

    const assessment = {
      id: 'ast-live-1',
      academicYearId: 'yr-live-1',
      classId: 'cls-live-1',
      gradingSchemeId: 'gs-default',
      componentKey: 'continuous_assessment',
      termNumber: 1,
      title: 'Test 1',
      date: '2026-10-15',
      maxScore: 20,
      coefficient: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.assessments.add(assessment as any);

    const grade = {
      id: 'grd-live-1',
      assessmentId: 'ast-live-1',
      studentEnrollmentId: 'enr-live-1',
      score: 16,
      isAbsent: false,
      isMedicalExemption: false,
      updatedAt: new Date().toISOString(),
    };
    await db.grades.add(grade as any);

    const binaryText = 'LIVE RESOURCE ORIGINAL BINARY DATA';
    const binaryBuffer = new TextEncoder().encode(binaryText);
    const blob = new Blob([binaryBuffer], { type: 'text/plain' });

    const resource: LocalResource = {
      id: 'res-live-1',
      title: 'Original Syllabus Document',
      category: 'Lesson Plan',
      fileName: 'syllabus.txt',
      fileMimeType: 'text/plain',
      fileSizeBytes: binaryBuffer.byteLength,
      fileHashSHA256: await computeSHA256ForBuffer(binaryBuffer),
      fileBlob: blob,
      tags: ['syllabus'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.resources.add(resource);

    // 2. Build a valid package
    const { zipUint8Array } = await createBackupPackage();
    const { backupPackage } = await validateBackupArchive(zipUint8Array);
    expect(backupPackage).not.toBeNull();

    // Induce a controlled post-restore count verification error
    backupPackage!.manifest.tableSummary['schools'] = { recordCount: 9999, sha256: 'fake-sha' };

    // 3. Attempt restore and verify rejection with error
    await expect(executeRestore(backupPackage!)).rejects.toThrow();

    // 4. Verify complete original database state survived rollback
    expect(await db.schools.get('sch-live-1')).toBeDefined();
    expect(await db.academicYears.get('yr-live-1')).toBeDefined();
    expect(await db.classes.get('cls-live-1')).toBeDefined();
    expect(await db.studentPersons.get('sp-live-1')).toBeDefined();
    expect(await db.studentEnrollments.get('enr-live-1')).toBeDefined();
    expect(await db.lessons.get('les-live-1')).toBeDefined();
    expect(await db.attendance.get('att-live-1')).toBeDefined();
    expect(await db.assessments.get('ast-live-1')).toBeDefined();
    expect(await db.grades.get('grd-live-1')).toBeDefined();

    const restoredRes = await db.resources.get('res-live-1');
    expect(restoredRes).toBeDefined();
    expect(restoredRes?.fileBlob).toBeDefined();

    const restoredBuf = new Uint8Array(await restoredRes!.fileBlob!.arrayBuffer());
    expect(new TextDecoder().decode(restoredBuf)).toBe(binaryText);
  });

  describe('Strict Referential & Resource Integrity Rejections', () => {
    async function createCustomBackupZip(
      tableOverrides: Record<string, any[]>,
      extraFiles: Record<string, Uint8Array> = {}
    ): Promise<Uint8Array> {
      const defaultTables: Record<string, any[]> = {
        schools: [{ id: 'sch-1', name: 'School 1', commune: 'C', wilaya: 'W', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        academicYears: [{ id: 'yr-1', schoolId: 'sch-1', label: '2026-2027', isCurrent: true, isArchived: false, terms: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        teacherProfile: [],
        gradingSchemes: [{ id: 'gs-1', name: 'Scheme', academicYearId: 'yr-1', components: [], formulaType: 'weighted_average', maxOverallScore: 20, isOfficial: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        classes: [{ id: 'cls-1', academicYearId: 'yr-1', schoolId: 'sch-1', levelCode: '1MS', name: '1MS1', isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        studentPersons: [{ id: 'sp-1', firstNameLatin: 'A', lastNameLatin: 'B', gender: 'M', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        studentEnrollments: [{ id: 'enr-1', studentPersonId: 'sp-1', academicYearId: 'yr-1', classId: 'cls-1', registerNumber: 1, isRepeating: false, status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        curriculumVersions: [{ id: 'cv-1', code: 'C1', title: 'Curriculum', status: 'active', isOfficial: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        curriculumLevels: [{ id: 'lvl-1', curriculumVersionId: 'cv-1', levelCode: '1MS', levelTitle: '1MS', weeklyHoursRecommended: 3, order: 1 }],
        competencies: [{ id: 'comp-1', curriculumVersionId: 'cv-1', levelCode: '1MS', code: 'C1', name: 'Comp 1', order: 1 }],
        sessionRubrics: [{ id: 'rub-1', curriculumVersionId: 'cv-1', code: 'R1', name: 'Rubric 1', pedagogicalStage: 'Practice', defaultDurationMinutes: 45, order: 1 }],
        curriculumSequences: [{ id: 'seq-1', curriculumVersionId: 'cv-1', levelCode: '1MS', sequenceNumber: 1, title: 'Seq 1', targetedCompetencyIds: ['comp-1'], plannedSessionsCount: 5, order: 1 }],
        learningObjectives: [{ id: 'obj-1', sequenceId: 'seq-1', curriculumVersionId: 'cv-1', type: 'Linguistic', description: 'Obj 1', order: 1 }],
        lessons: [{ id: 'les-1', academicYearId: 'yr-1', classId: 'cls-1', levelCode: '1MS', curriculumVersionId: 'cv-1', sequenceId: 'seq-1', rubricId: 'rub-1', sessionNumberInSequence: 1, date: '2026-10-01', startTime: '08:00', endTime: '09:00', title: 'Les 1', specificObjectives: [], targetedCompetencyIds: [], materialsAndAids: [], activitySteps: [], isCompleted: true, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        attendance: [{ id: 'att-1', lessonId: 'les-1', classId: 'cls-1', studentEnrollmentId: 'enr-1', date: '2026-10-01', status: 'Present', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        assessments: [{ id: 'ast-1', academicYearId: 'yr-1', classId: 'cls-1', gradingSchemeId: 'gs-1', componentKey: 'continuous_assessment', termNumber: 1, title: 'Ast 1', date: '2026-10-01', maxScore: 20, coefficient: 1, isLocked: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        grades: [{ id: 'grd-1', assessmentId: 'ast-1', studentEnrollmentId: 'enr-1', score: 15, isAbsent: false, isMedicalExemption: false, updatedAt: '2026-01-01' }],
        homework: [],
        observations: [],
        remediation: [],
        timetable: [],
        resources: [],
        ...tableOverrides,
      };

      const zipFiles: Record<string, Uint8Array> = { ...extraFiles };
      const tableSummaries: Record<string, any> = {};

      for (const [tName, records] of Object.entries(defaultTables)) {
        const jsonText = stringifyDeterministicJSON(records);
        zipFiles[`tables/${tName}.json`] = new TextEncoder().encode(jsonText);
        tableSummaries[tName] = {
          recordCount: records.length,
          sha256: await computeSHA256ForText(jsonText),
        };
      }

      const manifest: BackupManifest = {
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        appVersion: '1.0.0',
        appName: 'UNS SCHOOL',
        createdAt: new Date().toISOString(),
        dbSchemaVersion: 1,
        tableSummary: tableSummaries,
        resourceSummary: { totalCount: 0, totalSizeBytes: 0, items: {} },
        payloadsChecksumSHA256: await computeManifestPayloadChecksum(tableSummaries, {}),
      };

      zipFiles['manifest.json'] = new TextEncoder().encode(stringifyDeterministicJSON(manifest));
      return zipSync(zipFiles);
    }

    it('rejects archive with orphan attendance records', async () => {
      const zip = await createCustomBackupZip({
        attendance: [
          {
            id: 'att-orphan',
            lessonId: 'NON_EXISTENT_LESSON_ID',
            studentEnrollmentId: 'enr-1',
            date: '2026-10-01',
            status: 'Present',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      });

      const { report, backupPackage } = await validateBackupArchive(zip);
      expect(report.isValid).toBe(false);
      expect(backupPackage).toBeNull();
      expect(report.errors.some((e) => e.includes('Attendance att-orphan references non-existent Lesson'))).toBe(true);
    });

    it('rejects archive with orphan grade entries', async () => {
      const zip = await createCustomBackupZip({
        grades: [
          {
            id: 'grd-orphan',
            assessmentId: 'NON_EXISTENT_ASSESSMENT_ID',
            studentEnrollmentId: 'enr-1',
            score: 14,
            isAbsent: false,
            isMedicalExemption: false,
            updatedAt: '2026-01-01',
          },
        ],
      });

      const { report, backupPackage } = await validateBackupArchive(zip);
      expect(report.isValid).toBe(false);
      expect(backupPackage).toBeNull();
      expect(report.errors.some((e) => e.includes('GradeEntry grd-orphan references non-existent Assessment'))).toBe(true);
    });

    it('rejects archive with invalid enrollment references', async () => {
      const zip = await createCustomBackupZip({
        studentEnrollments: [
          {
            id: 'enr-orphan',
            studentPersonId: 'NON_EXISTENT_PERSON_ID',
            academicYearId: 'yr-1',
            classId: 'cls-1',
            registerNumber: 1,
            isRepeating: false,
            status: 'active',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      });

      const { report, backupPackage } = await validateBackupArchive(zip);
      expect(report.isValid).toBe(false);
      expect(backupPackage).toBeNull();
      expect(report.errors.some((e) => e.includes('StudentEnrollment enr-orphan references non-existent StudentPerson'))).toBe(true);
    });

    it('rejects archive with invalid lesson curriculum references', async () => {
      const zip = await createCustomBackupZip({
        lessons: [
          {
            id: 'les-invalid-seq',
            academicYearId: 'yr-1',
            classId: 'cls-1',
            levelCode: '1MS',
            curriculumVersionId: 'cv-1',
            sequenceId: 'NON_EXISTENT_SEQUENCE_ID',
            rubricId: 'rub-1',
            sessionNumberInSequence: 1,
            date: '2026-10-01',
            startTime: '08:00',
            endTime: '09:00',
            title: 'Lesson Title',
            specificObjectives: [],
            targetedCompetencyIds: [],
            materialsAndAids: [],
            activitySteps: [],
            isCompleted: true,
            isArchived: false,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      });

      const { report, backupPackage } = await validateBackupArchive(zip);
      expect(report.isValid).toBe(false);
      expect(backupPackage).toBeNull();
      expect(report.errors.some((e) => e.includes('Lesson les-invalid-seq references non-existent CurriculumSequence'))).toBe(true);
    });

    it('rejects archive with invalid assessment grading scheme references', async () => {
      const zip = await createCustomBackupZip({
        assessments: [
          {
            id: 'ast-invalid-scheme',
            academicYearId: 'yr-1',
            classId: 'cls-1',
            gradingSchemeId: 'NON_EXISTENT_SCHEME_ID',
            componentKey: 'continuous_assessment',
            termNumber: 1,
            title: 'Assessment 1',
            date: '2026-10-01',
            maxScore: 20,
            coefficient: 1,
            isLocked: false,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      });

      const { report, backupPackage } = await validateBackupArchive(zip);
      expect(report.isValid).toBe(false);
      expect(backupPackage).toBeNull();
      expect(report.errors.some((e) => e.includes('Assessment ast-invalid-scheme references non-existent GradingScheme'))).toBe(true);
    });

    it('rejects archive with invalid resource relationships (missing binary or orphan binary)', async () => {
      // 1. Missing binary file declared by resource metadata
      const zipMissingBin = await createCustomBackupZip({
        resources: [
          {
            id: 'res-missing-bin',
            title: 'Worksheet Missing File',
            category: 'Worksheet',
            fileName: 'missing.pdf',
            fileMimeType: 'application/pdf',
            fileSizeBytes: 200,
            fileHashSHA256: 'abc123sha256',
            tags: [],
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      });

      const res1 = await validateBackupArchive(zipMissingBin);
      expect(res1.report.isValid).toBe(false);
      expect(res1.backupPackage).toBeNull();
      expect(res1.report.errors.some((e) => e.includes('Missing resource binary file in archive'))).toBe(true);

      // 2. Unexpected orphan binary in ZIP entries
      const zipOrphanBin = await createCustomBackupZip(
        {},
        {
          'resources/orphan_file.bin': new Uint8Array([1, 2, 3, 4, 5]),
        }
      );

      const res2 = await validateBackupArchive(zipOrphanBin);
      expect(res2.report.isValid).toBe(false);
      expect(res2.backupPackage).toBeNull();
      expect(res2.report.errors.some((e) => e.includes('Unexpected orphan resource binary in archive'))).toBe(true);
    });
  });
});
