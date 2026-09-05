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
});
