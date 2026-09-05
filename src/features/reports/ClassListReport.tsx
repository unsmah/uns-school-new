import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { studentEnrollmentRepository } from '../../db/repositories/studentEnrollmentRepository';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, StudentEnrollment, School, TeacherProfile } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card } from '../../components/ui';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { exportToCsv } from '../../lib/export';

export const ClassListReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<(StudentEnrollment & { person: any })[]>([]);
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
    if (selectedClassId) {
      studentEnrollmentRepository.listByClass(selectedClassId).then(list => {
        setStudents(list.map(e => ({ ...e.enrollment, person: e.person })));
      });
    }
  }, [selectedClassId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = students.map(s => ({
      'Register Number': s.registerNumber,
      'Last Name (Latin)': s.person.lastNameLatin,
      'First Name (Latin)': s.person.firstNameLatin,
      'Last Name (Arabic)': s.person.lastNameArabic,
      'First Name (Arabic)': s.person.firstNameArabic,
      'Gender': s.person.gender === 'M' ? 'Male' : 'Female',
      'Date of Birth': s.person.dateOfBirth,
      'Status': s.status
    }));
    const clsName = classes.find(c => c.id === selectedClassId)?.name || 'class';
    exportToCsv(`Class_List_${clsName}`, data);
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
            <h2 className="font-bold">Class List Report</h2>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
        <Card className="print:border-none print:shadow-none overflow-hidden">
          <PrintableDocument
            title="Class List (قائمة التلاميذ)"
            subtitle={`Class: ${selectedClass.name}`}
            school={school}
            teacher={teacher}
            academicYear={selectedAcademicYear}
          >
            <table className="w-full border-collapse border border-slate-800 text-xs mt-4">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-800 p-2 w-12 text-center">No.</th>
                  <th className="border border-slate-800 p-2">Last Name</th>
                  <th className="border border-slate-800 p-2">First Name</th>
                  <th className="border border-slate-800 p-2 text-right font-arabic" dir="rtl">اللقب</th>
                  <th className="border border-slate-800 p-2 text-right font-arabic" dir="rtl">الاسم</th>
                  <th className="border border-slate-800 p-2 w-12 text-center">Gender</th>
                  <th className="border border-slate-800 p-2 w-24 text-center">DOB</th>
                  <th className="border border-slate-800 p-2 w-16 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{s.registerNumber}</td>
                    <td className="border border-slate-800 p-1.5 uppercase font-medium">{s.person.lastNameLatin}</td>
                    <td className="border border-slate-800 p-1.5 capitalize">{s.person.firstNameLatin}</td>
                    <td className="border border-slate-800 p-1.5 text-right font-arabic font-medium" dir="rtl">{s.person.lastNameArabic}</td>
                    <td className="border border-slate-800 p-1.5 text-right font-arabic" dir="rtl">{s.person.firstNameArabic}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{s.person.gender}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{s.person.dateOfBirth}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-[10px] uppercase">
                      {s.status.substring(0, 3)} {s.isRepeating ? '(R)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintableDocument>
        </Card>
      )}
    </div>
  );
};
