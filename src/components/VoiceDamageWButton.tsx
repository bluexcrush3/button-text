import React, { useState, useRef, useEffect } from 'react';
import { LineSelection, DamageItem } from '../types';
import { parseVoiceDamageW } from '../utils/voiceDamageParser';
import { Mic, MicOff, Check, AlertCircle, Square } from 'lucide-react';

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
      stopRecognition();
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
    showFeedback('success', 'W値を入力しました', parseResult.feedbackText, 3500);
  };

  // 手動で現在の認識テキストで即時確定する処理
  const handleManualConfirm = () => {
    if (lastTranscriptRef.current) {
      handleApplyVoiceW(lastTranscriptRef.current);
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

    const { items } = getActiveDamages();
    if (items.length === 0) {
      showFeedback(
        'warning',
        '損傷が選択されていません',
        '先に下の損傷ボタン（亀裂など）を選択してください。'
      );
      return;
    }

    // すでに認識インスタンスが残っている場合は強制破棄
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
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
      recognition.continuous = false; // 各セッションごとに単発で完全に新しく認識（過去テキスト混在防止）
      recognition.interimResults = true; // リアルタイム認識とキーワード即時確定を有効化
      lastTranscriptRef.current = '';
      setInterimText('');

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        lastTranscriptRef.current = '';
        const hintText =
          items.length === 1
            ? '例:「0.3 確定」「全般 以上」'
            : '例:「0.3と0.5 確定」「0.3 0.5 完了」';
        showFeedback('info', '🎙️ 音声入力中...', hintText, 0, true);
      };

      recognition.onresult = (event: any) => {
        if (!isListeningRef.current) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          lastTranscriptRef.current = combined;
          setInterimText(combined);

          const damageCount = items.length;
          const parseResult = parseVoiceDamageW(combined, damageCount);

          // ポップアップを更新して認識中のテキストをリアルタイム可視化
          showFeedback(
            'info',
            `🎙️ 『${combined}』`,
            parseResult.success
              ? `【認識】${parseResult.feedbackText} （「確定」または「以上」で終了）`
              : '「確定」「以上」で終了します',
            0,
            true
          );

          // 終了合図（「確定」「以上」「決定」「完了」「ストップ」など）が発話されたら即時確定・停止！
          if (parseResult.hasEndCommand) {
            handleApplyVoiceW(combined);
          }
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
        // 自然に無音などで音声認識が終了した場合
        if (isListeningRef.current) {
          const textToApply = lastTranscriptRef.current;
          isListeningRef.current = false;
          if (textToApply) {
            handleApplyVoiceW(textToApply);
          } else {
            stopRecognition();
          }
        } else {
          stopRecognition();
        }
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
        <span>{isListening ? '確定/停止' : 'W音声'}</span>
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
            border: `1.5px solid ${feedback.type === 'success'
              ? '#a7f3d0'
              : feedback.type === 'warning'
                ? '#fde68a'
                : feedback.type === 'error'
                  ? '#fecaca'
                  : '#cbd5e1'
              }`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '8px 10px',
            minWidth: '220px',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.78rem',
            animation: 'fadeInSlideDown 0.2s ease',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', minWidth: 0 }}>
              {feedback.type === 'success' && <Check size={14} color="#10b981" />}
              {feedback.type === 'warning' && <AlertCircle size={14} color="#f59e0b" />}
              {feedback.type === 'error' && <AlertCircle size={14} color="#ef4444" />}
              {feedback.type === 'info' && <Mic size={14} color="#6366f1" className={isListening ? 'voice-listening-pulse-icon' : ''} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {feedback.text}
              </span>
            </div>

            {/* 音声入力中の即時確定ボタン */}
            {isListening && feedback.canManualConfirm && (
              <button
                type="button"
                onClick={handleManualConfirm}
                style={{
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0,
                }}
                title="即時確定して入力を完了"
              >
                <Check size={12} />
                <span>確定</span>
              </button>
            )}
          </div>

          {feedback.subText && (
            <span style={{ fontSize: '0.72rem', opacity: 0.9, paddingLeft: '19px', wordBreak: 'break-word' }}>
              {feedback.subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

