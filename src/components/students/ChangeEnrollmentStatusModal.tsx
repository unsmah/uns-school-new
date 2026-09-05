/**
 * UNS SCHOOL — Change Student Enrollment Status Modal
 * Handles state transitions: active, transferred_out, withdrawn, suspended.
 */

import React, { useState } from 'react';
import { Modal, Input, Select, Button, Alert } from '../ui';
import { studentEnrollmentRepository } from '../../db/repositories';
import type { StudentEnrollment } from '../../types';

type EnrollmentStatus = StudentEnrollment['status'];

interface ChangeEnrollmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
  enrollment: StudentEnrollment;
  studentName: string;
}

export const ChangeEnrollmentStatusModal: React.FC<ChangeEnrollmentStatusModalProps> = ({
  isOpen,
  onClose,
  onStatusChanged,
  enrollment,
  studentName,
}) => {
  const [status, setStatus] = useState<EnrollmentStatus>(enrollment.status);
  const [statusChangeDate, setStatusChangeDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await studentEnrollmentRepository.update(enrollment.id, {
        status,
        statusChangeDate,
        statusChangeReason: statusChangeReason.trim() || undefined,
      });
      if (onStatusChanged) {
        onStatusChanged();
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update enrollment status.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Student Enrollment Status"
      description={`Update administrative status for ${studentName}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
            Update Status
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Select
          label="Enrollment Status (الحالة الإدارية)"
          value={status}
          onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
          options={[
            { value: 'active', label: 'Active (مستمر / Inscrit)' },
            { value: 'transferred_out', label: 'Transferred Out (محول / Transféré)' },
            { value: 'withdrawn', label: 'Withdrawn (منقطع / Démissionnaire)' },
            { value: 'suspended', label: 'Suspended (موقوف / Suspendu)' },
          ]}
        />

        <Input
          label="Effective Date (تاريخ السريان)"
          type="date"
          value={statusChangeDate}
          onChange={(e) => setStatusChangeDate(e.target.value)}
          required
        />

        <Input
          label="Reason / Notes (السبب / ملاحظات)"
          placeholder="e.g. Transferred to CEM Ibn Khaldoun due to relocation"
          value={statusChangeReason}
          onChange={(e) => setStatusChangeReason(e.target.value)}
        />
      </form>
    </Modal>
  );
};
