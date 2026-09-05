/**
 * UNS SCHOOL — Settings & Workspace Configuration
 */

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../../components/ui';
import { useI18n } from '../../i18n/I18nContext';
import type { AppLanguage } from '../../i18n/translations';
import { useTheme, type AppTheme } from '../../theme/ThemeContext';
import {
  checkStorageTelemetry,
  requestStoragePersistence,
  type StorageTelemetry,
} from '../../services/storageTelemetryService';
import { db } from '../../db/database';
import { HardDrive, ShieldCheck, AlertTriangle, RefreshCw, Globe, Moon, Sun, Laptop } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [telemetry, setTelemetry] = useState<StorageTelemetry | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [isRequestingPersistence, setIsRequestingPersistence] = useState(false);

  const loadData = async () => {
    const tel = await checkStorageTelemetry();
    setTelemetry(tel);

    // Query database table counts
    try {
      const counts: Record<string, number> = {
        schools: await db.schools.count(),
        academicYears: await db.academicYears.count(),
        classes: await db.classes.count(),
        studentPersons: await db.studentPersons.count(),
        studentEnrollments: await db.studentEnrollments.count(),
        lessons: await db.lessons.count(),
        attendance: await db.attendance.count(),
        assessments: await db.assessments.count(),
        grades: await db.grades.count(),
        curriculumVersions: await db.curriculumVersions.count(),
      };
      setTableCounts(counts);
    } catch {
      // Table count fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPersistence = async () => {
    setIsRequestingPersistence(true);
    await requestStoragePersistence();
    await loadData();
    setIsRequestingPersistence(false);
  };

  const isGranted = telemetry?.persistenceState === 'PERSISTENCE_GRANTED';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Settings & Diagnostics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure display preferences, review storage telemetry, and inspect database state.
          </p>
        </div>
        <Badge variant="neutral">Settings v1</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Storage Persistence & Telemetry */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Storage Quota & Persistence</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">IndexedDB Usage</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {telemetry ? `${telemetry.formattedUsage} used of ${telemetry.formattedQuota}` : 'Evaluating...'}
                </p>
              </div>
              <Badge variant={isGranted ? 'success' : 'warning'}>
                {isGranted ? 'Persisted' : 'Standard'}
              </Badge>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              {isGranted ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {isGranted
                  ? 'Browser has granted permanent storage retention. Your data is protected against low-disk eviction.'
                  : 'Storage persistence is not yet granted. Request persistence or back up regularly to guarantee retention.'}
              </p>
            </div>

            {!isGranted && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestPersistence}
                isLoading={isRequestingPersistence}
                className="w-full"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('storage_request_button')}</span>
              </Button>
            )}
          </div>
        </Card>

        {/* UI Preferences: Language & Theme */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Interface Preferences</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Application Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'fr', label: 'Français' },
                    { code: 'ar', label: 'العربية' },
                  ] as const satisfies readonly { code: AppLanguage; label: string }[]
                ).map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setLanguage(item.code)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      language === item.code
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Visual Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { mode: 'light', label: 'Light', icon: Sun },
                    { mode: 'dark', label: 'Dark', icon: Moon },
                    { mode: 'system', label: 'System', icon: Laptop },
                  ] as const satisfies readonly { mode: AppTheme; label: string; icon: typeof Sun }[]
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setTheme(item.mode)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        theme === item.mode
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Database Store Metrics */}
        <Card
          className="md:col-span-2"
          header={
            <div className="flex items-center justify-between text-slate-900 dark:text-white">
              <span>IndexedDB Table Diagnostics (Schema Version 1)</span>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                Database: uns_school_db
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {Object.entries(tableCounts).map(([tableName, count]) => (
              <div
                key={tableName}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  db.{tableName}
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                  {count} records
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
