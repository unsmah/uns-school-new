import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { assessmentRepository } from '../../db/repositories/assessmentRepository';
import { gradeRepository } from '../../db/repositories/gradeRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, School, TeacherProfile, Assessment, GradeEntry, StudentEnrollment } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card } from '../../components/ui';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { exportToCsv } from '../../lib/export';

export const AssessmentReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  const [students, setStudents] = useState<(StudentEnrollment & { person: any })[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  
  const [school, setSchool] = useState<School | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

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
    if (!selectedClassId) return;
    assessmentRepository.listByClass(selectedClassId).then(asts => {
      setAssessments(asts);
      if (asts.length > 0) {
        setSelectedAssessmentId(asts[0].id);
      } else {
        setSelectedAssessmentId('');
      }
    });
    studentEnrollmentRepository.listByClass(selectedClassId).then(list => {
      setStudents(list.map(e => ({ ...e.enrollment, person: e.person })));
    });
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedAssessmentId) {
      setGrades([]);
      return;
    }
    gradeRepository.listByAssessment(selectedAssessmentId).then(setGrades);
  }, [selectedAssessmentId]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const data = students.map(s => {
      const grade = grades.find(g => g.studentEnrollmentId === s.id);
      return {
        'Register Number': s.registerNumber,
        'Name': `${s.person.lastNameLatin} ${s.person.firstNameLatin}`,
        'Score': grade?.score ?? '',
        'Out Of': assessment?.maxScore ?? '',
        'Remarks': grade?.teacherRemarks ?? ''
      };
    });
    
    const clsName = classes.find(c => c.id === selectedClassId)?.name || 'class';
    exportToCsv(`Assessment_${assessment?.title}_${clsName}`, data);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const assessment = assessments.find(a => a.id === selectedAssessmentId);

  // Statistics
  let avg = 0;
  let passCount = 0;
  const validGrades = grades.filter(g => g.score !== undefined && g.score !== null);
  if (validGrades.length > 0 && assessment) {
    avg = validGrades.reduce((sum, g) => sum + g.score!, 0) / validGrades.length;
    passCount = validGrades.filter(g => g.score! >= (assessment.maxScore / 2)).length;
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold">Assessment Report</h2>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={selectedAssessmentId}
                onChange={e => setSelectedAssessmentId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                disabled={assessments.length === 0}
              >
                {assessments.length === 0 && <option value="">No assessments</option>}
                {assessments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.date})</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={!assessment || students.length === 0}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="primary" onClick={handlePrint} disabled={!assessment || students.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {selectedClass && assessment && (
        <Card className="print:border-none print:shadow-none overflow-hidden">
          <PrintableDocument
            title={`Assessment Report (كشف النقاط)`}
            subtitle={`Class: ${selectedClass.name} | ${assessment.title} (${assessment.termNumber}) | Date: ${assessment.date}`}
            school={school}
            teacher={teacher}
            academicYear={selectedAcademicYear}
          >
            <div className="flex justify-between items-end mb-4">
              <div className="text-sm">
                <div><strong>Type:</strong> <span className="capitalize">{assessment.componentKey.replace('_', ' ')}</span></div>
                <div><strong>Max Score:</strong> {assessment.maxScore}</div>
                <div><strong>Coefficient:</strong> {assessment.coefficient}</div>
              </div>
              <div className="border border-slate-800 p-2 text-center text-sm w-48">
                <div className="font-bold border-b border-slate-800 mb-1 pb-1">Class Statistics</div>
                <div className="flex justify-between"><span>Average:</span> <strong>{avg.toFixed(2)} / {assessment.maxScore}</strong></div>
                <div className="flex justify-between mt-1"><span>Pass Rate:</span> <strong>{validGrades.length ? Math.round((passCount/validGrades.length)*100) : 0}%</strong></div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-800 text-xs mt-4">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-800 p-2 w-12 text-center">No.</th>
                  <th className="border border-slate-800 p-2 text-left">Student Name</th>
                  <th className="border border-slate-800 p-2 w-24 text-center">Score (/{assessment.maxScore})</th>
                  <th className="border border-slate-800 p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const grade = grades.find(g => g.studentEnrollmentId === s.id);
                  const isPassing = grade?.score !== undefined && grade.score >= (assessment.maxScore / 2);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="border border-slate-800 p-1.5 text-center font-bold">{s.registerNumber}</td>
                      <td className="border border-slate-800 p-1.5 font-medium uppercase">
                        {s.person.lastNameLatin} <span className="capitalize">{s.person.firstNameLatin}</span>
                      </td>
                      <td className={`border border-slate-800 p-1.5 text-center font-bold text-sm ${grade?.score !== undefined ? (isPassing ? '' : 'text-rose-600') : 'text-slate-400'}`}>
                        {grade?.score !== undefined ? grade.score : '-'}
                      </td>
                      <td className="border border-slate-800 p-1.5 text-slate-600">
                        {grade?.teacherRemarks || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PrintableDocument>
        </Card>
      )}
    </div>
  );
};
