'use client';

import React from 'react';
import Link from 'next/link';
import { PiggyBank, AlertTriangle, Activity, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { formatDate } from '@/lib/utils/formatting';
import type { PenWithAnimals } from '@/types/api';

interface PenListProps {
  pens: PenWithAnimals[];
  onMovePiglet?: (pen: PenWithAnimals) => void;
}

export function PenList({ pens, onMovePiglet }: PenListProps) {
  if (pens.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><PiggyBank size={28} color="#4B5563" /></div>
        <p style={{ fontWeight: 600, marginTop: 8 }}>No pens found</p>
        <p className="text-small text-muted">Add pens to get started</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-4)',
      }}
    >
      {pens.map((pen) => {
        const pct = pen.occupancy_percentage ?? 0;
        const barClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : '';
        const isFull = (pen.current_count ?? 0) >= pen.capacity;

        return (
          <div key={pen.id} className="pen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--neutral-dark)' }}>
                    Pen {pen.pen_number}
                  </p>
                  {pen.pen_name && (
                    <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 2, fontWeight: 600 }}>{pen.pen_name}</p>
                  )}
                </div>
                <Badge variant={(pen.current_count ?? 0) > 0 ? 'active' : 'inactive'} />
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                <div>
                  <p className="metric-label" style={{ marginBottom: 3 }}>Animals</p>
                  <p style={{ fontWeight: 800, fontSize: 22, color: 'var(--secondary-green)' }}>
                    {pen.current_count}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted-dark)' }}> / {pen.capacity}</span>
                  </p>
                </div>
                {pen.location && (
                  <div>
                    <p className="metric-label" style={{ marginBottom: 3 }}>Location</p>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--neutral-dark)' }}>{pen.location}</p>
                  </div>
                )}
              </div>

              {/* Occupancy bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-dark)', fontWeight: 600 }}>Occupancy</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 90 ? 'var(--error)' : 'var(--secondary-green)' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="occupancy-bar">
                  <div
                    className={`occupancy-fill${barClass ? ` ${barClass}` : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {pen.last_cleaned_date && (
                <p style={{ fontSize: 11, color: 'var(--muted-dark)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                  <Activity size={11} />
                  Last cleaned: {formatDate(pen.last_cleaned_date)}
                </p>
              )}
            </div>

            {/* Move a piglet here button */}
            <Button
              variant="outline-green"
              size="sm"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => onMovePiglet?.(pen)}
              disabled={isFull}
              leftIcon={<ArrowRightLeft size={13} />}
            >
              {isFull ? 'Pen Full' : 'Move a piglet here'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
