'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { HEALTH_STATUSES } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatting';
import { createClient } from '@/lib/supabase/client';
import type { PenWithAnimals, CreateAnimalRequest } from '@/types/api';

interface AnimalFormProps {
  isOpen: boolean;
  onClose: () => void;
  pens: PenWithAnimals[];
  onSubmit: (data: CreateAnimalRequest) => Promise<{ error: string | null }>;
}

export function AnimalForm({ isOpen, onClose, pens, onSubmit }: AnimalFormProps) {
  // Tabs: 'breeding_sow' | 'piglet'
  const [animalType, setAnimalType] = useState<'breeding_sow' | 'piglet'>('breeding_sow');

  // Common fields
  const [penId, setPenId] = useState('');
  const [birthDate, setBirthDate] = useState(todayISO());
  const [healthStatus, setHealthStatus] = useState<CreateAnimalRequest['health_status']>('healthy');
  const [animalCode, setAnimalCode] = useState('');
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Breeding Sow fields
  const [breedingStage, setBreedingStage] = useState<'ready' | 'breeding' | 'not_yet'>('ready');

  // Piglet fields
  const [motherId, setMotherId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [maleCount, setMaleCount] = useState<number | ''>('');
  const [femaleCount, setFemaleCount] = useState<number | ''>('');

  // Existing Sows for Mother dropdown
  const [sowOptions, setSowOptions] = useState<{ value: string; label: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Derive available capacity dynamically from selected pen
  const selectedPen = pens.find((p) => p.id === penId);
  const availableCapacity = selectedPen ? Math.max(0, selectedPen.capacity - selectedPen.current_count) : undefined;

  useEffect(() => {
    if (isOpen) {
      // Default to first pen if not set
      if (pens.length > 0 && !penId) {
        setPenId(pens[0].id);
      }
      // Load active breeding sows from DB
      const supabase = createClient();
      supabase
        .from('animals')
        .select('id, animal_code, birth_date')
        .eq('animal_type', 'breeding_sow')
        .eq('status', 'active')
        .then(({ data }) => {
          if (data) {
            setSowOptions(
              data.map((sow) => ({
                value: sow.id,
                label: sow.animal_code ? `${sow.animal_code} (Sow)` : `Sow (${sow.id.slice(0, 8)})`,
              }))
            );
          }
        });
    }
  }, [isOpen, pens, penId]);

  const handleClose = () => {
    setServerError(null);
    setAnimalCode('');
    setNotes('');
    setQuantity('');
    setMaleCount('');
    setFemaleCount('');
    setWeight(undefined);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penId) {
      setServerError('Please select a pen.');
      return;
    }

    setServerError(null);

    const qtyNumber = animalType === 'piglet' ? (Number(quantity) || 1) : 1;
    const numMales = Number(maleCount) || 0;
    const numFemales = Number(femaleCount) || 0;

    if (animalType === 'piglet') {
      if (!quantity || Number(quantity) <= 0) {
        setServerError('Please enter a valid piglet quantity.');
        return;
      }
      if (numMales + numFemales > qtyNumber) {
        setServerError(`Total male (${numMales}) and female (${numFemales}) piglets cannot exceed total quantity (${qtyNumber}).`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload: CreateAnimalRequest = {
      pen_id: penId,
      animal_type: animalType,
      birth_date: birthDate,
      health_status: healthStatus,
      animal_code: animalCode.trim() || undefined,
      notes: notes.trim() || undefined,
      current_weight: weight !== undefined && !isNaN(Number(weight)) ? Number(weight) : undefined,
    };

    if (animalType === 'breeding_sow') {
      payload.is_breeding_sow = true;
      payload.breeding_stage = breedingStage;
      payload.gender = 'female';
    } else {
      payload.is_breeding_sow = false;
      payload.mother_id = motherId || undefined;
      payload.quantity = qtyNumber;
      payload.male_count = numMales;
      payload.female_count = numFemales;
      if (qtyNumber === 1) {
        payload.gender = numMales > 0 ? 'male' : numFemales > 0 ? 'female' : undefined;
      }
    }

    const { error } = await onSubmit(payload);
    setIsSubmitting(false);

    if (error) {
      setServerError(error);
    } else {
      handleClose();
    }
  };

  const penOptions = pens.map((p) => ({
    value: p.id,
    label: `Pen ${p.pen_number}${p.pen_name ? ` — ${p.pen_name}` : ''} (${p.current_count}/${p.capacity})`,
  }));

  const parsedQty = Number(quantity) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Animal"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {animalType === 'piglet' && parsedQty > 1
              ? `Add Batch (${parsedQty} Piglets)`
              : 'Add Animal'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Type Toggle Tabs */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Select Animal Category:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => setAnimalType('breeding_sow')}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                border: animalType === 'breeding_sow' ? '2px solid var(--secondary-green)' : '1px solid var(--card-border)',
                background: animalType === 'breeding_sow' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.03)',
                color: animalType === 'breeding_sow' ? 'var(--secondary-green)' : '#9CA3AF',
                transition: 'all 0.2s ease',
              }}
            >
              🐖 Breeding Sow
            </button>
            <button
              type="button"
              onClick={() => setAnimalType('piglet')}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                border: animalType === 'piglet' ? '2px solid var(--secondary-green)' : '1px solid var(--card-border)',
                background: animalType === 'piglet' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.03)',
                color: animalType === 'piglet' ? 'var(--secondary-green)' : '#9CA3AF',
                transition: 'all 0.2s ease',
              }}
            >
              🐽 Piglet / Litter
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
            * Note: Market Ready pigs are separated/moved from piglets and not created here.
          </p>
        </div>

        {/* Server error alert */}
        {serverError && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
            {serverError}
          </div>
        )}

        {/* BREEDING SOW FORM */}
        {animalType === 'breeding_sow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid form-grid-2">
              <FormField label="Breed Status" htmlFor="sow-stage" required>
                <FormSelect
                  id="sow-stage"
                  value={breedingStage}
                  onChange={(e) => setBreedingStage(e.target.value as 'ready' | 'breeding' | 'not_yet')}
                  options={[
                    { value: 'ready', label: 'Ready for Breeding' },
                    { value: 'breeding', label: 'Currently Breeding' },
                    { value: 'not_yet', label: 'Not Yet Ready' },
                  ]}
                />
              </FormField>

              <FormField label="Assigned Pen" htmlFor="sow-pen" required>
                <FormSelect
                  id="sow-pen"
                  value={penId}
                  onChange={(e) => setPenId(e.target.value)}
                  options={penOptions}
                  placeholder="Select a pen"
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-2">
              <FormField label="Animal Code (Optional)" htmlFor="sow-code" hint="Leave blank to auto-generate based on animal count">
                <input
                  id="sow-code"
                  type="text"
                  value={animalCode}
                  onChange={(e) => setAnimalCode(e.target.value)}
                  className="form-input"
                  placeholder="Auto-generated if blank"
                />
              </FormField>

              <FormField label="Birth Date" htmlFor="sow-birth" required>
                <input
                  id="sow-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                  required
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-2">
              <FormField label="Health Status" htmlFor="sow-health">
                <FormSelect
                  id="sow-health"
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value as CreateAnimalRequest['health_status'])}
                  options={HEALTH_STATUSES.map((h) => ({ value: h, label: h.charAt(0).toUpperCase() + h.slice(1) }))}
                />
              </FormField>

              <FormField label="Weight (kg)" htmlFor="sow-weight">
                <input
                  id="sow-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight ?? ''}
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : undefined)}
                  className="form-input"
                  placeholder="Enter weight in kg"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* PIGLET FORM */}
        {animalType === 'piglet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid form-grid-2">
              <FormField label="From Which Sow?" htmlFor="piglet-mother" hint="Mother sow (Optional)">
                <FormSelect
                  id="piglet-mother"
                  value={motherId}
                  onChange={(e) => setMotherId(e.target.value)}
                  options={[{ value: '', label: 'Select mother sow (optional)' }, ...sowOptions]}
                />
              </FormField>

              <FormField label="Assigned Pen" htmlFor="piglet-pen" required>
                <FormSelect
                  id="piglet-pen"
                  value={penId}
                  onChange={(e) => setPenId(e.target.value)}
                  options={penOptions}
                  placeholder="Select a pen"
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-3">
              <FormField
                label="How many piglets?"
                htmlFor="piglet-qty"
                hint={availableCapacity !== undefined ? `Available pen capacity: ${availableCapacity}` : undefined}
                required
              >
                <input
                  id="piglet-qty"
                  type="number"
                  min="1"
                  max={availableCapacity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  className="form-input"
                  placeholder="Enter quantity"
                  required
                />
              </FormField>

              <FormField label="Male Count" htmlFor="piglet-male">
                <input
                  id="piglet-male"
                  type="number"
                  min="0"
                  max={typeof quantity === 'number' ? quantity : undefined}
                  value={maleCount}
                  onChange={(e) => setMaleCount(e.target.value ? Number(e.target.value) : '')}
                  className="form-input"
                  placeholder="Count"
                />
              </FormField>

              <FormField label="Female Count" htmlFor="piglet-female">
                <input
                  id="piglet-female"
                  type="number"
                  min="0"
                  max={typeof quantity === 'number' ? quantity : undefined}
                  value={femaleCount}
                  onChange={(e) => setFemaleCount(e.target.value ? Number(e.target.value) : '')}
                  className="form-input"
                  placeholder="Count"
                  style={
                    typeof quantity === 'number' && (Number(maleCount || 0) + Number(femaleCount || 0) > quantity)
                      ? { borderColor: 'var(--palette-blush)', background: 'var(--palette-rose)' }
                      : undefined
                  }
                />
              </FormField>
            </div>

            {typeof quantity === 'number' && quantity > 0 && (Number(maleCount || 0) + Number(femaleCount || 0) > quantity) && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--palette-rose)',
                border: '1.5px solid var(--palette-blush)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--neutral-dark)',
                fontSize: 12,
                fontWeight: 700,
              }}>
                ⚠️ Total male ({Number(maleCount || 0)}) and female ({Number(femaleCount || 0)}) count ({Number(maleCount || 0) + Number(femaleCount || 0)}) exceeds the total quantity of {quantity} piglets.
              </div>
            )}

            <div className="form-grid form-grid-2">
              <FormField label="Birth Date" htmlFor="piglet-birth" required>
                <input
                  id="piglet-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                  required
                />
              </FormField>

              <FormField label="Code Prefix / Name" htmlFor="piglet-code" hint="Leave blank to auto-generate based on animal count">
                <input
                  id="piglet-code"
                  type="text"
                  value={animalCode}
                  onChange={(e) => setAnimalCode(e.target.value)}
                  className="form-input"
                  placeholder="Auto-generated if blank"
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-2">
              <FormField label="Health Status" htmlFor="piglet-health">
                <FormSelect
                  id="piglet-health"
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value as CreateAnimalRequest['health_status'])}
                  options={HEALTH_STATUSES.map((h) => ({ value: h, label: h.charAt(0).toUpperCase() + h.slice(1) }))}
                />
              </FormField>

              <FormField label="Starting Weight (kg)" htmlFor="piglet-weight">
                <input
                  id="piglet-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight ?? ''}
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : undefined)}
                  className="form-input"
                  placeholder="Enter weight in kg"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* Notes */}
        <FormField label="Additional Notes" htmlFor="animal-notes">
          <input
            id="animal-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            placeholder="Observations, medical history, etc."
          />
        </FormField>
      </form>
    </Modal>
  );
}
