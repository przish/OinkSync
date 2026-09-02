'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { SkeletonRow } from '@/components/UI/Spinner';
import { LogForm } from './components/LogForm';
import { usePenLogs } from '@/lib/hooks/usePenLogs';
import { useInventory } from '@/lib/hooks/useInventory';
import { useToast, ToastContainer } from '@/components/UI/Toast';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatting';
import type { PenLogFormValues } from '@/lib/utils/zod-schemas';

export default function PenLogsPage() {
  const { logs, pagination, isLoading, fetchLogs, addLog } = usePenLogs();
  const { pens, fetchPens } = useInventory();
  const { toasts, toast, remove } = useToast();
  const [showAddLog, setShowAddLog] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    fetchLogs({ page, limit: 20 });
    fetchPens();
  }, [fetchLogs, fetchPens, page]);

  useEffect(() => { load(); }, [load]);

  const handleAddLog = async (data: PenLogFormValues) => {
    const result = await addLog({
      pen_id: data.pen_id,
      log_date: data.log_date,
      feed_type: data.feed_type,
      feed_amount_kg: data.feed_amount_kg,
      water_provided: data.water_provided,
      health_observations: data.health_observations,
      cleaning_status: data.cleaning_status ?? undefined,
      cleanliness_score: data.cleanliness_score ?? undefined,
      animals_died: data.animals_died,
      animals_sick: data.animals_sick,
      mortality_cause: data.mortality_cause,
      general_notes: data.general_notes,
      issues_reported: data.issues_reported,
    });
    if (!result.error) { toast.success('Log saved!'); load(); }
    else toast.error(result.error ?? 'Failed to save log');
    return result;
  };

  return (
    <>
      <TopBar
        title="Pen Logs"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddLog(true)}>
            Add Log
          </Button>
        }
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>Daily Pen Logs</h3>
              {pagination && (
                <p style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{pagination.total} total logs</p>
              )}
            </div>
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pen</th>
                  <th>Feed</th>
                  <th>Died</th>
                  <th>Sick</th>
                  <th>Cleaning</th>
                  <th>Issues</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><ClipboardList size={28} color="#4B5563" /></div>
                        <p style={{ fontWeight: 600, marginTop: 8 }}>No logs yet</p>
                        <p className="text-small text-muted">Add daily pen logs to track farm activity</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(log.log_date)}</p>
                        <p style={{ fontSize: 11, color: '#4B5563' }}>{formatRelativeTime(log.created_at)}</p>
                      </td>
                      <td style={{ fontWeight: 600 }}>Pen {log.pen?.pen_number ?? '—'}</td>
                      <td style={{ color: '#4B5563' }}>{log.feed_amount_kg} kg</td>
                      <td>
                        {log.animals_died > 0
                          ? <span style={{ fontWeight: 700, color: 'var(--error)' }}>{log.animals_died}</span>
                          : <span style={{ color: '#4B5563' }}>0</span>
                        }
                      </td>
                      <td>
                        {log.animals_sick > 0
                          ? <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{log.animals_sick}</span>
                          : <span style={{ color: '#4B5563' }}>0</span>
                        }
                      </td>
                      <td>
                        {log.cleaning_status
                          ? <Badge variant={log.cleaning_status === 'cleaned' ? 'approved' : log.cleaning_status === 'not_cleaned' ? 'rejected' : 'pending'}>
                              {log.cleaning_status.replace('_', ' ')}
                            </Badge>
                          : <span style={{ color: '#4B5563' }}>—</span>
                        }
                      </td>
                      <td>
                        {log.issues_reported
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>
                              <AlertTriangle size={12} /> Yes
                            </span>
                          : <span style={{ color: '#4B5563', fontSize: 12 }}>No</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: '#4B5563' }}>{log.logged_by?.full_name ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={!pagination.has_prev} onClick={() => setPage(p => p - 1)}>‹</button>
              <span style={{ fontSize: 13, color: '#4B5563', padding: '0 12px' }}>Page {page} of {pagination.total_pages}</span>
              <button className="page-btn" disabled={!pagination.has_next} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </Card>
      </div>

      <LogForm
        isOpen={showAddLog}
        onClose={() => setShowAddLog(false)}
        pens={pens}
        onSubmit={handleAddLog}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
}
