'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { RECEIPT_MAX_SIZE_MB, RECEIPT_ALLOWED_TYPES } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils/formatting';

interface FormFileUploadProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function FormFileUpload({ value, onChange, error }: FormFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = useCallback((file: File): string | null => {
    if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, WebP, and PDF files are allowed';
    }
    if (file.size > RECEIPT_MAX_SIZE_MB * 1024 * 1024) {
      return `File must be smaller than ${RECEIPT_MAX_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setLocalError(err); return; }
    setLocalError(null);
    onChange(file);
  }, [onChange, validate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isImage = value?.type.startsWith('image/');
  const displayError = error ?? localError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: 'rgba(45,80,22,0.05)',
          border: '1.5px solid var(--secondary-green)',
          borderRadius: 'var(--radius-md)',
        }}>
          {isImage ? <ImageIcon size={20} color="var(--secondary-green)" /> : <FileText size={20} color="var(--secondary-green)" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--font-body-small)', fontWeight: 600, color: 'var(--neutral-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value.name}
            </p>
            <p style={{ fontSize: 11, color: '#6B7280' }}>{formatFileSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`drop-zone${isDragging ? ' dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Upload receipt file"
        >
          <Upload size={24} color="var(--tertiary-gold)" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop your receipt here</p>
          <p style={{ fontSize: 'var(--font-body-small)', color: '#6B7280' }}>
            or <span style={{ color: 'var(--secondary-green)', fontWeight: 600 }}>click to browse</span>
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
            JPG, PNG, WebP, PDF · Max {RECEIPT_MAX_SIZE_MB}MB
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ALLOWED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {displayError && (
        <p style={{ fontSize: 'var(--font-body-small)', color: 'var(--error)' }}>{displayError}</p>
      )}
    </div>
  );
}
