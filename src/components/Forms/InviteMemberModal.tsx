'use client';

import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { userSchema, type UserFormValues } from '@/lib/utils/zod-schemas';
import { USER_ROLES, ROLE_LABELS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

interface InviteMemberModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ onClose, onSuccess }: InviteMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'logistics',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      // In a real application, this would call an API route to use the Supabase Admin API
      // For this demo, we'll simulate the invite process or insert directly into the users table
      // (which requires RLS or service role, but we'll show a toast for UX).
      
      const { error } = await supabase.from('users').insert({
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        phone_number: data.phone_number || null,
        is_active: true,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Team member invited successfully!');
        onSuccess();
      }
    } catch (e) {
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
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--secondary-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Invite Member</h3>
              <p style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Add a new user to your farm</p>
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

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full Name */}
            <FormField label="Full Name" htmlFor="full_name" error={errors.full_name?.message} required>
              <input
                id="full_name"
                type="text"
                placeholder="John Doe"
                className={`form-input${errors.full_name ? ' error' : ''}`}
                {...register('full_name')}
              />
            </FormField>

            {/* Email */}
            <FormField label="Email Address" htmlFor="email" error={errors.email?.message} required>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                className={`form-input${errors.email ? ' error' : ''}`}
                {...register('email')}
              />
            </FormField>

            {/* Phone */}
            <FormField label="Phone Number" htmlFor="phone_number" error={errors.phone_number?.message}>
              <input
                id="phone_number"
                type="tel"
                placeholder="+63 912 345 6789"
                className={`form-input${errors.phone_number ? ' error' : ''}`}
                {...register('phone_number')}
              />
            </FormField>

            {/* Role */}
            <FormField label="Role" htmlFor="role" error={errors.role?.message} required>
              <FormSelect
                id="role"
                className={`form-select${errors.role ? ' error' : ''}`}
                options={USER_ROLES.map(role => ({ label: ROLE_LABELS[role], value: role }))}
                {...register('role')}
              />
            </FormField>

          </div>

          <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
