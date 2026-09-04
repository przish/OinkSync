'use client';

import React, { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';
import type { PenWithAnimals } from '@/types/api';
import type { Animal } from '@/types/database';

interface MovePigletModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPen: PenWithAnimals | null;
  allAnimals: Animal[];
  onSuccess: () => void;
}

export function MovePigletModal({
  isOpen,
  onClose,
  targetPen,
  allAnimals,
  onSuccess,
}: MovePigletModalProps) {
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !targetPen) return null;

  // Filter animals that are active and not already in this pen
  const movableAnimals = allAnimals.filter(
    (a) => a.status === 'active' && a.pen_id !== targetPen.id
  );

  const availableCapacity = Math.max(0, targetPen.capacity - (targetPen.current_count ?? 0));

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      toast.error('Please select an animal to move.');
      return;
    }

    if (availableCapacity <= 0) {
      toast.error(`Cannot move animal. ${targetPen.pen_name || targetPen.pen_number} is already at full capacity.`);
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Moving animal...');

    try {
      const res = await fetch(`/api/inventory/animals/${selectedAnimalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pen_id: targetPen.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(getErrorMessage(json.error, 'Failed to move animal'), { id: toastId });
      } else {
        toast.success(`Animal successfully moved to ${targetPen.pen_name || targetPen.pen_number}!`, { id: toastId });
        setSelectedAnimalId('');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error moving animal'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const animalOptions = movableAnimals.map((a) => {
    const code = a.animal_code || `#${a.id.slice(0, 6)}`;
    const typeLabel = a.animal_type === 'piglet' ? 'Piglet' : a.animal_type === 'breeding_sow' ? 'Sow' : 'Market Ready';
    const weightStr = a.current_weight ? ` (${a.current_weight} kg)` : '';
    return {
      value: a.id,
      label: `${code} — ${typeLabel}${weightStr}`,
    };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Piglet to ${targetPen.pen_name || targetPen.pen_number}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleMove}
            isLoading={isSubmitting}
            disabled={movableAnimals.length === 0 || availableCapacity <= 0}
            leftIcon={<ArrowRightLeft size={14} />}
          >
            Confirm Move
          </Button>
        </>
      }
    >
      <form onSubmit={handleMove} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Pen Capacity Card */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--palette-cream)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--palette-sage)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-dark)' }}>
              Target Pen: {targetPen.pen_name || targetPen.pen_number}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: availableCapacity > 0 ? 'var(--secondary-green)' : 'var(--error)' }}>
              {targetPen.current_count} / {targetPen.capacity} animals ({availableCapacity} slots left)
            </span>
          </div>
        </div>

        {availableCapacity <= 0 ? (
          <div style={{
            padding: '12px 16px',
            background: 'var(--palette-rose)',
            border: '1.5px solid var(--palette-blush)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--neutral-dark)',
            fontSize: 13,
            fontWeight: 600,
          }}>
            This pen is currently at full capacity ({targetPen.capacity}/{targetPen.capacity}). Please transfer animals out or select another pen.
          </div>
        ) : movableAnimals.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--muted-dark)',
            fontSize: 13,
          }}>
            No other active animals available to move into this pen.
          </div>
        ) : (
          <FormField label="Select Piglet / Animal to Transfer" htmlFor="select-animal-move" required>
            <FormSelect
              id="select-animal-move"
              value={selectedAnimalId}
              onChange={(e) => setSelectedAnimalId(e.target.value)}
              options={[{ value: '', label: 'Choose an animal to transfer...' }, ...animalOptions]}
            />
          </FormField>
        )}
      </form>
    </Modal>
  );
}
