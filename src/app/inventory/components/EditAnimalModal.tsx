'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { HEALTH_STATUSES, ANIMAL_STATUSES } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';
import type { PenWithAnimals } from '@/types/api';
import type { Animal } from '@/types/database';

interface EditAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: Animal | null;
  pens: PenWithAnimals[];
  onSuccess: () => void;
}

export function EditAnimalModal({
  isOpen,
  onClose,
  animal,
  pens,
  onSuccess,
}: EditAnimalModalProps) {
  const [healthStatus, setHealthStatus] = useState<string>('healthy');
  const [status, setStatus] = useState<string>('active');
  const [breedingPenId, setBreedingPenId] = useState<string>('');
  const [penId, setPenId] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (animal) {
      setHealthStatus(animal.health_status || 'healthy');
      setStatus(animal.status || 'active');
      setPenId(animal.pen_id || '');
      setBreedingPenId(animal.pen_id || (pens.length > 0 ? pens[0].id : ''));
      setWeight(animal.current_weight !== null && animal.current_weight !== undefined ? String(animal.current_weight) : '');
      setNotes(animal.notes || '');
    }
  }, [animal, pens]);

  if (!isOpen || !animal) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Updating animal details...');

    try {
      const payload: Record<string, any> = {
        health_status: healthStatus,
        notes: notes.trim(),
      };

      if (status === 'became_breeding_sow') {
        const destPen = breedingPenId || penId;
        if (!destPen) {
          toast.error('Please select the pen where the breeding sow will be moved.', { id: toastId });
          setIsSubmitting(false);
          return;
        }
        payload.status = 'active';
        payload.animal_type = 'breeding_sow';
        payload.gender = 'female';
        payload.pen_id = destPen;
      } else {
        payload.status = status;
        if (penId && penId !== animal.pen_id) {
          payload.pen_id = penId;
        }
      }

      if (weight !== '') {
        const numWeight = parseFloat(weight);
        if (!isNaN(numWeight)) payload.current_weight = numWeight;
      }

      const res = await fetch(`/api/inventory/animals/${animal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(getErrorMessage(json.error, 'Failed to update animal'), { id: toastId });
      } else {
        toast.success(
          status === 'became_breeding_sow'
            ? 'Animal successfully promoted to Breeding Sow and moved to pen!'
            : 'Animal updated successfully!',
          { id: toastId }
        );
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error updating animal'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const penOptions = pens.map((p) => ({
    value: p.id,
    label: `${p.pen_name || p.pen_number} (${p.current_count}/${p.capacity})`,
  }));

  const healthOptions = HEALTH_STATUSES.map((h) => ({
    value: h,
    label: h.charAt(0).toUpperCase() + h.slice(1),
  }));

  const statusOptions = animal.animal_type === 'breeding_sow'
    ? [
        { value: 'active', label: 'Active' },
        { value: 'sold', label: 'Sold' },
        { value: 'deceased', label: 'Deceased' },
      ]
    : [
        { value: 'active', label: 'Active' },
        { value: 'sold', label: 'Sold' },
        { value: 'became_breeding_sow', label: 'Became Breeding Sow' },
        { value: 'deceased', label: 'Deceased' },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Animal — ${animal.animal_code || `#${animal.id.slice(0, 6)}`}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdate} isLoading={isSubmitting}>
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-grid form-grid-2">
          <FormField label="Animal Status" htmlFor="edit-animal-status" required>
            <FormSelect
              id="edit-animal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={statusOptions}
            />
          </FormField>

          <FormField label="Health Status" htmlFor="edit-animal-health" required>
            <FormSelect
              id="edit-animal-health"
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value)}
              options={healthOptions}
            />
          </FormField>
        </div>

        {status === 'became_breeding_sow' && (
          <FormField
            label="Move to Breeding Pen"
            htmlFor="breeding-pen"
            required
            hint="Specify where this new breeding sow will be relocated"
          >
            <FormSelect
              id="breeding-pen"
              value={breedingPenId}
              onChange={(e) => setBreedingPenId(e.target.value)}
              options={penOptions}
              required
            />
          </FormField>
        )}

        <div className="form-grid form-grid-2">
          {status !== 'became_breeding_sow' && (
            <FormField label="Assigned Pen" htmlFor="edit-animal-pen" required>
              <FormSelect
                id="edit-animal-pen"
                value={penId}
                onChange={(e) => setPenId(e.target.value)}
                options={penOptions}
              />
            </FormField>
          )}

          <FormField label="Current Weight (kg)" htmlFor="edit-animal-weight">
            <input
              id="edit-animal-weight"
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="form-input"
              placeholder="e.g. 15.5"
            />
          </FormField>
        </div>

        <FormField label="Notes & Observations" htmlFor="edit-animal-notes">
          <input
            id="edit-animal-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            placeholder="Medical history, feed notes, observations"
          />
        </FormField>
      </form>
    </Modal>
  );
}
