/**
 * UNS SCHOOL — Academic Calendar, Trimester Timetable & Event Management
 * Algerian Sunday–Thursday school week schedule, term borders, exam periods, and holidays.
 *
 * PROVENANCE & CALENDAR INTEGRITY:
 * Calendar events clearly indicate whether dates are sample placeholders ('sample')
 * or officially verified ministry dates ('official_verified').
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Info,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpen,
  Tag,
  Trash2,
  Edit2,
  Award,
} from 'lucide-react';
import { Card, Button, Input, Select, Modal, Alert } from '../../components/ui';
import {
  academicYearRepository,
  classRepository,
  timetableRepository,
  schoolRepository,
} from '../../db/repositories';
import type { AcademicYear, CalendarEvent, SchoolClass, TimetableSlot } from '../../types';

export const CalendarPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'timetable'>('calendar');

  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Calendar Event Filter
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  // Add Calendar Event Modal
  const [addEventModalOpen, setAddEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['eventType']>('school_event');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStatus, setEventStatus] = useState<CalendarEvent['status']>('user_created');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = await academicYearRepository.getCurrent();
      if (year) {
        setActiveYear(year);
        const clsList = await classRepository.listByAcademicYear(year.id);
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0].id);
        }

        const slots = await timetableRepository.listByAcademicYear(year.id);
        setTimetableSlots(slots);
      }
    } catch (err) {
      console.error('Failed to load academic calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Calendar Events
  const filteredEvents = useMemo(() => {
    if (!activeYear || !activeYear.calendarEvents) return [];
    if (selectedEventType === 'ALL') return activeYear.calendarEvents;
    return activeYear.calendarEvents.filter((e) => e.eventType === selectedEventType);
  }, [activeYear, selectedEventType]);

  // Handle Adding Calendar Event
  const handleAddCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeYear) return;
    if (!eventTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }
    if (!eventStartDate) {
      setFormError('Start date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newEvt: CalendarEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: eventTitle.trim(),
        startDate: eventStartDate,
        endDate: eventEndDate || undefined,
        eventType,
        description: eventDesc.trim() || undefined,
        status: 'user_created',
        isOfficial: false,
      };

      const updatedEvents = [...(activeYear.calendarEvents || []), newEvt];
      await academicYearRepository.update(activeYear.id, {
        calendarEvents: updatedEvents,
      });

      setAddEventModalOpen(false);
      setEventTitle('');
      setEventStartDate('');
      setEventEndDate('');
      setEventDesc('');
      setNotification('Calendar event added successfully.');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save calendar event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timetable days (Sunday to Thursday)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;
  const periodNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  const getSlot = (day: string, period: number) => {
    return timetableSlots.find(
      (s) => s.classId === selectedClassId && s.dayOfWeek === day && s.periodNumber === period
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Academic Calendar & Weekly Timetable
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Algerian Academic Year {activeYear?.label || '2026-2027'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sunday to Thursday school week schedule, trimester date ranges, exam periods, and national holidays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setAddEventModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Calendar Event
          </Button>
        </div>
      </div>

      {notification && (
        <Alert variant="success" title="Action Completed">
          {notification}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Academic Calendar & Terms</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'timetable'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Weekly Timetable (الاستعمال الزمني)</span>
        </button>
      </div>

      {/* TAB 1: ACADEMIC CALENDAR & TERMS */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Provenance Transparency Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Academic Calendar Date Statuses</div>
              <p className="text-[11px] leading-relaxed">
                Key term dates marked as <span className="font-bold">Sample Schedule</span> are estimated structured placeholders for offline planning. Official Ministry circulars can be updated anytime by adding or adjusting event records.
              </p>
            </div>
          </div>

          {/* Trimester Cards */}
          {activeYear && activeYear.terms && activeYear.terms.length > 0 && (
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Trimester Date Ranges (الفصول الدراسية)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeYear.terms.map((term) => (
                  <Card key={term.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        Trimester {term.termNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {term.name}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Duration:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {term.startDate} → {term.endDate}
                        </strong>
                      </div>

                      {term.examinationStartDate && (
                        <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                          <span>Exams:</span>
                          <span>
                            {term.examinationStartDate} → {term.examinationEndDate}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Events List & Filter */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span>Academic Calendar Timeline & Holidays</span>
              </h2>

              <Select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Event Types' },
                  { value: 'term_border', label: 'Term Borders' },
                  { value: 'exam_period', label: 'Examination Periods' },
                  { value: 'holiday', label: 'Holidays & Vacations' },
                  { value: 'school_event', label: 'School Events & Meetings' },
                ]}
              />
            </div>

            {filteredEvents.length === 0 ? (
              <Card className="text-center py-8 text-slate-500 text-xs">
                No calendar events found for the selected filter.
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filteredEvents.map((evt) => {
                  return (
                    <Card key={evt.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {evt.title}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {evt.eventType.replace('_', ' ').toUpperCase()}
                          </span>

                          {evt.status === 'official_verified' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                              Official Verified
                            </span>
                          )}
                          {evt.status === 'sample' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Sample Schedule
                            </span>
                          )}
                          {evt.status === 'user_created' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              Teacher Created
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                        {evt.startDate}
                        {evt.endDate ? ` → ${evt.endDate}` : ''}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Algerian School Week Timetable (Sunday – Thursday)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Weekly teaching slots per class division (Period 1 to Period 8).
              </p>
            </div>

            {classes.length > 0 && (
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={classes.map((c) => ({
                  value: c.id,
                  label: `Class: ${c.name} (${c.levelCode})`,
                }))}
              />
            )}
          </div>

          {classes.length === 0 ? (
            <Card className="text-center py-8 text-slate-500 text-xs">
              No classes configured for this academic year yet.
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[100px]">Day</th>
                    {periodNumbers.map((p) => (
                      <th key={p} className="p-3 text-center border-r border-slate-200 dark:border-slate-700 min-w-[90px]">
                        Period {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day) => (
                    <tr key={day} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                        {day}
                      </td>

                      {periodNumbers.map((p) => {
                        const slot = getSlot(day, p);
                        return (
                          <td
                            key={p}
                            className="p-2 text-center border-r border-slate-200 dark:border-slate-800 text-[11px]"
                          >
                            {slot ? (
                              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-0.5">
                                <div className="font-bold">{slot.subject || 'English'}</div>
                                {slot.roomNumber && (
                                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    Room {slot.roomNumber}
                                  </div>
                                )}
                                <div className="text-[10px] opacity-75">
                                  {slot.startTime}–{slot.endTime}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ADD CALENDAR EVENT MODAL */}
      <Modal
        isOpen={addEventModalOpen}
        onClose={() => setAddEventModalOpen(false)}
        title="Add Academic Calendar Event"
        description="Register a new term border, exam period, school holiday, or meeting date."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full text-xs">
            <Button variant="ghost" size="sm" onClick={() => setAddEventModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddCalendarEvent} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Event'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddCalendarEvent} className="space-y-4 text-xs">
          {formError && (
            <Alert variant="error" title="Validation Error">
              {formError}
            </Alert>
          )}

          <Input
            label="Event Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. 2nd Trimester Parent-Teacher Coordination Day"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
              required
            />

            <Input
              label="End Date (Optional)"
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Event Category"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as CalendarEvent['eventType'])}
              options={[
                { value: 'school_event', label: 'School Event / Meeting' },
                { value: 'exam_period', label: 'Examination Period' },
                { value: 'holiday', label: 'Holiday / Vacation' },
                { value: 'term_border', label: 'Term Border' },
              ]}
            />

            <Select
              label="Event Provenance"
              value={eventStatus}
              onChange={(e) => setEventStatus(e.target.value as CalendarEvent['status'])}
              options={[
                { value: 'user_created', label: 'Teacher Created' },
                { value: 'sample', label: 'Sample Schedule' },
              ]}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Description / Instructions:
            </label>
            <textarea
              rows={3}
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="Provide context or instructions for this calendar date..."
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
