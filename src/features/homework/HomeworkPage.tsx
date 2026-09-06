import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { homeworkRepository } from '../../db/repositories/homeworkRepository';
import { classRepository } from '../../db/repositories/classRepository';
import type { HomeworkTask, SchoolClass } from '../../types';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { Plus, Edit2, Trash2, CheckCircle2, CircleDashed, Calendar, BookOpen } from 'lucide-react';

export const HomeworkPage: React.FC = () => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HomeworkTask | null>(null);
  const [classFilter, setClassFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    instructions: '',
    assignedDate: '',
    dueDate: '',
    textbookReference: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!selectedAcademicYear) return;
    const cls = await classRepository.listByAcademicYear(selectedAcademicYear.id);
    setClasses(cls);

    let t = await homeworkRepository.listByAcademicYear(selectedAcademicYear.id);
    if (classFilter !== 'ALL') {
      t = t.filter(x => x.classId === classFilter);
    }
    setTasks(t);
  };

  useEffect(() => {
    loadData();
  }, [selectedAcademicYear, classFilter]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.classId) e.classId = 'Class is required';
    if (!formData.title || formData.title.length < 2) e.title = 'Title required (min 2 chars)';
    if (!formData.assignedDate) e.assignedDate = 'Assigned date is required';
    if (!formData.dueDate) e.dueDate = 'Due date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedAcademicYear) return;
    
    const task: HomeworkTask = {
      id: editingTask?.id || crypto.randomUUID(),
      academicYearId: selectedAcademicYear.id,
      classId: formData.classId,
      lessonId: editingTask?.lessonId,
      title: formData.title,
      instructions: formData.instructions,
      assignedDate: formData.assignedDate,
      dueDate: formData.dueDate,
      textbookReference: formData.textbookReference,
      isCompleted: editingTask?.isCompleted || false,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await homeworkRepository.save(task);
    setIsModalOpen(false);
    loadData();
  };

  const handleEdit = (task: HomeworkTask) => {
    setEditingTask(task);
    setFormData({
      classId: task.classId,
      title: task.title,
      instructions: task.instructions || '',
      assignedDate: task.assignedDate,
      dueDate: task.dueDate,
      textbookReference: task.textbookReference || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this homework?')) {
      await homeworkRepository.delete(id);
      loadData();
    }
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await homeworkRepository.toggleCompleted(id, !current);
    loadData();
  };

  const handleOpenNew = () => {
    setEditingTask(null);
    setFormData({
      classId: '',
      title: '',
      instructions: '',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      textbookReference: ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white break-words">Homework</h2>
          <p className="text-xs sm:text-sm text-slate-500 break-words">Manage student assignments and due dates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-40 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
          >
            <option value="ALL">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!isArchived && (
            <Button variant="primary" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Homework
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <Card key={task.id} className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant={task.isCompleted ? 'success' : 'warning'} className="mb-2">
                  {task.isCompleted ? 'Completed' : 'Pending'}
                </Badge>
                <h3 className="font-bold text-slate-900 dark:text-white">{task.title}</h3>
                <p className="text-xs text-slate-500">{classes.find(c => c.id === task.classId)?.name}</p>
              </div>
              {!isArchived && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleComplete(task.id, task.isCompleted)}>
                    {task.isCompleted ? <CircleDashed className="w-4 h-4 text-slate-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {task.instructions}
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {task.dueDate}</span>
              {task.lessonId && <span className="flex items-center gap-1 text-emerald-600" title="Linked to Lesson"><BookOpen className="w-3 h-3" /> Linked</span>}
            </div>
          </Card>
        ))}
        {tasks.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            No homework assignments found.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Edit Homework" : "New Homework"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select 
              value={formData.classId} 
              onChange={e => setFormData(f => ({ ...f, classId: e.target.value }))}
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select Class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.classId && <p className="text-rose-500 text-xs mt-1">{errors.classId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
            />
            {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instructions / Details</label>
            <textarea 
              value={formData.instructions}
              onChange={e => setFormData(f => ({ ...f, instructions: e.target.value }))}
              rows={3} 
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Date</label>
              <input 
                type="date" 
                value={formData.assignedDate}
                onChange={e => setFormData(f => ({ ...f, assignedDate: e.target.value }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              />
              {errors.assignedDate && <p className="text-rose-500 text-xs mt-1">{errors.assignedDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input 
                type="date" 
                value={formData.dueDate}
                onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              />
              {errors.dueDate && <p className="text-rose-500 text-xs mt-1">{errors.dueDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Homework</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
