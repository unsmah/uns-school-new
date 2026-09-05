import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const AssessmentPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Assessment Management"
      moduleCode="MOD-ASM"
      description="Continuous assessment events (continuous evaluation, devoirs, tests, compositions/exams)."
      databaseTables={['assessments', 'gradingSchemes']}
      keyCapabilities={[
        'Configurable component keys (e.g. continuous, test_1, exam)',
        'Explicit link to configurable GradingScheme calculation rules',
        'Term-based locking mechanism preventing retroactive score modifications',
        'Assessment date and max score validation',
      ]}
    />
  );
};
