'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginFormValues } from '@/lib/utils/zod-schemas';
import { FormField } from '@/components/Forms/FormField';
import { Button } from '@/components/UI/Button';

export default function LoginPage() {
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

  // Call Supabase directly — no hook dependency that could re-render-loop
  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        setServerError('Invalid email or password. Please try again.');
      } else {
        // MUST use full-page navigation, not router.replace().
        // router.replace does a client-side RSC fetch that doesn't carry
        // the freshly-set Supabase auth cookies to the server, so middleware
        // sees unauthenticated and bounces back to /auth/login.
        window.location.assign('/dashboard');
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--palette-cream)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--palette-sage)',
        color: 'var(--palette-cream)',
      }} className="login-brand-panel">
        <div style={{
          width: 88, height: 88, borderRadius: 28,
          background: 'var(--palette-cream)',
          border: '2.5px solid var(--palette-blush)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, marginBottom: 24,
          boxShadow: 'var(--shadow-md)',
        }}>
          🐷
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, textAlign: 'center', color: 'var(--palette-cream)' }}>
          OinkSync
        </h1>
        <p style={{ fontSize: 16, color: 'var(--palette-cream)', opacity: 0.95, textAlign: 'center', maxWidth: 340, lineHeight: 1.7, fontWeight: 500 }}>
          The complete financial operating system for modern pig farm operations.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16, marginTop: 44, width: '100%', maxWidth: 420,
        }}>
          {[
            { label: 'Track Capital', icon: '💰' },
            { label: 'Manage Inventory', icon: '📋' },
            { label: 'View Analytics', icon: '📈' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(255, 253, 236, 0.16)',
              borderRadius: 14, padding: '16px 12px',
              textAlign: 'center',
              border: '1.5px solid rgba(255, 253, 236, 0.35)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{stat.icon}</div>
              <p style={{ fontSize: 12, color: 'var(--palette-cream)', fontWeight: 700, lineHeight: 1.4 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--palette-cream)',
        borderLeft: '1.5px solid var(--palette-blush)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--neutral-dark)', marginBottom: 8 }}>
              Welcome back 👋
            </h2>
            <p style={{ color: 'var(--muted-dark)', fontSize: 14, fontWeight: 500 }}>
              Sign in to access your farm dashboard
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            method="post"
            action="#"
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            noValidate
          >
            <FormField label="Email Address" htmlFor="login-email" error={errors.email?.message} required>
              <input
                id="login-email"
                type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                style={{ background: 'var(--palette-cream)', color: 'var(--neutral-dark)' }}
                {...register('email')}
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password" error={errors.password?.message} required>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 40, background: 'var(--palette-cream)', color: 'var(--neutral-dark)' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--muted-dark)',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>

            {serverError && (
              <div style={{
                background: 'var(--palette-rose)',
                borderLeft: '4px solid var(--palette-blush)',
                borderRadius: 10,
                padding: '12px 16px',
              }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-dark)' }}>{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              style={{ width: '100%', marginTop: 4, fontWeight: 700 }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to OinkSync'}
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--muted-dark)', fontWeight: 500 }}>
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
