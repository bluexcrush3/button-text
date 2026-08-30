import React, { useState, useRef } from 'react';
import { LineSelection, SurveyType, DamageItem, CustomButtonConfig, CustomButtonCategory } from '../types';
import { MapPin, Compass, Box, AlertCircle, Plus, Minus, RotateCcw, FileText, GripVertical } from 'lucide-react';

interface MainAreaProps {
  surveyType: SurveyType;
  selection: LineSelection;
  onChangeSelection: (newSelection: LineSelection) => void;
  onClearCurrentLine: () => void;
  internalCustomButtons: CustomButtonConfig[];
  externalCustomButtons: CustomButtonConfig[];
  onChangeInternalCustomButtons: (newButtons: CustomButtonConfig[]) => void;
  onChangeExternalCustomButtons: (newButtons: CustomButtonConfig[]) => void;
}

export const MainArea: React.FC<MainAreaProps> = ({
  surveyType,
  selection,
  onChangeSelection,
  onClearCurrentLine,
  internalCustomButtons,
  externalCustomButtons,
  onChangeInternalCustomButtons,
  onChangeExternalCustomButtons,
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

  // ③ 部位グループハンドラー（単一選択）
  const handlePartToggle = (partName: string) => {
    const nextPart = selection.part === partName ? null : partName;
    onChangeSelection({
      ...selection,
      part: nextPart,
    });
  };

  // ④ 損傷グループハンドラー（最大2つ選択）
  const handleDamageToggle = (damageName: string) => {
    const current = selection.damages || [];
    const exists = current.find(
      (d) => d.name === damageName || d.name.replace(/^[左右上下]/, '') === damageName
    );

    let next: DamageItem[];
    if (exists) {
      next = current.filter(
        (d) => d.name !== damageName && d.name.replace(/^[左右上下]/, '') !== damageName
      );
    } else {
      const newItem: DamageItem = { name: damageName, valueW: 0, valueL: 0 };
      if (current.length >= 2) {
        next = [current[1], newItem];
      } else {
        next = [...current, newItem];
      }
    }

    const nextSituationButton = next.length > 0 ? null : selection.situationButton;

    onChangeSelection({
      ...selection,
      damages: next,
      situationButton: nextSituationButton,
    });
  };

  // 損傷が1つのみ選択されている時に「左右」「上下」ボタン押下で同名損傷2を追加
  const handleDamageDirectionPreset = (directionType: '左右' | '上下') => {
    const current = selection.damages || [];
    if (current.length !== 1) return;

    const item1 = current[0];
    const baseName = item1.name.replace(/^[左右上下]/, '');

    const prefix1 = directionType === '左右' ? '左' : '上';
    const prefix2 = directionType === '左右' ? '右' : '下';

    const damage1: DamageItem = { ...item1, name: `${prefix1}${baseName}` };
    const damage2: DamageItem = { name: `${prefix2}${baseName}`, valueW: 0, valueL: 0 };

    const next = [damage1, damage2];

    onChangeSelection({
      ...selection,
      damages: next,
      situationButton: null,
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
      situationButton: null,
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
      situationButton: null,
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
      situationButton: null,
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
      situationButton: null,
    });
  };

  // 損傷の50設定
  const handleDamage50Set = (index: number) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const curW = current[index].valueW || 0;
    const nextW = curW === 50 ? 0 : 50;
    current[index] = { ...current[index], valueW: nextW, preset: null };

    onChangeSelection({
      ...selection,
      damages: current,
      situationButton: null,
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
      situationButton: null,
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

  const currentMode = selection.mode || '外部';
  const isModeInternal = currentMode === '内部';

  const customButtons = isModeInternal ? internalCustomButtons : externalCustomButtons;
  const onChangeCustomButtons = isModeInternal ? onChangeInternalCustomButtons : onChangeExternalCustomButtons;

  const currentCustomSelections = isModeInternal
    ? (selection.internalSelections || [])
    : (selection.externalSelections || []);

  const currentCustomDamages = isModeInternal
    ? (selection.internalDamages || [])
    : (selection.externalDamages || []);

  // 内部/外部用ハンドラーとローカルステート
  const [newButtonName, setNewButtonName] = useState('');
  const [newButtonCategory, setNewButtonCategory] = useState<CustomButtonCategory>('損傷');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [locationModalBtn, setLocationModalBtn] = useState<CustomButtonConfig | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleCustomSelection = (btnName: string) => {
    const btnConfig = customButtons.find((b) => b.name === btnName);
    if (btnConfig?.category === '場所') {
      setLocationModalBtn(btnConfig);
      return;
    }

    let nextSelections: string[];
    let nextDamages = [...currentCustomDamages];

    const baseName = btnName.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
    const isCurrentlySelected = currentCustomSelections.some(
      (item) => item === btnName || item.replace(/^[左右上下]/, '') === baseName
    );

    if (isCurrentlySelected) {
      nextSelections = currentCustomSelections.filter(
        (item) => item !== btnName && item.replace(/^[左右上下]/, '') !== baseName
      );
      nextDamages = currentCustomDamages.filter(
        (d) => d.name !== btnName && d.name.replace(/^[左右上下]/, '') !== baseName
      );
    } else {
      nextSelections = [...currentCustomSelections, btnName];
      if (btnConfig?.category === '損傷' && !nextDamages.some((d) => d.name === btnName)) {
        nextDamages.push({ name: btnName, valueW: 0, valueL: 0 });
      }
    }

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        internalSelections: nextSelections,
        internalDamages: nextDamages,
      });
    } else {
      onChangeSelection({
        ...selection,
        externalSelections: nextSelections,
        externalDamages: nextDamages,
      });
    }
  };

  // 場所ボタンの番号記号（①〜⑨）選択ハンドラー
  const handleSelectLocationNumber = (suffix: string | null) => {
    if (!locationModalBtn) return;

    const baseName = locationModalBtn.name;
    const existingIndex = currentCustomSelections.findIndex(
      (item) => item === baseName || (item.startsWith(baseName) && /[①-⑳]$/.test(item))
    );

    let next = [...currentCustomSelections];

    if (suffix === null) {
      if (existingIndex !== -1) {
        next.splice(existingIndex, 1);
      }
    } else {
      const newName = `${baseName}${suffix}`;
      if (existingIndex !== -1) {
        next[existingIndex] = newName;
      } else {
        next.push(newName);
      }
    }

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        internalSelections: next,
      });
    } else {
      onChangeSelection({
        ...selection,
        externalSelections: next,
      });
    }

    setLocationModalBtn(null);
  };

  // カスタム損傷数値 (W/L) 変更ヘルパー
  const updateCustomDamages = (newDamages: DamageItem[]) => {
    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        internalDamages: newDamages,
      });
    } else {
      onChangeSelection({
        ...selection,
        externalDamages: newDamages,
      });
    }
  };

  const handleCustomDamageWChange = (btnName: string, delta: number) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    const currentVal = item.valueW || 0;
    item.valueW = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
    updateCustomDamages(list);
  };

  const handleCustomDamageWInput = (btnName: string, rawVal: string) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    item.valueW = Math.max(0, parseFloat(rawVal) || 0);
    updateCustomDamages(list);
  };

  const handleCustomDamageLChange = (btnName: string, delta: number) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    const currentVal = item.valueL || 0;
    item.valueL = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
    updateCustomDamages(list);
  };

  const handleCustomDamageLInput = (btnName: string, rawVal: string) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    item.valueL = Math.max(0, parseFloat(rawVal) || 0);
    updateCustomDamages(list);
  };

  const handleCustomDamage50Set = (btnName: string) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    const curW = item.valueW || 0;
    item.valueW = curW === 50 ? 0 : 50;
    item.preset = null;
    updateCustomDamages(list);
  };

  const handleCustomDamagePresetToggle = (btnName: string, presetType: '全般' | '多数') => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    item.preset = item.preset === presetType ? null : presetType;
    updateCustomDamages(list);
  };

  const handleCustomDamageDirectionPreset = (btnName: string, directionType: '左右' | '上下') => {
    const selectedDamageButtons = currentCustomSelections
      .map((name) => {
        const baseName = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
        return customButtons.find((b) => b.name === name || b.name === baseName);
      })
      .filter((b): b is CustomButtonConfig => !!b && b.category === '損傷');

    if (selectedDamageButtons.length !== 1) return;

    const baseName = btnName.replace(/^[左右上下]/, '');
    const prefix1 = directionType === '左右' ? '左' : '上';
    const prefix2 = directionType === '左右' ? '右' : '下';

    const name1 = `${prefix1}${baseName}`;
    const name2 = `${prefix2}${baseName}`;

    const nextSelections = currentCustomSelections.map((item) => {
      if (item === btnName || item.replace(/^[左右上下]/, '') === baseName) {
        return name1;
      }
      return item;
    });
    if (!nextSelections.includes(name2)) {
      nextSelections.push(name2);
    }

    const item1 = currentCustomDamages.find((d) => d.name === btnName || d.name.replace(/^[左右上下]/, '') === baseName) || {
      name: btnName,
      valueW: 0,
      valueL: 0,
    };

    const damage1: DamageItem = { ...item1, name: name1 };
    const damage2: DamageItem = { name: name2, valueW: 0, valueL: 0 };

    const nextDamages = currentCustomDamages.filter(
      (d) => d.name !== btnName && d.name.replace(/^[左右上下]/, '') !== baseName
    );
    nextDamages.push(damage1, damage2);

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        internalSelections: nextSelections,
        internalDamages: nextDamages,
      });
    } else {
      onChangeSelection({
        ...selection,
        externalSelections: nextSelections,
        externalDamages: nextDamages,
      });
    }
  };

  const handleAddCustomButton = () => {
    const name = newButtonName.trim();
    if (!name) return;
    if (customButtons.some((b) => b.name === name)) {
      alert('そのボタン名は既に登録されています。');
      return;
    }
    const newBtn: CustomButtonConfig = {
      id: `${isModeInternal ? 'int' : 'ext'}-btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      category: newButtonCategory,
    };
    onChangeCustomButtons([...customButtons, newBtn]);
    setNewButtonName('');
  };

  const handleToggleCategory = (id: string) => {
    const updated = customButtons.map((btn) => {
      if (btn.id === id) {
        const categories: CustomButtonCategory[] = ['損傷', '場所', '階数', '部位'];
        const currentIdx = categories.indexOf(btn.category || '損傷');
        const nextCat = categories[(currentIdx + 1) % categories.length];
        return { ...btn, category: nextCat };
      }
      return btn;
    });
    onChangeCustomButtons(updated);
  };

  const handleRemoveCustomButton = (id: string, name: string) => {
    if (!confirm(`「${name}」ボタンを削除してもよろしいですか？`)) return;
    onChangeCustomButtons(customButtons.filter((b) => b.id !== id));
    if (currentCustomSelections.some((item) => item === name || item.startsWith(name))) {
      const nextSelections = currentCustomSelections.filter((item) => !item.startsWith(name));
      const nextDamages = currentCustomDamages.filter((item) => item.name !== name);
      if (isModeInternal) {
        onChangeSelection({
          ...selection,
          internalSelections: nextSelections,
          internalDamages: nextDamages,
        });
      } else {
        onChangeSelection({
          ...selection,
          externalSelections: nextSelections,
          externalDamages: nextDamages,
        });
      }
    }
  };

  const handleMoveCustomButton = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= customButtons.length) return;
    const nextButtons = [...customButtons];
    const temp = nextButtons[index];
    nextButtons[index] = nextButtons[nextIndex];
    nextButtons[nextIndex] = temp;
    onChangeCustomButtons(nextButtons);
  };

  // ドラッグ＆ドロップ並び替え (HTML5 & タッチ長押し)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const fromIdx = draggedIdx !== null ? draggedIdx : Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromIdx) && fromIdx !== dropIdx && fromIdx >= 0 && fromIdx < customButtons.length) {
      const updated = [...customButtons];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(dropIdx, 0, moved);
      onChangeCustomButtons(updated);
    }
    setDraggedIdx(null);
  };

  const DIRECTION_OPTIONS = ['北', '西', '南', '東'];
  const PART_OPTIONS = ['壁', '腰', '軒', '塀', '土間'];
  const DAMAGE_OPTIONS = ['亀裂', '隙間', 'HC', '欠落', '目地切れ', '剥離'];

  return (
    <main className="main-content">
      {/* モード切替エリア & クリアボタン */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>モード:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['外部', '内部'] as SurveyType[]).map((m) => {
              const isSelected = currentMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  className={`btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChangeSelection({
                      ...selection,
                      mode: m,
                    });
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onClearCurrentLine}
          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
        >
          <RotateCcw size={14} />
          選択解除
        </button>
      </div>

      {isModeInternal ? (
        <>
          {/* ① 内部用カスタムボタン選択エリア */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
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
                内部用カスタムボタン
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※長押し/ドラッグで並び替え可能
              </span>
            </div>

            {customButtons.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#888', padding: '20px 0', textAlign: 'center' }}>
                ボタンが登録されていません。下エリアから追加してください。
              </p>
            ) : (
              <div className="button-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {customButtons.map((btnConfig, idx) => {
                  const baseName = btnConfig.name;
                  const isLocation = btnConfig.category === '場所';
                  const selectedIndex = currentCustomSelections.findIndex(
                    (item) =>
                      item === baseName ||
                      item.replace(/^[左右上下]/, '') === baseName ||
                      (isLocation && item.startsWith(baseName) && /[①-⑳]$/.test(item))
                  );
                  const isSelected = selectedIndex !== -1;
                  const displayName = isSelected ? currentCustomSelections[selectedIndex] : baseName;
                  const isDraggingThis = draggedIdx === idx;

                  return (
                    <button
                      key={btnConfig.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`btn custom-btn-item ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''}`}
                      onClick={() => handleToggleCustomSelection(baseName)}
                      style={{
                        height: '52px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{displayName}</span>
                        <span
                          className={`category-badge ${btnConfig.category === '場所'
                            ? 'category-location'
                            : btnConfig.category === '階数'
                              ? 'category-floor'
                              : btnConfig.category === '部位'
                                ? 'category-part'
                                : 'category-damage'
                            }`}
                        >
                          {btnConfig.category}
                        </span>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '4px',
                            fontSize: '0.65rem',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #222222',
                            fontWeight: 'bold',
                          }}
                        >
                          {selectedIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 内部用 場所グループ (建物ボタンと階数ボタンを横一列に配置) */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
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
              場所グループ
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
              {/* 建物ボタン */}
              <button
                type="button"
                className={`btn ${selection.location.isBuilding ? 'selected' : ''}`}
                onClick={handleToggleBuilding}
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
                      onChangeSelection({
                        ...selection,
                        location: { ...selection.location, floor1: val },
                      });
                    }}
                    style={{ height: '36px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(1)}
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
                      onChangeSelection({
                        ...selection,
                        location: { ...selection.location, floor2: val },
                      });
                    }}
                    style={{ height: '36px', fontSize: '0.9rem', minWidth: 0, padding: '0 2px' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor2Change(1)}
                    style={{ width: '28px', height: '36px', flexShrink: 0 }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 内部用 方向グループ（東西南北） */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
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
                方向グループ
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

          {/* ② 選択された「損傷」タイプの詳細入力（W / L 数値 & 全般/多数 プリセット） */}
          {(() => {
            const selectedCustomDamageNames = currentCustomSelections.filter((name) => {
              const baseName = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
              const btnConfig = customButtons.find((b) => b.name === name || b.name === baseName);
              return btnConfig?.category === '損傷';
            });

            if (selectedCustomDamageNames.length === 0) return null;

            return (
              <section
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#fff0f6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#d6336c' }}>
                  損傷詳細入力（選択中: {selectedCustomDamageNames.join('、')}）
                </div>

                {selectedCustomDamageNames.map((btnName) => {
                  const item = currentCustomDamages.find((d) => d.name === btnName) || {
                    name: btnName,
                    valueW: 0,
                    valueL: 0,
                  };

                  return (
                    <div
                      key={btnName}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '8px 10px',
                        border: '1px solid #fcc2d7',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>
                          ● {btnName}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className={`btn ${currentCustomDamages.some((d) => d.name.startsWith('左') || d.name.startsWith('右')) ? 'selected' : ''}`}
                            onClick={() => handleCustomDamageDirectionPreset(btnName, '左右')}
                            disabled={selectedCustomDamageNames.length !== 1}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              opacity: selectedCustomDamageNames.length !== 1 ? 0.5 : 1,
                              cursor: selectedCustomDamageNames.length !== 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            左右
                          </button>
                          <button
                            type="button"
                            className={`btn ${currentCustomDamages.some((d) => d.name.startsWith('上') || d.name.startsWith('下')) ? 'selected' : ''}`}
                            onClick={() => handleCustomDamageDirectionPreset(btnName, '上下')}
                            disabled={selectedCustomDamageNames.length !== 1}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              opacity: selectedCustomDamageNames.length !== 1 ? 0.5 : 1,
                              cursor: selectedCustomDamageNames.length !== 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            上下
                          </button>
                          <button
                            type="button"
                            className={`btn ${item.valueW === 50 ? 'selected' : ''}`}
                            onClick={() => handleCustomDamage50Set(btnName)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              fontWeight: item.valueW === 50 ? 'bold' : 'normal',
                            }}
                          >
                            50
                          </button>
                          {(['全般', '多数'] as const).map((presetType) => {
                            const isPresetSelected = item.preset === presetType;
                            return (
                              <button
                                key={presetType}
                                type="button"
                                className={`btn ${isPresetSelected ? 'selected' : ''}`}
                                onClick={() => handleCustomDamagePresetToggle(btnName, presetType)}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.75rem',
                                  height: '26px',
                                }}
                              >
                                {presetType}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!item.preset && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* 数値W */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                              数値W:
                            </span>
                            <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, -1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, -0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                -0.5
                              </button>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="stepper-input"
                                value={item.valueW || ''}
                                onChange={(e) => handleCustomDamageWInput(btnName, e.target.value)}
                                style={{ height: '32px', fontSize: '0.85rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                              />
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, 0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                +0.5
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, 1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>

                          {/* 数値L */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                              数値L:
                            </span>
                            <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, -1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, -0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                -0.5
                              </button>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="stepper-input"
                                value={item.valueL || ''}
                                onChange={(e) => handleCustomDamageLInput(btnName, e.target.value)}
                                style={{ height: '32px', fontSize: '0.85rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                              />
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, 0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                +0.5
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, 1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })()}

          {/* ③ 状況グループ */}
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
                状況・補足テキスト
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${selection.situationButton === '現況' ? 'selected' : ''}`}
                onClick={() => handleSituationToggle('現況')}
                style={{ height: '42px', fontSize: '0.95rem', padding: '0 12px', flexShrink: 0 }}
              >
                現況
              </button>

              <button
                type="button"
                className={`btn ${selection.situationButton === '全景' ? 'selected' : ''}`}
                onClick={() => handleSituationToggle('全景')}
                style={{ height: '34px', fontSize: '0.8rem', padding: '0 8px', flexShrink: 0 }}
              >
                全景
              </button>

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

          {/* ④ ボタン管理・種類設定と並び替え */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px' }}>
              カスタムボタン管理・種類設定
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="登録する文字列（例：床きしみ, 和室）"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomButton();
                    }
                  }}
                  style={{
                    flex: 1,
                    height: '36px',
                    borderRadius: '6px',
                    border: '2px solid var(--border-color)',
                    padding: '0 8px',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleAddCustomButton}
                  style={{ height: '36px', fontSize: '0.85rem', padding: '0 12px' }}
                >
                  追加
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>登録種別:</span>
                {(['損傷', '場所', '階数', '部位'] as CustomButtonCategory[]).map((cat) => (
                  <label key={cat} style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <input
                      type="radio"
                      name="newBtnCat"
                      checked={newButtonCategory === cat}
                      onChange={() => setNewButtonCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {customButtons.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '2px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                {customButtons.map((btnConfig, idx) => (
                  <div
                    key={btnConfig.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`custom-btn-item ${draggedIdx === idx ? 'dragging' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GripVertical size={16} color="#888" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{btnConfig.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(btnConfig.id)}
                        className={`category-badge ${btnConfig.category === '場所'
                          ? 'category-location'
                          : btnConfig.category === '階数'
                            ? 'category-floor'
                            : btnConfig.category === '部位'
                              ? 'category-part'
                              : 'category-damage'
                          }`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="クリックして種類切り替え"
                      >
                        {btnConfig.category} (切替)
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleMoveCustomButton(idx, -1)}
                        disabled={idx === 0}
                        style={{ padding: '0', fontSize: '0.75rem', height: '24px', width: '24px' }}
                        title="上に移動"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleMoveCustomButton(idx, 1)}
                        disabled={idx === customButtons.length - 1}
                        style={{ padding: '0', fontSize: '0.75rem', height: '24px', width: '24px' }}
                        title="下に移動"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveCustomButton(btnConfig.id, btnConfig.name)}
                        style={{ padding: '0 6px', fontSize: '0.7rem', height: '24px' }}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* 外部用カスタムボタン */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
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
                外部用カスタムボタン
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※長押し/ドラッグで並び替え可能
              </span>
            </div>

            {customButtons.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#888', padding: '20px 0', textAlign: 'center' }}>
                ボタンが登録されていません。下エリアから追加してください。
              </p>
            ) : (
              <div className="button-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {customButtons.map((btnConfig, idx) => {
                  const baseName = btnConfig.name;
                  const isLocation = btnConfig.category === '場所';
                  const selectedIndex = currentCustomSelections.findIndex(
                    (item) =>
                      item === baseName ||
                      item.replace(/^[左右上下]/, '') === baseName ||
                      (isLocation && item.startsWith(baseName) && /[①-⑳]$/.test(item))
                  );
                  const isSelected = selectedIndex !== -1;
                  const displayName = isSelected ? currentCustomSelections[selectedIndex] : baseName;
                  const isDraggingThis = draggedIdx === idx;

                  return (
                    <button
                      key={btnConfig.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`btn custom-btn-item ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''}`}
                      onClick={() => handleToggleCustomSelection(baseName)}
                      style={{
                        height: '52px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{displayName}</span>
                        <span
                          className={`category-badge ${btnConfig.category === '場所'
                            ? 'category-location'
                            : btnConfig.category === '階数'
                              ? 'category-floor'
                              : btnConfig.category === '部位'
                                ? 'category-part'
                                : 'category-damage'
                            }`}
                        >
                          {btnConfig.category}
                        </span>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '4px',
                            fontSize: '0.65rem',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #222222',
                            fontWeight: 'bold',
                          }}
                        >
                          {selectedIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* サブタイトル */}
          <div className="survey-title">
            <span style={{ fontSize: '0.95rem' }}>ボタン選択（①場所 ②方向 ③部位 ④損傷 ⑤状況）</span>
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

          {/* ③ 部位グループ */}
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
                ③ 部位グループ
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
                const isSelected = (selection.damages || []).some(
                  (d) => d.name === dmg || d.name.replace(/^[左右上下]/, '') === dmg
                );
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

                      {/* 「左右」「上下」「全般」「多数」ボタン */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className={`btn ${selection.damages.some((d) => d.name.startsWith('左') || d.name.startsWith('右')) ? 'selected' : ''}`}
                          onClick={() => handleDamageDirectionPreset('左右')}
                          disabled={selection.damages.length !== 1}
                          style={{
                            height: '28px',
                            fontSize: '0.75rem',
                            padding: '0 8px',
                            opacity: selection.damages.length !== 1 ? 0.5 : 1,
                            cursor: selection.damages.length !== 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          左右
                        </button>
                        <button
                          type="button"
                          className={`btn ${selection.damages.some((d) => d.name.startsWith('上') || d.name.startsWith('下')) ? 'selected' : ''}`}
                          onClick={() => handleDamageDirectionPreset('上下')}
                          disabled={selection.damages.length !== 1}
                          style={{
                            height: '28px',
                            fontSize: '0.75rem',
                            padding: '0 8px',
                            opacity: selection.damages.length !== 1 ? 0.5 : 1,
                            cursor: selection.damages.length !== 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          上下
                        </button>
                        <button
                          type="button"
                          className={`btn ${dmg.valueW === 50 ? 'selected' : ''}`}
                          onClick={() => handleDamage50Set(idx)}
                          style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px', fontWeight: dmg.valueW === 50 ? 'bold' : 'normal' }}
                        >
                          50
                        </button>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* 数値1W / 数値2W */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                            数値{idx + 1}W:
                          </span>
                          <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueWChange(idx, -1.0)}
                              style={{ flex: 1, height: '34px', padding: 0 }}
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueWChange(idx, -0.5)}
                              style={{ flex: 1, height: '34px', fontSize: '0.75rem', padding: 0 }}
                            >
                              -0.5
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              className="stepper-input"
                              value={dmg.valueW || ''}
                              placeholder="0"
                              onChange={(e) => handleDamageValueWInput(idx, e.target.value)}
                              style={{ height: '34px', fontSize: '0.9rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                            />
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueWChange(idx, 0.5)}
                              style={{ flex: 1, height: '34px', fontSize: '0.75rem', padding: 0 }}
                            >
                              +0.5
                            </button>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueWChange(idx, 1.0)}
                              style={{ flex: 1, height: '34px', padding: 0 }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* 数値1L / 数値2L */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                            数値{idx + 1}L:
                          </span>
                          <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueLChange(idx, -1.0)}
                              style={{ flex: 1, height: '34px', padding: 0 }}
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueLChange(idx, -0.5)}
                              style={{ flex: 1, height: '34px', fontSize: '0.75rem', padding: 0 }}
                            >
                              -0.5
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              className="stepper-input"
                              value={dmg.valueL || ''}
                              placeholder="0"
                              onChange={(e) => handleDamageValueLInput(idx, e.target.value)}
                              style={{ height: '34px', fontSize: '0.9rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                            />
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueLChange(idx, 0.5)}
                              style={{ flex: 1, height: '34px', fontSize: '0.75rem', padding: 0 }}
                            >
                              +0.5
                            </button>
                            <button
                              type="button"
                              className="btn stepper-btn"
                              onClick={() => handleDamageValueLChange(idx, 1.0)}
                              style={{ flex: 1, height: '34px', padding: 0 }}
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

          {/* 選択されたカスタム「損傷」タイプの詳細入力 */}
          {(() => {
            const selectedCustomDamageNames = currentCustomSelections.filter((name) => {
              const baseName = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
              const btnConfig = customButtons.find((b) => b.name === name || b.name === baseName);
              return btnConfig?.category === '損傷';
            });

            if (selectedCustomDamageNames.length === 0) return null;

            return (
              <section
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#fff0f6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#d6336c' }}>
                  外部カスタム損傷詳細入力（選択中: {selectedCustomDamageNames.join('、')}）
                </div>

                {selectedCustomDamageNames.map((btnName) => {
                  const item = currentCustomDamages.find((d) => d.name === btnName) || {
                    name: btnName,
                    valueW: 0,
                    valueL: 0,
                  };

                  return (
                    <div
                      key={btnName}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '8px 10px',
                        border: '1px solid #fcc2d7',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>
                          ● {btnName}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className={`btn ${currentCustomDamages.some((d) => d.name.startsWith('左') || d.name.startsWith('右')) ? 'selected' : ''}`}
                            onClick={() => handleCustomDamageDirectionPreset(btnName, '左右')}
                            disabled={selectedCustomDamageNames.length !== 1}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              opacity: selectedCustomDamageNames.length !== 1 ? 0.5 : 1,
                              cursor: selectedCustomDamageNames.length !== 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            左右
                          </button>
                          <button
                            type="button"
                            className={`btn ${currentCustomDamages.some((d) => d.name.startsWith('上') || d.name.startsWith('下')) ? 'selected' : ''}`}
                            onClick={() => handleCustomDamageDirectionPreset(btnName, '上下')}
                            disabled={selectedCustomDamageNames.length !== 1}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              opacity: selectedCustomDamageNames.length !== 1 ? 0.5 : 1,
                              cursor: selectedCustomDamageNames.length !== 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            上下
                          </button>
                          <button
                            type="button"
                            className={`btn ${item.valueW === 50 ? 'selected' : ''}`}
                            onClick={() => handleCustomDamage50Set(btnName)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              height: '26px',
                              fontWeight: item.valueW === 50 ? 'bold' : 'normal',
                            }}
                          >
                            50
                          </button>
                          {(['全般', '多数'] as const).map((presetType) => {
                            const isPresetSelected = item.preset === presetType;
                            return (
                              <button
                                key={presetType}
                                type="button"
                                className={`btn ${isPresetSelected ? 'selected' : ''}`}
                                onClick={() => handleCustomDamagePresetToggle(btnName, presetType)}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.75rem',
                                  height: '26px',
                                }}
                              >
                                {presetType}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!item.preset && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* 数値W */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                              数値W:
                            </span>
                            <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, -1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, -0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                -0.5
                              </button>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="stepper-input"
                                value={item.valueW || ''}
                                onChange={(e) => handleCustomDamageWInput(btnName, e.target.value)}
                                style={{ height: '32px', fontSize: '0.85rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                              />
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, 0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                +0.5
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageWChange(btnName, 1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>

                          {/* 数値L */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '38px', flexShrink: 0 }}>
                              数値L:
                            </span>
                            <div className="number-stepper" style={{ flex: 1, gap: '2px' }}>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, -1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, -0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                -0.5
                              </button>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="stepper-input"
                                value={item.valueL || ''}
                                onChange={(e) => handleCustomDamageLInput(btnName, e.target.value)}
                                style={{ height: '32px', fontSize: '0.85rem', width: '126px', flexShrink: 0, textAlign: 'center', padding: '0 2px' }}
                              />
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, 0.5)}
                                style={{ flex: 1, height: '32px', fontSize: '0.75rem', padding: 0 }}
                              >
                                +0.5
                              </button>
                              <button
                                type="button"
                                className="btn stepper-btn"
                                onClick={() => handleCustomDamageLChange(btnName, 1.0)}
                                style={{ flex: 1, height: '32px', padding: 0 }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })()}

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

          {/* 外部用カスタムボタン管理・種類設定 */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px' }}>
              外部用カスタムボタン管理・種類設定
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="登録する文字列（例：犬走, ひび割れ）"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomButton();
                    }
                  }}
                  style={{
                    flex: 1,
                    height: '36px',
                    borderRadius: '6px',
                    border: '2px solid var(--border-color)',
                    padding: '0 8px',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleAddCustomButton}
                  style={{ height: '36px', fontSize: '0.85rem', padding: '0 12px' }}
                >
                  追加
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>登録種別:</span>
                {(['損傷', '場所', '階数', '部位'] as CustomButtonCategory[]).map((cat) => (
                  <label key={cat} style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <input
                      type="radio"
                      name="newBtnCatExt"
                      checked={newButtonCategory === cat}
                      onChange={() => setNewButtonCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {customButtons.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '2px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                {customButtons.map((btnConfig, idx) => (
                  <div
                    key={btnConfig.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`custom-btn-item ${draggedIdx === idx ? 'dragging' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GripVertical size={16} color="#888" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{btnConfig.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(btnConfig.id)}
                        className={`category-badge ${btnConfig.category === '場所'
                          ? 'category-location'
                          : btnConfig.category === '階数'
                            ? 'category-floor'
                            : btnConfig.category === '部位'
                              ? 'category-part'
                              : 'category-damage'
                          }`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="クリックして種類切り替え"
                      >
                        {btnConfig.category} (切替)
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleMoveCustomButton(idx, -1)}
                        disabled={idx === 0}
                        style={{ padding: '0', fontSize: '0.75rem', height: '24px', width: '24px' }}
                        title="上に移動"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleMoveCustomButton(idx, 1)}
                        disabled={idx === customButtons.length - 1}
                        style={{ padding: '0', fontSize: '0.75rem', height: '24px', width: '24px' }}
                        title="下に移動"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveCustomButton(btnConfig.id, btnConfig.name)}
                        style={{ padding: '0 6px', fontSize: '0.7rem', height: '24px' }}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* 「場所」カテゴリの番号選択ポップアップ modal (提案2) */}
      {
        locationModalBtn && (() => {
          const baseName = locationModalBtn.name;
          const currentSelections = currentCustomSelections;
          const currentSelectedFullName = currentSelections.find(
            (item) => item === baseName || (item.startsWith(baseName) && /[①-⑳]$/.test(item))
          );

          const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

          return (
            <div className="modal-overlay" onClick={() => setLocationModalBtn(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                <div className="modal-header" style={{ paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={18} color="#0d6efd" />
                    「{baseName}」の番号を選択
                  </h3>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.82rem', color: '#666', margin: 0 }}>
                    付与する部屋番号（①〜⑨）を選択してください。
                  </p>

                  {/* 番号選択エリア */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 番号なし（ベース名称） */}
                    <button
                      type="button"
                      className={`btn ${currentSelectedFullName === baseName ? 'selected' : ''}`}
                      onClick={() => handleSelectLocationNumber('')}
                      style={{
                        height: '40px',
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        width: '100%',
                      }}
                    >
                      番号なし（{baseName}）
                    </button>

                    {/* ① 〜 ⑨ のグリッド */}
                    <div className="button-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {circleNumbers.map((num) => {
                        const fullName = `${baseName}${num}`;
                        const isSelected = currentSelectedFullName === fullName;

                        return (
                          <button
                            key={num}
                            type="button"
                            className={`btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectLocationNumber(num)}
                            style={{
                              height: '44px',
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '12px' }}>
                  {currentSelectedFullName ? (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleSelectLocationNumber(null)}
                      style={{ flex: 1, padding: '8px 12px' }}
                    >
                      選択解除
                    </button>
                  ) : (
                    <div style={{ flex: 1 }} />
                  )}

                  <button
                    type="button"
                    onClick={() => setLocationModalBtn(null)}
                    style={{ minWidth: '80px', padding: '8px 12px' }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      }
    </main >
  );
};
