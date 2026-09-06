import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { lessonRepository } from '../../db/repositories/lessonRepository';
import { curriculumRepository } from '../../db/repositories/curriculumRepository';
import { attendanceRepository } from '../../db/repositories/attendanceRepository';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, Lesson, School, TeacherProfile, SessionRubricDefinition, CurriculumSequence, CompetencyDefinition } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card, Badge } from '../../components/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export const CahierJournalReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const { language } = useI18n();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { present: number, absent: number, late: number }>>({});
  
  const [school, setSchool] = useState<School | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

  const [rubrics, setRubrics] = useState<Record<string, SessionRubricDefinition>>({});
  const [sequences, setSequences] = useState<Record<string, CurriculumSequence>>({});
  const [competencies, setCompetencies] = useState<Record<string, CompetencyDefinition>>({});

  useEffect(() => {
    schoolRepository.get().then(s => setSchool(s || null));
    teacherRepository.get().then(t => setTeacher(t || null));
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedAcademicYear || !selectedDate) return;
    
    const [yearClasses, allLessons] = await Promise.all([
      classRepository.listByAcademicYear(selectedAcademicYear.id),
      lessonRepository.listByAcademicYear(selectedAcademicYear.id)
    ]);
    
    setClasses(yearClasses);
    
    const dateLessons = allLessons.filter(l => l.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
    setLessons(dateLessons);
    
    // Load attendance for these lessons
    const attRecord: Record<string, { present: number, absent: number, late: number }> = {};
    for (const l of dateLessons) {
      const records = await attendanceRepository.listByLesson(l.id);
      let present = 0, absent = 0, late = 0;
      records.forEach(r => {
        if (r.status === 'Present') present++;
        else if (r.status === 'Absent' || r.status === 'Excused') absent++;
        else if (r.status === 'Late') late++;
      });
      attRecord[l.id] = { present, absent, late };
    }
    setAttendance(attRecord);
    
    // Load curriculum data
    const rMap: Record<string, SessionRubricDefinition> = {};
    const sMap: Record<string, CurriculumSequence> = {};
    const cMap: Record<string, CompetencyDefinition> = {};
    
    for (const l of dateLessons) {
      if (l.rubricId && !rMap[l.rubricId]) {
        const r = await curriculumRepository.getRubricById(l.rubricId);
        if (r) rMap[l.rubricId] = r;
      }
      if (l.sequenceId && !sMap[l.sequenceId]) {
        const s = await curriculumRepository.getSequenceById(l.sequenceId);
        if (s) sMap[l.sequenceId] = s;
      }
      for (const cid of l.targetedCompetencyIds) {
        if (!cMap[cid]) {
          const c = await curriculumRepository.getCompetencyById(cid);
          // @ts-ignore
          if (c) cMap[cid] = c;
        }
      }
    }
    setRubrics(rMap);
    setSequences(sMap);
    setCompetencies(cMap);
  }, [selectedAcademicYear, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold">Cahier de Journal (Daily Log)</h2>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handlePrint} disabled={lessons.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none overflow-hidden">
        <PrintableDocument
          title={language === 'ar' ? 'دفتر اليومية' : 'Cahier de Journal'}
          subtitle={`Date: ${selectedDate}`}
          school={school}
          teacher={teacher}
          academicYear={selectedAcademicYear}
        >
          {lessons.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">No lessons recorded for this date.</div>
          ) : (
            <div className="space-y-8 mt-6">
              {lessons.map(lesson => {
                const cls = classes.find(c => c.id === lesson.classId);
                const rubric = rubrics[lesson.rubricId || ''];
                const sequence = sequences[lesson.sequenceId || ''];
                const att = attendance[lesson.id] || { present: 0, absent: 0, late: 0 };
                
                return (
                  <div key={lesson.id} className="border-b border-black pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">Class: {cls?.name} <span className="text-sm font-normal ml-2">(Level: {cls?.levelCode})</span></h3>
                        <p className="text-sm font-semibold">{lesson.startTime} - {lesson.endTime}</p>
                      </div>
                      <div className="text-right text-xs border border-slate-400 p-2 rounded">
                        <div><strong>Present:</strong> {att.present}</div>
                        <div><strong>Absent:</strong> {att.absent}</div>
                        <div><strong>Late:</strong> {att.late}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                      <div className="border border-slate-300 p-2">
                        <strong className="block border-b border-slate-300 mb-1 pb-1">Pedagogical Context</strong>
                        {sequence && <div><strong>Sequence {sequence.sequenceNumber}:</strong> {sequence.title}</div>}
                        {rubric && <div><strong>Rubric:</strong> {rubric.name} ({rubric.pedagogicalStage})</div>}
                        {lesson.title && <div><strong>Lesson:</strong> {lesson.title}</div>}
                      </div>
                      <div className="border border-slate-300 p-2">
                        <strong className="block border-b border-slate-300 mb-1 pb-1">Objectives & Competencies</strong>
                        <div>
                          <strong>Competencies:</strong>{' '}
                          {lesson.targetedCompetencyIds.map(cid => competencies[cid]?.name || cid).join(', ') || 'None'}
                        </div>
                        {lesson.specificObjectives && lesson.specificObjectives.length > 0 && (
                          <div className="mt-1">
                            <strong>Objectives:</strong> {lesson.specificObjectives.length} selected
                          </div>
                        )}
                        {lesson.specificObjectives?.length && (
                          <div className="mt-1 text-slate-700 italic">"{lesson.specificObjectives?.length}"</div>
                        )}
                      </div>
                    </div>

                    {lesson.activitySteps && lesson.activitySteps.length > 0 && (
                      <table className="w-full border-collapse border border-slate-800 text-[10px] mb-4">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border border-slate-800 p-1 w-8">#</th>
                            <th className="border border-slate-800 p-1 w-24">Phase</th>
                            <th className="border border-slate-800 p-1 w-12">Time</th>
                            <th className="border border-slate-800 p-1 w-16">Interact</th>
                            <th className="border border-slate-800 p-1">Teacher Role / Instructions</th>
                            <th className="border border-slate-800 p-1">Pupil Task</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lesson.activitySteps.map(step => (
                            <tr key={step.id || step.stepNumber}>
                              <td className="border border-slate-800 p-1 text-center font-bold">{step.stepNumber}</td>
                              <td className="border border-slate-800 p-1 font-semibold">{step.phaseName}</td>
                              <td className="border border-slate-800 p-1 text-center">{step.allocatedMinutes}m</td>
                              <td className="border border-slate-800 p-1 text-center">{step.interactionPattern}</td>
                              <td className="border border-slate-800 p-1 whitespace-pre-wrap">{step.teacherRoleAndInstructions}</td>
                              <td className="border border-slate-800 p-1 whitespace-pre-wrap">{step.studentRoleAndTasks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {lesson.materialsAndAids && lesson.materialsAndAids.length > 0 && (
                        <div>
                          <strong>Materials & Aids:</strong> {lesson.materialsAndAids.join(', ')}
                        </div>
                      )}
                      {lesson.assignedHomeworkTitle && (
                        <div>
                          <strong>Homework:</strong> {lesson.assignedHomeworkTitle} 
                          {lesson.assignedHomeworkDueDate ? ` (Due: ${lesson.assignedHomeworkDueDate})` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PrintableDocument>
      </Card>
    </div>
  );
};
