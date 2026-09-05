import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const GradebookPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Gradebook & Term Averages"
      moduleCode="MOD-GRD"
      description="Student grades and term average calculations powered by the declarative grading calculation service."
      databaseTables={['grades', 'assessments', 'gradingSchemes']}
      keyCapabilities={[
        'Pure calculation engine with zero eval() or new Function()',
        'Declarative coefficient weighting and missing component handling',
        'Class analytics: average, highest, lowest, and pass rate (score >= 10/20)',
        'Atomic uniqueness per [assessmentId + studentEnrollmentId]',
      ]}
    />
  );
};
