import React, { useState } from 'react';
import { Card } from '../../components/ui';
import { Printer, Users, UserCheck, BookOpen, FileText, Award, Layers } from 'lucide-react';
import { ClassListReport } from './ClassListReport';
import { AttendanceReport } from './AttendanceReport';
import { CahierJournalReport } from './CahierJournalReport';
import { CahierTextesReport } from './CahierTextesReport';
import { PlanningReport } from './PlanningReport';
import { AssessmentReport } from './AssessmentReport';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const reports = [
    { id: 'class_list', name: 'Class Lists', icon: Users, description: 'Printable student rosters and class lists.' },
    { id: 'attendance', name: 'Attendance Register', icon: UserCheck, description: 'Monthly or term attendance grids for roll call.' },
    { id: 'cahier_journal', name: 'Cahier de Journal', icon: BookOpen, description: 'Daily pedagogical log based on lessons taught.' },
    { id: 'cahier_textes', name: 'Cahier de Textes', icon: FileText, description: 'Class-specific logs and homework assignments.' },
    { id: 'planning', name: 'Planning & Curriculum', icon: Layers, description: 'Sequence progress and competency coverage reports.' },
    { id: 'assessment', name: 'Assessment & Grades', icon: Award, description: 'Grade lists and assessment score distributions.' },
  ];

  if (activeReport === 'class_list') return <ClassListReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'attendance') return <AttendanceReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'cahier_journal') return <CahierJournalReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'cahier_textes') return <CahierTextesReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'planning') return <PlanningReport onBack={() => setActiveReport(null)} />;
  if (activeReport === 'assessment') return <AssessmentReport onBack={() => setActiveReport(null)} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:hidden">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Official Documents & Reports</h2>
        <p className="text-sm text-slate-500">Generate, export, and print official administrative and pedagogical documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card 
              key={r.id} 
              className="p-5 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
              onClick={() => setActiveReport(r.id)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{r.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
