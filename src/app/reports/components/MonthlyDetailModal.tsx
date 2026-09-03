'use client';

import React, { useState } from 'react';
import { X, ArrowLeft, Download, FileText, TrendingUp, TrendingDown, Image as ImageIcon, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { formatCurrency, formatPercentage, formatDate, formatMonthYear } from '@/lib/utils/formatting';

interface ReceiptItem {
  id: string;
  url: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

interface TransactionItem {
  id: string;
  transaction_date: string;
  description: string;
  category: string;
  transaction_type: string;
  amount: number;
  status: string;
  receipt_url?: string;
}

interface MonthlyDetailData {
  month: string;
  analytics: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    roi_percentage: number;
    animals_sold: number;
  };
  transactions: TransactionItem[];
  receipts: ReceiptItem[];
}

interface MonthlyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MonthlyDetailData | null;
  isLoading: boolean;
}

export function MonthlyDetailModal({
  isOpen,
  onClose,
  data,
  isLoading,
}: MonthlyDetailModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const txRows = (data.transactions || []).map((tx) => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${formatDate(tx.transaction_date)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${tx.description}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${tx.category}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-transform: uppercase;">${tx.transaction_type}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${tx.transaction_type === 'income' ? '#166534' : '#991B1B'}">
          ${tx.transaction_type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Report — ${formatMonthYear(data.month)}</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #182B1D; }
            h1 { font-size: 22px; color: #3D5C40; margin-bottom: 4px; }
            .kpi-grid { display: flex; gap: 16px; margin: 20px 0; }
            .kpi-box { flex: 1; padding: 12px; background: #FFFDEC; border: 1px solid #86A788; border-radius: 8px; }
            .kpi-label { font-size: 11px; text-transform: uppercase; color: #666; }
            .kpi-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background: #86A788; color: white; text-align: left; padding: 8px 10px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Monthly Financial Statement — ${formatMonthYear(data.month)}</h1>
          <p style="font-size: 12px; color: #666;">OinkSync Farm Operations</p>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-label">Revenue</div>
              <div class="kpi-val" style="color: #166534;">${formatCurrency(data.analytics.total_revenue)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Expenses</div>
              <div class="kpi-val" style="color: #991B1B;">${formatCurrency(data.analytics.total_expenses)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Net Profit</div>
              <div class="kpi-val" style="color: ${data.analytics.net_profit >= 0 ? '#166534' : '#991B1B'};">
                ${formatCurrency(data.analytics.net_profit)}
              </div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">ROI</div>
              <div class="kpi-val">${formatPercentage(data.analytics.roi_percentage)}</div>
            </div>
          </div>

          <h2 style="font-size: 15px; margin-top: 24px;">Itemized Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txRows || '<tr><td colspan="5" style="text-align: center; padding: 12px;">No transactions recorded</td></tr>'}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24, 43, 29, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 10030,
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
          maxWidth: 820,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Header with Back Navigation */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--palette-cream)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                background: 'white',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--neutral-dark)',
              }}
            >
              <ArrowLeft size={15} /> Back to Reports
            </button>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
                {data ? formatMonthYear(data.month) : 'Monthly Report'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: 0 }}>
                Comprehensive Financial Statement & Receipts
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadPDF}
              disabled={!data}
            >
              Download PDF
            </Button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isLoading || !data ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-dark)' }}>
              Loading comprehensive report...
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div style={{ padding: 14, background: 'rgba(42, 104, 48, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(42, 104, 48, 0.2)' }}>
                  <p className="metric-label" style={{ color: 'var(--success)' }}>Total Revenue</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                    {formatCurrency(data.analytics.total_revenue)}
                  </p>
                </div>

                <div style={{ padding: 14, background: 'rgba(186, 60, 60, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(186, 60, 60, 0.2)' }}>
                  <p className="metric-label" style={{ color: 'var(--error)' }}>Total Expenses</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--error)', marginTop: 4 }}>
                    {formatCurrency(data.analytics.total_expenses)}
                  </p>
                </div>

                <div style={{
                  padding: 14,
                  background: data.analytics.net_profit >= 0 ? 'var(--palette-rose)' : 'rgba(186, 60, 60, 0.1)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 207, 207, 0.9)',
                }}>
                  <p className="metric-label" style={{ color: '#883333' }}>Net Profit</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-dark)', marginTop: 4 }}>
                    {formatCurrency(data.analytics.net_profit)}
                  </p>
                </div>

                <div style={{ padding: 14, background: 'var(--palette-blush)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(235, 175, 175, 0.8)' }}>
                  <p className="metric-label" style={{ color: '#883333' }}>Monthly ROI</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-dark)', marginTop: 4 }}>
                    {formatPercentage(data.analytics.roi_percentage)}
                  </p>
                </div>
              </div>

              {/* Uploaded Receipts Gallery */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={16} color="var(--secondary-green)" />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
                    Uploaded Receipts for {formatMonthYear(data.month)} ({data.receipts?.length || 0})
                  </h4>
                </div>

                {data.receipts && data.receipts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                    {data.receipts.map((rcpt) => (
                      <div
                        key={rcpt.id}
                        onClick={() => setSelectedReceipt(rcpt.url)}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--card-border)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: 'white',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ height: 110, background: '#F3F4F6', position: 'relative' }}>
                          <img
                            src={rcpt.url}
                            alt={rcpt.description || 'Receipt'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ padding: '8px 10px', fontSize: 11 }}>
                          <p style={{ fontWeight: 700, margin: 0, color: 'var(--neutral-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rcpt.description || rcpt.category}
                          </p>
                          <p style={{ color: 'var(--secondary-green)', fontWeight: 800, margin: '2px 0 0' }}>
                            {formatCurrency(rcpt.amount)}
                          </p>
                          <p style={{ color: 'var(--muted-dark)', fontSize: 10, margin: '2px 0 0' }}>
                            {formatDate(rcpt.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--muted-dark)' }}>
                    No receipts were attached to transactions during this month.
                  </div>
                )}
              </div>

              {/* Itemized Transactions Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="var(--secondary-green)" />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--neutral-dark)' }}>
                    Itemized Month Transactions ({data.transactions?.length || 0})
                  </h4>
                </div>

                <div className="table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions && data.transactions.length > 0 ? (
                        data.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td style={{ fontWeight: 600 }}>{formatDate(tx.transaction_date)}</td>
                            <td>{tx.description}</td>
                            <td>{tx.category}</td>
                            <td>
                              <span style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                color: tx.transaction_type === 'income' ? 'var(--success)' : 'var(--error)',
                              }}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td style={{
                              textAlign: 'right',
                              fontWeight: 800,
                              color: tx.transaction_type === 'income' ? 'var(--success)' : 'var(--error)',
                            }}>
                              {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                            <td>
                              {tx.receipt_url ? (
                                <button
                                  onClick={() => setSelectedReceipt(tx.receipt_url || '')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-green)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, textDecoration: 'underline' }}
                                >
                                  <ExternalLink size={12} /> View
                                </button>
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: 11 }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--muted-dark)' }}>
                            No transactions recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Receipt Full Preview Lightbox */}
        {selectedReceipt && (
          <div
            onClick={() => setSelectedReceipt(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              zIndex: 10040,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 12,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  position: 'absolute',
                  top: -14,
                  right: -14,
                  background: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
              <img
                src={selectedReceipt}
                alt="Receipt Full Preview"
                style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
