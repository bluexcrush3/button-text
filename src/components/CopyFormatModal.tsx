import React, { useState, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { CopyNumberOptions } from '../utils/textGenerator';

export const ALPHABET_OPTIONS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export type CopyFormatType = '\t' | ';' | 'spreadsheet_optimized';

interface CopyFormatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFormat: (format: CopyFormatType, options: CopyNumberOptions) => void;
    initialStartNo?: number;
    initialStartInclination?: string;
    initialInsertGenkyo?: boolean;
    initialInsertAllGenba?: boolean;
}

export const CopyFormatModal: React.FC<CopyFormatModalProps> = ({
    isOpen,
    onClose,
    onSelectFormat,
    initialStartNo = 1,
    initialStartInclination = 'A',
    initialInsertGenkyo = false,
    initialInsertAllGenba = false,
}) => {
    const [startNo, setStartNo] = useState<string>(String(initialStartNo));
    const [startInclination, setStartInclination] = useState<string>(initialStartInclination);
    const [insertGenkyo, setInsertGenkyo] = useState<boolean>(initialInsertGenkyo);
    const [insertAllGenba, setInsertAllGenba] = useState<boolean>(initialInsertAllGenba);

    useEffect(() => {
        if (isOpen) {
            setStartNo(String(initialStartNo));
            setStartInclination(initialStartInclination);
            setInsertGenkyo(initialInsertGenkyo);
            setInsertAllGenba(initialInsertAllGenba);
        }
    }, [isOpen, initialStartNo, initialStartInclination, initialInsertGenkyo, initialInsertAllGenba]);

    if (!isOpen) return null;

    const handleSelect = (format: CopyFormatType) => {
        const parsedNo = Math.max(1, parseInt(startNo, 10) || 1);
        onSelectFormat(format, {
            startNo: parsedNo,
            startInclination: startInclination || 'A',
            insertGenkyo,
            insertAllGenba,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div
                    className="modal-header"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '12px',
                        paddingBottom: '12px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.15rem' }}>
                            <Copy size={20} color="#0d6efd" />
                            コピー形式の選択
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* 開始番号・傾斜点設定エリア */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            gap: '12px',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* No. 開始番号 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label
                                htmlFor="copy-start-no-input"
                                style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', whiteSpace: 'nowrap' }}
                            >
                                No.開始:
                            </label>
                            <input
                                id="copy-start-no-input"
                                type="number"
                                min={1}
                                value={startNo}
                                onChange={(e) => setStartNo(e.target.value)}
                                style={{
                                    width: '64px',
                                    height: '32px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    border: '1.5px solid #94a3b8',
                                    borderRadius: '6px',
                                    backgroundColor: '#ffffff',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* 傾斜点 開始文字 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label
                                htmlFor="copy-start-inclination-select"
                                style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', whiteSpace: 'nowrap' }}
                            >
                                傾斜点:
                            </label>
                            <select
                                id="copy-start-inclination-select"
                                value={startInclination}
                                onChange={(e) => setStartInclination(e.target.value)}
                                style={{
                                    height: '32px',
                                    padding: '0 8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    border: '1.5px solid #94a3b8',
                                    borderRadius: '6px',
                                    backgroundColor: '#ffffff',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {ALPHABET_OPTIONS.map((char) => (
                                    <option key={char} value={char}>
                                        {char}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: '0.9rem', color: '#444' }}>
                        クリップボードにコピーする区切り文字の形式を選択してください。
                    </p>

                    {/* 全て現場 & 現況挿入 チェックボックス（横並び） */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginTop: '4px',
                            marginBottom: '6px',
                        }}
                    >
                        <label
                            htmlFor="copy-insert-all-genba-checkbox"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: insertAllGenba ? '#eff6ff' : '#f8fafc',
                                border: insertAllGenba ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <input
                                id="copy-insert-all-genba-checkbox"
                                type="checkbox"
                                checked={insertAllGenba}
                                onChange={(e) => setInsertAllGenba(e.target.checked)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#0d6efd',
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: insertAllGenba ? '#1d4ed8' : '#1e293b' }}>
                                全て現場
                            </span>
                        </label>

                        <label
                            htmlFor="copy-insert-genkyo-checkbox"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                backgroundColor: insertGenkyo ? '#eff6ff' : '#f8fafc',
                                border: insertGenkyo ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <input
                                id="copy-insert-genkyo-checkbox"
                                type="checkbox"
                                checked={insertGenkyo}
                                onChange={(e) => setInsertGenkyo(e.target.checked)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#0d6efd',
                                    flexShrink: 0,
                                }}
                            />
                            <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: insertGenkyo ? '#1d4ed8' : '#1e293b' }}>
                                現況挿入
                            </span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        <button
                            type="button"
                            className="selected"
                            onClick={() => handleSelect('\t')}
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
                            onClick={() => handleSelect(';')}
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

                        <button
                            type="button"
                            className="btn"
                            onClick={() => handleSelect('spreadsheet_optimized')}
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
                                backgroundColor: '#f0fdf4',
                                borderColor: '#86efac',
                                color: '#166534',
                            }}
                        >
                            <span>スプシ最適化</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#15803d' }}>
                                （独自正規化ルール・セミコロン区切り）
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
