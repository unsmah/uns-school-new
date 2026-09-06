import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { remediationRepository } from '../../db/repositories/remediationRepository';
import { classRepository } from '../../db/repositories/classRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import type { RemediationSession, SchoolClass, StudentEnrollment } from '../../types';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { Plus, Edit2, Trash2, Users, Calendar, Activity } from 'lucide-react';

export const RemediationPage: React.FC = () => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();
  const [sessions, setSessions] = useState<RemediationSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<RemediationSession | null>(null);
  const [classFilter, setClassFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    classId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    identifiedPedagogicalWeakness: '',
    remedialActivitiesDescription: '',
    targetedStudentEnrollmentIds: [] as string[],
    outcomeEvaluationNotes: '',
    isCompleted: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!selectedAcademicYear) return;
    const cls = await classRepository.listByAcademicYear(selectedAcademicYear.id);
    setClasses(cls);

    let list = await remediationRepository.listByAcademicYear(selectedAcademicYear.id);
    if (classFilter !== 'ALL') {
      list = list.filter(s => s.classId === classFilter);
    }
    setSessions(list);
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

  const toggleStudent = (id: string) => {
    setFormData(f => ({
      ...f,
      targetedStudentEnrollmentIds: f.targetedStudentEnrollmentIds.includes(id) 
        ? f.targetedStudentEnrollmentIds.filter(x => x !== id)
        : [...f.targetedStudentEnrollmentIds, id]
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.classId) e.classId = 'Class is required';
    if (!formData.scheduledDate) e.scheduledDate = 'Date is required';
    if (!formData.identifiedPedagogicalWeakness || formData.identifiedPedagogicalWeakness.length < 2) e.identifiedPedagogicalWeakness = 'Weakness required (min 2 chars)';
    if (!formData.remedialActivitiesDescription || formData.remedialActivitiesDescription.length < 2) e.remedialActivitiesDescription = 'Activities required (min 2 chars)';
    if (formData.targetedStudentEnrollmentIds.length === 0) e.targetedStudentEnrollmentIds = 'At least one student is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedAcademicYear) return;

    const session: RemediationSession = {
      id: editingSession?.id || crypto.randomUUID(),
      academicYearId: selectedAcademicYear.id,
      classId: formData.classId,
      scheduledDate: formData.scheduledDate,
      identifiedPedagogicalWeakness: formData.identifiedPedagogicalWeakness,
      remedialActivitiesDescription: formData.remedialActivitiesDescription,
      targetedStudentEnrollmentIds: formData.targetedStudentEnrollmentIds,
      outcomeEvaluationNotes: formData.outcomeEvaluationNotes,
      isCompleted: formData.isCompleted,
      createdAt: editingSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await remediationRepository.save(session);
    setIsModalOpen(false);
    loadData();
  };

  const handleEdit = (session: RemediationSession) => {
    setEditingSession(session);
    setFormData({
      classId: session.classId,
      scheduledDate: session.scheduledDate,
      identifiedPedagogicalWeakness: session.identifiedPedagogicalWeakness,
      remedialActivitiesDescription: session.remedialActivitiesDescription,
      targetedStudentEnrollmentIds: session.targetedStudentEnrollmentIds,
      outcomeEvaluationNotes: session.outcomeEvaluationNotes || '',
      isCompleted: session.isCompleted
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this remediation session?')) {
      await remediationRepository.delete(id);
      loadData();
    }
  };
  
  const handleOpenNew = () => {
    setEditingSession(null);
    setFormData({
      classId: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      identifiedPedagogicalWeakness: '',
      remedialActivitiesDescription: '',
      targetedStudentEnrollmentIds: [],
      outcomeEvaluationNotes: '',
      isCompleted: false
    });
    setErrors({});
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white break-words">Remediation</h2>
          <p className="text-xs sm:text-sm text-slate-500 break-words">Targeted support sessions & interventions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-40 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
          >
            <option value="ALL">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!isArchived && (
            <Button variant="primary" onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" /> New Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sessions.map(sess => (
          <Card key={sess.id} className="p-4 flex flex-col gap-3 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant={sess.isCompleted ? 'success' : 'warning'} className="mb-2">
                  {sess.isCompleted ? 'Completed' : 'Planned'}
                </Badge>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral">{classes.find(c => c.id === sess.classId)?.name}</Badge>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {sess.scheduledDate}
                  </span>
                </div>
              </div>
              {!isArchived && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(sess)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(sess.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm space-y-2 border border-slate-100 dark:border-slate-800">
              <div>
                <strong className="text-slate-700 dark:text-slate-300 flex items-center gap-1"><Activity className="w-4 h-4 text-rose-500" /> Weakness Identified:</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{sess.identifiedPedagogicalWeakness}</p>
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Activities:</strong>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{sess.remedialActivitiesDescription}</p>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-1">
              <Users className="w-4 h-4" /> {sess.targetedStudentEnrollmentIds.length} targeted students
            </div>
          </Card>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            No remediation sessions scheduled.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSession ? "Edit Remediation" : "New Remediation"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select 
                value={formData.classId}
                onChange={e => setFormData(f => ({ ...f, classId: e.target.value, targetedStudentEnrollmentIds: [] }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Select Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.classId && <p className="text-rose-500 text-xs mt-1">{errors.classId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                value={formData.scheduledDate}
                onChange={e => setFormData(f => ({ ...f, scheduledDate: e.target.value }))}
                className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              />
              {errors.scheduledDate && <p className="text-rose-500 text-xs mt-1">{errors.scheduledDate}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Pedagogical Weakness</label>
            <textarea 
              value={formData.identifiedPedagogicalWeakness}
              onChange={e => setFormData(f => ({ ...f, identifiedPedagogicalWeakness: e.target.value }))}
              rows={2} 
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              placeholder="e.g. Difficulty with present continuous..." 
            />
            {errors.identifiedPedagogicalWeakness && <p className="text-rose-500 text-xs mt-1">{errors.identifiedPedagogicalWeakness}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Remedial Activities</label>
            <textarea 
              value={formData.remedialActivitiesDescription}
              onChange={e => setFormData(f => ({ ...f, remedialActivitiesDescription: e.target.value }))}
              rows={2} 
              className="w-full rounded-md border-slate-300 dark:border-slate-700 dark:bg-slate-900" 
              placeholder="e.g. Group work on worksheet 2..." 
            />
            {errors.remedialActivitiesDescription && <p className="text-rose-500 text-xs mt-1">{errors.remedialActivitiesDescription}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Targeted Students</label>
            {modalStudents.length > 0 ? (
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 bg-slate-50 dark:bg-slate-900 grid grid-cols-2 gap-2">
                {modalStudents.map(student => (
                  <label key={student.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.targetedStudentEnrollmentIds.includes(student.id)} 
                      onChange={() => toggleStudent(student.id)} 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm truncate">{student.studentName}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Select a class first to view students.</p>
            )}
            {errors.targetedStudentEnrollmentIds && <p className="text-rose-500 text-xs mt-1">{errors.targetedStudentEnrollmentIds}</p>}
          </div>

          {editingSession && (
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isCompleted" 
                checked={formData.isCompleted}
                onChange={e => setFormData(f => ({ ...f, isCompleted: e.target.checked }))}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
              />
              <label htmlFor="isCompleted" className="text-sm font-medium">Session Completed</label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Session</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
