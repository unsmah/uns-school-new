import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const ResourcesPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Teaching Resources"
      moduleCode="MOD-RES"
      description="Local offline pedagogical aids, audio references, worksheet templates, and visual flashcards."
      databaseTables={['resources']}
      keyCapabilities={[
        'Local IndexedDB resource store with category taxonomy',
        'Direct linkage to curriculum sequences and specific learning objectives',
        'Fully offline access during classroom teaching without internet connectivity',
        'Exportable and importable within portable .unsschool backup packages',
      ]}
    />
  );
};
