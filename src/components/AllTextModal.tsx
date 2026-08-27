import React, { useState } from 'react';
import { LineData, CustomButtonConfig } from '../types';
import { generateLineText, generateLineTextForSpreadsheet } from '../utils/textGenerator';
import { FileText, Copy, Check, X } from 'lucide-react';

interface AllTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: LineData[];
  houseNumber: number;
  currentLineIndex?: number;
  onNavigateToLine?: (index: number) => void;
  customButtons?: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] };
}

export const AllTextModal: React.FC<AllTextModalProps> = ({
  isOpen,
  onClose,
  lines,
  houseNumber,
  currentLineIndex,
  onNavigateToLine,
  customButtons = [],
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 全行のテキストリストを生成
  const lineTexts = lines.map((line) => generateLineText(line.selection, customButtons));
  const fullText = lineTexts.filter((t) => t.trim().length > 0).join('\n');

  const handleCopy = async () => {
    try {
      const copyText = lines
        .map((line) => generateLineTextForSpreadsheet(line.selection, customButtons))
        .filter((t) => t.trim().length > 0)
        .join('\n');
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleLineClick = (index: number) => {
    if (onNavigateToLine) {
      onNavigateToLine(index);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            生成文字列 確認（家屋 #{houseNumber}）
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '4px 8px', border: 'none', background: 'none' }}
          >
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            全 {lines.length} 行のデータ一覧です。行をタップするとそのページに飛べます。
          </p>

          <div
            style={{
              backgroundColor: '#f8f9fa',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px',
              minHeight: '160px',
              maxHeight: '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {lines.map((line, idx) => {
              const text = lineTexts[idx];
              const isCurrent = idx === currentLineIndex;

              return (
                <div
                  key={line.id || idx}
                  onClick={() => handleLineClick(idx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: isCurrent ? '2px solid #0d6efd' : '1px solid #ddd',
                    backgroundColor: isCurrent ? '#eef6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: isCurrent ? '#0d6efd' : '#666',
                      minWidth: '40px',
                      flexShrink: 0,
                    }}
                  >
                    行 {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: text ? 'bold' : 'normal',
                      color: text ? '#111' : '#aaa',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {text || '（未選択）'}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        backgroundColor: '#0d6efd',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      編集中
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            閉じる
          </button>
          <button
            type="button"
            className="selected"
            onClick={handleCopy}
            disabled={!fullText}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'コピーしました！' : '全テキストをコピー'}
          </button>
        </div>
      </div>
    </div>
  );
};
