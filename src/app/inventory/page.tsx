'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, PiggyBank, AlertTriangle, Heart } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { SkeletonCard, SkeletonRow } from '@/components/UI/Spinner';
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
  const totalCapacity = pens.reduce((acc, p) => acc + (p.capacity || 0), 0);
  const totalAnimalsInPens = pens.reduce((acc, p) => acc + (p.current_count || 0), 0);
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalAnimalsInPens / totalCapacity) * 100) : 0;

  return (
    <>
      <TopBar title="Inventory" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* KPI Cards */}
        <div className="grid-kpi">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <Card>
                <CardHeader title="Total Pigs" subtitle="All active animals" icon={<PiggyBank size={18} color="var(--secondary-green)" />} />
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary-green)', marginTop: 8 }}>
                  {summary?.total_active ?? animals.length}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 4 }}>
                  {summary?.breeding_sows ?? 0} sows &bull; {summary?.piglets ?? 0} piglets
                </p>
              </Card>

              <Card>
                <CardHeader title="Active Pens" subtitle="Pens with animals" icon={<PiggyBank size={18} color="var(--secondary-green)" />} />
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary-green)', marginTop: 8 }}>
                  {pens.filter((p) => (p.current_count ?? 0) > 0).length} / {pens.length}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 4 }}>
                  Overall {overallOccupancy}% capacity
                </p>
              </Card>

              <Card>
                <CardHeader title="Sick / Recovering" subtitle="Needs attention" icon={<Heart size={18} color="var(--error)" />} />
                <p style={{ fontSize: 28, fontWeight: 800, color: sickAnimals.length > 0 ? 'var(--error)' : 'var(--secondary-green)', marginTop: 8 }}>
                  {sickAnimals.length}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 4 }}>
                  {sickAnimals.length === 0 ? 'All animals healthy' : `${sickAnimals.length} require care`}
                </p>
              </Card>

              <Card>
                <CardHeader title="Market Ready" subtitle="Ready for harvest/sale" icon={<AlertTriangle size={18} color="var(--secondary-green)" />} />
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary-green)', marginTop: 8 }}>
                  {summary?.market_ready ?? 0}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 4 }}>
                  Fatteners reaching market weight
                </p>
              </Card>
            </>
          )}
        </div>

        {/* Pens Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>Pens & Facilities</h2>
              <p style={{ fontSize: 13, color: 'var(--muted-dark)', margin: '2px 0 0' }}>
                Monitor pen assignments, capacity limits, and move piglets between pens
              </p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddPen(true)}>
              Add Pen
            </Button>
          </div>

          <PenList
            pens={pens}
            onMovePiglet={(pen) => setMoveTargetPen(pen)}
          />
        </div>

        {/* All Animals Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
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
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Gender</th>
                  <th>Pen</th>
                  <th>Health</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={8} />)
                ) : animals.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
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
                      <td>
                        {animal.gender ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 12,
                            fontWeight: 600,
                            background: animal.gender === 'male' ? 'rgba(134, 167, 136, 0.18)' : 'rgba(255, 207, 207, 0.5)',
                            color: 'var(--neutral-dark)',
                          }}>
                            {animal.gender === 'male' ? '♂ Male' : '♀ Female'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-dark)' }}>—</span>
                        )}
                      </td>
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
        pens={pens}
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
