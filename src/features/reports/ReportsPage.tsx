import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const ReportsPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Reports & Deliberations"
      moduleCode="MOD-REP"
      description="Official administrative documents, grade deliberation sheets, and inspection exports."
      databaseTables={['grades', 'assessments', 'attendance', 'classes']}
      keyCapabilities={[
        'Official middle-school term deliberation sheets (Procès-Verbal de Délibération)',
        'Class performance statistics (averages, distributions, rank lists)',
        'Attendance summary reports per class and per student',
        'Direct browser printing with high-contrast, black-and-white print styles',
      ]}
    />
  );
};
