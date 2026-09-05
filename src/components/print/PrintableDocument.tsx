import React, { ReactNode } from 'react';
import type { School, TeacherProfile, AcademicYear } from '../../types';

interface PrintableDocumentProps {
  title: string;
  school?: School | null;
  teacher?: TeacherProfile | null;
  academicYear?: AcademicYear | null;
  children: ReactNode;
  subtitle?: string;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  title,
  school,
  teacher,
  academicYear,
  subtitle,
  children,
}) => {
  return (
    <div className="bg-white text-black print:p-0 p-8 shadow-sm print:shadow-none mx-auto print:mx-0 print:w-full" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold mb-1 font-arabic" dir="rtl">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
        <h2 className="text-md font-bold mb-4 font-arabic" dir="rtl">وزارة التربية الوطنية</h2>
        
        <div className="flex justify-between text-sm text-left">
          <div className="flex flex-col space-y-1 w-1/2">
            <span><strong>Direction of Education:</strong> {school?.wilaya || '....................'}</span>
            <span><strong>Middle School:</strong> {school?.name || '....................'}</span>
          </div>
          <div className="flex flex-col space-y-1 w-1/2 text-right">
            <span><strong>Academic Year:</strong> {academicYear?.label || '....................'}</span>
            <span><strong>Teacher:</strong> {teacher ? `${teacher.fullNameLatin}` : '....................'}</span>
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold uppercase underline underline-offset-4">{title}</h2>
        {subtitle && <p className="text-md mt-2 font-medium">{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="print-content text-sm">
        {children}
      </div>
      
    </div>
  );
};
