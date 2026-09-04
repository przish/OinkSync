'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({
  isOpen,
  onSuccess,
}: ForcePasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please retype carefully.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Updating your password...');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(getErrorMessage(error, 'Failed to update password'), { id: toastId });
      } else {
        toast.success('Password updated successfully! Please remember your new password.', { id: toastId, duration: 6000 });
        onSuccess();
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred while updating your password.');
      toast.error(getErrorMessage(err, 'Failed to update password'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot dismiss without changing password
      title="Create Your New Password"
      footer={
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          style={{ width: '100%', fontWeight: 700 }}
        >
          Set Password & Continue
        </Button>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          padding: '14px 16px',
          background: 'var(--palette-rose)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--palette-blush)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <Lock size={20} color="var(--neutral-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: 'var(--neutral-dark)', lineHeight: 1.5 }}>
            <p style={{ fontWeight: 800, margin: '0 0 2px' }}>Security Notice: Temporary Password</p>
            <p style={{ margin: 0 }}>
              You logged in using an initial temporary password. For security, please set a new personal password and <strong>remember it</strong> for all future logins.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--palette-rose)',
            border: '1.5px solid var(--palette-blush)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--neutral-dark)',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {errorMsg}
          </div>
        )}

        <FormField label="New Password (min. 6 characters)" htmlFor="force-new-password" required>
          <div style={{ position: 'relative' }}>
            <input
              id="force-new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--muted-dark)',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <FormField label="Confirm New Password" htmlFor="force-confirm-password" required>
          <input
            id="force-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            required
          />
        </FormField>

        <div style={{
          padding: '10px 14px',
          background: 'var(--palette-cream)',
          border: '1px solid var(--palette-sage)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          color: 'var(--neutral-dark)',
        }}>
          💡 <strong>Reminder:</strong> Make sure to remember or save your new password safely.
        </div>
      </form>
    </Modal>
  );
}
