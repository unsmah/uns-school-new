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

  async save(resource: LocalResource): Promise<string> {
    const now = new Date().toISOString();
    const existing = await db.resources.get(resource.id);
    if (existing) {
      await db.resources.put({ ...resource, updatedAt: now });
    } else {
      await db.resources.add({
        ...resource,
        createdAt: resource.createdAt || now,
        updatedAt: now,
      });
    }
    return resource.id;
  },

  async delete(id: string): Promise<void> {
    await db.resources.delete(id);
  },
};
