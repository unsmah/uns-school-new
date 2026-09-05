/**
 * UNS SCHOOL — Phase 1 Module Placeholder
 * Displays a clean, professional status screen indicating architectural readiness.
 */

import React from 'react';
import { Card, Badge } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { Database, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  moduleName: string;
  moduleCode: string;
  description: string;
  databaseTables: string[];
  keyCapabilities: string[];
}

export const Phase1ModulePlaceholder: React.FC<Props> = ({
  moduleName,
  moduleCode,
  description,
  databaseTables,
  keyCapabilities,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {moduleName}
            </h2>
            <Badge variant="neutral">{moduleCode}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <Badge variant="default">{t('phase_1_status')}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Database Foundation Ready */}
        <Card
          header={
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Database className="w-4 h-4" />
              <span>Database Foundation Provisioned</span>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            IndexedDB tables, schema indexes, and transactional repositories are initialized:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {databaseTables.map((table) => (
              <span
                key={table}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                db.{table}
              </span>
            ))}
          </div>
        </Card>

        {/* Planned Capabilities */}
        <Card
          header={
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Engineered Domain Rules</span>
            </div>
          }
        >
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            {keyCapabilities.map((cap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>{t('phase_1_coming_soon')}</span>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <span>Back to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
