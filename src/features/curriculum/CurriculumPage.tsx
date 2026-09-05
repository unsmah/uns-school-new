/**
 * UNS SCHOOL — Curriculum & Competencies Explorer (Phase 5)
 * Teacher-facing interactive curriculum explorer for versioned Algerian Middle School syllabi (1AM–4AM).
 * Fully data-driven, version-isolated, and strictly local-first.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Layers,
  Award,
  Clock,
  Target,
  FileText,
  ShieldCheck,
  History,
  Sparkles,
  ChevronRight,
  ListOrdered,
  Compass,
} from 'lucide-react';
import { Card, Button, Badge, Alert } from '../../components/ui';
import { curriculumRepository } from '../../db/repositories/curriculumRepository';
import type {
  CurriculumVersion,
  CurriculumLevelConfig,
  CurriculumSequence,
  CompetencyDefinition,
  SessionRubricDefinition,
  LearningObjectiveDefinition,
} from '../../types';

export const CurriculumPage: React.FC = () => {
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [levels, setLevels] = useState<CurriculumLevelConfig[]>([]);
  const [selectedLevelCode, setSelectedLevelCode] = useState<string>('1MS');
  const [sequences, setSequences] = useState<CurriculumSequence[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyDefinition[]>([]);
  const [rubrics, setRubrics] = useState<SessionRubricDefinition[]>([]);
  const [objectives, setObjectives] = useState<LearningObjectiveDefinition[]>([]);

  const [activeTab, setActiveTab] = useState<'sequences' | 'competencies' | 'rubrics'>('sequences');
  const [expandedSequenceId, setExpandedSequenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Load available curriculum versions
  useEffect(() => {
    async function loadVersions() {
      setIsLoading(true);
      try {
        const allVersions = await curriculumRepository.listVersions();
        setVersions(allVersions);

        const activeVersion = allVersions.find((v) => v.status === 'active') || allVersions[0];
        if (activeVersion && !selectedVersionId) {
          setSelectedVersionId(activeVersion.id);
        }
      } catch (err) {
        console.error('Failed to load curriculum versions:', err);
        setError('Failed to load curriculum versions.');
      } finally {
        setIsLoading(false);
      }
    }
    loadVersions();
  }, []);

  // 2. Load levels, rubrics, and version-level competencies whenever selectedVersionId changes
  useEffect(() => {
    if (!selectedVersionId) return;

    async function loadVersionData() {
      try {
        const [lvlList, rubList, compList, allObjs] = await Promise.all([
          curriculumRepository.listLevels(selectedVersionId),
          curriculumRepository.listRubrics(selectedVersionId),
          curriculumRepository.listCompetencies(selectedVersionId),
          curriculumRepository.listObjectivesByCurriculumVersion(selectedVersionId),
        ]);

        setLevels(lvlList);
        setRubrics(rubList);
        setCompetencies(compList);
        setObjectives(allObjs);

        if (lvlList.length > 0 && !lvlList.some((l) => l.levelCode === selectedLevelCode)) {
          setSelectedLevelCode(lvlList[0].levelCode);
        }
      } catch (err) {
        console.error('Failed to load version details:', err);
        setError('Failed to load curriculum version details.');
      }
    }

    loadVersionData();
  }, [selectedVersionId]);

  // 3. Load sequences whenever selectedVersionId or selectedLevelCode changes
  useEffect(() => {
    if (!selectedVersionId || !selectedLevelCode) return;

    async function loadSequences() {
      try {
        const seqList = await curriculumRepository.listSequences(selectedVersionId, selectedLevelCode);
        setSequences(seqList);
        if (seqList.length > 0) {
          setExpandedSequenceId(seqList[0].id);
        } else {
          setExpandedSequenceId(null);
        }
      } catch (err) {
        console.error('Failed to load sequences:', err);
      }
    }

    loadSequences();
  }, [selectedVersionId, selectedLevelCode]);

  // Selected Version object
  const currentVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  // Selected Level object
  const currentLevel = useMemo(
    () => levels.find((l) => l.levelCode === selectedLevelCode),
    [levels, selectedLevelCode]
  );

  // Competencies applicable to current level
  const filteredCompetencies = useMemo(() => {
    return competencies.filter(
      (c) => c.levelCode === 'ALL' || c.levelCode === selectedLevelCode
    );
  }, [competencies, selectedLevelCode]);

  // Objectives map by sequenceId
  const objectivesBySequence = useMemo(() => {
    const map = new Map<string, LearningObjectiveDefinition[]>();
    for (const obj of objectives) {
      const list = map.get(obj.sequenceId) || [];
      list.push(obj);
      map.set(obj.sequenceId, list);
    }
    return map;
  }, [objectives]);

  const getObjectiveTypeBadge = (type: string) => {
    switch (type) {
      case 'Communicative':
        return <Badge variant="neutral">Communicative (تواصلي)</Badge>;
      case 'Linguistic':
        return <Badge variant="default">Linguistic (لغوي / نحوي)</Badge>;
      case 'Methodological':
        return <Badge variant="warning">Methodological (منهجي)</Badge>;
      case 'Cultural':
        return <Badge variant="success">Cultural (ثقافي)</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const getPedagogicalStageBadge = (stage: string) => {
    switch (stage) {
      case 'Pre-requisite':
        return <Badge variant="neutral">Pre-requisite</Badge>;
      case 'Presentation':
        return <Badge variant="neutral">Presentation</Badge>;
      case 'Practice':
        return <Badge variant="default">Practice</Badge>;
      case 'Production':
        return <Badge variant="success">Production</Badge>;
      case 'Integration':
        return <Badge variant="warning">Integration</Badge>;
      case 'Evaluation':
        return <Badge variant="error">Evaluation</Badge>;
      default:
        return <Badge variant="neutral">{stage}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading curriculum database...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Curriculum Explorer (استكشاف المنهاج)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data-driven versioned Algerian middle school English curriculum (1AM–4AM)
          </p>
        </div>

        {/* Version Selector & Protection Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Curriculum Version:
            </label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} ({v.code})
                </option>
              ))}
            </select>
          </div>

          {currentVersion?.status === 'active' && (
            <Badge variant="success" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Active National Curriculum
            </Badge>
          )}

          {currentVersion?.status === 'historical' && (
            <Badge variant="neutral" className="flex items-center gap-1">
              <History className="w-3 h-3" />
              Historical Syllabus
            </Badge>
          )}

          {currentVersion?.isOfficial && (
            <Badge variant="default" className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Official MEN
            </Badge>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Curriculum Details Banner */}
      {currentVersion && (
        <Card className="bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentVersion.title}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentVersion.code}
                </span>
              </div>
              {currentVersion.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {currentVersion.description}
                </p>
              )}
              {currentVersion.sourceDocumentReference && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Reference: {currentVersion.sourceDocumentReference}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs text-slate-600 dark:text-slate-400">
              <div className="text-right">
                <span className="block font-semibold text-slate-800 dark:text-slate-200">
                  {levels.length} Middle School Levels
                </span>
                <span className="text-[11px] text-slate-500">1AM · 2AM · 3AM · 4AM (BEM)</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Level Selection Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
            Target Level:
          </span>
          {levels.map((lvl) => {
            const isSelected = selectedLevelCode === lvl.levelCode;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setSelectedLevelCode(lvl.levelCode)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {lvl.levelTitle}
              </button>
            );
          })}
        </div>

        {currentLevel && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Recommended: {currentLevel.weeklyHoursRecommended} hrs / week</span>
          </div>
        )}
      </div>

      {/* Exit Profile Summary */}
      {currentLevel?.exitProfileDescription && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 text-xs">
          <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-950 dark:text-emerald-300">
              Level Exit Profile (الملمح الختامي للمستوى):{' '}
            </span>
            <span className="text-emerald-900 dark:text-emerald-200">
              {currentLevel.exitProfileDescription}
            </span>
          </div>
        </div>
      )}

      {/* Explorer Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('sequences')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'sequences'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sequences & Learning Projects ({sequences.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('competencies')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'competencies'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Core Competencies ({filteredCompetencies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rubrics')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'rubrics'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Session Rubrics ({rubrics.length})</span>
        </button>
      </div>

      {/* TAB 1: Sequences & Learning Projects */}
      {activeTab === 'sequences' && (
        <div className="space-y-4">
          {sequences.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">No sequences registered for this level.</p>
              <p className="text-xs mt-1">
                Sequences will be populated according to the curriculum version definitions.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sequences.map((seq) => {
                const isExpanded = expandedSequenceId === seq.id;
                const seqObjectives = objectivesBySequence.get(seq.id) || [];

                return (
                  <div
                    key={seq.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Sequence Header Bar */}
                    <div
                      onClick={() => setExpandedSequenceId(isExpanded ? null : seq.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          S{seq.sequenceNumber}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {seq.title}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              {seq.plannedSessionsCount || 12} Planned Sessions
                            </span>
                          </div>
                          {seq.communicativeObjective && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Communicative Goal:{' '}
                              </span>
                              {seq.communicativeObjective}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {seqObjectives.length} Objectives
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Sequence Expanded Body */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:divide-slate-800/80 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                        {/* Project Work / Culminating Task */}
                        {seq.projectWorkTitle && (
                          <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs">
                            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
                              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Project Work / Culminating Task (المشروع البيداغوجي):</span>
                            </div>
                            <p className="text-amber-950 dark:text-amber-200 font-medium mt-1">
                              {seq.projectWorkTitle}
                            </p>
                            {seq.projectWorkDescription && (
                              <p className="text-amber-900/80 dark:text-amber-300/80 text-[11px] mt-0.5">
                                {seq.projectWorkDescription}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Targeted Competencies */}
                        {seq.targetedCompetencyIds && seq.targetedCompetencyIds.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                              Targeted Core Competencies:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {seq.targetedCompetencyIds.map((compId) => {
                                const comp = competencies.find((c) => c.id === compId);
                                return (
                                  <div
                                    key={compId}
                                    className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5"
                                  >
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {comp?.code || 'Comp'}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                      {comp?.name || compId}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Learning Objectives Breakdown */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Learning Objectives Breakdown (الأهداف التعلمية):
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Linguistic · Communicative · Methodological · Cultural
                            </span>
                          </div>

                          {seqObjectives.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              No discrete learning objectives entered for this sequence yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {seqObjectives.map((obj) => (
                                <div
                                  key={obj.id}
                                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5">
                                      {obj.order}
                                    </span>
                                    <p className="text-slate-800 dark:text-slate-200">
                                      {obj.description}
                                    </p>
                                  </div>
                                  <div className="shrink-0 self-end sm:self-center">
                                    {getObjectiveTypeBadge(obj.type)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Core Competencies */}
      {activeTab === 'competencies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredCompetencies.map((comp) => (
            <Card key={comp.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  {comp.code}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {comp.levelCode === 'ALL' ? 'All Levels (1AM–4AM)' : comp.levelCode}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {comp.name}
                </h3>
                {comp.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {comp.description}
                  </p>
                )}
              </div>

              {comp.criteria && comp.criteria.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Assessment Criteria (معايير التقييم):
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    {comp.criteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: Pedagogical Session Rubrics */}
      {activeTab === 'rubrics' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Standard Algerian Pedagogical Rubrics:</span> Each session in
            a sequence follows an explicit pedagogical stage (Pre-requisite, Presentation, Practice,
            Production, Integration, Evaluation).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rubrics.map((rub) => (
              <div
                key={rub.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {rub.name}
                  </span>
                  {getPedagogicalStageBadge(rub.pedagogicalStage)}
                </div>

                {rub.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {rub.description}
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="font-mono">Code: {rub.code}</span>
                  <span>Duration: {rub.defaultDurationMinutes || 60}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
