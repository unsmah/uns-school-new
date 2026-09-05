/**
 * UNS SCHOOL — Academic Year Selector
 * Dropdown selector in the application layout allowing the teacher to easily switch active viewing context.
 */

import React from 'react';
import { Calendar, AlertCircle, Archive, CheckCircle2 } from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { Badge } from '../ui';

export const AcademicYearSelector: React.FC<{ onManageClick?: () => void }> = ({ onManageClick }) => {
  const { academicYears, selectedYearId, selectYearId, selectedAcademicYear, isArchived, isHistorical } =
    useAcademicYear();

  if (academicYears.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>No academic year configured.</span>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-200"
          >
            Create Year
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Calendar className="w-3.5 h-3.5 absolute start-2.5 text-slate-400 pointer-events-none" />
        <select
          id="academic-year-selector"
          value={selectedYearId}
          onChange={(e) => selectYearId(e.target.value)}
          className="ps-8 pe-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Select active viewing academic year"
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label} {year.isCurrent ? '(Current)' : year.isArchived ? '(Archived)' : '(Historical)'}
            </option>
          ))}
        </select>
      </div>

      {/* Year Status Badges */}
      {selectedAcademicYear && (
        <div className="hidden sm:flex items-center gap-1.5">
          {selectedAcademicYear.isCurrent && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Current</span>
            </Badge>
          )}
          {isArchived && (
            <Badge variant="warning" className="flex items-center gap-1">
              <Archive className="w-3 h-3" />
              <span>Archived (Read-Only)</span>
            </Badge>
          )}
          {!selectedAcademicYear.isCurrent && !isArchived && (
            <Badge variant="neutral" className="flex items-center gap-1">
              <span>Historical</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
