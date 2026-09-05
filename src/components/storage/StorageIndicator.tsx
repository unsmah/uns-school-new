/**
 * UNS SCHOOL — Storage Telemetry Indicator & Dialog Component
 * Displays IndexedDB usage, quota, and persistence grant state with backup reminders.
 */

import React, { useEffect, useState } from 'react';
import { HardDrive, ShieldCheck, AlertTriangle, RefreshCw, X } from 'lucide-react';
import {
  checkStorageTelemetry,
  requestStoragePersistence,
  type StorageTelemetry,
} from '../../services/storageTelemetryService';
import { useI18n } from '../../i18n/I18nContext';

export const StorageIndicator: React.FC = () => {
  const [telemetry, setTelemetry] = useState<StorageTelemetry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const { t } = useI18n();

  const refreshTelemetry = async () => {
    const data = await checkStorageTelemetry();
    setTelemetry(data);
  };

  useEffect(() => {
    refreshTelemetry();
  }, []);

  const handleRequestPersistence = async () => {
    setIsRequesting(true);
    await requestStoragePersistence();
    await refreshTelemetry();
    setIsRequesting(false);
  };

  const isGranted = telemetry?.persistenceState === 'PERSISTENCE_GRANTED';

  return (
    <>
      <button
        id="storage-telemetry-trigger"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
        title="View local storage and persistence status"
      >
        <HardDrive className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">
          {telemetry ? telemetry.formattedUsage : 'Storage'}
        </span>
        {isGranted ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Persistent storage granted" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-amber-500" title="Standard browser storage" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('storage_title')}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Storage Quota Bar */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
                  <span>
                    {t('storage_used')}: <strong>{telemetry?.formattedUsage ?? '0 B'}</strong>
                  </span>
                  <span>
                    {t('storage_quota')}: <strong>{telemetry?.formattedQuota ?? 'Unknown'}</strong>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(1, telemetry?.usagePercentage ?? 1)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {telemetry?.usagePercentage ?? 0}% of estimated browser quota utilized.
                </p>
              </div>

              {/* Persistence Status */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {isGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {isGranted
                      ? t('storage_persistence_granted')
                      : t('storage_persistence_not_granted')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isGranted
                      ? 'The browser has agreed to retain your local IndexedDB records even during low disk space.'
                      : 'Storage persistence is not yet granted. The browser might clear local data under critical disk pressure.'}
                  </p>
                </div>
              </div>

              {/* Persistence Request Action */}
              {!isGranted && telemetry?.persistenceState !== 'PERSISTENCE_UNAVAILABLE' && (
                <button
                  onClick={handleRequestPersistence}
                  disabled={isRequesting}
                  className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                  <span>{t('storage_request_button')}</span>
                </button>
              )}

              {/* Backup reminder */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">Safety Best Practice:</p>
                <p className="leading-relaxed">{t('storage_backup_recommendation')}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="py-1.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                {t('action_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
