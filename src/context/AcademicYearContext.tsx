/**
 * UNS SCHOOL — Academic Year & School Context
 * Global state management for active academic year, historical view selection, and school entity.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { School, AcademicYear } from '../types';
import { schoolRepository, academicYearRepository } from '../db/repositories';

interface AcademicYearContextValue {
  school: School | null;
  academicYears: AcademicYear[];
  selectedAcademicYear: AcademicYear | null;
  selectedYearId: string;
  isHistorical: boolean;
  isArchived: boolean;
  isLoading: boolean;
  selectYearId: (id: string) => void;
  refreshAcademicYears: () => Promise<void>;
  refreshSchool: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(undefined);

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const refreshSchool = useCallback(async () => {
    try {
      const activeSchool = await schoolRepository.get();
      setSchool(activeSchool || null);
    } catch (err) {
      console.error('[AcademicYearContext] Failed to load school:', err);
    }
  }, []);

  const refreshAcademicYears = useCallback(async () => {
    try {
      const years = await academicYearRepository.listAll();
      setAcademicYears(years);

      // If no year is currently selected, pick current year or first available
      setSelectedYearId((prevId) => {
        if (prevId && years.some((y) => y.id === prevId)) {
          return prevId;
        }
        const currentYear = years.find((y) => y.isCurrent);
        if (currentYear) return currentYear.id;
        if (years.length > 0) return years[0].id;
        return '';
      });
    } catch (err) {
      console.error('[AcademicYearContext] Failed to load academic years:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      await Promise.all([refreshSchool(), refreshAcademicYears()]);
      if (isMounted) {
        setIsLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [refreshSchool, refreshAcademicYears]);

  const selectedAcademicYear = academicYears.find((y) => y.id === selectedYearId) || null;
  const isHistorical = selectedAcademicYear ? !selectedAcademicYear.isCurrent : false;
  const isArchived = selectedAcademicYear ? Boolean(selectedAcademicYear.isArchived) : false;

  const selectYearId = (id: string) => {
    setSelectedYearId(id);
  };

  return (
    <AcademicYearContext.Provider
      value={{
        school,
        academicYears,
        selectedAcademicYear,
        selectedYearId,
        isHistorical,
        isArchived,
        isLoading,
        selectYearId,
        refreshAcademicYears,
        refreshSchool,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = (): AcademicYearContextValue => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};
