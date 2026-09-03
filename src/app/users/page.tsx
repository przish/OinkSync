'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { SkeletonRow } from '@/components/UI/Spinner';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils/formatting';
import { InviteMemberModal } from '@/components/Forms/InviteMemberModal';
import { EditMemberModal } from '@/components/Forms/EditMemberModal';
import type { User } from '@/types/database';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    setUsers((data as unknown as User[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <ProtectedRoute allowedRoles={['admin', 'logistics', 'pen_manager', 'investor']}>
      <TopBar title="Team Members" />

      <div className="page-body">
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>
              All Team Members
              <span style={{ fontWeight: 400, color: '#4B5563', fontSize: 13, marginLeft: 8 }}>({users.length})</span>
            </h3>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={() => setShowInviteModal(true)}
            >
              Invite Member
            </Button>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><Users size={28} color="#4B5563" /></div>
                        <p style={{ fontWeight: 600, marginTop: 8 }}>No team members</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--secondary-green), #3d6b1f)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                          }}>
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{user.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#4B5563', fontSize: 13 }}>{user.email}</td>
                      <td><Badge variant={user.role}>{ROLE_LABELS[user.role]}</Badge></td>
                      <td style={{ color: '#4B5563', fontSize: 13 }}>{user.phone_number ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`status-dot${user.is_active ? ' green' : ' gray'}`} />
                          <span style={{ fontSize: 12, color: user.is_active ? 'var(--success)' : '#4B5563' }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#4B5563', fontSize: 13 }}>{formatDate(user.created_at)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
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

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditMemberModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </ProtectedRoute>
  );
}
