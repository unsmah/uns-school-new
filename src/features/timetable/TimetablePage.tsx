/**
 * UNS SCHOOL — Weekly Timetable Page
 * Algerian Middle School Teaching Week (Sunday - Thursday).
 * Interactive weekly schedule manager for English teachers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  DoorOpen,
  Edit2,
  Trash2,
  Printer,
  AlertCircle,
  Filter,
  Layers,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { timetableRepository, classRepository } from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState, Select, Modal } from '../../components/ui';
import { TimetableSlotModal } from '../../components/timetable/TimetableSlotModal';
import type { TimetableSlot, SchoolClass } from '../../types';

const DAYS_OF_WEEK: TimetableSlot['dayOfWeek'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_LABELS: Record<number, string> = {
  1: '08:00 - 09:00',
  2: '09:00 - 10:00',
  3: '10:00 - 11:00',
  4: '11:00 - 12:00',
  5: '13:00 - 14:00',
  6: '14:00 - 15:00',
  7: '15:00 - 16:00',
  8: '16:00 - 17:00',
};

const DAY_LABELS_AR: Record<string, string> = {
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const TimetablePage: React.FC = () => {
  const { school, selectedAcademicYear, isArchived } = useAcademicYear();

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<TimetableSlot | null>(null);
  const [targetDayForNewSlot, setTargetDayForNewSlot] = useState<TimetableSlot['dayOfWeek']>('Sunday');
  const [targetPeriodForNewSlot, setTargetPeriodForNewSlot] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(true);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedAcademicYear) {
      setSlots([]);
      setClasses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [yearSlots, yearClasses] = await Promise.all([
        timetableRepository.listByAcademicYear(selectedAcademicYear.id),
        classRepository.listByAcademicYear(selectedAcademicYear.id),
      ]);
      setSlots(yearSlots);
      setClasses(yearClasses);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSlot = (day: TimetableSlot['dayOfWeek'] = 'Sunday', period: number = 1) => {
    if (isArchived) return;
    setEditingSlot(null);
    setTargetDayForNewSlot(day);
    setTargetPeriodForNewSlot(period);
    setIsModalOpen(true);
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    if (isArchived) return;
    setEditingSlot(slot);
    setIsModalOpen(true);
  };

  const handleDeleteSlot = (slot: TimetableSlot) => {
    if (isArchived) return;
    setSlotToDelete(slot);
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    try {
      await timetableRepository.delete(slotToDelete.id);
      setSlotToDelete(null);
      await loadData();
      setFeedbackSuccess(`Timetable slot removed.`);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to delete slot.');
      setSlotToDelete(null);
    }
  };

  const filteredSlots = slots.filter((s) =>
    selectedClassFilter === 'ALL' ? true : s.classId === selectedClassFilter
  );

  const classMap = React.useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of classes) {
      map.set(c.id, c);
    }
    return map;
  }, [classes]);

  // Compute stats
  const totalWeeklyHours = slots.length;
  const classesTaughtCount = new Set(slots.map((s) => s.classId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            Weekly Timetable (جدول التوقيت الأسبوعي)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly English teaching schedule for academic year{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAcademicYear?.label || 'None'}
            </strong>{' '}
            (Sunday – Thursday).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {classes.length > 0 && !isArchived && (
            <Button variant="primary" size="sm" onClick={() => handleAddSlot('Sunday', 1)}>
              <Plus className="w-4 h-4" />
              Add Teaching Slot
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert variant="warning" title="Archived Academic Year (Read-Only)">
          You are viewing an archived academic year timetable. Modifying past timetable slots is restricted.
        </Alert>
      )}

      {feedbackSuccess && (
        <Alert variant="success" title="Success">
          {feedbackSuccess}
        </Alert>
      )}
      {feedbackError && (
        <Alert variant="error" title="Error">
          {feedbackError}
        </Alert>
      )}

      {/* Metrics & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Weekly Workload:</span>
            <strong className="font-mono text-slate-900 dark:text-white text-sm">
              {totalWeeklyHours} hrs
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Active Classes:</span>
            <strong className="font-mono text-slate-900 dark:text-white text-sm">
              {classesTaughtCount}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Filter:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="ALL">All Classes (جميع الأفواج)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.levelCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Weekly Grid */}
      {isLoading ? (
        <LoadingState message="Loading weekly timetable..." />
      ) : !selectedAcademicYear ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="No Academic Year Selected"
          description="Please select an academic year to manage your timetable."
        />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-10 h-10" />}
          title="No Classes Available"
          description="Create your classes first in the Classes workspace before adding timetable slots."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full border-collapse text-left min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 w-28 text-center text-[11px] font-bold tracking-wider uppercase border-e border-slate-200 dark:border-slate-800">
                  Period / Time
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day}
                    className="py-3 px-3 text-center text-xs font-bold tracking-tight border-e last:border-e-0 border-slate-200 dark:border-slate-800"
                  >
                    <div>{day}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {DAY_LABELS_AR[day]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {PERIOD_NUMBERS.map((periodNum) => {
                const isMiddayBreak = periodNum === 5;

                return (
                  <React.Fragment key={periodNum}>
                    {/* Midday Lunch Break Divider */}
                    {isMiddayBreak && (
                      <tr className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                        <td
                          colSpan={6}
                          className="py-1.5 px-4 text-center tracking-wide uppercase italic"
                        >
                          Midday Pause / الاستراحة (12:00 – 13:00)
                        </td>
                      </tr>
                    )}

                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Period Header */}
                      <td className="py-2 px-2 text-center border-e border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          P{periodNum}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {PERIOD_LABELS[periodNum]}
                        </div>
                      </td>

                      {/* Day Columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const cellSlots = filteredSlots.filter(
                          (s) => s.dayOfWeek === day && s.periodNumber === periodNum
                        );

                        return (
                          <td
                            key={`${day}-${periodNum}`}
                            className="py-2 px-2 border-e last:border-e-0 border-slate-200 dark:border-slate-800 align-top min-h-[72px]"
                          >
                            {cellSlots.length > 0 ? (
                              <div className="space-y-1.5">
                                {cellSlots.map((slot) => {
                                  const cls = classMap.get(slot.classId);
                                  return (
                                    <div
                                      key={slot.id}
                                      className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-slate-900 dark:text-slate-100 group relative flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                                            {cls?.name || 'Class'}
                                          </span>
                                          {cls?.levelCode && (
                                            <Badge variant="default" className="text-[10px] px-1 py-0">
                                              {cls.levelCode}
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                          <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            {slot.roomNumber || cls?.roomNumber || 'Room —'}
                                          </span>
                                        </div>

                                        {slot.notes && (
                                          <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                                            {slot.notes}
                                          </div>
                                        )}
                                      </div>

                                      {!isArchived && (
                                        <div className="flex items-center justify-end gap-1 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => handleEditSlot(slot)}
                                            className="p-1 rounded text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                                            title="Edit slot"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSlot(slot)}
                                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                            title="Delete slot"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {!isArchived && selectedClassFilter === 'ALL' && (
                                  <button
                                    onClick={() => handleAddSlot(day, periodNum)}
                                    className="w-full py-1 rounded border border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer text-[10px]"
                                    title={`Add another slot for ${day} Period ${periodNum}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Slot
                                  </button>
                                )}
                              </div>
                            ) : (
                              !isArchived && (
                                <button
                                  onClick={() => handleAddSlot(day, periodNum)}
                                  className="w-full h-full min-h-[54px] rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-slate-300 dark:text-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                                  title={`Add teaching slot for ${day} Period ${periodNum}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Timetable Modal */}
      {selectedAcademicYear && school && (
        <TimetableSlotModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSlot(null);
          }}
          academicYearId={selectedAcademicYear.id}
          schoolId={school.id}
          classes={classes}
          existingSlot={editingSlot}
          defaultDay={targetDayForNewSlot}
          defaultPeriod={targetPeriodForNewSlot}
          onSaved={() => {
            loadData();
            setFeedbackSuccess(
              editingSlot ? 'Timetable slot updated.' : 'New timetable slot added.'
            );
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {slotToDelete && (
        <Modal
          isOpen={Boolean(slotToDelete)}
          onClose={() => setSlotToDelete(null)}
          title="Delete Timetable Slot"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete this timetable slot for{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {classes.find((c) => c.id === slotToDelete.classId)?.name || 'Class'}
              </strong>{' '}
              on {slotToDelete.dayOfWeek} (Period {slotToDelete.periodNumber})?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSlotToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteSlot}>
                Delete Slot
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
