/**
 * UNS SCHOOL — Local Resource Repository
 * Stores teaching aids and worksheets locally in IndexedDB.
 */

import { db } from '../database';
import type { LocalResource } from '../../types';

export const resourceRepository = {
  async listAll(): Promise<LocalResource[]> {
    return await db.resources.orderBy('createdAt').reverse().toArray();
  },

  async listByCategory(category: LocalResource['category']): Promise<LocalResource[]> {
    return await db.resources.where('category').equals(category).toArray();
  },

  async getById(id: string): Promise<LocalResource | undefined> {
    return await db.resources.get(id);
  },

  /**
   * Public save with strict provenance rules & forgery defense.
   * Prohibits escalating user/template resources to official_verified.
   * Guarantees isOfficial === false whenever provenance !== 'official_verified'.
   */
  async save(resource: LocalResource): Promise<string> {
    const now = new Date().toISOString();
    const existing = await db.resources.get(resource.id);

    let finalProvenance = resource.provenance || 'user_created';
    let finalIsOfficial = Boolean(resource.isOfficial);

    // Provenance invariant: only official_verified can have isOfficial === true
    if (finalProvenance !== 'official_verified') {
      finalIsOfficial = false;
    }

    // Escalation Defense: Block untrusted attempts to elevate new or non-official records to official_verified
    if (finalProvenance === 'official_verified' || finalIsOfficial) {
      if (!existing || existing.provenance !== 'official_verified') {
        finalProvenance = 'user_created';
        finalIsOfficial = false;
      }
    }

    const cleanResource: LocalResource = {
      ...resource,
      provenance: finalProvenance,
      isOfficial: finalIsOfficial,
      updatedAt: now,
      createdAt: existing ? existing.createdAt : (resource.createdAt || now),
    };

    await db.resources.put(cleanResource);
    return cleanResource.id;
  },

  /**
   * Internal trusted seed path for official resources.
   */
  async seedOfficial(resource: LocalResource): Promise<string> {
    const now = new Date().toISOString();
    const cleanResource: LocalResource = {
      ...resource,
      provenance: 'official_verified',
      isOfficial: true,
      updatedAt: now,
      createdAt: resource.createdAt || now,
    };
    await db.resources.put(cleanResource);
    return cleanResource.id;
  },

  async delete(id: string): Promise<void> {
    await db.resources.delete(id);
  },
};
