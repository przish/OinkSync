'use client';

import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, Layers, CheckSquare } from 'lucide-react';
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
  const [transferMode, setTransferMode] = useState<'quantity' | 'specific'>('quantity');
  const [sourcePenId, setSourcePenId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group active animals by pen
  const movableAnimals = useMemo(() => {
    if (!targetPen) return [];
    return allAnimals.filter((a) => a.status === 'active' && a.pen_id !== targetPen.id);
  }, [allAnimals, targetPen]);

  // Pens with active animals (excluding target pen)
  const sourcePens = useMemo(() => {
    const penMap = new Map<string, { id: string; name: string; animals: Animal[] }>();
    movableAnimals.forEach((a) => {
      const pId = a.pen_id || 'unassigned';
      // @ts-ignore
      const pName = a.pen?.pen_name || a.pen?.pen_number || (a.pen_id ? `Pen ${a.pen_id.slice(0, 6)}` : 'Unassigned');
      if (!penMap.has(pId)) {
        penMap.set(pId, { id: pId, name: pName, animals: [] });
      }
      penMap.get(pId)!.animals.push(a);
    });
    return Array.from(penMap.values());
  }, [movableAnimals]);

  // Animals in selected source pen
  const animalsInSourcePen = useMemo(() => {
    if (!sourcePenId) return movableAnimals;
    return movableAnimals.filter((a) => a.pen_id === sourcePenId);
  }, [movableAnimals, sourcePenId]);

  const availableCapacity = targetPen ? Math.max(0, targetPen.capacity - (targetPen.current_count ?? 0)) : 0;
  const maxPossibleQuantity = Math.min(availableCapacity, animalsInSourcePen.length);

  if (!isOpen || !targetPen) return null;

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();

    let idsToMove: string[] = [];

    if (transferMode === 'quantity') {
      if (animalsInSourcePen.length === 0) {
        toast.error('No animals available in the selected source pen.');
        return;
      }
      const numToMove = Math.min(quantity, animalsInSourcePen.length, availableCapacity);
      if (numToMove <= 0) {
        toast.error('Please specify a valid quantity of animals to move.');
        return;
      }
      idsToMove = animalsInSourcePen.slice(0, numToMove).map((a) => a.id);
    } else {
      if (selectedAnimalIds.length === 0) {
        toast.error('Please select at least one animal to move.');
        return;
      }
      if (selectedAnimalIds.length > availableCapacity) {
        toast.error(`Cannot move ${selectedAnimalIds.length} animals. Only ${availableCapacity} slots available.`);
        return;
      }
      idsToMove = selectedAnimalIds;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Moving ${idsToMove.length} animal(s)...`);

    try {
      const results = await Promise.all(
        idsToMove.map((id) =>
          fetch(`/api/inventory/animals/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pen_id: targetPen.id }),
          }).then((r) => r.json())
        )
      );

      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast.error('Some animals could not be moved. Please refresh.', { id: toastId });
      } else {
        toast.success(
          `Successfully moved ${idsToMove.length} piglet(s) to ${targetPen.pen_name || targetPen.pen_number}!`,
          { id: toastId }
        );
        setSelectedAnimalIds([]);
        setQuantity(1);
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error moving animals'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectAnimal = (id: string) => {
    setSelectedAnimalIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= availableCapacity) {
        toast.error(`Cannot select more than ${availableCapacity} animals.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Piglets to ${targetPen.pen_name || targetPen.pen_number}`}
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
            {transferMode === 'quantity'
              ? `Confirm Move (${Math.min(quantity, maxPossibleQuantity)} Piglets)`
              : `Confirm Move (${selectedAnimalIds.length} Piglets)`}
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
          <>
            {/* Transfer Mode Switcher */}
            <div style={{ display: 'flex', gap: 8, background: 'var(--palette-cream)', padding: 4, borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setTransferMode('quantity')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: transferMode === 'quantity' ? 'var(--palette-sage)' : 'transparent',
                  color: transferMode === 'quantity' ? 'var(--palette-cream)' : 'var(--neutral-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Layers size={14} />
                By Quantity / Batch
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('specific')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: transferMode === 'specific' ? 'var(--palette-sage)' : 'transparent',
                  color: transferMode === 'specific' ? 'var(--palette-cream)' : 'var(--neutral-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <CheckSquare size={14} />
                Select Specific Animals
              </button>
            </div>

            {transferMode === 'quantity' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField label="Move From Source Pen" htmlFor="source-pen" required>
                  <FormSelect
                    id="source-pen"
                    value={sourcePenId}
                    onChange={(e) => {
                      setSourcePenId(e.target.value);
                      setQuantity(1);
                    }}
                    options={[
                      { value: '', label: `All other pens (${movableAnimals.length} total animals)` },
                      ...sourcePens.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.animals.length} animals available)`,
                      })),
                    ]}
                  />
                </FormField>

                <FormField
                  label="How Many Piglets to Move?"
                  htmlFor="move-quantity"
                  required
                  hint={`Available in source: ${animalsInSourcePen.length} | Available slots in target: ${availableCapacity}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--card-border)',
                        background: 'var(--palette-cream)',
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <input
                      id="move-quantity"
                      type="number"
                      min="1"
                      max={maxPossibleQuantity || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(maxPossibleQuantity || 1, parseInt(e.target.value) || 1)))}
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxPossibleQuantity, q + 1))}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--card-border)',
                        background: 'var(--palette-cream)',
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                </FormField>

                <div style={{
                  padding: '10px 14px',
                  background: 'var(--palette-cream)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--neutral-dark)',
                  border: '1px solid var(--card-border)',
                }}>
                  Moving <strong>{Math.min(quantity, maxPossibleQuantity)}</strong> animal(s) into{' '}
                  <strong>{targetPen.pen_name || targetPen.pen_number}</strong>.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--neutral-dark)' }}>
                    Selected: {selectedAnimalIds.length} / {availableCapacity} max
                  </span>
                  {selectedAnimalIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAnimalIds([])}
                      style={{ background: 'none', border: 'none', color: 'var(--secondary-green)', cursor: 'pointer', fontSize: 12, fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                <div style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--palette-cream)',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  {movableAnimals.map((a) => {
                    const isSelected = selectedAnimalIds.includes(a.id);
                    const code = a.animal_code || `#${a.id.slice(0, 6)}`;
                    const weightStr = a.current_weight ? `${a.current_weight} kg` : '';
                    return (
                      <label
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--palette-rose)' : '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                          border: isSelected ? '1px solid var(--palette-sage)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectAnimal(a.id)}
                            style={{ accentColor: 'var(--secondary-green)' }}
                          />
                          <span style={{ fontWeight: 700 }}>{code}</span>
                          <span style={{ textTransform: 'capitalize', color: 'var(--muted-dark)' }}>{a.animal_type.replace('_', ' ')}</span>
                          {a.gender && (
                            <span style={{ fontSize: 11, color: 'var(--muted-dark)' }}>
                              ({a.gender === 'male' ? '♂' : '♀'})
                            </span>
                          )}
                        </div>
                        {weightStr && <span style={{ fontWeight: 600 }}>{weightStr}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}

