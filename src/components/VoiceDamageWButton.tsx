import React, { useState, useRef, useEffect } from 'react';
import { LineSelection, DamageItem } from '../types';
import { parseVoiceDamageW } from '../utils/voiceDamageParser';
import { Mic, MicOff, Check, AlertCircle } from 'lucide-react';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface VoiceDamageWButtonProps {
  selection: LineSelection;
  onChangeSelection: (newSelection: LineSelection) => void;
}

export const VoiceDamageWButton: React.FC<VoiceDamageWButtonProps> = ({
  selection,
  onChangeSelection,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    text: string;
    subText?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // フィードバック表示ヘルパー
  const showFeedback = (
    type: 'info' | 'success' | 'warning' | 'error',
    text: string,
    subText?: string,
    durationMs: number = 3500
  ) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setFeedback({ type, text, subText });
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
  };

  useEffect(() => {
    return () => {
      stopRecognition();
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // 現在選択されている損傷のリストとそのタイプを判定
  const getActiveDamages = (): {
    target: 'standard' | 'internal' | 'external';
    items: DamageItem[];
  } => {
    const isInternal = (selection.mode || '外部') === '内部';

    if (isInternal) {
      if (selection.internalDamages && selection.internalDamages.length > 0) {
        return { target: 'internal', items: selection.internalDamages };
      }
    } else {
      if (selection.damages && selection.damages.length > 0) {
        return { target: 'standard', items: selection.damages };
      }
      if (selection.externalDamages && selection.externalDamages.length > 0) {
        return { target: 'external', items: selection.externalDamages };
      }
    }

    // fallback
    if (selection.damages && selection.damages.length > 0) {
      return { target: 'standard', items: selection.damages };
    }
    return { target: 'standard', items: [] };
  };

  // 音声認識結果の適用
  const handleApplyVoiceW = (rawTranscript: string) => {
    const { target, items } = getActiveDamages();
    const damageCount = items.length;

    if (damageCount === 0) {
      stopRecognition();
      showFeedback(
        'warning',
        '損傷が選択されていません',
        '先に下の損傷ボタン（亀裂など）を選択してください。'
      );
      return;
    }

    const parseResult = parseVoiceDamageW(rawTranscript, damageCount);

    if (!parseResult.success || parseResult.damages.length === 0) {
      showFeedback('warning', '音声を認識できませんでした', `発話:「${rawTranscript}」`);
      return;
    }

    // 取得したW値を現在の損傷に適用
    const newItems = [...items];
    parseResult.damages.forEach((parsed, idx) => {
      if (idx < newItems.length) {
        newItems[idx] = {
          ...newItems[idx],
          valueW: parsed.valueW,
          preset: parsed.preset,
        };
      }
    });

    // selection を更新
    let newSelection: LineSelection;
    if (target === 'internal') {
      newSelection = {
        ...selection,
        internalDamages: newItems,
      };
    } else if (target === 'external') {
      newSelection = {
        ...selection,
        externalDamages: newItems,
      };
    } else {
      newSelection = {
        ...selection,
        damages: newItems,
      };
    }

    onChangeSelection(newSelection);
    stopRecognition();
    showFeedback('success', 'W値を入力しました', parseResult.feedbackText);
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopRecognition();
      showFeedback('info', '音声入力を停止しました', undefined, 1500);
      return;
    }

    const { items } = getActiveDamages();
    if (items.length === 0) {
      showFeedback(
        'warning',
        '損傷が選択されていません',
        '先に下の損傷ボタン（亀裂など）を選択してください。'
      );
      return;
    }

    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      showFeedback(
        'error',
        '音声認識に未対応です',
        'お使いのブラウザはWeb Speech APIに対応していません。'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ja-JP';
      recognition.continuous = false; // 単発発話で確定
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        const countText = items.length === 1 ? '例:「0.3」「全般」' : '例:「0.3と0.5」「両方50」';
        showFeedback('info', '🎙️ W数値を話してください...', countText, 0);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          handleApplyVoiceW(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error in VoiceDamageWButton:', event.error);
        if (event.error === 'not-allowed') {
          showFeedback('error', 'マイクへのアクセスが拒否されています');
        } else if (event.error !== 'no-speech') {
          showFeedback('error', `認識エラー: ${event.error}`);
        }
        stopRecognition();
      };

      recognition.onend = () => {
        stopRecognition();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start voice recognition', e);
      showFeedback('error', '音声認識の起動に失敗しました');
      stopRecognition();
    }
  };

  const { items } = getActiveDamages();
  const hasDamage = items.length > 0;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* ヘッダーマイクボタン */}
      <button
        type="button"
        className={`btn-header-voice ${isListening ? 'listening' : ''} ${hasDamage ? 'ready' : ''}`}
        onClick={handleToggleVoice}
        title={
          hasDamage
            ? `W数値を音声入力（選択中: ${items.map((d) => d.name).join('、')}）`
            : '損傷を選択すると音声でW数値を入力できます'
        }
        style={{
          height: '28px',
          padding: '0 7px',
          fontSize: '0.78rem',
          fontWeight: 'bold',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          borderRadius: '6px',
          border: '2px solid',
          borderColor: isListening ? '#ef4444' : hasDamage ? '#6366f1' : '#cbd5e1',
          backgroundColor: isListening ? '#fef2f2' : hasDamage ? '#eef2ff' : '#f8fafc',
          color: isListening ? '#dc2626' : hasDamage ? '#4f46e5' : '#94a3b8',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        {isListening ? (
          <Mic size={14} className="voice-listening-pulse-icon" />
        ) : (
          <Mic size={14} />
        )}
        <span>W音声</span>
      </button>

      {/* ポップオーバー / ツールチップ通知 */}
      {feedback && (
        <div
          className={`voice-toast-popup ${feedback.type}`}
          style={{
            position: 'absolute',
            top: '34px',
            right: '0',
            zIndex: 9999,
            backgroundColor:
              feedback.type === 'success'
                ? '#ecfdf5'
                : feedback.type === 'warning'
                  ? '#fffbeb'
                  : feedback.type === 'error'
                    ? '#fef2f2'
                    : '#f0fdf4',
            color:
              feedback.type === 'success'
                ? '#065f46'
                : feedback.type === 'warning'
                  ? '#92400e'
                  : feedback.type === 'error'
                    ? '#991b1b'
                    : '#1e293b',
            border: `1.5px solid ${
              feedback.type === 'success'
                ? '#a7f3d0'
                : feedback.type === 'warning'
                  ? '#fde68a'
                  : feedback.type === 'error'
                    ? '#fecaca'
                    : '#cbd5e1'
            }`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '6px 10px',
            minWidth: '200px',
            maxWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            fontSize: '0.78rem',
            animation: 'fadeInSlideDown 0.2s ease',
            pointerEvents: 'auto',
          }}
          onClick={() => setFeedback(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
            {feedback.type === 'success' && <Check size={14} color="#10b981" />}
            {feedback.type === 'warning' && <AlertCircle size={14} color="#f59e0b" />}
            {feedback.type === 'error' && <AlertCircle size={14} color="#ef4444" />}
            {feedback.type === 'info' && <Mic size={14} color="#6366f1" />}
            <span>{feedback.text}</span>
          </div>
          {feedback.subText && (
            <span style={{ fontSize: '0.72rem', opacity: 0.85, paddingLeft: '19px' }}>
              {feedback.subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
