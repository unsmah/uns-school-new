import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { lessonRepository } from '../../db/repositories/lessonRepository';
import { attendanceRepository } from '../../db/repositories/attendanceRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, StudentEnrollment, School, TeacherProfile, Lesson, AttendanceRecord } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card } from '../../components/ui';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { exportToCsv } from '../../lib/export';

export const AttendanceReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [month, setMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  
  const [students, setStudents] = useState<(StudentEnrollment & { person: any })[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
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
    if (!selectedClassId || !month || !selectedAcademicYear) return;
    
    Promise.all([
      studentEnrollmentRepository.listByClass(selectedClassId),
      lessonRepository.listByClass(selectedClassId),
      attendanceRepository.listByClass(selectedClassId)
    ]).then(([enrollments, allLessons, allAttendance]) => {
      setStudents(enrollments.map(e => ({ ...e.enrollment, person: e.person })));
      
      // Filter lessons by month
      const monthLessons = allLessons.filter(l => l.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
      setLessons(monthLessons);
      
      const lessonIds = new Set(monthLessons.map(l => l.id));
      setAttendance(allAttendance.filter(a => lessonIds.has(a.lessonId)));
    });
  }, [selectedClassId, month, selectedAcademicYear]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const data = students.map(s => {
      const row: any = {
        'No.': s.registerNumber,
        'Name': `${s.person.lastNameLatin} ${s.person.firstNameLatin}`
      };
      
      let absentCount = 0;
      lessons.forEach((l, i) => {
        const record = attendance.find(a => a.lessonId === l.id && a.studentEnrollmentId === s.id);
        const status = record ? record.status : '-';
        row[`L${i+1} (${l.date.substring(5)})`] = status;
        if (status === 'Absent' || status === 'Excused') absentCount++;
      });
      row['Total Absences'] = absentCount;
      return row;
    });
    
    const clsName = classes.find(c => c.id === selectedClassId)?.name || 'class';
    exportToCsv(`Attendance_${clsName}_${month}`, data);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold">Attendance Register</h2>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input 
                type="month" 
                value={month} 
                onChange={e => setMonth(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={!selectedClassId || students.length === 0}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="primary" onClick={handlePrint} disabled={!selectedClassId || students.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {selectedClass && (
        <Card className="print:border-none print:shadow-none overflow-x-auto">
          <PrintableDocument
            title="Attendance Register (سجل الغيابات)"
            subtitle={`Class: ${selectedClass.name} | Month: ${month}`}
            school={school}
            teacher={teacher}
            academicYear={selectedAcademicYear}
          >
            <table className="w-full border-collapse border border-slate-800 text-xs mt-4">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-800 p-2 w-8 text-center">#</th>
                  <th className="border border-slate-800 p-2 w-48 text-left">Student Name</th>
                  {lessons.map((l, i) => (
                    <th key={l.id} className="border border-slate-800 p-1 text-center text-[9px] leading-tight" title={l.date}>
                      <div className="-rotate-90 origin-center whitespace-nowrap h-16 w-4 mx-auto flex items-center justify-center">
                        {l.date.substring(5)}
                      </div>
                    </th>
                  ))}
                  <th className="border border-slate-800 p-2 w-16 text-center text-[10px]">Total<br/>Absences</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  let totalAbsences = 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="border border-slate-800 p-1 text-center font-bold">{s.registerNumber}</td>
                      <td className="border border-slate-800 p-1 font-medium text-[11px] truncate uppercase">
                        {s.person.lastNameLatin} <span className="capitalize">{s.person.firstNameLatin}</span>
                      </td>
                      {lessons.map(l => {
                        const record = attendance.find(a => a.lessonId === l.id && a.studentEnrollmentId === s.id);
                        const status = record?.status;
                        if (status === 'Absent' || status === 'Excused') totalAbsences++;
                        
                        let display = '';
                        if (status === 'Absent') display = 'A';
                        if (status === 'Excused') display = 'E';
                        if (status === 'Late') display = 'L';
                        
                        return (
                          <td key={l.id} className={`border border-slate-800 p-1 text-center font-bold text-[10px] ${status === 'Absent' ? 'text-rose-600' : ''}`}>
                            {display}
                          </td>
                        );
                      })}
                      <td className="border border-slate-800 p-1 text-center font-bold text-rose-600">{totalAbsences > 0 ? totalAbsences : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-4 flex gap-6 text-[10px] text-slate-600">
              <div><strong className="text-black">A:</strong> Absent (غياب)</div>
              <div><strong className="text-black">E:</strong> Excused (مستدعى)</div>
              <div><strong className="text-black">L:</strong> Late (تأخر)</div>
            </div>
          </PrintableDocument>
        </Card>
      )}
    </div>
  );
};
