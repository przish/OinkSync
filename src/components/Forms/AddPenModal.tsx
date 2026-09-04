'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, PiggyBank, AlertCircle } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';
import type { PenWithAnimals } from '@/types/api';

interface AddPenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPenCreated: () => void;
  existingCount: number;
  pens?: PenWithAnimals[];
}

export function AddPenModal({
  isOpen,
  onClose,
  onPenCreated,
  existingCount,
  pens = [],
}: AddPenModalProps) {
  const [penNumber, setPenNumber] = useState('');
  const [penName, setPenName] = useState('');
  const [capacity, setCapacity] = useState('15');
  const [location, setLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      let nextNum = existingCount + 1;
      if (pens && pens.length > 0) {
        const highest = pens.reduce((max, p) => {
          const match = p.pen_number.match(/\d+/);
          if (match) {
            const val = parseInt(match[0], 10);
            return val > max ? val : max;
          }
          return max;
        }, 0);
        nextNum = Math.max(existingCount + 1, highest + 1);
      }
      setPenNumber(`PEN-${String(nextNum).padStart(3, '0')}`);
      setPenName('');
      setCapacity('15');
      setLocation('');
    }
  }, [isOpen, existingCount, pens]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!penNumber.trim()) {
      setErrorMessage('Pen number / ID is required.');
      return;
    }
    const capNum = parseInt(capacity, 10);
    if (!capNum || capNum <= 0) {
      setErrorMessage('Valid pen capacity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Adding new pen...');

    try {
      const res = await fetch('/api/inventory/pens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pen_number: penNumber.trim().toUpperCase(),
          pen_name: penName.trim() || `Pen ${penNumber.trim().toUpperCase()}`,
          capacity: capNum,
          location: location.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const msg = getErrorMessage(json.error, 'Failed to add pen');
        setErrorMessage(msg);
        toast.error(msg, { id: toastId });
      } else {
        toast.success('Pen added successfully!', { id: toastId });
        onPenCreated();
        onClose();
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Error adding pen');
      setErrorMessage(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24, 43, 29, 0.5)',
        backdropFilter: 'blur(5px)',
        zIndex: 10020,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #FFFFFF)',
          borderRadius: 'var(--radius-xl, 24px)',
          width: '100%',
          maxWidth: 440,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'var(--palette-cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PiggyBank size={20} color="var(--secondary-green)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
              Add New Pen
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: 0 }}>
          Create an additional pen to accommodate farm upscaling and increased herd capacity.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <FormField label="Pen Number / Identifier" htmlFor="pen-num" required>
              <input
                id="pen-num"
                type="text"
                className="form-input"
                value={penNumber}
                onChange={(e) => setPenNumber(e.target.value)}
                placeholder="e.g. PEN-006"
                required
              />
            </FormField>
          </div>

          <div className="form-group">
            <FormField label="Pen Name / Purpose" htmlFor="pen-name">
              <input
                id="pen-name"
                type="text"
                className="form-input"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                placeholder="e.g. Nursery Pen 2 or Grower Pen"
              />
            </FormField>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <FormField label="Max Capacity (Heads)" htmlFor="pen-cap" required>
                <input
                  id="pen-cap"
                  type="number"
                  min="1"
                  className="form-input"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="15"
                  required
                />
              </FormField>
            </div>

            <div className="form-group">
              <FormField label="Location / Section" htmlFor="pen-loc">
                <input
                  id="pen-loc"
                  type="text"
                  className="form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. East Wing"
                />
              </FormField>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--error)',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button variant="ghost" size="sm" type="button" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              leftIcon={<Plus size={15} />}
              isLoading={isSubmitting}
              style={{ flex: 1 }}
            >
              Add Pen
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
