/**
 * UNS SCHOOL — SHA-256 Checksum & Integrity Utility
 * Calculates deterministic cryptographic digests over table payloads and resource files.
 */

/**
 * Computes SHA-256 hash for a UTF-8 text string.
 */
export async function computeSHA256ForText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return computeSHA256ForBuffer(data);
}

/**
 * Computes SHA-256 hash for a binary ArrayBuffer or Uint8Array.
 */
export async function computeSHA256ForBuffer(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const u8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', u8Array);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback for vitest environment if globalThis.crypto.subtle is not present
  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(Buffer.from(u8Array)).digest('hex');
  } catch {
    throw new Error('SHA-256 computation unavailable in current runtime environment.');
  }
}

/**
 * Computes SHA-256 hash for a Blob object.
 */
export async function computeSHA256ForBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  return computeSHA256ForBuffer(arrayBuffer);
}

/**
 * Computes deterministic master payload checksum over table SHA-256 digests and resource SHA-256 digests.
 * Prevents circular dependency by combining component digests in deterministic alphabetical key order.
 */
export async function computeManifestPayloadChecksum(
  tableSummaries: Record<string, { sha256: string }>,
  resourceSummaries: Record<string, { sha256: string }>
): Promise<string> {
  const sortedTableKeys = Object.keys(tableSummaries).sort();
  const tablePart = sortedTableKeys
    .map((k) => `${k}:${tableSummaries[k].sha256}`)
    .join(';');

  const sortedResourceKeys = Object.keys(resourceSummaries).sort();
  const resourcePart = sortedResourceKeys
    .map((k) => `${k}:${resourceSummaries[k].sha256}`)
    .join(';');

  const compositeString = `TABLES[${tablePart}]|RESOURCES[${resourcePart}]`;
  return computeSHA256ForText(compositeString);
}

/**
 * Helper to produce deterministic, key-sorted JSON representation for database entities.
 */
export function stringifyDeterministicJSON(value: any): string {
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const sortedObj: Record<string, any> = {};
      Object.keys(val)
        .sort()
        .forEach((k) => {
          sortedObj[k] = val[k];
        });
      return sortedObj;
    }
    return val;
  }, 2);
}
