'use client';

import React from 'react';
import Link from 'next/link';
import { PiggyBank, AlertTriangle, Activity } from 'lucide-react';
import { Badge } from '@/components/UI/Badge';
import { formatDate } from '@/lib/utils/formatting';
import type { PenWithAnimals } from '@/types/api';

interface PenListProps {
  pens: PenWithAnimals[];
}

export function PenList({ pens }: PenListProps) {
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
    <div className="grid-cards">
      {pens.map((pen) => {
        const pct = pen.occupancy_percentage ?? 0;
        const barClass = pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : '';

        return (
          <div key={pen.id} className="pen-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--neutral-dark)' }}>
                  Pen {pen.pen_number}
                </p>
                {pen.pen_name && (
                  <p style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{pen.pen_name}</p>
                )}
              </div>
              <Badge variant={pen.status} />
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <div>
                <p className="metric-label" style={{ marginBottom: 3 }}>Animals</p>
                <p style={{ fontWeight: 800, fontSize: 22, color: 'var(--secondary-green)' }}>
                  {pen.current_count}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#4B5563' }}> / {pen.capacity}</span>
                </p>
              </div>
              {pen.location && (
                <div>
                  <p className="metric-label" style={{ marginBottom: 3 }}>Location</p>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{pen.location}</p>
                </div>
              )}
            </div>

            {/* Occupancy bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#4B5563', fontWeight: 600 }}>Occupancy</span>
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
              <p style={{ fontSize: 11, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Activity size={11} />
                Last cleaned: {formatDate(pen.last_cleaned_date)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
