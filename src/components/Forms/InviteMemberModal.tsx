'use client';

import React, { useState } from 'react';
import { X, Mail, Key, Check, Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { userSchema, type UserFormValues } from '@/lib/utils/zod-schemas';
import { USER_ROLES, ROLE_LABELS } from '@/lib/constants';

interface InviteMemberModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ onClose, onSuccess }: InviteMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

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
    if (!customPassword.trim()) {
      toast.error('Please provide an initial password for this member.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, password: customPassword.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message || 'Failed to invite team member');
      } else {
        toast.success('Team member created successfully!');
        setCreatedCredentials({
          email: data.email,
          password: json.data?.initial_password || customPassword,
        });
        onSuccess();
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const loginUrl = `${origin}/auth/login`;
    const text = `PiggyTrack (Farm OS) Invitation\n\nYou have been invited to join PiggyTrack. Access the system using the official website link:\n\nOfficial Website Link: ${loginUrl}\nEmail: ${createdCredentials.email}\nInitial Password: ${createdCredentials.password}\n\nPlease check your email inbox (including your Spam or Junk folder) so you can receive the official website link and updates.\n\nIf you did not request this account creation, please ignore it.`;
    navigator.clipboard.writeText(text);
    toast.success('Invitation credentials copied to clipboard!');
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !createdCredentials) onClose(); }}
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
              {createdCredentials ? <Check size={18} color="white" /> : <Mail size={18} color="white" />}
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>
                {createdCredentials ? 'Account Ready' : 'Invite Member'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-dark)' }}>
                {createdCredentials ? 'Share these credentials with the new member' : 'Add a new member to your farm'}
              </p>
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

        {createdCredentials ? (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                padding: '16px 20px',
                background: 'var(--palette-cream)',
                border: '1.5px solid var(--palette-sage)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--secondary-green)', margin: 0 }}>
                Account created and invitation email triggered!
              </p>

              <div style={{ fontSize: 13, background: '#fff', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--neutral-dark)' }}>
                <div>
                  <strong>Official Website Link:</strong>{' '}
                  <a
                    href={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--secondary-green)', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    {typeof window !== 'undefined' ? window.location.origin : ''}/auth/login
                  </a>
                </div>
                <div><strong>Email:</strong> {createdCredentials.email}</div>
                <div><strong>Initial Password:</strong> {createdCredentials.password}</div>
              </div>

              <div style={{
                fontSize: 12,
                color: 'var(--neutral-dark)',
                lineHeight: 1.5,
                background: 'var(--palette-rose)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--palette-blush)',
              }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  ✉️ Note for Invited Member:
                </p>
                <p style={{ margin: '4px 0 0' }}>
                  Please prompt the user to check their email (including <strong>Spam / Junk</strong> folder) so they can receive the official website link.
                </p>
                <p style={{ margin: '6px 0 0', fontStyle: 'italic', color: 'var(--muted-dark)' }}>
                  If they did not request this account creation, please ask them to ignore it.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={copyCredentials} leftIcon={<Copy size={15} />}>
                Copy Invitation
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
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

              {/* Password */}
              <FormField label="Initial Password" htmlFor="password" hint="Default is provided; they will use this to sign in">
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter initial password"
                    required
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--secondary-green)',
                    }}
                  >
                    <Key size={16} />
                  </div>
                </div>
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
                  options={USER_ROLES.map((role) => ({ label: ROLE_LABELS[role], value: role }))}
                  {...register('role')}
                />
              </FormField>

              <div style={{
                fontSize: 12,
                color: 'var(--neutral-dark)',
                lineHeight: 1.5,
                background: 'var(--palette-cream)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--card-border)',
              }}>
                <strong>Tip:</strong> An invitation email containing the workspace access link will be delivered directly to this address.
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {isSubmitting ? 'Creating User...' : 'Create & Invite Member'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
