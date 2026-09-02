'use client';

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { FormTextarea } from '@/components/Forms/FormTextarea';
import { animalSchema, type AnimalFormValues } from '@/lib/utils/zod-schemas';
import { ANIMAL_TYPE_LABELS, HEALTH_STATUSES } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatting';
import type { PenWithAnimals } from '@/types/api';

const ANIMAL_TYPE_OPTIONS = Object.entries(ANIMAL_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const HEALTH_OPTIONS = HEALTH_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
const GENDER_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

interface AnimalFormProps {
  isOpen: boolean;
  onClose: () => void;
  pens: PenWithAnimals[];
  onSubmit: (data: AnimalFormValues) => Promise<{ error: string | null }>;
}

export function AnimalForm({ isOpen, onClose, pens, onSubmit }: AnimalFormProps) {
  const penOptions = pens.map((p) => ({
    value: p.id,
    label: `Pen ${p.pen_number}${p.pen_name ? ` — ${p.pen_name}` : ''}`,
  }));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AnimalFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(animalSchema) as any,
    defaultValues: {
      birth_date: todayISO(),
      health_status: 'healthy',
      animal_type: 'piglet',
      is_breeding_sow: false,
    },
  });

  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleClose = () => { reset(); setServerError(null); onClose(); };

  const onFormSubmit = async (data: AnimalFormValues) => {
    setServerError(null);
    const { error } = await onSubmit(data);
    if (error) setServerError(error);
    else handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Animal"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSubmit(onFormSubmit)()} isLoading={isSubmitting}>
            Add Animal
          </Button>
        </>
      }
    >
      <form style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
        <div className="form-grid form-grid-2">
          <FormField label="Animal Type" htmlFor="a-type" error={errors.animal_type?.message} required>
            <FormSelect id="a-type" options={ANIMAL_TYPE_OPTIONS} error={!!errors.animal_type} {...register('animal_type')} />
          </FormField>
          <FormField label="Pen" htmlFor="a-pen" error={errors.pen_id?.message} required>
            <FormSelect id="a-pen" options={penOptions} placeholder="Select pen" error={!!errors.pen_id} {...register('pen_id')} />
          </FormField>
        </div>
        <div className="form-grid form-grid-2">
          <FormField label="Birth Date" htmlFor="a-birth" error={errors.birth_date?.message} required>
            <input id="a-birth" type="date" className={`form-input${errors.birth_date ? ' error' : ''}`} {...register('birth_date')} />
          </FormField>
          <FormField label="Gender" htmlFor="a-gender">
            <FormSelect id="a-gender" options={GENDER_OPTIONS} {...register('gender')} />
          </FormField>
        </div>
        <div className="form-grid form-grid-2">
          <FormField label="Health Status" htmlFor="a-health" error={errors.health_status?.message}>
            <FormSelect id="a-health" options={HEALTH_OPTIONS} {...register('health_status')} />
          </FormField>
          <FormField label="Weight (kg)" htmlFor="a-weight">
            <input id="a-weight" type="number" step="0.1" min="0" className="form-input" placeholder="Optional" {...register('current_weight', { valueAsNumber: true })} />
          </FormField>
        </div>
        <FormField label="Animal Code" htmlFor="a-code" hint="Optional unique identifier">
          <input id="a-code" type="text" className="form-input" placeholder="e.g. SOW-001" {...register('animal_code')} />
        </FormField>
        <FormField label="Notes" htmlFor="a-notes">
          <FormTextarea id="a-notes" placeholder="Any observations or notes..." rows={3} {...register('notes')} />
        </FormField>
        {serverError && (
          <div className="alert-banner" style={{ borderLeftColor: 'var(--error)', background: 'linear-gradient(135deg, #fde8e8, #f5c6c6)' }}>
            <p style={{ fontSize: 14 }}>{serverError}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
