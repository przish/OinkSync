'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, PiggyBank, AlertTriangle, Heart } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { SkeletonCard } from '@/components/UI/Spinner';
import { PenList } from './components/PenList';
import { AnimalForm } from './components/AnimalForm';
import { AddPenModal } from '@/components/Forms/AddPenModal';
import { MovePigletModal } from './components/MovePigletModal';
import { EditAnimalModal } from './components/EditAnimalModal';
import { useInventory } from '@/lib/hooks/useInventory';
import { useToast, ToastContainer } from '@/components/UI/Toast';
import type { CreateAnimalRequest, PenWithAnimals } from '@/types/api';
import type { Animal } from '@/types/database';

export default function InventoryPage() {
  const { summary, pens, animals, isLoading, fetchAll, addAnimal } = useInventory();
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddPen, setShowAddPen] = useState(false);
  const [moveTargetPen, setMoveTargetPen] = useState<PenWithAnimals | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const { toasts, toast, remove } = useToast();

  const load = useCallback(() => fetchAll(), [fetchAll]);
  useEffect(() => { load(); }, [load]);

  const handleAddAnimal = async (data: CreateAnimalRequest) => {
    const result = await addAnimal(data);
    if (!result.error) {
      toast.success(data.quantity && data.quantity > 1 ? `${data.quantity} piglets added!` : 'Animal added!');
      load();
    } else {
      toast.error(result.error);
    }
    return result;
  };

  const sickAnimals = animals.filter((a) => a.health_status === 'sick' || a.health_status === 'recovering');

  return (
    <>
      <TopBar title="Inventory" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Summary cards */}
        <div className="grid-kpi">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {[
                { label: 'Total Active', value: summary?.total_active ?? 0, icon: <PiggyBank size={18} />, color: 'var(--secondary-green)' },
                { label: 'Breeding Sows', value: summary?.breeding_sows ?? 0, icon: <Heart size={18} />, color: '#C4A57B' },
                { label: 'Piglets', value: summary?.piglets ?? 0, icon: '🐷', color: 'var(--secondary-green)' },
                { label: 'Market Ready', value: summary?.market_ready ?? 0, icon: '📦', color: '#3B82F6' },
              ].map((item) => (
                <div key={item.label} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <p className="metric-label">{item.label}</p>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${item.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: typeof item.icon === 'string' ? 16 : undefined,
                      color: item.color,
                    }}>
                      {item.icon}
                    </div>
                  </div>
                  <p style={{ fontSize: 32, fontWeight: 800, color: item.color }}>{item.value}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Health alerts */}
        {sickAnimals.length > 0 && (
          <div className="alert-banner" style={{ borderLeftColor: 'var(--error)', background: 'linear-gradient(135deg, #fde8e8, #f5c6c6)' }}>
            <AlertTriangle size={20} color="var(--error)" />
            <div>
              <p style={{ fontWeight: 700 }}>{sickAnimals.length} animal{sickAnimals.length > 1 ? 's' : ''} need attention</p>
              <p className="text-small">{sickAnimals.filter(a => a.health_status === 'sick').length} sick · {sickAnimals.filter(a => a.health_status === 'recovering').length} recovering</p>
            </div>
          </div>
        )}

        {/* Pen List */}
        <Card>
          <CardHeader
            title="Pen Overview"
            subtitle={`${pens.length} pens total`}
            icon={<PiggyBank size={18} color="var(--secondary-green)" />}
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setShowAddPen(true)}
              >
                Add Pen
              </Button>
            }
          />
          {isLoading ? (
            <div className="grid-cards">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <PenList pens={pens} onMovePiglet={(pen) => setMoveTargetPen(pen)} />
          )}
        </Card>

        {/* Animals table */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>
              All Animals
              <span style={{ fontWeight: 400, color: 'var(--muted-dark)', fontSize: 13, marginLeft: 8 }}>
                ({animals.length} total)
              </span>
            </h3>
            <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddAnimal(true)}>
              Add Animal
            </Button>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Pen</th>
                  <th>Health</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🐷</div>
                        <p style={{ fontWeight: 600, marginTop: 8 }}>No animals yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  animals.slice(0, 50).map((animal) => (
                    <tr key={animal.id}>
                      <td style={{ fontWeight: 700 }}>{animal.animal_code ?? `#${animal.id.slice(0, 6)}`}</td>
                      <td style={{ textTransform: 'capitalize' }}>{animal.animal_type.replace('_', ' ')}</td>
                      <td style={{ color: 'var(--neutral-dark)', fontWeight: 600 }}>
                        {/* @ts-ignore - pen is populated from the API join */}
                        {animal.pen ? (animal.pen.pen_name || animal.pen.pen_number) : (animal.pen_id ? `${animal.pen_id.slice(0, 8)}...` : '—')}
                      </td>
                      <td><Badge variant={animal.health_status} /></td>
                      <td style={{ color: 'var(--neutral-dark)', fontWeight: 600 }}>{animal.current_weight ? `${animal.current_weight} kg` : '—'}</td>
                      <td><Badge variant={animal.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="outline-green"
                          size="sm"
                          onClick={() => setEditingAnimal(animal)}
                          style={{ padding: '4px 10px', fontSize: 12, height: 28 }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AnimalForm
        isOpen={showAddAnimal}
        onClose={() => setShowAddAnimal(false)}
        pens={pens}
        onSubmit={handleAddAnimal}
      />

      <AddPenModal
        isOpen={showAddPen}
        onClose={() => setShowAddPen(false)}
        onPenCreated={load}
        existingCount={pens.length}
      />

      <MovePigletModal
        isOpen={Boolean(moveTargetPen)}
        onClose={() => setMoveTargetPen(null)}
        targetPen={moveTargetPen}
        allAnimals={animals}
        onSuccess={load}
      />

      <EditAnimalModal
        isOpen={Boolean(editingAnimal)}
        onClose={() => setEditingAnimal(null)}
        animal={editingAnimal}
        pens={pens}
        onSuccess={load}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
}
