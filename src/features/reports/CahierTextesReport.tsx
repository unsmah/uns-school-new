import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { lessonRepository } from '../../db/repositories/lessonRepository';
import { curriculumRepository } from '../../db/repositories/curriculumRepository';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, Lesson, School, TeacherProfile, SessionRubricDefinition, CurriculumSequence } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card } from '../../components/ui';
import { ArrowLeft, Printer } from 'lucide-react';

export const CahierTextesReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Date range logic for Cahier de textes (e.g. current month)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  
  const [rubrics, setRubrics] = useState<Record<string, SessionRubricDefinition>>({});
  const [sequences, setSequences] = useState<Record<string, CurriculumSequence>>({});

  useEffect(() => {
    schoolRepository.get().then(s => setSchool(s || null));
    teacherRepository.get().then(t => setTeacher(t || null));
  }, []);

  useEffect(() => {
    if (!selectedAcademicYear) return;
    classRepository.listByAcademicYear(selectedAcademicYear.id).then(cls => {
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    });
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (!selectedClassId || !startDate || !endDate) return;
    
    lessonRepository.listByClass(selectedClassId).then(allLessons => {
      const filtered = allLessons
        .filter(l => l.date >= startDate && l.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      
      setLessons(filtered);
      
      // Load rubrics and sequences
      const rMap: Record<string, SessionRubricDefinition> = {};
      const sMap: Record<string, CurriculumSequence> = {};
      
      Promise.all(filtered.map(async l => {
        if (l.rubricId && !rMap[l.rubricId]) {
          const r = await curriculumRepository.getRubricById(l.rubricId);
          if (r) rMap[l.rubricId] = r;
        }
        if (l.sequenceId && !sMap[l.sequenceId]) {
          const s = await curriculumRepository.getSequenceById(l.sequenceId);
          if (s) sMap[l.sequenceId] = s;
        }
      })).then(() => {
        setRubrics(rMap);
        setSequences(sMap);
      });
    });
  }, [selectedClassId, startDate, endDate]);

  const handlePrint = () => window.print();
  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold">Cahier de Textes</h2>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-slate-500">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handlePrint} disabled={!selectedClassId || lessons.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {selectedClass && (
        <Card className="print:border-none print:shadow-none overflow-hidden">
          <PrintableDocument
            title="Cahier de Textes (دفتر النصوص)"
            subtitle={`Class: ${selectedClass.name} | Period: ${startDate} to ${endDate}`}
            school={school}
            teacher={teacher}
            academicYear={selectedAcademicYear}
          >
            {lessons.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic">No lessons recorded for this class in this period.</div>
            ) : (
              <table className="w-full border-collapse border border-slate-800 text-xs mt-4">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-800 p-2 w-24 text-center">Date & Time</th>
                    <th className="border border-slate-800 p-2">Lesson Details (Session / Content)</th>
                    <th className="border border-slate-800 p-2 w-48 text-right font-arabic" dir="rtl">العمل المنجز والواجبات</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map(lesson => {
                    const rubric = rubrics[lesson.rubricId || ''];
                    const sequence = sequences[lesson.sequenceId || ''];
                    
                    return (
                      <tr key={lesson.id} className="align-top">
                        <td className="border border-slate-800 p-2">
                          <div className="font-bold">{lesson.date}</div>
                          <div className="text-slate-600">{new Date(lesson.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{lesson.startTime} - {lesson.endTime}</div>
                        </td>
                        <td className="border border-slate-800 p-2">
                          {sequence && <div className="font-semibold text-slate-800 mb-1">Sequence {sequence.sequenceNumber}: {sequence.title}</div>}
                          {rubric && <div className="font-medium text-slate-700">{rubric.name}</div>}
                          {lesson.title && <div className="italic text-slate-600 mt-1">{lesson.title}</div>}
                          {lesson.specificObjectives?.join(', ') && <div className="text-[10px] mt-2">Obj: {lesson.specificObjectives?.join(', ')}</div>}
                        </td>
                        <td className="border border-slate-800 p-2 text-right font-arabic" dir="rtl">
                          <div className="font-medium text-slate-800">
                            {rubric?.name || 'حصة تعلمية'}
                          </div>
                          {lesson.assignedHomeworkTitle && (
                            <div className="mt-2 pt-2 border-t border-slate-300">
                              <strong className="text-amber-700 text-[10px]">الواجب المنزلي:</strong>
                              <div className="font-medium">{lesson.assignedHomeworkTitle}</div>
                              {lesson.assignedHomeworkInstructions && (
                                <div className="text-[10px] text-slate-600 mt-1">{lesson.assignedHomeworkInstructions}</div>
                              )}
                              {lesson.assignedHomeworkDueDate && (
                                <div className="text-[9px] text-slate-500 mt-1" dir="ltr">Due: {lesson.assignedHomeworkDueDate}</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </PrintableDocument>
        </Card>
      )}
    </div>
  );
};
