import React from 'react';
import { LineSelection, SurveyType, DamageItem } from '../types';
import { MapPin, Compass, Box, AlertCircle, Plus, Minus, RotateCcw, FileText } from 'lucide-react';

interface MainAreaProps {
  surveyType: SurveyType;
  selection: LineSelection;
  onChangeSelection: (newSelection: LineSelection) => void;
  onClearCurrentLine: () => void;
}

export const MainArea: React.FC<MainAreaProps> = ({
  surveyType,
  selection,
  onChangeSelection,
  onClearCurrentLine,
}) => {
  const isLocationDisabled = selection.part === '塀' || selection.part === '土間';

  // ① 場所グループハンドラー
  const handleToggleBuilding = () => {
    if (isLocationDisabled) return;
    onChangeSelection({
      ...selection,
      location: {
        ...selection.location,
        isBuilding: !selection.location.isBuilding,
      },
    });
  };

  const handleFloor1Change = (delta: number) => {
    if (isLocationDisabled) return;
    const newVal = Math.max(0, selection.location.floor1 + delta);
    onChangeSelection({
      ...selection,
      location: {
        ...selection.location,
        floor1: newVal,
      },
    });
  };

  const handleFloor2Change = (delta: number) => {
    if (isLocationDisabled) return;
    const newVal = Math.max(0, selection.location.floor2 + delta);
    onChangeSelection({
      ...selection,
      location: {
        ...selection.location,
        floor2: newVal,
      },
    });
  };

  // ② 方向グループハンドラー（最大2つ選択）
  const handleDirectionToggle = (dir: string) => {
    const current = selection.directions;
    let next: string[];

    if (current.includes(dir)) {
      next = current.filter((d) => d !== dir);
    } else {
      if (current.length >= 2) {
        next = [current[1], dir];
      } else {
        next = [...current, dir];
      }
    }

    onChangeSelection({
      ...selection,
      directions: next,
    });
  };

  // ③ 箇所グループハンドラー（単一選択）
  const handlePartToggle = (partName: string) => {
    const nextPart = selection.part === partName ? null : partName;
    onChangeSelection({
      ...selection,
      part: nextPart,
    });
  };

  // ④ 損傷グループハンドラー（最大2つ選択）
  // ※損傷グループが入力（選択）された場合、「全景」「現況」選択を解除
  const handleDamageToggle = (damageName: string) => {
    const current = selection.damages || [];
    const exists = current.find((d) => d.name === damageName);

    let next: DamageItem[];
    if (exists) {
      // すでに選択済みなら解除
      next = current.filter((d) => d.name !== damageName);
    } else {
      const newItem: DamageItem = { name: damageName, valueW: 0, valueL: 0 };
      if (current.length >= 2) {
        // 2つ選択済みの場合は古い方を入れ替え
        next = [current[1], newItem];
      } else {
        next = [...current, newItem];
      }
    }

    // 損傷グループ選択時は「全景」「現況」選択を解除
    const nextSituationButton = next.length > 0 ? null : selection.situationButton;

    onChangeSelection({
      ...selection,
      damages: next,
      situationButton: nextSituationButton,
    });
  };

  // 損傷のW数値変更
  const handleDamageValueWChange = (index: number, delta: number) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const currentVal = current[index].valueW || 0;
    const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
    current[index] = { ...current[index], valueW: newVal };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null, // 損傷入力時は状況選択解除
    });
  };

  const handleDamageValueWInput = (index: number, rawVal: string) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const parsed = Math.max(0, parseFloat(rawVal) || 0);
    current[index] = { ...current[index], valueW: parsed };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null, // 損傷入力時は状況選択解除
    });
  };

  // 損傷のL数値変更
  const handleDamageValueLChange = (index: number, delta: number) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const currentVal = current[index].valueL || 0;
    const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
    current[index] = { ...current[index], valueL: newVal };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null, // 損傷入力時は状況選択解除
    });
  };

  const handleDamageValueLInput = (index: number, rawVal: string) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const parsed = Math.max(0, parseFloat(rawVal) || 0);
    current[index] = { ...current[index], valueL: parsed };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null, // 損傷入力時は状況選択解除
    });
  };

  // 損傷のプリセット(全般 / 多数)切り替え
  const handleDamagePresetToggle = (index: number, presetType: '全般' | '多数') => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const nextPreset = current[index].preset === presetType ? null : presetType;
    current[index] = { ...current[index], preset: nextPreset };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null, // 損傷入力時は状況選択解除
    });
  };

  // ⑤ 状況グループボタン切り替え
  const handleSituationToggle = (buttonType: '全景' | '現況') => {
    const nextBtn = selection.situationButton === buttonType ? null : buttonType;
    onChangeSelection({
      ...selection,
      situationButton: nextBtn,
    });
  };

  const DIRECTION_OPTIONS = ['北', '西', '南', '東'];
  const PART_OPTIONS = ['壁', '腰', '軒', '塀', '土間'];
  const DAMAGE_OPTIONS = ['亀裂', '隙間', 'HC', '欠落', '目地切れ', '剥離'];

  return (
    <main className="main-content">
      {/* サブタイトル & クリアボタン */}
      <div className="survey-title">
        <span style={{ fontSize: '0.95rem' }}>ボタン選択（①場所 ②方向 ③箇所 ④損傷 ⑤状況）</span>
        <button
          type="button"
          onClick={onClearCurrentLine}
          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
        >
          <RotateCcw size={14} />
          選択解除
        </button>
      </div>

      {/* ① 場所グループ (建物ボタンと階数ボタンを横一列に配置) */}
      <section
        style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
          backgroundColor: isLocationDisabled ? '#f0f0f0' : '#ffffff',
          opacity: isLocationDisabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '0.95rem',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MapPin size={18} />
          ① 場所グループ
          {isLocationDisabled && (
            <span style={{ fontSize: '0.75rem', color: '#d9534f', marginLeft: 'auto' }}>
              ※ 塀・土間選択中のため無効
            </span>
          )}
        </div>

        {/* 建物・階数①・階数② を横一列に配置 */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
          {/* 建物ボタン */}
          <button
            type="button"
            className={`btn ${selection.location.isBuilding ? 'selected' : ''}`}
            onClick={handleToggleBuilding}
            disabled={isLocationDisabled}
            style={{
              height: '38px',
              fontSize: '0.95rem',
              padding: '0 12px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            建物
          </button>

          {/* 階数① */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階①</span>
            <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFloor1Change(-1)}
                disabled={isLocationDisabled}
                style={{ width: '28px', height: '36px', flexShrink: 0 }}
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                className="stepper-input"
                value={selection.location.floor1 || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  if (!isLocationDisabled) {
                    onChangeSelection({
                      ...selection,
                      location: { ...selection.location, floor1: val },
                    });
                  }
                }}
                disabled={isLocationDisabled}
                style={{ height: '36px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFloor1Change(1)}
                disabled={isLocationDisabled}
                style={{ width: '28px', height: '36px', flexShrink: 0 }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* 階数② */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階②</span>
            <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFloor2Change(-1)}
                disabled={isLocationDisabled}
                style={{ width: '28px', height: '36px', flexShrink: 0 }}
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                className="stepper-input"
                value={selection.location.floor2 || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  if (!isLocationDisabled) {
                    onChangeSelection({
                      ...selection,
                      location: { ...selection.location, floor2: val },
                    });
                  }
                }}
                disabled={isLocationDisabled}
                style={{ height: '36px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleFloor2Change(1)}
                disabled={isLocationDisabled}
                style={{ width: '28px', height: '36px', flexShrink: 0 }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ② 方向グループ */}
      <section
        style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '0.95rem',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={18} />
            ② 方向グループ
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
            ※最大2つ選択可
          </span>
        </div>

        <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {DIRECTION_OPTIONS.map((dir) => {
            const isSelected = selection.directions.includes(dir);
            return (
              <button
                key={dir}
                type="button"
                className={`btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDirectionToggle(dir)}
                style={{ height: '48px', fontSize: '1.05rem' }}
              >
                {dir}
              </button>
            );
          })}
        </div>
      </section>

      {/* ③ 箇所グループ */}
      <section
        style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '0.95rem',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box size={18} />
            ③ 箇所グループ
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
            ※1つのみ選択
          </span>
        </div>

        <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {PART_OPTIONS.map((part) => {
            const isSelected = selection.part === part;
            return (
              <button
                key={part}
                type="button"
                className={`btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handlePartToggle(part)}
                style={{ height: '48px', fontSize: '0.95rem', padding: '4px' }}
              >
                {part}
              </button>
            );
          })}
        </div>
      </section>

      {/* ④ 損傷グループ */}
      <section
        style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={18} />
            ④ 損傷グループ
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
            ※最大2つ選択可
          </span>
        </div>

        <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {DAMAGE_OPTIONS.map((dmg) => {
            const isSelected = (selection.damages || []).some((d) => d.name === dmg);
            return (
              <button
                key={dmg}
                type="button"
                className={`btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDamageToggle(dmg)}
                style={{ height: '48px', fontSize: '1rem' }}
              >
                {dmg}
              </button>
            );
          })}
        </div>

        {/* 選択された損傷の数値入力フォーム (数値W, 数値L / 全般, 多数) */}
        {selection.damages && selection.damages.length > 0 && (
          <div
            style={{
              marginTop: '4px',
              padding: '8px 10px',
              backgroundColor: '#f8f9fa',
              border: '1px dashed var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>
              損傷の数値入力・詳細指定
            </span>

            {selection.damages.map((dmg, idx) => (
              <div
                key={dmg.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderBottom: idx < selection.damages.length - 1 ? '1px dashed #ddd' : 'none',
                  paddingBottom: idx < selection.damages.length - 1 ? '8px' : '0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111' }}>
                    損傷{idx + 1}: {dmg.name}
                  </span>

                  {/* 「全般」「多数」ボタン */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn ${dmg.preset === '全般' ? 'selected' : ''}`}
                      onClick={() => handleDamagePresetToggle(idx, '全般')}
                      style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px' }}
                    >
                      全般
                    </button>
                    <button
                      type="button"
                      className={`btn ${dmg.preset === '多数' ? 'selected' : ''}`}
                      onClick={() => handleDamagePresetToggle(idx, '多数')}
                      style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px' }}
                    >
                      多数
                    </button>
                  </div>
                </div>

                {/* 「全般」「多数」が未選択の場合のみ数値(W/L)入力ボックスを表示 */}
                {!dmg.preset && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* 数値1W / 数値2W */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        数値{idx + 1}W
                      </span>
                      <div className="number-stepper" style={{ flex: 1, gap: '2px', minWidth: 0 }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleDamageValueWChange(idx, -0.5)}
                          style={{ width: '28px', height: '34px' }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          className="stepper-input"
                          value={dmg.valueW || ''}
                          placeholder="0"
                          onChange={(e) => handleDamageValueWInput(idx, e.target.value)}
                          style={{ height: '34px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleDamageValueWChange(idx, 0.5)}
                          style={{ width: '28px', height: '34px' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* 数値1L / 数値2L */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        数値{idx + 1}L
                      </span>
                      <div className="number-stepper" style={{ flex: 1, gap: '2px', minWidth: 0 }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleDamageValueLChange(idx, -0.5)}
                          style={{ width: '28px', height: '34px' }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          className="stepper-input"
                          value={dmg.valueL || ''}
                          placeholder="0"
                          onChange={(e) => handleDamageValueLInput(idx, e.target.value)}
                          style={{ height: '34px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleDamageValueLChange(idx, 0.5)}
                          style={{ width: '28px', height: '34px' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ⑤ 状況グループ */}
      <section
        style={{
          border: '2px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={18} />
            ⑤ 状況グループ
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
            ※損傷選択時は自動解除
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 現況ボタン */}
          <button
            type="button"
            className={`btn ${selection.situationButton === '現況' ? 'selected' : ''}`}
            onClick={() => handleSituationToggle('現況')}
            style={{ height: '42px', fontSize: '0.95rem', padding: '0 12px', flexShrink: 0 }}
          >
            現況
          </button>

          {/* 全景ボタン（たまにしか使わないため小さめのボタン） */}
          <button
            type="button"
            className={`btn ${selection.situationButton === '全景' ? 'selected' : ''}`}
            onClick={() => handleSituationToggle('全景')}
            style={{ height: '34px', fontSize: '0.8rem', padding: '0 8px', flexShrink: 0 }}
          >
            全景
          </button>

          {/* テキスト入力ボックス */}
          <input
            type="text"
            className="stepper-input"
            placeholder="テキスト入力"
            value={selection.situationText || ''}
            onChange={(e) =>
              onChangeSelection({
                ...selection,
                situationText: e.target.value,
              })
            }
            style={{
              flex: 1,
              height: '42px',
              fontSize: '0.95rem',
              textAlign: 'left',
              padding: '0 10px',
              minWidth: 0,
            }}
          />
        </div>
      </section>
    </main>
  );
};
