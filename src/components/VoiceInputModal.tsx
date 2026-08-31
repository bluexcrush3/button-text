import React, { useState, useEffect, useRef } from 'react';
import { CustomButtonCategory } from '../types';
import { Mic, MicOff, RotateCcw, Check, X, AlertCircle } from 'lucide-react';

// SpeechRecognition の型定義
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (text: string, category: CustomButtonCategory) => void;
  defaultCategory?: CustomButtonCategory;
}

const CATEGORIES: { label: CustomButtonCategory; className: string }[] = [
  { label: '損傷', className: 'category-damage' },
  { label: '場所', className: 'category-location' },
  { label: '階数', className: 'category-floor' },
  { label: '部位', className: 'category-part' },
];

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  defaultCategory = '損傷',
}) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CustomButtonCategory>(defaultCategory);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const textRef = useRef('');
  const categoryRef = useRef<CustomButtonCategory>(defaultCategory);
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

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

  // 音声認識結果のテキストからコマンド検知・登録・停止を判定する共通ハンドラー
  const processVoiceResult = (rawTranscript: string) => {
    if (isRegisteredRef.current) return;

    let processed = rawTranscript;

    // 1. 「登録」音声コマンド検知（例: "2階廊下 登録", "2階廊下とうろく", "登録" など）
    const registerRegex = /[\s　]*(?:登録|とうろく|登録する|とうろくする|決定|けってい)$/i;
    if (registerRegex.test(processed)) {
      const cleaned = processed.replace(registerRegex, '').trim();
      const finalVal = cleaned || textRef.current.trim();
      if (finalVal) {
        isRegisteredRef.current = true;
        stopRecognition();
        onRegister(finalVal, categoryRef.current);
        onClose();
        return;
      }
    }

    // 2. 「ストップ」「一時停止」音声コマンド検知（例: "2階廊下 ストップ", "ストップ", "一時停止" など）
    const stopRegex = /[\s　]*(?:ストップ|すをとっぷ|すっとっぷ|stop|一時停止|いちじていし|終了|しゅうりょう)$/i;
    if (stopRegex.test(processed)) {
      const cleaned = processed.replace(stopRegex, '').trim();
      if (cleaned) {
        setText(cleaned);
        textRef.current = cleaned;
      }
      stopRecognition();
      return;
    }

    // 3. 通常の入力テキスト反映
    if (processed.trim()) {
      setText(processed);
      textRef.current = processed;
    }
  };

  // モーダルオープン時の初期化・音声認識開始
  useEffect(() => {
    if (!isOpen) {
      stopRecognition();
      setText('');
      textRef.current = '';
      setErrorMessage(null);
      isRegisteredRef.current = false;
      return;
    }

    setCategory(defaultCategory);
    categoryRef.current = defaultCategory;
    setText('');
    textRef.current = '';
    setErrorMessage(null);
    isRegisteredRef.current = false;

    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setErrorMessage('お使いのブラウザは音声認識機能（Web Speech API）に対応していません。テキストボックスから直接入力してください。');
      return;
    }

    setIsSupported(true);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          processVoiceResult(combined);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('マイクへのアクセスが許可されていません。ブラウザ設定でマイクを許可してください。');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // 音声未検出
        } else {
          setErrorMessage(`音声認識エラー: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (isRegisteredRef.current) return;
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start speech recognition', e);
      setIsListening(false);
    }

    return () => {
      stopRecognition();
    };
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      stopRecognition();
    } else {
      const win = window as unknown as IWindow;
      const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          const combined = (finalTranscript + interimTranscript).trim();
          if (combined) {
            processVoiceResult(combined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === 'not-allowed') {
            setErrorMessage('マイクへのアクセスが許可されていません。ブラウザ設定でマイクを許可してください。');
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isRegisteredRef.current) return;
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        isListeningRef.current = true;
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to restart speech recognition', e);
      }
    }
  };

  const handleClear = () => {
    setText('');
    textRef.current = '';
  };

  const handleRegister = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    isRegisteredRef.current = true;
    stopRecognition();
    onRegister(trimmed, category);
    onClose();
  };

  const handleClose = () => {
    stopRecognition();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-card voice-input-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '92%', padding: '16px' }}
      >
        {/* モーダルヘッダー */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
            <span className="voice-mic-header-icon">
              <Mic size={22} color="#6366f1" />
            </span>
            音声入力
          </h3>
          <button
            type="button"
            onClick={handleClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <X size={20} color="#666" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 音声認識ステータス / マイクコントロール */}
          <div
            className={`voice-status-box ${isListening ? 'listening' : 'paused'}`}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: `2px solid ${isListening ? '#818cf8' : '#e2e8f0'}`,
              backgroundColor: isListening ? '#f5f3ff' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className={`voice-pulse-circle ${isListening ? 'active' : ''}`} style={{ flexShrink: 0 }}>
                {isListening ? <Mic size={18} color="#ffffff" /> : <MicOff size={18} color="#94a3b8" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: isListening ? '#4338ca' : '#64748b', whiteSpace: 'nowrap' }}>
                  {isListening ? '音声を聞き取り中...' : '音声入力を一時停止中'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {isListening ? 'マイクに向かって話してください' : 'タップして聞き取りを再開'}
                </span>
              </div>
            </div>

            {isSupported && (
              <button
                type="button"
                className="btn"
                onClick={toggleListening}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 10px',
                  backgroundColor: isListening ? '#ffffff' : '#4f46e5',
                  color: isListening ? '#4338ca' : '#ffffff',
                  borderColor: isListening ? '#c7d2fe' : '#4338ca',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {isListening ? '一時停止' : '再開'}
              </button>
            )}
          </div>

          {/* 音声コマンド案内バッジ */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontWeight: 'bold' }}>💡 音声操作:</span>
            <span>「<strong>ストップ</strong>」で一時停止 / 「<strong>登録</strong>」で決定</span>
          </div>

          {errorMessage && (
            <div
              style={{
                fontSize: '0.78rem',
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '8px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 登録種別選択ボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
              登録種別の選択:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    className={`btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setCategory(cat.label)}
                    style={{
                      height: '38px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#1e293b' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      borderColor: isSelected ? '#1e293b' : '#cbd5e1',
                      padding: '0',
                    }}
                  >
                    <span>{cat.label}</span>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        width: '16px',
                        height: '3px',
                        borderRadius: '2px',
                        backgroundColor:
                          cat.label === '場所'
                            ? '#1c7ed6'
                            : cat.label === '階数'
                              ? '#2b8a3e'
                              : cat.label === '部位'
                                ? '#d9480f'
                                : '#d6336c',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 音声入力結果確認テキストボックス */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
                音声入力結果（直接編集可）:
              </label>
              {text && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {text.length} 文字
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="音声がここにテキスト化されます。キーボードで修正・追加入力も可能です。"
              style={{
                width: '100%',
                fontSize: '1rem',
                fontWeight: 'bold',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '2px solid #94a3b8',
                backgroundColor: '#ffffff',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.4,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* モーダルフッター（クリア・キャンセル・登録） - スマホでも崩れない3分割グリッド */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.25fr',
            gap: '8px',
            borderTop: '2px solid var(--border-color)',
            paddingTop: '12px',
            marginTop: '8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            disabled={!text}
            style={{
              height: '42px',
              padding: '0 6px',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              borderColor: '#fca5a5',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              opacity: !text ? 0.5 : 1,
              cursor: !text ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={15} style={{ flexShrink: 0 }} />
            <span>クリア</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleClose}
            style={{
              height: '42px',
              padding: '0 6px',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>キャンセル</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleRegister}
            disabled={!text.trim()}
            style={{
              height: '42px',
              padding: '0 6px',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              borderColor: '#4338ca',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              opacity: !text.trim() ? 0.5 : 1,
              cursor: !text.trim() ? 'not-allowed' : 'pointer',
              boxShadow: text.trim() ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none',
            }}
          >
            <Check size={18} style={{ flexShrink: 0 }} />
            <span>登録</span>
          </button>
        </div>
      </div>
    </div>
  );
};
