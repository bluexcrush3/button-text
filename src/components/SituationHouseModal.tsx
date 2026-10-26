import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Home, Delete, Plus, Minus } from 'lucide-react';

interface SituationHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSituationText?: string;
  onConfirm: (formattedText: string) => void;
  onClear: () => void;
}

export const SituationHouseModal: React.FC<SituationHouseModalProps> = ({
  isOpen,
  onClose,
  currentSituationText,
  onConfirm,
  onClear,
}) => {
  const [inputNumber, setInputNumber] = useState<string>('');

  // 状況テキストから数字部分を抽出
  const extractNumber = (text?: string): string => {
    if (!text) return '';
    const match = text.match(/家屋№\.(\d+)より撮影/);
    if (match) {
      // 01 -> 1 などの数値文字列、またはそのまま
      const n = parseInt(match[1], 10);
      return isNaN(n) ? match[1] : String(n);
    }
    return '';
  };

  useEffect(() => {
    if (isOpen) {
      setInputNumber(extractNumber(currentSituationText));
    }
  }, [isOpen, currentSituationText]);

  if (!isOpen) return null;

  // ゼロパディングなし（例: 1 -> 家屋№.1より撮影、3 -> 家屋№.3より撮影）
  const formatResultText = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) {
      return '家屋№.より撮影';
    }
    const n = parseInt(trimmed, 10);
    const numStr = isNaN(n) ? trimmed : `${n}`;
    return `家屋№.${numStr}より撮影`;
  };

  const previewText = formatResultText(inputNumber);

  // テンキー押下ハンドラー
  const handleKeyClick = (key: string) => {
    if (key === 'C') {
      setInputNumber('');
    } else if (key === 'BS') {
      setInputNumber((prev) => prev.slice(0, -1));
    } else {
      setInputNumber((prev) => {
        // 最大4桁までに制限
        if (prev.length >= 4) return prev;
        return `${prev}${key}`;
      });
    }
  };

  // ステッパー増減
  const handleStep = (delta: number) => {
    const current = parseInt(inputNumber, 10) || 0;
    const next = Math.max(1, current + delta);
    setInputNumber(String(next));
  };

  const handleConfirm = () => {
    onConfirm(previewText);
    onClose();
  };

  const handleClearClick = () => {
    onClear();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '380px',
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
            padding: '12px 16px',
            borderBottom: '2px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Home size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a' }}>
              家屋番号入力
            </h3>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              padding: '6px',
              borderRadius: '6px',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ボディ */}
        <div
          className="modal-body"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* プレビュー表示 */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              反映テキストプレビュー
            </div>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 'bold',
                color: '#1d4ed8',
                letterSpacing: '0.5px',
              }}
            >
              {previewText}
            </div>
          </div>

          {/* 入力欄 & ステッパー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleStep(-1)}
              style={{
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
            >
              <Minus size={18} />
            </button>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="stepper-input"
              placeholder="家屋番号 (例: 1, 3)"
              value={inputNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setInputNumber(val.slice(0, 4));
              }}
              style={{
                flex: 1,
                height: '42px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '8px',
              }}
              autoFocus
            />

            <button
              type="button"
              className="btn"
              onClick={() => handleStep(1)}
              style={{
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* テンキー（ワンタップで入力可能） */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                className="btn"
                onClick={() => handleKeyClick(digit)}
                style={{
                  height: '42px',
                  fontSize: '1.15rem',
                  fontWeight: 'bold',
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() => handleKeyClick('C')}
              style={{
                height: '42px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                color: '#dc2626',
              }}
            >
              クリア
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleKeyClick('0')}
              style={{
                height: '42px',
                fontSize: '1.15rem',
                fontWeight: 'bold',
              }}
            >
              0
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleKeyClick('BS')}
              style={{
                height: '42px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="1文字削除"
            >
              <Delete size={18} />
            </button>
          </div>
        </div>

        {/* フッター */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 16px',
            borderTop: '2px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#f8fafc',
          }}
        >
          {currentSituationText && currentSituationText.startsWith('家屋№.') ? (
            <button
              type="button"
              className="btn"
              onClick={handleClearClick}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={14} />
              選択解除
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                color: '#64748b',
              }}
            >
              キャンセル
            </button>
          )}

          <button
            type="button"
            className="btn selected"
            onClick={handleConfirm}
            style={{
              padding: '8px 24px',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              borderColor: '#1d4ed8',
              color: '#ffffff',
            }}
          >
            <Check size={16} />
            決定
          </button>
        </div>
      </div>
    </div>
  );
};
