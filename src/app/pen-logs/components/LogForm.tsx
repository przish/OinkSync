'use client';

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { FormTextarea } from '@/components/Forms/FormTextarea';
import { penLogSchema, type PenLogFormValues } from '@/lib/utils/zod-schemas';
import { CLEANING_STATUS_LABELS } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatting';
import type { PenWithAnimals } from '@/types/api';

const CLEANING_OPTIONS = [
  { value: '', label: 'Not specified' },
  ...Object.entries(CLEANING_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

interface LogFormProps {
  isOpen: boolean;
  onClose: () => void;
  pens: PenWithAnimals[];
  onSubmit: (data: PenLogFormValues) => Promise<{ error: string | null }>;
}

export function LogForm({ isOpen, onClose, pens, onSubmit }: LogFormProps) {
  const penOptions = pens.map((p) => ({
    value: p.id,
    label: `Pen ${p.pen_number}${p.pen_name ? ` — ${p.pen_name}` : ''}`,
  }));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PenLogFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(penLogSchema) as any,
    defaultValues: {
      log_date: todayISO(),
      feed_amount_kg: 0,
      water_provided: true,
      animals_died: 0,
      animals_sick: 0,
      issues_reported: false,
    },
  });

  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleClose = () => { reset(); setServerError(null); onClose(); };

  const onFormSubmit = async (data: PenLogFormValues) => {
    setServerError(null);
    const { error } = await onSubmit(data);
    if (error) setServerError(error);
    else handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Pen Log"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSubmit(onFormSubmit)()} isLoading={isSubmitting}>
            Save Log
          </Button>
        </>
      }
    >
      <form style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
        <div className="form-grid form-grid-2">
          <FormField label="Date" htmlFor="log-date" error={errors.log_date?.message} required>
            <input id="log-date" type="date" className={`form-input${errors.log_date ? ' error' : ''}`} {...register('log_date')} />
          </FormField>
          <FormField label="Pen" htmlFor="log-pen" error={errors.pen_id?.message} required>
            <FormSelect id="log-pen" options={penOptions} placeholder="Select pen" error={!!errors.pen_id} {...register('pen_id')} />
          </FormField>
        </div>

        <div className="form-grid form-grid-2">
          <FormField label="Feed Type" htmlFor="log-feed-type">
            <input id="log-feed-type" type="text" className="form-input" placeholder="e.g. Starter, Grower" {...register('feed_type')} />
          </FormField>
          <FormField label="Feed Amount (kg)" htmlFor="log-feed-kg" error={errors.feed_amount_kg?.message} required>
            <input id="log-feed-kg" type="number" step="0.1" min="0" className={`form-input${errors.feed_amount_kg ? ' error' : ''}`} {...register('feed_amount_kg', { valueAsNumber: true })} />
          </FormField>
        </div>

        <div className="form-grid form-grid-3">
          <FormField label="Animals Died" htmlFor="log-died">
            <input id="log-died" type="number" min="0" className="form-input" {...register('animals_died', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Animals Sick" htmlFor="log-sick">
            <input id="log-sick" type="number" min="0" className="form-input" {...register('animals_sick', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Cleaning Status" htmlFor="log-clean">
            <FormSelect id="log-clean" options={CLEANING_OPTIONS} {...register('cleaning_status')} />
          </FormField>
        </div>

        <FormField label="Health Observations" htmlFor="log-health">
          <FormTextarea id="log-health" placeholder="Describe any health observations..." rows={2} {...register('health_observations')} />
        </FormField>

        <FormField label="General Notes" htmlFor="log-notes">
          <FormTextarea id="log-notes" placeholder="Any other notes about this pen..." rows={2} {...register('general_notes')} />
        </FormField>

        <div style={{ display: 'flex', gap: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" {...register('water_provided')} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Water provided</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" {...register('issues_reported')} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)' }}>Issues reported</span>
          </label>
        </div>

        {serverError && (
          <div className="alert-banner" style={{ borderLeftColor: 'var(--error)', background: 'linear-gradient(135deg, #fde8e8, #f5c6c6)' }}>
            <p style={{ fontSize: 14 }}>{serverError}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
