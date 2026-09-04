'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X, Camera, Check, Clock, TrendingUp, DollarSign, User as UserIcon,
  Upload, AlertCircle, FileText, CheckCircle2, AlertTriangle, Edit2
} from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { ImageCropModal } from '@/components/UI/ImageCropModal';
import { formatCurrency } from '@/lib/utils/formatting';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';
import type { User } from '@/types/database';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated?: (updated: User) => void;
}

interface PendingInvestment {
  id: string;
  amount: number;
  receipt_url: string;
  created_at: string;
  status: string;
  description?: string;
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

  // 1x1 Avatar Cropping State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Investment Contribution State
  const [pendingInvest, setPendingInvest] = useState<PendingInvestment | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investReceipt, setInvestReceipt] = useState<File | null>(null);
  const [investConfirmed, setInvestConfirmed] = useState(false);
  const [isSubmittingInvest, setIsSubmittingInvest] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setNameInput(currentUser.full_name);
    }
  }, [currentUser]);

  const loadProfileAndInvestment = useCallback(() => {
    setIsLoading(true);
    fetch('/api/users/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProfile(json.data.profile);
          setNameInput(json.data.profile.full_name);
          if (json.data.metrics) {
            setMetrics(json.data.metrics);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // Fetch user's pending investment
    fetch('/api/users/investment')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.pending) {
          setPendingInvest(json.data.pending);
        } else {
          setPendingInvest(null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadProfileAndInvestment();
    }
  }, [isOpen, loadProfileAndInvestment]);

  // Calculate 14-day avatar cooldown
  const calculateCooldownDays = (): number => {
    if (!profile?.avatar_updated_at) return 0;
    const lastUpdate = new Date(profile.avatar_updated_at).getTime();
    const now = Date.now();
    const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    const remaining = 14 - diffDays;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  };

  const cooldownDays = calculateCooldownDays();

  // Calculate 24-hour investment edit countdown
  const getInvestmentTimeLeft = (): { canEdit: boolean; text: string } => {
    if (!pendingInvest) return { canEdit: true, text: '' };
    const createdAt = new Date(pendingInvest.created_at).getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const msRemaining = (createdAt + ONE_DAY_MS) - Date.now();

    if (msRemaining <= 0) {
      return { canEdit: false, text: 'Locked for GM review (1-2 business days)' };
    }

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    return { canEdit: true, text: `${hours}h ${mins}m left to edit` };
  };

  const investTime = getInvestmentTimeLeft();

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

  // 1x1 Avatar File Selection -> Triggers 1x1 Crop Modal
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (cooldownDays > 0) {
      toast.error(`You can only change your avatar every 14 days. Please wait ${cooldownDays} more day(s).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Cropped Image Blob Output
  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    const formData = new FormData();
    formData.append('file', croppedBlob, 'avatar.jpg');

    const toastId = toast.loading('Uploading 1:1 avatar...');
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
        toast.error(getErrorMessage(json.error, 'Failed to update profile image'), { id: toastId });
      } else {
        toast.success('Profile picture updated!', { id: toastId });
        setProfile(json.data);
        onProfileUpdated?.(json.data);
      }
    } catch {
      toast.error('Error uploading avatar', { id: toastId });
    }
  };

  // Handle Investment Submission with Receipt
  const handleSubmitInvestment = async () => {
    const numAmount = parseFloat(investAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid investment amount');
      return;
    }

    if (!investReceipt && !pendingInvest?.receipt_url) {
      toast.error('Please upload your proof of payment / receipt');
      return;
    }

    if (!investConfirmed) {
      toast.error('Please confirm that your receipt and information are correct');
      return;
    }

    setIsSubmittingInvest(true);
    const toastId = toast.loading('Submitting investment...');

    try {
      let receiptUrl = pendingInvest?.receipt_url || '';

      // Upload receipt if new file selected
      if (investReceipt) {
        const formData = new FormData();
        formData.append('file', investReceipt);
        const uploadRes = await fetch('/api/storage/receipt', {
          method: 'POST',
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          toast.error(getErrorMessage(uploadJson.error, 'Receipt upload failed'), { id: toastId });
          setIsSubmittingInvest(false);
          return;
        }
        receiptUrl = uploadJson.data?.url;
      }

      // Submit investment to API
      const res = await fetch('/api/users/investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          receipt_url: receiptUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(getErrorMessage(json.error, 'Failed to submit investment'), { id: toastId });
      } else {
        toast.success('Investment submitted for General Manager approval!', { id: toastId });
        setShowInvestModal(false);
        setInvestAmount('');
        setInvestReceipt(null);
        setInvestConfirmed(false);
        loadProfileAndInvestment();
      }
    } catch {
      toast.error('Error submitting investment', { id: toastId });
    } finally {
      setIsSubmittingInvest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(24, 43, 29, 0.45)',
          backdropFilter: 'blur(6px)',
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
          width: '460px',
          maxWidth: '100vw',
          background: 'var(--card-bg, #FFFFFF)',
          boxShadow: '-10px 0 40px rgba(24, 43, 29, 0.15)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          borderLeft: '1px solid var(--card-border)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--palette-cream)',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
            Member Profile
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              borderRadius: '50%',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Avatar & Profile Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '20px 16px',
              background: 'var(--palette-cream)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div style={{ position: 'relative', width: 92, height: 92, marginBottom: 12 }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--secondary-green)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'var(--palette-sage)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserIcon size={36} />}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
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
                  border: '2px solid white',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cooldownDays > 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                title={cooldownDays > 0 ? `Editable in ${cooldownDays} days` : 'Change profile picture (1x1 in-app crop)'}
              >
                <Camera size={15} />
              </button>
            </div>

            {cooldownDays > 0 ? (
              <p style={{ fontSize: 11, color: 'var(--muted-dark)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <Clock size={12} /> Profile picture editable in {cooldownDays} day{cooldownDays > 1 ? 's' : ''}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--muted-dark)', marginBottom: 12 }}>
                Click camera to update photo (In-app 1:1 resize included)
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
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
                  {profile?.full_name || 'User'}
                </h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-green)',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  Edit
                </button>
              </div>
            )}

            <p style={{ fontSize: 13, color: 'var(--muted-dark)', marginTop: 4 }}>{profile?.email}</p>
            <div style={{ marginTop: 8 }}>
              <Badge variant={profile?.role || 'admin'}>
                {profile?.role ? ROLE_LABELS[profile.role] : 'Member'}
              </Badge>
            </div>
          </div>

          {/* User's Farm Dashboard Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--secondary-green)" />
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
                Your Farm Dashboard
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Total Investment Card */}
              <div
                style={{
                  padding: '16px',
                  background: 'var(--palette-rose)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 207, 207, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#883333', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <DollarSign size={14} />
                  Total Investment
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-dark)' }}>
                  {formatCurrency(metrics.total_investment)}
                </div>
                <div style={{ fontSize: 11, color: '#6B4444' }}>Approved capital stake</div>
              </div>

              {/* Total Profit Card */}
              <div
                style={{
                  padding: '16px',
                  background: 'var(--palette-blush)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(235, 175, 175, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#883333', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <TrendingUp size={14} />
                  Total Profit
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-dark)' }}>
                  {formatCurrency(metrics.total_profit)}
                </div>
                <div style={{ fontSize: 11, color: '#6B4444' }}>Work + investor dividend</div>
              </div>
            </div>
          </div>

          {/* Dedicated Investment Contribution & Editing Card */}
          <div
            style={{
              padding: '18px 20px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
                  Investment Contribution
                </h4>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 2 }}>
                  Submit or adjust your investment with proof receipt
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Edit2 size={13} />}
                onClick={() => {
                  setInvestAmount(pendingInvest ? String(pendingInvest.amount) : '');
                  setShowInvestModal(true);
                }}
                disabled={Boolean(pendingInvest && !investTime.canEdit)}
              >
                {pendingInvest ? 'Edit Submission' : '+ Add Investment'}
              </Button>
            </div>

            {/* Pending Investment Status Banner */}
            {pendingInvest ? (
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(234, 179, 8, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#854D0E', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} /> Pending General Admin Approval
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#854D0E' }}>
                    {formatCurrency(pendingInvest.amount)}
                  </span>
                </div>

                <p style={{ fontSize: 11, color: '#854D0E' }}>
                  {investTime.text}
                </p>

                {pendingInvest.receipt_url && (
                  <a
                    href={pendingInvest.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: 'var(--secondary-green)', textDecoration: 'underline', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <FileText size={12} /> View Uploaded Receipt
                  </a>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px', background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--muted-dark)' }}>
                No pending adjustments. Investments must include an uploaded receipt and require General Admin approval before reflecting on the farm dashboard.
              </div>
            )}
          </div>
        </div>

        {/* Investment Submission Modal */}
        {showInvestModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(5px)',
              zIndex: 10010,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-xl)',
                width: '100%',
                maxWidth: 420,
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
                  {pendingInvest ? 'Edit Investment Submission' : 'Submit Investment Contribution'}
                </h3>
                <button
                  onClick={() => setShowInvestModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Strict Policy Notice */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: 12,
                  color: '#991B1B',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>STRICT SUBMISSION POLICY:</strong> You have <strong>one (1) day (24 hours)</strong> to edit or update the information and files you provide.
                  After 24 hours, submissions are locked and require 1-2 business days for General Manager review.
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="invest-amt">Investment Amount (PHP)</label>
                <input
                  id="invest-amt"
                  type="number"
                  step="100"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 50000"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                />
              </div>

              {/* Receipt File Upload */}
              <div className="form-group">
                <label className="form-label">Proof of Payment / Receipt (Required)</label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setInvestReceipt(f);
                  }}
                />

                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  style={{
                    padding: '12px',
                    border: '1.5px dashed var(--card-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--palette-cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--neutral-dark)',
                    fontWeight: 600,
                  }}
                >
                  <Upload size={16} color="var(--secondary-green)" />
                  {investReceipt
                    ? investReceipt.name
                    : pendingInvest?.receipt_url
                    ? 'Receipt already attached (Click to change)'
                    : 'Upload Payment Receipt'}
                </button>
              </div>

              {/* Confirmation Checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--neutral-dark)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={investConfirmed}
                  onChange={(e) => setInvestConfirmed(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--secondary-green)' }}
                />
                <span>I confirm that the receipt and amount provided are accurate and complete.</span>
              </label>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Button variant="ghost" size="sm" onClick={() => setShowInvestModal(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 size={14} />}
                  onClick={handleSubmitInvestment}
                  isLoading={isSubmittingInvest}
                  disabled={!investConfirmed || (!investReceipt && !pendingInvest?.receipt_url)}
                  style={{ flex: 1 }}
                >
                  Submit for Approval
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 1x1 Crop Modal */}
        {cropImageSrc && (
          <ImageCropModal
            isOpen={showCropModal}
            imageSrc={cropImageSrc}
            onClose={() => setShowCropModal(false)}
            onCropComplete={handleCropComplete}
          />
        )}

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
