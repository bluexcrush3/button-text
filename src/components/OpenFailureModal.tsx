import React from 'react';
import { X, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { OPEN_FAILURE_PRESETS } from '../types';

interface OpenFailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset?: string | null;
  damageName?: string;
  onSelectPreset: (preset: string) => void;
  onClearPreset: () => void;
  onRemoveDamage?: () => void;
}

export const OpenFailureModal: React.FC<OpenFailureModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  damageName = '開閉不良',
  onSelectPreset,
  onClearPreset,
  onRemoveDamage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '440px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* ヘッダー */}
        <div
          className="modal-header"
          style={{
            padding: '14px 18px',
            borderBottom: '2px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#e11d48" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a' }}>
              {damageName} 損傷補足設定
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ボディ */}
        <div
          className="modal-body"
          style={{
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.4 }}>
            該当する開閉不良の症状・状態を選択してください（プリセットとして記録されます）：
          </div>

          {/* 9つの補足ボタン */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {OPEN_FAILURE_PRESETS.map((preset) => {
              const isSelected = currentPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectPreset(preset)}
                  style={{
                    height: '46px',
                    fontSize: '0.95rem',
                    fontWeight: isSelected ? 'bold' : '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && <Check size={16} />}
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>

          {currentPreset && (
            <div
              style={{
                marginTop: '4px',
                padding: '6px 10px',
                backgroundColor: '#eff6ff',
                borderRadius: '6px',
                fontSize: '0.82rem',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>現在選択中: <strong>{currentPreset}</strong></span>
              <button
                type="button"
                onClick={onClearPreset}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                補足を解除
              </button>
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            {onRemoveDamage && (
              <button
                type="button"
                onClick={onRemoveDamage}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                開閉不良を解除
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                borderRadius: '6px',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
