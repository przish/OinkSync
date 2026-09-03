'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { SkeletonRow } from '@/components/UI/Spinner';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { InviteMemberModal } from '@/components/Forms/InviteMemberModal';
import { EditMemberModal } from '@/components/Forms/EditMemberModal';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils/formatting';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import type { User } from '@/types/database';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/invite');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading('Deleting user...');

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to delete user', { id: toastId });
      } else {
        toast.success('User deleted successfully', { id: toastId });
        setUserToDelete(null);
        fetchUsers();
      }
    } catch {
      toast.error('Error deleting user', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'logistics', 'pen_manager', 'investor']}>
      <TopBar title="Team Members" />

      <div className="page-body">
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--neutral-dark)' }}>
                All Team Members
                <span style={{ fontWeight: 400, color: '#4B5563', fontSize: 13, marginLeft: 8 }}>({users.length})</span>
              </h3>
              {!isAdmin && (
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: '2px 0 0' }}>
                  Directory view (Admin permissions required for member management)
                </p>
              )}
            </div>

            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={15} />}
                onClick={() => setShowInviteModal(true)}
              >
                Invite Member
              </Button>
            )}
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
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6}>
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
                            background: 'var(--palette-sage)',
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
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit size={12} />}
                              onClick={() => setEditingUser(user)}
                            >
                              Edit
                            </Button>
                            {currentUser?.id !== user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Trash2 size={12} color="var(--error)" />}
                                onClick={() => setUserToDelete(user)}
                                style={{ color: 'var(--error)' }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 10050,
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
              maxWidth: 400,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(186, 60, 60, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--error)',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
                  Delete Team Member
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: '2px 0 0' }}>
                  This action permanently removes the user
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--neutral-dark)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to delete <strong>{userToDelete.full_name}</strong> ({userToDelete.email})?
              Their login credentials and permissions will be revoked immediately.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserToDelete(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={13} />}
                onClick={handleDeleteUser}
                isLoading={isDeleting}
                style={{ flex: 1 }}
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}

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
