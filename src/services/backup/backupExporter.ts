/**
 * UNS SCHOOL — Backup Exporter Service
 * Export complete .unsschool ZIP packages containing deterministic JSON tables, resource blobs, and integrity manifests.
 */

import { zipSync } from 'fflate';
import { db } from '../../db/database';
import { DB_TABLES, type DbTableName } from '../../db/schema';
import type { LocalResource } from '../../types';
import {
  BACKUP_FORMAT_VERSION,
  APP_VERSION,
  APP_NAME,
  BACKUP_FILE_EXTENSION,
  type BackupManifest,
  type TableSummaryItem,
  type ResourceSummaryItem,
} from './backupTypes';
import {
  computeSHA256ForText,
  computeSHA256ForBuffer,
  computeManifestPayloadChecksum,
  stringifyDeterministicJSON,
} from './checksumService';

export async function createBackupPackage(): Promise<{
  zipUint8Array: Uint8Array;
  filename: string;
  manifest: BackupManifest;
}> {
  const nowIso = new Date().toISOString();
  const dateStamp = nowIso.split('T')[0];
  const filename = `unsschool_backup_${dateStamp}${BACKUP_FILE_EXTENSION}`;

  const zipFiles: Record<string, Uint8Array> = {};
  const tableSummaries: Record<string, TableSummaryItem> = {};
  const resourceItems: Record<string, ResourceSummaryItem> = {};

  let totalResourceSizeBytes = 0;
  let totalResourceCount = 0;

  // 1. Read and process all database tables
  const tableNames = Object.values(DB_TABLES) as DbTableName[];

  for (const tableName of tableNames) {
    const rawRecords = await db.table(tableName).toArray();

    // Sort records deterministically by ID if available
    const sortedRecords = [...rawRecords].sort((a, b) => {
      const idA = String(a?.id || '');
      const idB = String(b?.id || '');
      return idA.localeCompare(idB);
    });

    // Special handling for resources table: decouple fileBlob from JSON payload
    let processedRecords = sortedRecords;
    if (tableName === DB_TABLES.RESOURCES) {
      processedRecords = await Promise.all(
        sortedRecords.map(async (resItem: LocalResource) => {
          const { fileBlob, ...resourceMetadata } = resItem;

          if (fileBlob) {
            const arrayBuffer = await fileBlob.arrayBuffer();
            const u8Data = new Uint8Array(arrayBuffer);
            const blobSha256 = await computeSHA256ForBuffer(u8Data);
            const zipPath = `resources/${resItem.id}.bin`;

            zipFiles[zipPath] = u8Data;

            totalResourceCount++;
            totalResourceSizeBytes += u8Data.byteLength;

            resourceItems[resItem.id] = {
              fileName: resItem.fileName || `${resItem.id}.bin`,
              fileMimeType: resItem.fileMimeType || 'application/octet-stream',
              fileSizeBytes: u8Data.byteLength,
              fileHashSHA256: blobSha256,
              zipPath,
            };
          }

          return resourceMetadata;
        })
      );
    }

    const jsonText = stringifyDeterministicJSON(processedRecords);
    const jsonBytes = new TextEncoder().encode(jsonText);
    const tableSha256 = await computeSHA256ForText(jsonText);

    zipFiles[`tables/${tableName}.json`] = jsonBytes;

    tableSummaries[tableName] = {
      recordCount: processedRecords.length,
      sha256: tableSha256,
    };
  }

  // 2. Extract active school and academic year metadata for manifest header
  let schoolMetadata: BackupManifest['schoolMetadata'] = undefined;
  let activeAcademicYear: BackupManifest['activeAcademicYear'] = undefined;

  try {
    const schools = await db.schools.toArray();
    if (schools.length > 0) {
      schoolMetadata = {
        schoolName: schools[0].name,
        wilaya: schools[0].wilaya,
        commune: schools[0].commune,
      };
    }

    const currentYear = await db.academicYears.where('isCurrent').equals(1).first();
    if (currentYear) {
      activeAcademicYear = {
        id: currentYear.id,
        label: currentYear.label,
      };
    }
  } catch {
    // Non-fatal metadata collection fallback
  }

  // 3. Compute master composite SHA-256 digest over table & resource checksums
  const resourceShaMap = Object.fromEntries(
    Object.entries(resourceItems).map(([id, item]) => [id, { sha256: item.fileHashSHA256 }])
  );

  const payloadsChecksumSHA256 = await computeManifestPayloadChecksum(
    tableSummaries,
    resourceShaMap
  );

  // 4. Build Manifest
  const manifest: BackupManifest = {
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    appName: APP_NAME,
    createdAt: nowIso,
    dbSchemaVersion: 1,
    schoolMetadata,
    activeAcademicYear,
    tableSummary: tableSummaries,
    resourceSummary: {
      totalCount: totalResourceCount,
      totalSizeBytes: totalResourceSizeBytes,
      items: resourceItems,
    },
    payloadsChecksumSHA256,
  };

  const manifestJsonText = stringifyDeterministicJSON(manifest);
  zipFiles['manifest.json'] = new TextEncoder().encode(manifestJsonText);

  // 5. Create compressed ZIP archive
  const zipUint8Array = zipSync(zipFiles);

  return {
    zipUint8Array,
    filename,
    manifest,
  };
}

/**
 * Triggers browser download for a generated backup file.
 */
export function triggerBrowserDownload(zipUint8Array: Uint8Array, filename: string): void {
  const blob = new Blob([zipUint8Array], { type: 'application/x-unsschool' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
