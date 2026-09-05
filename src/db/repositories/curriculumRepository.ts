/**
 * UNS SCHOOL — Curriculum Repository
 * Pure data access for versioned curricula, sequences, competencies, and session rubrics.
 */

import { db } from '../database';
import type {
  CurriculumVersion,
  CurriculumLevelConfig,
  CompetencyDefinition,
  SessionRubricDefinition,
  CurriculumSequence,
  LearningObjectiveDefinition,
} from '../../types';

export const curriculumRepository = {
  // Versions
  async listVersions(): Promise<CurriculumVersion[]> {
    const versions = await db.curriculumVersions.toArray();
    return versions.sort((a, b) => a.title.localeCompare(b.title));
  },

  async getVersionById(id: string): Promise<CurriculumVersion | undefined> {
    return await db.curriculumVersions.get(id);
  },

  async getActiveVersion(): Promise<CurriculumVersion | undefined> {
    return await db.curriculumVersions.where('status').equals('active').first();
  },

  async saveVersion(version: CurriculumVersion): Promise<string> {
    const now = new Date().toISOString();
    const existing = await db.curriculumVersions.get(version.id);
    if (existing) {
      await db.curriculumVersions.put({ ...version, updatedAt: now });
    } else {
      await db.curriculumVersions.add({
        ...version,
        createdAt: version.createdAt || now,
        updatedAt: now,
      });
    }
    return version.id;
  },

  // Levels
  async listLevels(curriculumVersionId: string): Promise<CurriculumLevelConfig[]> {
    return await db.curriculumLevels
      .where('curriculumVersionId')
      .equals(curriculumVersionId)
      .sortBy('order');
  },

  async saveLevel(level: CurriculumLevelConfig): Promise<void> {
    await db.curriculumLevels.put(level);
  },

  // Sequences
  async listSequences(curriculumVersionId: string, levelCode: string): Promise<CurriculumSequence[]> {
    return await db.curriculumSequences
      .where('curriculumVersionId')
      .equals(curriculumVersionId)
      .and((s) => s.levelCode === levelCode)
      .sortBy('sequenceNumber');
  },

  async listAllSequences(curriculumVersionId: string): Promise<CurriculumSequence[]> {
    return await db.curriculumSequences
      .where('curriculumVersionId')
      .equals(curriculumVersionId)
      .sortBy('sequenceNumber');
  },

  async getSequenceById(id: string): Promise<CurriculumSequence | undefined> {
    return await db.curriculumSequences.get(id);
  },

  async saveSequence(sequence: CurriculumSequence): Promise<string> {
    await db.curriculumSequences.put(sequence);
    return sequence.id;
  },

  async deleteSequence(id: string): Promise<void> {
    const lessonCount = await db.lessons.where('sequenceId').equals(id).count();
    if (lessonCount > 0) {
      throw new Error(`Cannot delete sequence: ${lessonCount} lesson(s) reference this sequence.`);
    }
    await db.transaction('rw', [db.curriculumSequences, db.learningObjectives], async () => {
      await db.learningObjectives.where('sequenceId').equals(id).delete();
      await db.curriculumSequences.delete(id);
    });
  },

  // Session Rubrics
  async listRubrics(curriculumVersionId: string): Promise<SessionRubricDefinition[]> {
    return await db.sessionRubrics
      .where('curriculumVersionId')
      .equals(curriculumVersionId)
      .sortBy('order');
  },

  async getRubricById(id: string): Promise<SessionRubricDefinition | undefined> {
    return await db.sessionRubrics.get(id);
  },

  async saveRubric(rubric: SessionRubricDefinition): Promise<void> {
    await db.sessionRubrics.put(rubric);
  },

  async deleteRubric(id: string): Promise<void> {
    const lessonCount = await db.lessons.where('rubricId').equals(id).count();
    if (lessonCount > 0) {
      throw new Error(`Cannot delete session rubric: ${lessonCount} lesson(s) reference this rubric.`);
    }
    await db.sessionRubrics.delete(id);
  },

  // Competencies
  async listCompetencies(curriculumVersionId: string, levelCode?: string): Promise<CompetencyDefinition[]> {
    const query = db.competencies.where('curriculumVersionId').equals(curriculumVersionId);
    if (levelCode) {
      return await query.and((c) => c.levelCode === levelCode || c.levelCode === 'ALL').sortBy('order');
    }
    return await query.sortBy('order');
  },

  async getCompetencyById(id: string): Promise<CompetencyDefinition | undefined> {
    return await db.competencies.get(id);
  },

  async saveCompetency(competency: CompetencyDefinition): Promise<void> {
    await db.competencies.put(competency);
  },

  async deleteCompetency(id: string): Promise<void> {
    await db.competencies.delete(id);
  },

  // Learning Objectives
  async listObjectives(sequenceId: string): Promise<LearningObjectiveDefinition[]> {
    return await db.learningObjectives.where('sequenceId').equals(sequenceId).sortBy('order');
  },

  async listObjectivesByCurriculumVersion(curriculumVersionId: string): Promise<LearningObjectiveDefinition[]> {
    return await db.learningObjectives.where('curriculumVersionId').equals(curriculumVersionId).sortBy('order');
  },

  async saveObjective(objective: LearningObjectiveDefinition): Promise<void> {
    await db.learningObjectives.put(objective);
  },

  async deleteObjective(id: string): Promise<void> {
    await db.learningObjectives.delete(id);
  },
};
