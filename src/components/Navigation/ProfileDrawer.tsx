'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, Check, Clock, TrendingUp, DollarSign, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { formatCurrency } from '@/lib/utils/formatting';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import type { User } from '@/types/database';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated?: (updated: User) => void;
}

export function ProfileDrawer({ isOpen, onClose, currentUser, onProfileUpdated }: ProfileDrawerProps) {
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [metrics, setMetrics] = useState<{ total_investment: number; total_profit: number }>({
    total_investment: 0,
    total_profit: 0,
  });
  const [nameInput, setNameInput] = useState(currentUser?.full_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setNameInput(currentUser.full_name);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/users/profile')
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setProfile(json.data.profile);
            setNameInput(json.data.profile.full_name);
            setMetrics(json.data.metrics);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 14-day avatar check
  const getAvatarCooldownDays = () => {
    if (!profile?.avatar_updated_at) return 0;
    const last = new Date(profile.avatar_updated_at).getTime();
    const now = Date.now();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    if (diffDays < 14) return Math.ceil(14 - diffDays);
    return 0;
  };

  const cooldownDays = getAvatarCooldownDays();

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: nameInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || 'Failed to update name');
      } else {
        toast.success('Display name updated!');
        setProfile(json.data);
        setIsEditingName(false);
        onProfileUpdated?.(json.data);
      }
    } catch {
      toast.error('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (cooldownDays > 0) {
      toast.error(`You can only change your avatar every 14 days. Please wait ${cooldownDays} more day(s).`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading avatar...');
    try {
      const uploadRes = await fetch('/api/storage/receipt', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        toast.error(uploadJson.error?.message || 'Upload failed', { id: toastId });
        return;
      }

      const avatarUrl = uploadJson.data?.url;
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || 'Failed to update profile image', { id: toastId });
      } else {
        toast.success('Profile picture updated!', { id: toastId });
        setProfile(json.data);
        onProfileUpdated?.(json.data);
      }
    } catch {
      toast.error('Error uploading avatar', { id: toastId });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Slide-over Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50vw',
          minWidth: 360,
          maxWidth: 620,
          background: 'var(--card-bg, #1a2517)',
          borderLeft: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserIcon size={20} color="var(--secondary-green)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Member Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', width: 36, height: 36 }}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>
          {/* Avatar & Display Name Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--card-border, rgba(255,255,255,0.06))',
            }}
          >
            {/* Avatar with Upload button */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: profile?.avatar_url
                    ? `url(${profile.avatar_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, var(--secondary-green), #3d6b1f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 36,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {!profile?.avatar_url && (profile?.full_name?.charAt(0).toUpperCase() || 'U')}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={cooldownDays > 0}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: cooldownDays > 0 ? '#4B5563' : 'var(--secondary-green)',
                  border: '2px solid var(--card-bg)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cooldownDays > 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                title={cooldownDays > 0 ? `Editable in ${cooldownDays} days` : 'Change profile picture'}
              >
                <Camera size={15} />
              </button>
            </div>

            {cooldownDays > 0 ? (
              <p style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <Clock size={12} /> Profile picture editable in {cooldownDays} day{cooldownDays > 1 ? 's' : ''}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
                Click camera to update photo (Can change once every 14 days)
              </p>
            )}

            {/* Editable Display Name */}
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 300 }}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="form-input"
                  style={{ textAlign: 'center', fontWeight: 700 }}
                  autoFocus
                />
                <Button size="sm" variant="primary" onClick={handleSaveName} isLoading={isSaving}>
                  <Check size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{profile?.full_name || 'User'}</h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-green)',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Edit
                </button>
              </div>
            )}

            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{profile?.email}</p>
            <div style={{ marginTop: 8 }}>
              <Badge variant={profile?.role || 'admin'}>
                {profile?.role ? ROLE_LABELS[profile.role] : 'Member'}
              </Badge>
            </div>
          </div>

          {/* User's Personal Dashboard Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--secondary-green)" />
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Your Farm Dashboard</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Total Investment Card */}
              <div
                style={{
                  padding: '18px 20px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--card-border, rgba(255,255,255,0.06))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 12, fontWeight: 600 }}>
                  <DollarSign size={14} color="var(--secondary-green)" />
                  TOTAL INVESTMENT
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--neutral-dark, #fff)' }}>
                  {formatCurrency(metrics.total_investment)}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Your recorded capital stake</div>
              </div>

              {/* Total Profit Card */}
              <div
                style={{
                  padding: '18px 20px',
                  background: 'rgba(52, 211, 153, 0.08)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399', fontSize: 12, fontWeight: 600 }}>
                  <TrendingUp size={14} />
                  TOTAL PROFIT
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#34D399' }}>
                  {formatCurrency(metrics.total_profit)}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Calculated earnings / payout</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 768px) {
            aside { width: 100vw !important; min-width: 100vw !important; }
          }
        `}</style>
      </aside>
    </>
  );
}
