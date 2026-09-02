import React, { useState, useRef, useEffect } from 'react';
import { LineSelection, DamageItem } from '../types';
import { parseVoiceDamageW } from '../utils/voiceDamageParser';
import { Mic, Check, AlertCircle, Square } from 'lucide-react';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface VoiceInclinationButtonProps {
  selection: LineSelection;
  onChangeSelection: (newSelection: LineSelection) => void;
}

export const VoiceInclinationButton: React.FC<VoiceInclinationButtonProps> = ({
  selection,
  onChangeSelection,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    text: string;
    subText?: string;
    canManualConfirm?: boolean;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

  // フィードバック表示ヘルパー
  const showFeedback = (
    type: 'info' | 'success' | 'warning' | 'error',
    text: string,
    subText?: string,
    durationMs: number = 3500,
    canManualConfirm: boolean = false
  ) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setFeedback({ type, text, subText, canManualConfirm });
    if (durationMs > 0) {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
      }, durationMs);
    }
  };

  const stopRecognition = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
    lastTranscriptRef.current = '';
  };

  useEffect(() => {
    return () => {
      stopRecognition();
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // 音声認識結果の適用（傾斜用: 損傷名の有無に関わらず数値を直接反映）
  const handleApplyVoiceInclination = (rawTranscript: string) => {
    const parseResult = parseVoiceDamageW(rawTranscript, 2);

    if (!parseResult.success || parseResult.damages.length === 0) {
      showFeedback('warning', '音声を認識できませんでした', `発話:「${rawTranscript}」`);
      stopRecognition();
      return;
    }

    // 取得した数値を inclinationValues に格納
    const newItems: DamageItem[] = parseResult.damages.map((parsed, idx) => ({
      name: `傾斜${idx + 1}`,
      valueW: parsed.valueW,
      valueL: 0,
      preset: parsed.preset,
      isLessThan: parsed.isLessThan,
    }));

    onChangeSelection({
      ...selection,
      inclinationValues: newItems,
    });

    stopRecognition();

    const formattedFeedback = newItems
      .map((item, idx) => {
        const prefix = item.isLessThan ? '<' : '';
        const valStr = item.preset ? `【${item.preset}】` : `${prefix}${item.valueW}`;
        return `傾斜${idx + 1}: ${valStr}`;
      })
      .join(' / ');

    showFeedback('success', '傾斜値を入力しました', formattedFeedback, 3500);
  };

  // 手動確定
  const handleManualConfirm = () => {
    if (lastTranscriptRef.current) {
      handleApplyVoiceInclination(lastTranscriptRef.current);
    } else {
      stopRecognition();
      showFeedback('info', '音声入力を終了しました', undefined, 1500);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      handleManualConfirm();
      return;
    }

    const windowObj = window as unknown as IWindow;
    const SpeechRec = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRec) {
      showFeedback('error', '非対応ブラウザです', 'Google Chrome 等の対応ブラウザをご利用ください。');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'ja-JP';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setInterimText('');
        lastTranscriptRef.current = '';
        showFeedback('info', '傾斜値を話してください', '例:「2.5」「1.0と2.0」「以下1.0」「クリア」', 0, true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        const currentText = (final || interim).trim();
        setInterimText(currentText);
        if (currentText) {
          lastTranscriptRef.current = currentText;
        }

        if (final) {
          handleApplyVoiceInclination(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          showFeedback('warning', '音声が検出されませんでした', 'もう一度お話しください。', 2500);
        } else if (event.error === 'not-allowed') {
          showFeedback('error', 'マイクへのアクセスが拒否されました', 'ブラウザの設定でマイクを許可してください。', 4000);
        } else {
          showFeedback('error', '音声認識エラーが発生しました', event.error, 3000);
        }
        stopRecognition();
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          if (lastTranscriptRef.current) {
            handleApplyVoiceInclination(lastTranscriptRef.current);
          } else {
            stopRecognition();
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition', e);
      showFeedback('error', '音声認識を開始できませんでした', e?.message || '', 3000);
      stopRecognition();
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        className={`btn-copy-prev voice-w-btn ${isListening ? 'listening' : ''}`}
        onClick={handleToggleVoice}
        title={isListening ? 'タップして確定・終了' : '音声で傾斜数値を入力（例: 2.5 / 1.0と2.0）'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '4px 8px',
          height: '28px',
          backgroundColor: isListening ? '#dcfce7' : '#f0fdf4',
          borderColor: isListening ? '#16a34a' : '#22c55e',
          color: isListening ? '#15803d' : '#166534',
          fontWeight: 'bold',
          fontSize: '0.78rem',
          boxShadow: isListening ? '0 0 0 2px rgba(34, 197, 94, 0.35)' : 'none',
          animation: isListening ? 'pulse-green 1.5s infinite' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {isListening ? (
          <>
            <Square size={13} fill="#16a34a" />
            <span>傾音声 (録音中)</span>
          </>
        ) : (
          <>
            <Mic size={14} color="#16a34a" />
            <span>傾音声</span>
          </>
        )}
      </button>

      {/* フィードバック / ガイド ポップアップ */}
      {feedback && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: '0',
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: `1.5px solid ${
              feedback.type === 'success'
                ? '#22c55e'
                : feedback.type === 'error'
                  ? '#ef4444'
                  : feedback.type === 'warning'
                    ? '#f59e0b'
                    : '#3b82f6'
            }`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px 12px',
            minWidth: '220px',
            maxWidth: '300px',
            fontSize: '0.8rem',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            {feedback.type === 'success' && <Check size={16} color="#16a34a" />}
            {feedback.type === 'error' && <AlertCircle size={16} color="#dc2626" />}
            {feedback.type === 'warning' && <AlertCircle size={16} color="#d97706" />}
            {feedback.type === 'info' && <Mic size={16} color="#2563eb" />}
            <span>{feedback.text}</span>
          </div>

          {feedback.subText && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
              {feedback.subText}
            </div>
          )}

          {interimText && (
            <div
              style={{
                marginTop: '4px',
                padding: '4px 6px',
                backgroundColor: '#f8fafc',
                borderRadius: '4px',
                border: '1px dashed #cbd5e1',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: '500',
              }}
            >
              認識中: 「{interimText}」
            </div>
          )}

          {feedback.canManualConfirm && isListening && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn"
                onClick={handleManualConfirm}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  borderColor: '#15803d',
                  fontWeight: 'bold',
                }}
              >
                確定
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  stopRecognition();
                  setFeedback(null);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                }}
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
