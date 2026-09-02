import React, { useState } from 'react';
import { LineData, CustomButtonConfig } from '../types';
import { generateLineText, generateLineTextForSpreadsheet, CustomButtonsInput } from '../utils/textGenerator';
import { FileText, Copy, Check } from 'lucide-react';

interface AllTextPreviewPanelProps {
    lines: LineData[];
    currentLineIndex: number;
    onNavigateToLine: (index: number) => void;
    customButtons?: CustomButtonsInput;
}

export const AllTextPreviewPanel: React.FC<AllTextPreviewPanelProps> = ({
    lines,
    currentLineIndex,
    onNavigateToLine,
    customButtons = [],
}) => {
    const [copied, setCopied] = useState(false);

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

    return (
        <section
            style={{
                margin: '12px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                padding: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #eee',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    <FileText size={18} color="#0d6efd" />
                    生成文字列 プレビュー（全 {lines.length} 行）
                </div>
                <button
                    type="button"
                    className="btn selected"
                    onClick={handleCopy}
                    disabled={!fullText}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'コピー完了' : '一括コピー'}
                </button>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                }}
            >
                {lines.map((line, idx) => {
                    const text = lineTexts[idx];
                    const isCurrent = idx === currentLineIndex;

                    return (
                        <div
                            key={line.id || idx}
                            onClick={() => onNavigateToLine(idx)}
                            style={{
                                padding: '6px 10px',
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
                                    minWidth: '36px',
                                    flexShrink: 0,
                                }}
                            >
                                行 {idx + 1}
                            </span>
                            <span
                                style={{
                                    fontSize: '0.9rem',
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
                                        fontSize: '0.65rem',
                                        backgroundColor: '#0d6efd',
                                        color: '#fff',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        flexShrink: 0,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    編集中
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
