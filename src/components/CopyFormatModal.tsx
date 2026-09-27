import React from 'react';
import { Copy, X } from 'lucide-react';

interface CopyFormatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFormat: (delimiter: '\t' | ';') => void;
}

export const CopyFormatModal: React.FC<CopyFormatModalProps> = ({
    isOpen,
    onClose,
    onSelectFormat,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Copy size={20} />
                        コピー形式の選択
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
                    <p style={{ fontSize: '0.9rem', color: '#444' }}>
                        クリップボードにコピーする区切り文字の形式を選択してください。
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        <button
                            type="button"
                            className="selected"
                            onClick={() => onSelectFormat('\t')}
                            style={{
                                padding: '12px 14px',
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                textAlign: 'left',
                                width: '100%',
                            }}
                        >
                            <span>TAB区切り</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.85 }}>
                                （Excel / Googleスプレッドシート貼り付け用）
                            </span>
                        </button>

                        <button
                            type="button"
                            className="btn"
                            onClick={() => onSelectFormat(';')}
                            style={{
                                padding: '12px 14px',
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                textAlign: 'left',
                                width: '100%',
                                backgroundColor: '#f8f9fa',
                                borderColor: 'var(--border-color)',
                            }}
                        >
                            <span>セミコロン（ ; ）区切り</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666' }}>
                                （テキストデータ・CSV用途）
                            </span>
                        </button>
                    </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '4px' }}>
                    <button type="button" onClick={onClose}>
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
};
