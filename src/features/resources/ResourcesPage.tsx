/**
 * UNS SCHOOL — Teaching Resources & Lesson Plan Library Workspace
 * Offline-first repository for starter lesson plan templates, worksheets, and teacher guidance.
 *
 * PROVENANCE TRANSPARENCY:
 * All seeded and created items clearly highlight provenance labels ('teacher_template', 'sample', 'official_verified').
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  BookOpen,
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Sparkles,
  Layers,
  Award,
  Tag,
  CheckCircle2,
  Trash2,
  X,
  FileUp,
  Info,
} from 'lucide-react';
import { Card, Button, Input, Select, Modal, Alert } from '../../components/ui';
import { resourceRepository, academicYearRepository, classRepository, lessonRepository } from '../../db/repositories';
import { LessonModal } from '../../components/lessons/LessonModal';
import { computeSHA256ForText } from '../../services/backup/checksumService';
import type { LocalResource, LessonTemplatePayload, SchoolClass, AcademicYear, Lesson } from '../../types';

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<LocalResource[]>([]);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedProvenance, setSelectedProvenance] = useState<string>('ALL');

  // Viewing / Reading Resource Modal State
  const [viewingResource, setViewingResource] = useState<LocalResource | null>(null);
  const [resourceTextContent, setResourceTextContent] = useState<string>('');

  // Lesson Modal State ("Use as Template" workflow)
  const [templateLessonModalOpen, setTemplateLessonModalOpen] = useState(false);
  const [selectedTemplatePayload, setSelectedTemplatePayload] = useState<LessonTemplatePayload | null>(null);

  // Add Resource Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<LocalResource['category']>('Teacher Templates');
  const [newLevel, setNewLevel] = useState('ALL');
  const [newProvenance, setNewProvenance] = useState<LocalResource['provenance']>('teacher_template');
  const [newSourceRef, setNewSourceRef] = useState('Teacher Original Material');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newContentText, setNewContentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Success Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const items = await resourceRepository.listAll();
      setResources(items);

      const year = await academicYearRepository.getCurrent();
      if (year) {
        setActiveYear(year);
        const clsList = await classRepository.listByAcademicYear(year.id);
        setClasses(clsList);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Items
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Category filter
      if (selectedCategory !== 'ALL' && res.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'ALL' && res.levelCode !== 'ALL' && res.levelCode !== selectedLevel) {
        return false;
      }
      // Provenance filter
      if (selectedProvenance !== 'ALL' && (res.provenance || 'teacher_template') !== selectedProvenance) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = (res.description || '').toLowerCase().includes(q);
        const matchesTags = (res.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [resources, selectedCategory, selectedLevel, selectedProvenance, searchQuery]);

  // Handle Viewing a Resource Content
  const handleOpenViewModal = async (res: LocalResource) => {
    setViewingResource(res);
    if (res.fileBlob) {
      try {
        const text = await res.fileBlob.text();
        setResourceTextContent(text);
      } catch {
        setResourceTextContent('Unable to parse text content from binary file.');
      }
    } else {
      setResourceTextContent(res.description || 'No document preview available.');
    }
  };

  // Handle "Use as Template"
  const handleUseAsTemplate = (res: LocalResource) => {
    if (!res.templatePayload) return;
    if (classes.length === 0) {
      setNotification('Please set up at least one school class before applying lesson templates.');
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    setSelectedTemplatePayload(res.templatePayload);
    setTemplateLessonModalOpen(true);
  };

  // Handle Downloading a Resource
  const handleDownloadResource = async (res: LocalResource) => {
    if (!res.fileBlob) {
      const bytes = new TextEncoder().encode(res.description || res.title);
      const blob = new Blob([bytes], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName || `${res.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const url = URL.createObjectURL(res.fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName || `${res.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Handle Deleting a Resource
  const handleDeleteResource = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource from local storage?')) {
      await resourceRepository.delete(id);
      setNotification('Resource removed successfully.');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    }
  };

  // Handle Creating Custom Resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newTitle.trim()) {
      setAddError('Title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const text = newContentText.trim() || newDescription.trim() || `# ${newTitle}`;
      const sha256 = await computeSHA256ForText(text);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const blob = new Blob([bytes], { type: 'text/markdown;charset=utf-8' });

      const tags = newTagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const safeProvenance = (newProvenance === 'official_verified' ? 'user_created' : newProvenance) || 'user_created';

      const newRes: LocalResource = {
        id: `res-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        levelCode: newLevel,
        fileName: `${newTitle.toLowerCase().replace(/\s+/g, '_')}.md`,
        fileMimeType: 'text/markdown',
        fileSizeBytes: bytes.byteLength,
        fileHashSHA256: sha256,
        fileBlob: blob,
        tags,
        provenance: safeProvenance,
        isOfficial: false,
        sourceReference: newSourceRef.trim() || 'Teacher Custom Local File',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await resourceRepository.save(newRes);

      setAddModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewContentText('');
      setNewTagsStr('');
      setNotification('New teaching resource created and stored locally in IndexedDB.');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to save resource.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriesList: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'ALL', label: 'All Resources', icon: FolderOpen },
    { id: 'Lesson Plan', label: 'Lesson Plan Library', icon: BookOpen },
    { id: 'Classroom Activities', label: 'Activities', icon: Layers },
    { id: 'Worksheets', label: 'Worksheets', icon: FileText },
    { id: 'Grammar', label: 'Grammar', icon: Tag },
    { id: 'Vocabulary', label: 'Vocabulary', icon: Tag },
    { id: 'Teacher Templates', label: 'Teacher Templates', icon: Sparkles },
    { id: 'Assessment Templates', label: 'Assessment', icon: Award },
    { id: 'Classroom Management', label: 'Management', icon: Layers },
    { id: 'BEM Preparation', label: 'BEM Prep', icon: Award },
    { id: 'Remediation', label: 'Remediation', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 break-words">
              Teaching Resources & Lesson Plan Library
            </h1>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Offline Local Library
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">
            Starter lesson plans, pair-work speaking cards, diagnostic rubrics, and printable worksheets for Algerian middle school teachers.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Resource / Template</span>
        </Button>
      </div>

      {notification && (
        <Alert variant="success" title="Action Completed">
          {notification}
        </Alert>
      )}

      {/* Provenance Transparency Alert */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-semibold">Provenance & Content Integrity Transparency</div>
          <p className="text-[11px] leading-relaxed">
            All seeded resources are teacher community templates and illustrative reference samples.
            No content is falsely claimed to be an official Ministry document.
            Teachers may safely edit, copy, or use lesson templates to log independent historical records.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {categoriesList.map((cat) => {
          const IconComp = cat.icon;
          const isActive = selectedCategory === cat.id;
          const count =
            cat.id === 'ALL'
              ? resources.length
              : resources.filter((r) => r.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by title, tag, or topic..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <Select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Middle School Levels' },
            { value: '1MS', label: '1MS (1AM - 1st Year)' },
            { value: '2MS', label: '2MS (2AM - 2nd Year)' },
            { value: '3MS', label: '3MS (3AM - 3rd Year)' },
            { value: '4MS', label: '4MS (4AM - 4th Year BEM)' },
          ]}
        />

        <Select
          value={selectedProvenance}
          onChange={(e) => setSelectedProvenance(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Provenances' },
            { value: 'teacher_template', label: 'Teacher Template' },
            { value: 'sample', label: 'Sample / Reference' },
            { value: 'official_verified', label: 'Official Verified' },
          ]}
        />
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">No matching resources found</div>
          <p className="text-[11px] text-slate-400">
            Try adjusting your search keywords, level filter, or category selection.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const hasTemplate = !!res.templatePayload;
            const prov = res.provenance || 'teacher_template';

            return (
              <Card
                key={res.id}
                className="flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all p-4 space-y-3"
              >
                <div className="space-y-2">
                  {/* Category & Level Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {res.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {res.levelCode}
                      </span>

                      {/* Provenance Badge */}
                      {prov === 'user_created' && (
                        <span className="px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Teacher Created
                        </span>
                      )}
                      {prov === 'teacher_template' && (
                        <span className="px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Teacher Template
                        </span>
                      )}
                      {(prov === 'sample' || prov === 'reference') && (
                        <span className="px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Sample Reference
                        </span>
                      )}
                      {prov === 'official_verified' && (
                        <span className="px-2 py-0.5 rounded-md font-medium bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Official Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                    {res.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {res.description}
                  </p>

                  {/* Tags */}
                  {res.tags && res.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenViewModal(res)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="View Content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownloadResource(res)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Download File"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {res.id.startsWith('res-custom-') && (
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* "Use as Template" Action for Lesson Plans */}
                  {hasTemplate ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUseAsTemplate(res)}
                      className="text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Use as Template
                    </Button>
                  ) : (
                    <button
                      onClick={() => handleOpenViewModal(res)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Read Guide →
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* VIEW RESOURCE CONTENT MODAL */}
      <Modal
        isOpen={!!viewingResource}
        onClose={() => setViewingResource(null)}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span className="line-clamp-1">{viewingResource?.title}</span>
          </div>
        }
        description={`Category: ${viewingResource?.category} | Level: ${viewingResource?.levelCode} | Source: ${
          viewingResource?.sourceReference || 'UNS SCHOOL Library'
        }`}
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full text-xs">
            <span className="text-slate-500">
              Provenance:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {viewingResource?.provenance || 'teacher_template'}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewingResource(null)}>
                Close
              </Button>

              {viewingResource && (
                <Button variant="primary" size="sm" onClick={() => handleDownloadResource(viewingResource)}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download File
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {viewingResource?.templatePayload ? (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Lesson Plan Template Payload
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const res = viewingResource;
                    setViewingResource(null);
                    handleUseAsTemplate(res);
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Apply to New Lesson
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                <div>
                  <strong>Communicative Objective:</strong> {viewingResource.templatePayload.communicativeObjective}
                </div>
                <div>
                  <strong>Pedagogical Stage:</strong> {viewingResource.templatePayload.pedagogicalStage}
                </div>
              </div>
            </div>
          ) : null}

          {/* Document Content Display */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
            {resourceTextContent}
          </div>
        </div>
      </Modal>

      {/* CREATE CUSTOM RESOURCE MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Custom Teaching Resource / Template"
        description="Save local worksheets, lesson templates, or guides directly into IndexedDB."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateResource} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save to Local Storage'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
          {addError && (
            <Alert variant="error" title="Validation Error">
              {addError}
            </Alert>
          )}

          <Input
            label="Resource Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. 2MS Past Simple Grammar Exercises"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as LocalResource['category'])}
              options={[
                { value: 'Lesson Plan', label: 'Lesson Plan' },
                { value: 'Classroom Activities', label: 'Classroom Activities' },
                { value: 'Worksheets', label: 'Worksheets' },
                { value: 'Grammar', label: 'Grammar' },
                { value: 'Vocabulary', label: 'Vocabulary' },
                { value: 'Teacher Templates', label: 'Teacher Templates' },
                { value: 'Assessment Templates', label: 'Assessment Templates' },
                { value: 'Classroom Management', label: 'Classroom Management' },
                { value: 'BEM Preparation', label: 'BEM Preparation' },
                { value: 'Remediation', label: 'Remediation' },
              ]}
            />

            <Select
              label="Level Code"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Levels (ALL)' },
                { value: '1MS', label: '1MS (1AM)' },
                { value: '2MS', label: '2MS (2AM)' },
                { value: '3MS', label: '3MS (3AM)' },
                { value: '4MS', label: '4MS (4AM)' },
              ]}
            />

            <Select
              label="Provenance Tag"
              value={newProvenance}
              onChange={(e) => setNewProvenance(e.target.value as LocalResource['provenance'])}
              options={[
                { value: 'user_created', label: 'Teacher Created' },
                { value: 'teacher_template', label: 'Teacher Template' },
                { value: 'sample', label: 'Sample / Reference' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Source / Provenance Reference"
              value={newSourceRef}
              onChange={(e) => setNewSourceRef(e.target.value)}
              placeholder="e.g. Self-authored / Teacher Group"
            />

            <Input
              label="Tags (comma-separated)"
              value={newTagsStr}
              onChange={(e) => setNewTagsStr(e.target.value)}
              placeholder="e.g. grammar, past-simple, 2AM"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Short Summary / Description:
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Provide a concise description of this teaching aid..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Markdown / Document Body Text:
            </label>
            <textarea
              rows={6}
              value={newContentText}
              onChange={(e) => setNewContentText(e.target.value)}
              placeholder="# Resource Title&#10;&#10;Write markdown content, exercises, or instructions here..."
              className="w-full font-mono text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>
      </Modal>

      {/* LESSON MODAL FOR "USE AS TEMPLATE" */}
      {activeYear && classes.length > 0 && (
        <LessonModal
          isOpen={templateLessonModalOpen}
          onClose={() => {
            setTemplateLessonModalOpen(false);
            setSelectedTemplatePayload(null);
          }}
          academicYearId={activeYear.id}
          classes={classes}
          initialTemplatePayload={selectedTemplatePayload}
          onSaved={(newLesson: Lesson) => {
            setNotification(`New lesson "${newLesson.title}" created successfully from template.`);
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      )}
    </div>
  );
};
