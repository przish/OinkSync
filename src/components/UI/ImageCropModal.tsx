'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (blob: Blob) => void;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const VIEWPORT_SIZE = 260; // 1x1 preview size in pixels

  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImgElement(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
  }, [imageSrc, isOpen]);

  // Render 1x1 crop preview onto preview canvas
  useEffect(() => {
    if (!imgElement || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Calculate scaling to fill the 1x1 square
    const minScale = Math.max(VIEWPORT_SIZE / imgElement.width, VIEWPORT_SIZE / imgElement.height);
    const scale = minScale * zoom;

    const scaledWidth = imgElement.width * scale;
    const scaledHeight = imgElement.height * scale;

    const centerX = (VIEWPORT_SIZE - scaledWidth) / 2 + offset.x;
    const centerY = (VIEWPORT_SIZE - scaledHeight) / 2 + offset.y;

    ctx.drawImage(imgElement, centerX, centerY, scaledWidth, scaledHeight);
  }, [imgElement, zoom, offset]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate 1x1 Output Blob (400x400 square)
  const handleApply = () => {
    if (!imgElement) return;

    const outputCanvas = document.createElement('canvas');
    const OUTPUT_SIZE = 400;
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    const minScale = Math.max(OUTPUT_SIZE / imgElement.width, OUTPUT_SIZE / imgElement.height);
    const scale = minScale * zoom;

    const scaledWidth = imgElement.width * scale;
    const scaledHeight = imgElement.height * scale;

    // Proportionate offset for output size
    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const centerX = (OUTPUT_SIZE - scaledWidth) / 2 + offset.x * ratio;
    const centerY = (OUTPUT_SIZE - scaledHeight) / 2 + offset.y * ratio;

    ctx.drawImage(imgElement, centerX, centerY, scaledWidth, scaledHeight);

    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 10005,
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
          maxWidth: 380,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
              Crop to 1:1 Square
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: '2px 0 0' }}>
              Drag to position & adjust zoom for your profile
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1x1 Crop Box */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: VIEWPORT_SIZE,
            height: VIEWPORT_SIZE,
            borderRadius: '50%', // Circle guide mask
            overflow: 'hidden',
            boxShadow: '0 0 0 3px var(--secondary-green), 0 8px 24px rgba(0,0,0,0.15)',
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'relative',
            background: '#1F2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Zoom Slider Controls */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ZoomOut size={16} color="var(--muted-dark)" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--secondary-green)' }}
          />
          <ZoomIn size={16} color="var(--muted-dark)" />
          <button
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
            title="Reset position"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-dark)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 6 }}>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check size={14} />}
            onClick={handleApply}
            style={{ flex: 1 }}
          >
            Apply & Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
