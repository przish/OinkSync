'use client';

import React, { useState } from 'react';
import { X, UserCheck, Shield } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { USER_ROLES, ROLE_LABELS } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import type { User, UserRole } from '@/types/database';

interface EditMemberModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMemberModal({ user, onClose, onSuccess }: EditMemberModalProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          role,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || 'Failed to update member');
      } else {
        toast.success('Member updated successfully!');
        onSuccess();
        onClose();
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal modal-sm animate-slide-up" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--secondary-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Edit Team Member</h3>
              <p style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Update permissions and contact information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-dark)', padding: 4 }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full Name */}
            <FormField label="Full Name" htmlFor="edit-name" required>
              <input
                id="edit-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                required
              />
            </FormField>

            {/* Email (Read only) */}
            <FormField label="Email" htmlFor="edit-email">
              <input
                id="edit-email"
                type="email"
                value={user.email}
                disabled
                className="form-input"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </FormField>

            {/* Phone */}
            <FormField label="Phone Number" htmlFor="edit-phone">
              <input
                id="edit-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="form-input"
                placeholder="+63 912 345 6789"
              />
            </FormField>

            {/* Role */}
            <FormField label="Role" htmlFor="edit-role" required>
              <FormSelect
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={USER_ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }))}
              />
            </FormField>

            {/* Status */}
            <FormField label="Account Status" htmlFor="edit-status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                  />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                  />
                  Inactive
                </label>
              </div>
            </FormField>
          </div>

          <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
