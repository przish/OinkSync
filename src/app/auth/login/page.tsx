'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, PiggyBank } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { loginSchema, type LoginFormValues } from '@/lib/utils/zod-schemas';
import { FormField } from '@/components/Forms/FormField';
import { Button } from '@/components/UI/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    const { error } = await login(data.email, data.password);
    if (error) {
      setServerError('Invalid email or password. Please try again.');
    } else {
      router.replace('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0d1a05 0%, #1a2e0a 50%, #2D5016 100%)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', color: 'white',
      }} className="login-brand-panel">
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, var(--tertiary-gold), #d4b890)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, marginBottom: 24,
          boxShadow: '0 20px 40px rgba(196,165,123,0.3)',
        }}>
          🐷
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>
          PiggyTrack
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
          The complete financial operating system for modern pig farm operations.
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16, marginTop: 48, width: '100%', maxWidth: 400,
        }}>
          {[
            { label: 'Track Capital', value: '₱', icon: '💰' },
            { label: 'Manage Inventory', value: '🐷', icon: '📋' },
            { label: 'View Analytics', value: '📊', icon: '📈' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '16px 12px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'white',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--neutral-dark)', marginBottom: 8 }}>
              Welcome back 👋
            </h2>
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              Sign in to access your farm dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <FormField label="Email Address" htmlFor="email" error={errors.email?.message} required>
              <input
                id="email"
                type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
            </FormField>

            <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#9CA3AF',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>

            {serverError && (
              <div className="alert-banner" style={{ borderLeftColor: 'var(--error)', background: 'linear-gradient(135deg, #fde8e8, #f5c6c6)' }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              style={{ width: '100%', marginTop: 4 }}
            >
              Sign In to PiggyTrack
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#9CA3AF' }}>
            Contact your administrator to get access
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
