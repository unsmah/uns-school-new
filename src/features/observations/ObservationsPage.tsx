import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { observationRepository } from '../../db/repositories/observationRepository';
import { classRepository } from '../../db/repositories/classRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import type { StudentObservation, SchoolClass, StudentEnrollment } from '../../types';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { Plus, Trash2, Calendar, User } from 'lucide-react';

export const ObservationsPage: React.FC = () => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();
  const [observations, setObservations] = useState<StudentObservation[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<(StudentEnrollment & { studentName?: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('');
  
  const [formData, setFormData] = useState({
    classId: '',
    studentEnrollmentId: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Participation' as StudentObservation['category'],
    content: '',
    isPrivateToTeacher: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!selectedAcademicYear) return;
    const cls = await classRepository.listByAcademicYear(selectedAcademicYear.id);
    setClasses(cls);
    
    if (cls.length > 0 && !classFilter) {
      setClassFilter(cls[0].id);
      return; // Will reload because classFilter changes
    }
    
    if (classFilter) {
      const obs = await observationRepository.listByClass(classFilter);
      setObservations(obs);
      
      const enrolls = await studentEnrollmentRepository.listByClass(classFilter);
      setStudents(enrolls.map(e => ({
        ...e.enrollment,
        studentName: `${e.person.lastNameLatin} ${e.person.firstNameLatin}`
      })));
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAcademicYear, classFilter]);

  const [modalStudents, setModalStudents] = useState<(StudentEnrollment & { studentName?: string })[]>([]);
  useEffect(() => {
    if (formData.classId) {
      studentEnrollmentRepository.listByClass(formData.classId).then(res => {
        setModalStudents(res.map(e => ({
          ...e.enrollment,
          studentName: `${e.person.lastNameLatin} ${e.person.firstNameLatin}`
        })));
      });
    } else {
      setModalStudents([]);
    }
  }, [formData.classId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.classId) e.classId = 'Class is required';
    if (!formData.studentEnrollmentId) e.studentEnrollmentId = 'Student is required';
    if (!formData.date) e.date = 'Date is required';
    if (!formData.content || formData.content.length < 2) e.content = 'Content required (min 2 chars)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedAcademicYear) return;

    const student = modalStudents.find(s => s.id === formData.studentEnrollmentId);
    if (!student) return;

    const obs: StudentObservation = {
      id: crypto.randomUUID(),
      academicYearId: selectedAcademicYear.id,
      classId: formData.classId,
      studentEnrollmentId: student.id,
      studentPersonId: student.studentPersonId,
      date: formData.date,
      category: formData.category,
      content: formData.content,
      isPrivateToTeacher: formData.isPrivateToTeacher,
      createdAt: new Date().toISOString(),
    };
    await observationRepository.create(obs);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this observation?')) {
      await observationRepository.delete(id);
      loadData();
    }
  };

  const handleOpenNew = () => {
    setFormData({
      classId: classFilter,
      studentEnrollmentId: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Participation',
      content: '',
      isPrivateToTeacher: true
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Behaviour': return 'rose';
      case 'Exceptional Effort': return 'emerald';
      case 'Pedagogical Difficulty': return 'amber';
      case 'Private Note': return 'slate';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Observations</h2>
          <p className="text-sm text-slate-500">Pedagogical notes & behaviour tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-40 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!isArchived && (
            <Button variant="primary" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Note
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {observations.map(obs => {
          const sName = students.find(s => s.id === obs.studentEnrollmentId)?.studentName || 'Unknown Student';
          return (
            <Card key={obs.id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white">{sName}</h3>
                </div>
                {!isArchived && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(obs.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div>
                <Badge variant={getCategoryColor(obs.category) as any} className="mb-2">
                  {obs.category}
                </Badge>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-800">
                  {obs.content}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {obs.date}</span>
                {obs.isPrivateToTeacher && <span className="italic text-slate-400">Private</span>}
              </div>
            </Card>
          );
        })}
        
        {observations.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            No observations recorded for this class.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Observation">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select 
                value={formData.classId} 
                onChange={e => setFormData(f => ({ ...f, classId: e.target.value, studentEnrollmentId: '' }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Select Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.classId && <p className="text-rose-500 text-xs mt-1">{errors.classId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Student</label>
              <select 
                value={formData.studentEnrollmentId}
                onChange={e => setFormData(f => ({ ...f, studentEnrollmentId: e.target.value }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
                disabled={!formData.classId}
              >
                <option value="">Select Student...</option>
                {modalStudents.map(s => <option key={s.id} value={s.id}>{s.studentName}</option>)}
              </select>
              {errors.studentEnrollmentId && <p className="text-rose-500 text-xs mt-1">{errors.studentEnrollmentId}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select 
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as any }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="Participation">Participation</option>
                <option value="Behaviour">Behaviour</option>
                <option value="Pedagogical Difficulty">Pedagogical Difficulty</option>
                <option value="Exceptional Effort">Exceptional Effort</option>
                <option value="Private Note">Private Note</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              />
              {errors.date && <p className="text-rose-500 text-xs mt-1">{errors.date}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observation Notes</label>
            <textarea 
              value={formData.content}
              onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
              rows={4} 
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
            />
            {errors.content && <p className="text-rose-500 text-xs mt-1">{errors.content}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isPrivate" 
              checked={formData.isPrivateToTeacher}
              onChange={e => setFormData(f => ({ ...f, isPrivateToTeacher: e.target.checked }))}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
            />
            <label htmlFor="isPrivate" className="text-sm">Keep this note private</label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Observation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
