import React, { useState } from 'react';
import { LineData, BasicInfo } from '../types';
import { generateLineText, generateLineTextForSpreadsheet, formatBasicInfoHeader, CustomButtonsInput } from '../utils/textGenerator';
import { FileText, Copy, Check, WrapText } from 'lucide-react';
import { CopyFormatModal } from './CopyFormatModal';

interface AllTextPreviewPanelProps {
    lines: LineData[];
    currentLineIndex: number;
    onNavigateToLine: (index: number) => void;
    customButtons?: CustomButtonsInput;
    basicInfo?: BasicInfo;
}

export const AllTextPreviewPanel: React.FC<AllTextPreviewPanelProps> = ({
    lines,
    currentLineIndex,
    onNavigateToLine,
    customButtons = [],
    basicInfo,
}) => {
    const [copied, setCopied] = useState(false);
    const [isWrapText, setIsWrapText] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

    const lineTexts = lines.map((line) => generateLineText(line.selection, customButtons));
    const fullText = lineTexts.filter((t) => t.trim().length > 0).join('\n');

    const handleSelectFormatAndCopy = async (delimiter: '\t' | ';') => {
        try {
            const headerLine = formatBasicInfoHeader(basicInfo);
            const lineTextsForCopy = lines
                .map((line) => generateLineTextForSpreadsheet(line.selection, customButtons, delimiter))
                .filter((t, idx) => t.trim().length > 0 || lines[idx]?.selection.mode === '傾斜');

            const copyText = headerLine
                ? [headerLine, ...lineTextsForCopy].join('\n')
                : lineTextsForCopy.join('\n');

            await navigator.clipboard.writeText(copyText);
            setCopied(true);
            setIsCopyModalOpen(false);
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
                    プレビュー（全 {lines.length} 行 / 残{1000 - lines.length}）
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        type="button"
                        className={`btn ${isWrapText ? 'selected' : ''}`}
                        onClick={() => setIsWrapText(!isWrapText)}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={isWrapText ? '省略表示に切り替え' : '全文表示に切り替え'}
                    >
                        <WrapText size={14} />
                        全文
                    </button>
                    <button
                        type="button"
                        className="btn selected"
                        onClick={() => setIsCopyModalOpen(true)}
                        disabled={!fullText}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'コピー完了' : '一括コピー'}
                    </button>
                </div>
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
                                alignItems: isWrapText ? 'flex-start' : 'center',
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
                                    marginTop: isWrapText ? '2px' : 0,
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
                                    overflow: isWrapText ? 'visible' : 'hidden',
                                    textOverflow: isWrapText ? 'clip' : 'ellipsis',
                                    whiteSpace: isWrapText ? 'pre-wrap' : 'nowrap',
                                    wordBreak: isWrapText ? 'break-all' : 'normal',
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
                                        marginTop: isWrapText ? '2px' : 0,
                                    }}
                                >
                                    編集中
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <CopyFormatModal
                isOpen={isCopyModalOpen}
                onClose={() => setIsCopyModalOpen(false)}
                onSelectFormat={handleSelectFormatAndCopy}
            />
        </section>
    );
};

