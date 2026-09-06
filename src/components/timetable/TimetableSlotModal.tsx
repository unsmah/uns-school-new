/**
 * UNS SCHOOL — Timetable Slot Modal
 * Create or edit a weekly timetable slot (Sunday - Thursday, Periods 1 - 8).
 */

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, DoorOpen, BookOpen, AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select, Alert } from '../ui';
import { timetableRepository } from '../../db/repositories';
import { useI18n } from '../../i18n/I18nContext';
import type { TimetableSlot, SchoolClass } from '../../types';

interface TimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: string;
  schoolId: string;
  classes: SchoolClass[];
  existingSlot?: TimetableSlot | null;
  defaultDay?: TimetableSlot['dayOfWeek'];
  defaultPeriod?: number;
  onSaved: () => void;
}

const DAYS_OF_WEEK: TimetableSlot['dayOfWeek'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

const DAY_LABELS: Record<string, Record<string, string>> = {
  ar: {
    Sunday: 'الأحد',
    Monday: 'الإثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
  },
  fr: {
    Sunday: 'Dimanche',
    Monday: 'Lundi',
    Tuesday: 'Mardi',
    Wednesday: 'Mercredi',
    Thursday: 'Jeudi',
  },
  en: {
    Sunday: 'Sunday',
    Monday: 'Monday',
    Tuesday: 'Tuesday',
    Wednesday: 'Wednesday',
    Thursday: 'Thursday',
  },
};

const PERIOD_PRESETS: Record<number, { startTime: string; endTime: string; label: string }> = {
  1: { startTime: '08:00', endTime: '09:00', label: 'Period 1 (08:00 - 09:00)' },
  2: { startTime: '09:00', endTime: '10:00', label: 'Period 2 (09:00 - 10:00)' },
  3: { startTime: '10:00', endTime: '11:00', label: 'Period 3 (10:00 - 11:00)' },
  4: { startTime: '11:00', endTime: '12:00', label: 'Period 4 (11:00 - 12:00)' },
  5: { startTime: '13:00', endTime: '14:00', label: 'Period 5 (13:00 - 14:00)' },
  6: { startTime: '14:00', endTime: '15:00', label: 'Period 6 (14:00 - 15:00)' },
  7: { startTime: '15:00', endTime: '16:00', label: 'Period 7 (15:00 - 16:00)' },
  8: { startTime: '16:00', endTime: '17:00', label: 'Period 8 (16:00 - 17:00)' },
};

export const TimetableSlotModal: React.FC<TimetableSlotModalProps> = ({
  isOpen,
  onClose,
  academicYearId,
  schoolId,
  classes,
  existingSlot,
  defaultDay,
  defaultPeriod,
  onSaved,
}) => {
  const { language } = useI18n();
  const [dayOfWeek, setDayOfWeek] = useState<TimetableSlot['dayOfWeek']>('Sunday');
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:00');
  const [classId, setClassId] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [subject, setSubject] = useState<string>('English');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSlot) {
      setDayOfWeek(existingSlot.dayOfWeek);
      setPeriodNumber(existingSlot.periodNumber);
      setStartTime(existingSlot.startTime);
      setEndTime(existingSlot.endTime);
      setClassId(existingSlot.classId);
      setRoomNumber(existingSlot.roomNumber || '');
      setSubject(existingSlot.subject || 'English');
      setNotes(existingSlot.notes || '');
    } else {
      const initialDay = defaultDay || 'Sunday';
      const initialPeriod = defaultPeriod || 1;
      setDayOfWeek(initialDay);
      setPeriodNumber(initialPeriod);
      const preset = PERIOD_PRESETS[initialPeriod] || PERIOD_PRESETS[1];
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setClassId(classes[0]?.id || '');
      setRoomNumber(classes[0]?.roomNumber || '');
      setSubject('English');
      setNotes('');
    }
    setError(null);
  }, [existingSlot, defaultDay, defaultPeriod, classes, isOpen]);

  const handlePeriodChange = (pNum: number) => {
    setPeriodNumber(pNum);
    const preset = PERIOD_PRESETS[pNum];
    if (preset) {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
    }
  };

  const handleClassChange = (selectedId: string) => {
    setClassId(selectedId);
    const selectedClass = classes.find((c) => c.id === selectedId);
    if (selectedClass?.roomNumber) {
      setRoomNumber(selectedClass.roomNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!classId) {
      setError('Please select a class for this timetable slot.');
      return;
    }

    if (!startTime || !endTime) {
      setError('Start time and end time are required.');
      return;
    }

    if (startTime >= endTime) {
      setError(`Start time (${startTime}) must be earlier than end time (${endTime}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prevent overlapping slots on same Day and Period
      const allSlots = await timetableRepository.listByAcademicYear(academicYearId);
      const conflict = allSlots.find(
        (s) =>
          s.dayOfWeek === dayOfWeek &&
          s.periodNumber === periodNumber &&
          (!existingSlot || s.id !== existingSlot.id)
      );

      if (conflict) {
        setError(
          language === 'ar'
            ? 'هناك حصة مبرمجة بالفعل في هذا اليوم وفي هذه الفترة. يسمح بحصة واحدة فقط.'
            : language === 'fr'
            ? 'Un créneau est déjà programmé pour ce jour et cette période. Un seul créneau est autorisé.'
            : 'A slot is already scheduled for this day and period. Only one slot is allowed.'
        );
        setIsSubmitting(false);
        return;
      }

      if (existingSlot) {
        await timetableRepository.update(existingSlot.id, {
          dayOfWeek,
          periodNumber,
          startTime,
          endTime,
          classId,
          roomNumber: roomNumber.trim() || undefined,
          subject: subject.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        const newSlot: TimetableSlot = {
          id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          academicYearId,
          schoolId,
          dayOfWeek,
          periodNumber,
          startTime,
          endTime,
          classId,
          roomNumber: roomNumber.trim() || undefined,
          subject: subject.trim() || undefined,
          notes: notes.trim() || undefined,
        };
        await timetableRepository.create(newSlot);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save timetable slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <span>{existingSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}</span>
        </div>
      }
      description="Configure your weekly teaching schedule for Algerian middle school week (Sun–Thu)."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : existingSlot ? 'Save Changes' : 'Add Slot'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Schedule Conflict / Error">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Day of Week */}
          <Select
            label={language === 'ar' ? 'يوم التدريس' : language === 'fr' ? 'Jour de la semaine' : 'Day of Week'}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value as TimetableSlot['dayOfWeek'])}
            options={DAYS_OF_WEEK.map((day) => ({
              value: day,
              label: DAY_LABELS[language]?.[day] || DAY_LABELS['en'][day],
            }))}
          />

          {/* Period Preset */}
          <Select
            label={language === 'ar' ? 'الحصة التعليمية' : language === 'fr' ? 'Séance' : 'Teaching Period'}
            value={periodNumber.toString()}
            onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10))}
            options={Object.entries(PERIOD_PRESETS).map(([pNum, p]) => ({
              value: pNum,
              label: `${language === 'ar' ? 'الحصة' : language === 'fr' ? 'Séance' : 'Period'} ${pNum} (${p.startTime} - ${p.endTime})`,
            }))}
          />
        </div>

        {/* Start & End Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={language === 'ar' ? 'وقت البداية' : language === 'fr' ? 'Heure de début' : 'Start Time'}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label={language === 'ar' ? 'وقت النهاية' : language === 'fr' ? 'Heure de fin' : 'End Time'}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        {/* Class Division */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={language === 'ar' ? 'الفوج التربوي' : language === 'fr' ? 'Classe' : 'Class Division'}
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.levelCode})`,
            }))}
          />

          <Input
            label={language === 'ar' ? 'القاعة' : language === 'fr' ? 'Salle' : 'Room'}
            placeholder={language === 'ar' ? 'مثال: قاعة 04' : 'e.g. Salle 04, Lab'}
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
        </div>

        {/* Subject / Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={language === 'ar' ? 'المادة التعليمية' : language === 'fr' ? 'Matière' : 'Subject'}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={language === 'ar' ? 'اللغة الإنجليزية' : 'e.g. English Language'}
          />

          <Input
            label={language === 'ar' ? 'ملاحظات إضافية' : language === 'fr' ? 'Remarques (optionnel)' : 'Notes (Optional)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'ar' ? 'مثال: بالتناوب كل أسبوعين' : 'e.g. Fortnightly / Bi-weekly'}
          />
        </div>
      </form>
    </Modal>
  );
};
