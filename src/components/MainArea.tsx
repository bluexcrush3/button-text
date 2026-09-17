import React, { useState, useRef, useMemo } from 'react';
import { LineSelection, SurveyType, DamageItem, CustomButtonConfig, CustomButtonCategory, VoiceInputItem } from '../types';
import { MapPin, Compass, Box, AlertCircle, Plus, Minus, RotateCcw, FileText, GripVertical, Mic, Layers } from 'lucide-react';
import { VoiceInputModal } from './VoiceInputModal';

interface MainAreaProps {
  surveyType: SurveyType;
  selection: LineSelection;
  onChangeSelection: (newSelection: LineSelection) => void;
  onClearCurrentLine: () => void;
  internalCustomButtons: CustomButtonConfig[];
  externalCustomButtons: CustomButtonConfig[];
  inclinationCustomButtons: CustomButtonConfig[];
  onChangeInternalCustomButtons: (newButtons: CustomButtonConfig[]) => void;
  onChangeExternalCustomButtons: (newButtons: CustomButtonConfig[]) => void;
  onChangeInclinationCustomButtons: (newButtons: CustomButtonConfig[]) => void;
}

const DEFAULT_LOCATION_OPTIONS = ['建物', '外構', '土間', '塀', '植込', '擁壁'];
const DEFAULT_DIRECTION_OPTIONS = ['北', '西', '南', '東'];
const DEFAULT_PART_OPTIONS = ['壁', '腰', '軒', '屋根'];
const DEFAULT_DAMAGE_OPTIONS = ['現況', '亀裂', '隙間', 'HC', '欠落', '目地切', '剥離', '割れ', 'ズレ', '全景'];
const DEFAULT_INTERNAL_SITUATION_OPTIONS = ['現況', '全景'];

const STORAGE_KEY_LOCATION_ORDER = 'btn_text_gen_location_order_v2';
const STORAGE_KEY_DIRECTION_ORDER = 'btn_text_gen_direction_order_v2';
const STORAGE_KEY_PART_ORDER = 'btn_text_gen_part_order_v2';
const STORAGE_KEY_DAMAGE_ORDER = 'btn_text_gen_damage_order_v2';
const STORAGE_KEY_INTERNAL_SITUATION_ORDER = 'btn_text_gen_internal_situation_order_v2';

const loadOrderedList = (key: string, defaults: string[]): string[] => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validItems: string[] = [];
        parsed.forEach((item) => {
          if (typeof item === 'string' && item.trim() && !validItems.includes(item)) {
            validItems.push(item);
          }
        });
        defaults.forEach((item) => {
          if (!validItems.includes(item)) validItems.push(item);
        });
        return validItems;
      }
    }
  } catch (e) {
    // ignore
  }
  return defaults;
};

export const MainArea: React.FC<MainAreaProps> = ({
  surveyType,
  selection,
  onChangeSelection,
  onClearCurrentLine,
  internalCustomButtons,
  externalCustomButtons,
  inclinationCustomButtons,
  onChangeInternalCustomButtons,
  onChangeExternalCustomButtons,
  onChangeInclinationCustomButtons,
}) => {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const activeLocation =
    selection.location.selectedLocation ?? (selection.location.isBuilding ? '建物' : null);
  const isFloorDisabled = activeLocation === '塀' || activeLocation === '土間';

  // ② 場所グループハンドラー（1つのみ選択）
  const handleLocationToggle = (locName: string) => {
    const nextLoc = activeLocation === locName ? null : locName;
    onChangeSelection({
      ...selection,
      location: {
        ...selection.location,
        selectedLocation: nextLoc,
        isBuilding: nextLoc === '建物',
      },
    });
  };

  const handleFloor1Change = (delta: number) => {
    if (isFloorDisabled) return;
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
    if (isFloorDisabled) return;
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
    const baseName = damageName.replace(/^[左右上下]/, '');
    const exists = current.find(
      (d) => d.name === damageName || d.name.replace(/^[左右上下]/, '') === baseName
    );

    let next: DamageItem[];
    if (exists) {
      next = current.filter(
        (d) => d.name !== damageName && d.name.replace(/^[左右上下]/, '') !== baseName
      );
    } else {
      const newItem: DamageItem = { name: damageName, valueW: 0, valueL: 0 };
      if (current.length >= 2) {
        next = [current[1], newItem];
      } else {
        next = [...current, newItem];
      }
    }

    const activeDamageNames = new Set(next.map((d) => d.name.replace(/^[左右上下]/, '')));
    const nextCustomSelections = currentCustomSelections.filter((name) => {
      const customBase = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
      const btnConfig = displayedCustomButtons.find((b) => b.name === name || b.name === customBase);
      if (btnConfig?.category === '損傷') {
        return activeDamageNames.has(name) || activeDamageNames.has(customBase);
      }
      return true;
    });
    const nextCustomDamages = currentCustomDamages.filter((d) =>
      activeDamageNames.has(d.name) || activeDamageNames.has(d.name.replace(/^[左右上下]/, ''))
    );

    const nextSituationButton = next.length > 0 ? null : selection.situationButton;

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        damages: next,
        internalSelections: nextCustomSelections,
        internalDamages: nextCustomDamages,
        situationButton: nextSituationButton,
      });
    } else if (isModeInclination) {
      onChangeSelection({
        ...selection,
        damages: next,
        inclinationSelections: nextCustomSelections,
        situationButton: nextSituationButton,
      });
    } else {
      onChangeSelection({
        ...selection,
        damages: next,
        externalSelections: nextCustomSelections,
        externalDamages: nextCustomDamages,
        situationButton: nextSituationButton,
      });
    }
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

  // 損傷の「以下(<)」トグル切り替え
  const handleDamageLessThanToggle = (index: number) => {
    const current = [...(selection.damages || [])];
    if (!current[index]) return;

    const nextLessThan = !current[index].isLessThan;
    current[index] = { ...current[index], isLessThan: nextLessThan };

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
    const nextPreset = current[index].preset === '全般' ? null : current[index].preset;
    current[index] = { ...current[index], valueW: nextW, preset: nextPreset };

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
  const isModeInclination = currentMode === '傾斜';

  const customButtons = isModeInternal
    ? internalCustomButtons
    : isModeInclination
      ? inclinationCustomButtons
      : externalCustomButtons;

  const onChangeCustomButtons = isModeInternal
    ? onChangeInternalCustomButtons
    : isModeInclination
      ? onChangeInclinationCustomButtons
      : onChangeExternalCustomButtons;

  // 傾斜モード表示用: 傾斜カスタムボタン + 外部/内部の「場所」カテゴリボタン（重複排除）
  const displayedCustomButtons = useMemo(() => {
    if (isModeInternal) return internalCustomButtons;
    if (isModeInclination) {
      const incBtns = inclinationCustomButtons || [];
      const locationBtns: CustomButtonConfig[] = [];
      const seenNames = new Set(incBtns.map((b) => b.name));

      [...(internalCustomButtons || []), ...(externalCustomButtons || [])].forEach((b) => {
        if (b.category === '場所' && !seenNames.has(b.name)) {
          seenNames.add(b.name);
          locationBtns.push(b);
        }
      });
      return [...incBtns, ...locationBtns];
    }
    return externalCustomButtons;
  }, [isModeInternal, isModeInclination, internalCustomButtons, externalCustomButtons, inclinationCustomButtons]);

  const currentCustomSelections = isModeInternal
    ? (selection.internalSelections || [])
    : isModeInclination
      ? (selection.inclinationSelections || [])
      : (selection.externalSelections || []);

  const currentCustomDamages = isModeInternal
    ? (selection.internalDamages || [])
    : isModeInclination
      ? (selection.inclinationValues || [])
      : (selection.externalDamages || []);

  // 傾斜数値操作用
  const currentInclinationValues = selection.inclinationValues || [];

  const updateInclinationValues = (newValues: DamageItem[]) => {
    onChangeSelection({
      ...selection,
      inclinationValues: newValues,
    });
  };

  const handleInclinationValueChange = (index: number, delta: number) => {
    const list = [...currentInclinationValues];
    while (list.length <= index) {
      list.push({ name: `傾斜${list.length + 1}`, valueW: 0, valueL: 0 });
    }
    const curVal = list[index].valueW || 0;
    list[index] = {
      ...list[index],
      valueW: parseFloat((curVal + delta).toFixed(1)),
    };
    updateInclinationValues(list);
  };

  const handleInclinationValueInput = (index: number, rawVal: string) => {
    const list = [...currentInclinationValues];
    while (list.length <= index) {
      list.push({ name: `傾斜${list.length + 1}`, valueW: 0, valueL: 0 });
    }
    const parsed = parseFloat(rawVal) || 0;
    list[index] = {
      ...list[index],
      valueW: parsed,
    };
    updateInclinationValues(list);
  };

  const handleInclinationMinusToggle = (index: number) => {
    const list = [...currentInclinationValues];
    while (list.length <= index) {
      list.push({ name: `傾斜${list.length + 1}`, valueW: 0, valueL: 0 });
    }
    const curVal = list[index].valueW || 0;
    if (curVal === 0) {
      list[index] = {
        ...list[index],
        valueW: -1.0,
      };
    } else {
      list[index] = {
        ...list[index],
        valueW: parseFloat((-curVal).toFixed(1)),
      };
    }
    updateInclinationValues(list);
  };

  const handleInclinationDirectionToggle = (index: number, dir: string) => {
    const list = [...currentInclinationValues];
    while (list.length <= index) {
      list.push({ name: `傾斜${list.length + 1}`, valueW: 0, valueL: 0, directions: [] });
    }
    const currentDirs = list[index].directions || [];
    let nextDirs: string[];
    if (currentDirs.includes(dir)) {
      nextDirs = currentDirs.filter((d) => d !== dir);
    } else {
      nextDirs = [...currentDirs, dir];
    }

    const isSouthNorthBoth = (index === 0) && (nextDirs.includes('南') && nextDirs.includes('北'));
    const isEastWestBoth = (index === 1) && (nextDirs.includes('東') && nextDirs.includes('西'));
    const isBoth = isSouthNorthBoth || isEastWestBoth;

    list[index] = {
      ...list[index],
      directions: nextDirs,
      valueW: isBoth ? 0 : list[index].valueW,
    };
    updateInclinationValues(list);
  };

  const handleClearInclinationValues = () => {
    updateInclinationValues([]);
  };

  // 内部/外部/傾斜用ハンドラーとローカルステート
  const [newButtonName, setNewButtonName] = useState('');
  const [newButtonCategory, setNewButtonCategory] = useState<CustomButtonCategory>('部位');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [locationModalBtn, setLocationModalBtn] = useState<CustomButtonConfig | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 音声入力による文字列登録ハンドラー
  const handleRegisterVoiceText = (voiceText: string, category: CustomButtonCategory) => {
    const newItem: VoiceInputItem = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: voiceText,
      category,
    };
    const currentVoiceItems = selection.voiceItems || [];
    onChangeSelection({
      ...selection,
      voiceItems: [...currentVoiceItems, newItem],
    });
  };

  // 音声入力で追加された項目の削除ハンドラー
  const handleRemoveVoiceItem = (id: string) => {
    const currentVoiceItems = selection.voiceItems || [];
    onChangeSelection({
      ...selection,
      voiceItems: currentVoiceItems.filter((item) => item.id !== id),
    });
  };

  const handleToggleCustomSelection = (btnName: string) => {
    const btnConfig = displayedCustomButtons.find((b) => b.name === btnName);
    if (btnConfig?.isVoice || btnName === '音声入力') {
      setIsVoiceModalOpen(true);
      return;
    }
    if (btnConfig?.category === '場所') {
      setLocationModalBtn(btnConfig);
      return;
    }

    const baseName = btnName.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');

    if (btnConfig?.category === '損傷') {
      const currentDamages = selection.damages || [];
      const exists = currentDamages.find(
        (d) => d.name === btnName || d.name.replace(/^[左右上下]/, '') === baseName
      );

      let nextDamages: DamageItem[];
      let nextCustomSelections: string[];

      if (exists) {
        nextDamages = currentDamages.filter(
          (d) => d.name !== btnName && d.name.replace(/^[左右上下]/, '') !== baseName
        );
        nextCustomSelections = currentCustomSelections.filter(
          (item) => item !== btnName && item.replace(/^[左右上下]/, '') !== baseName
        );
      } else {
        const existingCustomDamage = currentCustomDamages.find(
          (d) => d.name === btnName || d.name.replace(/^[左右上下]/, '') === baseName
        );
        const newItem: DamageItem = existingCustomDamage || { name: btnName, valueW: 0, valueL: 0 };

        if (currentDamages.length >= 2) {
          nextDamages = [currentDamages[1], newItem];
        } else {
          nextDamages = [...currentDamages, newItem];
        }

        const activeDamageNames = new Set(nextDamages.map((d) => d.name.replace(/^[左右上下]/, '')));
        nextCustomSelections = currentCustomSelections.filter((name) => {
          const customBase = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
          const config = displayedCustomButtons.find((b) => b.name === name || b.name === customBase);
          if (config?.category === '損傷') {
            return activeDamageNames.has(name) || activeDamageNames.has(customBase);
          }
          return true;
        });
        if (!nextCustomSelections.includes(btnName)) {
          nextCustomSelections.push(btnName);
        }
      }

      const updatedCustomDamages = currentCustomDamages.filter(
        (d) => d.name !== btnName && d.name.replace(/^[左右上下]/, '') !== baseName
      );
      if (!exists) {
        const itemToStore = nextDamages.find(
          (d) => d.name === btnName || d.name.replace(/^[左右上下]/, '') === baseName
        ) || { name: btnName, valueW: 0, valueL: 0 };
        updatedCustomDamages.push(itemToStore);
      }

      if (isModeInternal) {
        onChangeSelection({
          ...selection,
          damages: nextDamages,
          internalSelections: nextCustomSelections,
          internalDamages: updatedCustomDamages,
          situationButton: nextDamages.length > 0 ? null : selection.situationButton,
        });
      } else if (isModeInclination) {
        onChangeSelection({
          ...selection,
          damages: nextDamages,
          inclinationSelections: nextCustomSelections,
          situationButton: nextDamages.length > 0 ? null : selection.situationButton,
        });
      } else {
        onChangeSelection({
          ...selection,
          damages: nextDamages,
          externalSelections: nextCustomSelections,
          externalDamages: updatedCustomDamages,
          situationButton: nextDamages.length > 0 ? null : selection.situationButton,
        });
      }
      return;
    }

    const isCurrentlySelected = currentCustomSelections.some(
      (item) => item === btnName || item.replace(/^[左右上下]/, '') === baseName
    );

    let nextSelections: string[];
    let nextDamages = [...currentCustomDamages];

    if (isCurrentlySelected) {
      nextSelections = currentCustomSelections.filter(
        (item) => item !== btnName && item.replace(/^[左右上下]/, '') === baseName
      );
      nextDamages = currentCustomDamages.filter(
        (d) => d.name !== btnName && d.name.replace(/^[左右上下]/, '') !== baseName
      );
    } else {
      nextSelections = [...currentCustomSelections, btnName];
    }

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        internalSelections: nextSelections,
        internalDamages: nextDamages,
      });
    } else if (isModeInclination) {
      onChangeSelection({
        ...selection,
        inclinationSelections: nextSelections,
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
    } else if (isModeInclination) {
      onChangeSelection({
        ...selection,
        inclinationSelections: next,
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
    const currentDamages = [...(selection.damages || [])];
    const updatedDamages = currentDamages.map((d) => {
      const match = newDamages.find(
        (cd) => cd.name === d.name || cd.name.replace(/^[左右上下]/, '') === d.name.replace(/^[左右上下]/, '')
      );
      return match ? { ...d, ...match } : d;
    });

    if (isModeInternal) {
      onChangeSelection({
        ...selection,
        damages: updatedDamages,
        internalDamages: newDamages,
      });
    } else {
      onChangeSelection({
        ...selection,
        damages: updatedDamages,
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
    const parsed = Math.max(0, parseFloat(rawVal) || 0);
    item.valueW = parsed;
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
    const parsed = Math.max(0, parseFloat(rawVal) || 0);
    item.valueL = parsed;
    updateCustomDamages(list);
  };

  const handleCustomDamageLessThanToggle = (btnName: string) => {
    const list = [...currentCustomDamages];
    let item = list.find((d) => d.name === btnName);
    if (!item) {
      item = { name: btnName, valueW: 0, valueL: 0 };
      list.push(item);
    }
    item.isLessThan = !item.isLessThan;
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
    if (item.preset === '全般') {
      item.preset = null;
    }
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
        return displayedCustomButtons.find((b) => b.name === name || b.name === baseName);
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
        damages: nextDamages,
        internalSelections: nextSelections,
        internalDamages: nextDamages,
      });
    } else if (isModeInclination) {
      onChangeSelection({
        ...selection,
        damages: nextDamages,
        inclinationSelections: nextSelections,
      });
    } else {
      onChangeSelection({
        ...selection,
        damages: nextDamages,
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
    const prefix = isModeInternal ? 'int' : isModeInclination ? 'inc' : 'ext';
    const newBtn: CustomButtonConfig = {
      id: `${prefix}-btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      category: newButtonCategory,
    };
    onChangeCustomButtons([...customButtons, newBtn]);
    setNewButtonName('');
  };

  const handleToggleCategory = (id: string) => {
    const target = customButtons.find((b) => b.id === id);
    if (target?.isVoice || target?.name === '音声入力') return;

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
    const target = customButtons.find((b) => b.id === id);
    if (target?.isVoice || name === '音声入力') {
      alert('音声入力ボタンは削除できません。');
      return;
    }
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
      } else if (isModeInclination) {
        onChangeSelection({
          ...selection,
          inclinationSelections: nextSelections,
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

  // 各グループ固定ボタンの並び順ステート（localStorage連動）
  const [locationOptions, setLocationOptions] = useState<string[]>(() =>
    loadOrderedList(STORAGE_KEY_LOCATION_ORDER, DEFAULT_LOCATION_OPTIONS)
  );
  const [directionOptions, setDirectionOptions] = useState<string[]>(() =>
    loadOrderedList(STORAGE_KEY_DIRECTION_ORDER, DEFAULT_DIRECTION_OPTIONS)
  );
  const [partOptions, setPartOptions] = useState<string[]>(() =>
    loadOrderedList(STORAGE_KEY_PART_ORDER, DEFAULT_PART_OPTIONS)
  );
  const [damageOptions, setDamageOptions] = useState<string[]>(() =>
    loadOrderedList(STORAGE_KEY_DAMAGE_ORDER, DEFAULT_DAMAGE_OPTIONS)
  );
  const [internalSituationOptions, setInternalSituationOptions] = useState<string[]>(() =>
    loadOrderedList(STORAGE_KEY_INTERNAL_SITUATION_ORDER, DEFAULT_INTERNAL_SITUATION_OPTIONS)
  );

  // ドラッグ中アイテムの状態（カスタムまたは固定ボタン）
  const [draggedItem, setDraggedItem] = useState<{ type: string; key: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // 長押し＆タッチ操作管理用ref
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const touchDraggedItemRef = useRef<{ type: string; key: string } | null>(null);
  const currentDragOverTargetRef = useRef<string | null>(null);

  const handleCustomButtonDrop = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = customButtons.findIndex((b) => b.id === fromId);
    const toIdx = customButtons.findIndex((b) => b.id === toId);
    if (fromIdx !== -1 && toIdx !== -1) {
      const updated = [...customButtons];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      onChangeCustomButtons(updated);
    }
  };

  const reorderItemInList = (
    list: string[],
    defaults: string[],
    customNames: string[],
    fromName: string,
    toName: string
  ): string[] => {
    if (fromName === toName) return list;
    const next = [...list];
    const allAvailable = [...defaults, ...customNames];
    allAvailable.forEach((name) => {
      if (!next.includes(name)) next.push(name);
    });
    const fromIdx = next.indexOf(fromName);
    const toIdx = next.indexOf(toName);
    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
    }
    return next;
  };

  const handleLocationDrop = (fromName: string, toName: string) => {
    const customNames = displayedCustomButtons
      .filter((b) => b.category === '場所' && !b.isVoice && b.name !== '音声入力')
      .map((b) => b.name);
    const next = reorderItemInList(locationOptions, DEFAULT_LOCATION_OPTIONS, customNames, fromName, toName);
    setLocationOptions(next);
    localStorage.setItem(STORAGE_KEY_LOCATION_ORDER, JSON.stringify(next));
  };

  const handleDirectionDrop = (fromName: string, toName: string) => {
    if (fromName === toName) return;
    const fromIdx = directionOptions.indexOf(fromName);
    const toIdx = directionOptions.indexOf(toName);
    if (fromIdx !== -1 && toIdx !== -1) {
      const next = [...directionOptions];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setDirectionOptions(next);
      localStorage.setItem(STORAGE_KEY_DIRECTION_ORDER, JSON.stringify(next));
    }
  };

  const handlePartDrop = (fromName: string, toName: string) => {
    const customNames = displayedCustomButtons
      .filter((b) => (b.category || '部位') === '部位' && !b.isVoice && b.name !== '音声入力')
      .map((b) => b.name);
    const next = reorderItemInList(partOptions, DEFAULT_PART_OPTIONS, customNames, fromName, toName);
    setPartOptions(next);
    localStorage.setItem(STORAGE_KEY_PART_ORDER, JSON.stringify(next));
  };

  const handleDamageDrop = (fromName: string, toName: string) => {
    const customNames = displayedCustomButtons
      .filter((b) => b.category === '損傷' && !b.isVoice && b.name !== '音声入力')
      .map((b) => b.name);
    const defaults = isModeInternal ? DEFAULT_INTERNAL_SITUATION_OPTIONS : DEFAULT_DAMAGE_OPTIONS;
    const next = reorderItemInList(damageOptions, defaults, customNames, fromName, toName);
    setDamageOptions(next);
    localStorage.setItem(STORAGE_KEY_DAMAGE_ORDER, JSON.stringify(next));
  };

  const handleInternalSituationDrop = (fromName: string, toName: string) => {
    if (fromName === toName) return;
    const fromIdx = internalSituationOptions.indexOf(fromName);
    const toIdx = internalSituationOptions.indexOf(toName);
    if (fromIdx !== -1 && toIdx !== -1) {
      const next = [...internalSituationOptions];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setInternalSituationOptions(next);
      localStorage.setItem(STORAGE_KEY_INTERNAL_SITUATION_ORDER, JSON.stringify(next));
    }
  };

  const executeDrop = (type: string, fromKey: string, toKey: string) => {
    if (type.startsWith('custom-')) {
      handleCustomButtonDrop(fromKey, toKey);
    } else if (type === 'location') {
      handleLocationDrop(fromKey, toKey);
    } else if (type === 'direction') {
      handleDirectionDrop(fromKey, toKey);
    } else if (type === 'part') {
      handlePartDrop(fromKey, toKey);
    } else if (type === 'damage') {
      handleDamageDrop(fromKey, toKey);
    } else if (type === 'internal-situation') {
      handleInternalSituationDrop(fromKey, toKey);
    }
  };

  const handleItemTouchStart = (type: string, key: string, e: React.TouchEvent) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isTouchDraggingRef.current = false;
    touchDraggedItemRef.current = { type, key };
    currentDragOverTargetRef.current = null;

    touchTimerRef.current = setTimeout(() => {
      isTouchDraggingRef.current = true;
      setDraggedItem({ type, key });
      try {
        if (navigator.vibrate) navigator.vibrate(40);
      } catch (err) { }
    }, 250);
  };

  const handleItemTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !touchDraggedItemRef.current) return;
    const touch = e.touches[0];

    if (!isTouchDraggingRef.current) {
      const dist = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      );
      if (dist > 10) {
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      }
      return;
    }

    if (e.cancelable) e.preventDefault();

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetEl = el?.closest(`[data-drag-type="${touchDraggedItemRef.current.type}"]`);
    if (targetEl) {
      const targetKey = targetEl.getAttribute('data-drag-key');
      if (targetKey && targetKey !== touchDraggedItemRef.current.key) {
        currentDragOverTargetRef.current = targetKey;
        setDragOverTarget(targetKey);
        return;
      }
    }
    currentDragOverTargetRef.current = null;
    setDragOverTarget(null);
  };

  const handleItemTouchEnd = (e: React.TouchEvent) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isTouchDraggingRef.current) {
      if (e.cancelable) e.preventDefault();
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);

      if (touchDraggedItemRef.current && currentDragOverTargetRef.current) {
        executeDrop(
          touchDraggedItemRef.current.type,
          touchDraggedItemRef.current.key,
          currentDragOverTargetRef.current
        );
      }
    }

    isTouchDraggingRef.current = false;
    touchDraggedItemRef.current = null;
    currentDragOverTargetRef.current = null;
    touchStartPosRef.current = null;
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const getDragProps = (type: string, key: string, isDisabled: boolean = false) => {
    if (isDisabled) return { dragClass: '', cursorStyle: {}, dragEvents: {} };
    const isDragging = draggedItem?.type === type && draggedItem?.key === key;
    const isTarget = dragOverTarget === key && draggedItem?.type === type && !isDragging;

    return {
      dragClass: `custom-btn-item ${isDragging ? 'dragging' : ''} ${isTarget ? 'drag-target' : ''}`,
      cursorStyle: { cursor: 'grab' },
      dragEvents: {
        draggable: true,
        'data-drag-type': type,
        'data-drag-key': key,
        onDragStart: (e: React.DragEvent) => {
          setDraggedItem({ type, key });
          e.dataTransfer.setData('text/plain', JSON.stringify({ type, key }));
          e.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (e: React.DragEvent) => {
          if (draggedItem?.type === type && draggedItem?.key !== key) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverTarget(key);
          }
        },
        onDragLeave: () => {
          if (dragOverTarget === key) setDragOverTarget(null);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          if (draggedItem?.type === type && draggedItem?.key !== key) {
            executeDrop(type, draggedItem.key, key);
          }
          setDraggedItem(null);
          setDragOverTarget(null);
        },
        onDragEnd: () => {
          setDraggedItem(null);
          setDragOverTarget(null);
        },
        onTouchStart: (e: React.TouchEvent) => handleItemTouchStart(type, key, e),
        onTouchMove: handleItemTouchMove,
        onTouchEnd: handleItemTouchEnd,
      },
    };
  };

  // 各グループへカスタムボタンを割り振って描画するヘルパー
  const renderCustomButtonsForCategory = (
    cat: CustomButtonCategory,
    buttonStyle: React.CSSProperties,
    gridColumns: string = 'repeat(4, 1fr)',
    isDisabled: boolean = false
  ) => {
    const btns = displayedCustomButtons.filter(
      (b) => (b.category || '部位') === cat && !b.isVoice && b.name !== '音声入力'
    );
    if (btns.length === 0) return null;

    return (
      <div
        className="button-grid-3"
        style={{
          gridTemplateColumns: gridColumns,
          gap: '6px',
          marginTop: '6px',
        }}
      >
        {btns.map((btnConfig) => {
          const isVoice = btnConfig.isVoice || btnConfig.name === '音声入力';
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

          if (isVoice) {
            return (
              <button
                key={btnConfig.id}
                type="button"
                className="btn"
                onClick={() => setIsVoiceModalOpen(true)}
                style={{
                  ...buttonStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  borderColor: '#6366f1',
                  borderWidth: '2px',
                  color: '#3730a3',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                <Mic size={16} color="#4f46e5" />
                <span>音声入力</span>
              </button>
            );
          }

          const { dragClass, cursorStyle, dragEvents } = getDragProps(`custom-${cat}`, btnConfig.id, isDisabled);

          return (
            <button
              key={btnConfig.id}
              type="button"
              disabled={isDisabled}
              className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
              onClick={() => {
                if (suppressClickRef.current) return;
                handleToggleCustomSelection(baseName);
              }}
              {...dragEvents}
              style={{
                ...buttonStyle,
                position: 'relative',
                cursor: isDisabled ? 'not-allowed' : 'grab',
                opacity: isDisabled ? 0.5 : 1,
                ...cursorStyle,
              }}
            >
              {displayName}
              {isSelected && selectedIndex !== -1 && (
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
    );
  };

  // 各グループへ既存ボタン＋カスタムボタンを統合して描画するヘルパー
  const renderUnifiedCategoryButtons = (
    cat: CustomButtonCategory,
    defaultOptions: string[],
    orderedOptions: string[],
    dragType: string,
    buttonStyle: React.CSSProperties,
    gridColumns: string = 'repeat(4, 1fr)',
    isDisabled: boolean = false
  ) => {
    const customBtns = displayedCustomButtons.filter(
      (b) => (b.category || '部位') === cat && !b.isVoice && b.name !== '音声入力'
    );
    const customMap = new Map(customBtns.map((b) => [b.name, b]));

    const allAvailableNames = new Set([...defaultOptions, ...customBtns.map((b) => b.name)]);

    const orderedList: string[] = [];
    orderedOptions.forEach((name) => {
      if (allAvailableNames.has(name) && !orderedList.includes(name)) {
        orderedList.push(name);
      }
    });
    allAvailableNames.forEach((name) => {
      if (!orderedList.includes(name)) {
        orderedList.push(name);
      }
    });

    if (orderedList.length === 0) return null;

    return (
      <div
        className="button-grid-3"
        style={{
          gridTemplateColumns: gridColumns,
          gap: '6px',
          marginTop: '6px',
        }}
      >
        {orderedList.map((btnName) => {
          const customConfig = customMap.get(btnName);
          const { dragClass, cursorStyle, dragEvents } = getDragProps(dragType, btnName, isDisabled);

          if (customConfig) {
            const isVoice = customConfig.isVoice || customConfig.name === '音声入力';
            const baseName = customConfig.name;
            const isLocation = customConfig.category === '場所';
            const selectedIndex = currentCustomSelections.findIndex(
              (item) =>
                item === baseName ||
                item.replace(/^[左右上下]/, '') === baseName ||
                (isLocation && item.startsWith(baseName) && /[①-⑳]$/.test(item))
            );
            const isSelected = selectedIndex !== -1;
            const displayName = isSelected ? currentCustomSelections[selectedIndex] : baseName;

            if (isVoice) {
              return (
                <button
                  key={customConfig.id}
                  type="button"
                  className="btn"
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{
                    ...buttonStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                    borderColor: '#6366f1',
                    borderWidth: '2px',
                    color: '#3730a3',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  <Mic size={16} color="#4f46e5" />
                  <span>音声入力</span>
                </button>
              );
            }

            return (
              <button
                key={customConfig.id}
                type="button"
                disabled={isDisabled}
                className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  handleToggleCustomSelection(baseName);
                }}
                {...dragEvents}
                style={{
                  ...buttonStyle,
                  position: 'relative',
                  cursor: isDisabled ? 'not-allowed' : 'grab',
                  opacity: isDisabled ? 0.5 : 1,
                  ...cursorStyle,
                }}
              >
                {displayName}
                {isSelected && selectedIndex !== -1 && (
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
          } else {
            if (cat === '場所') {
              const isSelected = activeLocation === btnName;
              return (
                <button
                  key={btnName}
                  type="button"
                  disabled={isDisabled}
                  className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    handleLocationToggle(btnName);
                  }}
                  {...dragEvents}
                  style={{
                    ...buttonStyle,
                    fontWeight: 'bold',
                    cursor: isDisabled ? 'not-allowed' : 'grab',
                    opacity: isDisabled ? 0.5 : 1,
                    ...cursorStyle,
                  }}
                >
                  {btnName}
                </button>
              );
            } else if (cat === '部位') {
              const isSelected = selection.part === btnName;
              return (
                <button
                  key={btnName}
                  type="button"
                  disabled={isDisabled}
                  className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    handlePartToggle(btnName);
                  }}
                  {...dragEvents}
                  style={{
                    ...buttonStyle,
                    cursor: isDisabled ? 'not-allowed' : 'grab',
                    opacity: isDisabled ? 0.5 : 1,
                    ...cursorStyle,
                  }}
                >
                  {btnName}
                </button>
              );
            } else if (cat === '損傷') {
              if (btnName === '現況' || btnName === '全景') {
                const isSelected = selection.situationButton === btnName;
                return (
                  <button
                    key={btnName}
                    type="button"
                    disabled={isDisabled}
                    className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      handleSituationToggle(btnName as '現況' | '全景');
                    }}
                    {...dragEvents}
                    style={{
                      ...buttonStyle,
                      fontWeight: 'bold',
                      cursor: isDisabled ? 'not-allowed' : 'grab',
                      opacity: isDisabled ? 0.5 : 1,
                      ...cursorStyle,
                    }}
                  >
                    {btnName}
                  </button>
                );
              }

              const isSelected = (selection.damages || []).some(
                (d) => d.name === btnName || d.name.replace(/^[左右上下]/, '') === btnName
              );
              return (
                <button
                  key={btnName}
                  type="button"
                  disabled={isDisabled}
                  className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    handleDamageToggle(btnName);
                  }}
                  {...dragEvents}
                  style={{
                    ...buttonStyle,
                    cursor: isDisabled ? 'not-allowed' : 'grab',
                    opacity: isDisabled ? 0.5 : 1,
                    ...cursorStyle,
                  }}
                >
                  {btnName}
                </button>
              );
            }
            return null;
          }
        })}
      </div>
    );
  };

  return (
    <main className="main-content">
      {/* モード切替エリア & クリアボタン */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>モード:</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {(['外部', '内部', '傾斜'] as SurveyType[]).map((m) => {
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

            {/* モードボタン（外部/内部/傾斜）の隣に音声入力ボタンを配置 */}
            <button
              type="button"
              className="btn"
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderColor: '#6366f1',
                borderWidth: '2px',
                color: '#3730a3',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <Mic size={14} color="#4f46e5" />
              <span>音声入力</span>
            </button>
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

      {/* 音声入力で追加された項目タグ一覧 */}
      {selection.voiceItems && selection.voiceItems.length > 0 && (
        <div
          style={{
            backgroundColor: '#f5f3ff',
            border: '1.5px solid #c7d2fe',
            borderRadius: '8px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mic size={14} />
              音声入力で追加された項目 ({selection.voiceItems.length}件):
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selection.voiceItems.map((item) => (
              <span
                key={item.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #818cf8',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  color: '#312e81',
                }}
              >
                <span
                  className={`category-badge ${item.category === '場所'
                    ? 'category-location'
                    : item.category === '階数'
                      ? 'category-floor'
                      : item.category === '部位'
                        ? 'category-part'
                        : 'category-damage'
                    }`}
                  style={{ fontSize: '0.62rem', padding: '0 4px' }}
                >
                  {item.category}
                </span>
                <span>{item.text}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVoiceItem(item.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '0 2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    lineHeight: 1,
                    marginLeft: '2px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {isModeInternal ? (
        <>
          {/* ① 内部用 階数グループ */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: isFloorDisabled ? '#f0f0f0' : '#ffffff',
              opacity: isFloorDisabled ? 0.5 : 1,
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
              <Layers size={18} />
              ① 階数グループ
              {isFloorDisabled && (
                <span style={{ fontSize: '0.75rem', color: '#d9534f', marginLeft: 'auto' }}>
                  ※ 塀・土間選択中のため無効
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
              {/* 階数① */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階①</span>
                <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(-1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={selection.location.floor1 || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (!isFloorDisabled) {
                        onChangeSelection({
                          ...selection,
                          location: { ...selection.location, floor1: val },
                        });
                      }
                    }}
                    disabled={isFloorDisabled}
                    style={{ height: '38px', fontSize: '0.95rem', minWidth: 0, padding: '0 4px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 階数② */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階②</span>
                <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor2Change(-1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={selection.location.floor2 || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (!isFloorDisabled) {
                        onChangeSelection({
                          ...selection,
                          location: { ...selection.location, floor2: val },
                        });
                      }
                    }}
                    disabled={isFloorDisabled}
                    style={{ height: '38px', fontSize: '0.95rem', minWidth: 0, padding: '0 4px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor2Change(1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 階数カスタムボタン */}
            {renderCustomButtonsForCategory('階数', { height: '38px', fontSize: '0.9rem', fontWeight: 'bold' }, 'repeat(4, 1fr)', isFloorDisabled)}
          </section>

          {/* ② 内部用 場所グループ */}
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
              ② 場所グループ
            </div>

            {/* 場所ボタン */}
            {renderUnifiedCategoryButtons('場所', DEFAULT_LOCATION_OPTIONS, locationOptions, 'location', { height: '48px', fontSize: '0.95rem', padding: '4px', fontWeight: 'bold' }, 'repeat(6, 1fr)')}
          </section>

          {/* ③ 内部用 方向グループ（東西南北） */}
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
                ③ 方向グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※最大2つ選択可
              </span>
            </div>

            <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {directionOptions.map((dir) => {
                const isSelected = selection.directions.includes(dir);
                const { dragClass, cursorStyle, dragEvents } = getDragProps('direction', dir);
                return (
                  <button
                    key={dir}
                    type="button"
                    className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      handleDirectionToggle(dir);
                    }}
                    {...dragEvents}
                    style={{ height: '48px', fontSize: '1.05rem', ...cursorStyle }}
                  >
                    {dir}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ④ 内部用 部位グループ */}
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
              <Box size={18} />
              ④ 部位グループ
            </div>

            {renderUnifiedCategoryButtons('部位', DEFAULT_PART_OPTIONS, partOptions, 'part', { height: '48px', fontSize: '0.95rem', padding: '4px' }, 'repeat(4, 1fr)') || (
              <p style={{ fontSize: '0.85rem', color: '#888', margin: 0, padding: '8px 0', textAlign: 'center' }}>
                部位ボタンが登録されていません。下エリアから追加してください。
              </p>
            )}
          </section>

          {/* ⑤ 内部用 損傷グループ */}
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
                ⑤ 損傷グループ
              </span>
            </div>

            {renderUnifiedCategoryButtons('損傷', internalSituationOptions, damageOptions, 'damage', { height: '48px', fontSize: '1rem' }, 'repeat(5, 1fr)')}

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
                          className={`btn ${dmg.isLessThan ? 'selected' : ''}`}
                          onClick={() => handleDamageLessThanToggle(idx)}
                          style={{ height: '28px', fontSize: '0.8rem', padding: '0 8px', fontWeight: 'bold' }}
                          title="以下 (＜) を指定"
                        >
                          &lt;
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

                    {/* 「全般」が未選択の場合のみ数値(W/L)入力ボックスを表示（「多数」選択時も入力可能） */}
                    {dmg.preset !== '全般' && (
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
              <button
                type="button"
                className={`btn ${selection.situationText === '現場より撮影' ? 'selected' : ''}`}
                onClick={() =>
                  onChangeSelection({
                    ...selection,
                    situationText: '現場より撮影',
                  })
                }
                style={{
                  height: '42px',
                  padding: '0 16px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                現場
              </button>
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
                {customButtons.map((btnConfig, idx) => {
                  const isVoice = btnConfig.isVoice || btnConfig.name === '音声入力';

                  if (isVoice) {
                    return (
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
                          backgroundColor: '#f5f3ff',
                          borderRadius: '4px',
                          border: '1.5px solid #818cf8',
                          cursor: 'grab',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GripVertical size={16} color="#6366f1" />
                          <Mic size={15} color="#4f46e5" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#312e81' }}>{btnConfig.name}</span>
                          <span
                            className="category-badge"
                            style={{
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                            }}
                          >
                            音声 (固定)
                          </span>
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
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', padding: '0 4px' }}>
                            削除不可
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : isModeInclination ? (
        <>
          {/* ① 傾斜用 階数グループ */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: isFloorDisabled ? '#f0f0f0' : '#ffffff',
              opacity: isFloorDisabled ? 0.5 : 1,
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
              <Layers size={18} />
              ① 階数グループ
              {isFloorDisabled && (
                <span style={{ fontSize: '0.75rem', color: '#d9534f', marginLeft: 'auto' }}>
                  ※ 塀・土間選択中のため無効
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
              {/* 階数① */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階①</span>
                <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '4px' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(-1)}
                    disabled={isFloorDisabled}
                    style={{ width: '36px', height: '38px', flexShrink: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={selection.location.floor1 || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (!isFloorDisabled) {
                        onChangeSelection({
                          ...selection,
                          location: { ...selection.location, floor1: val },
                        });
                      }
                    }}
                    disabled={isFloorDisabled}
                    style={{ height: '38px', fontSize: '1rem', minWidth: 0, padding: '0 4px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(1)}
                    disabled={isFloorDisabled}
                    style={{ width: '36px', height: '38px', flexShrink: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 階数カスタムボタン */}
            {renderCustomButtonsForCategory('階数', { height: '38px', fontSize: '0.9rem', fontWeight: 'bold' }, 'repeat(4, 1fr)', isFloorDisabled)}
          </section>

          {/* ② 傾斜用 場所グループ */}
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
              ② 場所グループ
            </div>

            {/* 場所ボタン */}
            {renderUnifiedCategoryButtons('場所', DEFAULT_LOCATION_OPTIONS, locationOptions, 'location', { height: '48px', fontSize: '0.95rem', padding: '4px', fontWeight: 'bold' }, 'repeat(6, 1fr)')}
          </section>

          {/* ③ 傾斜用 方向グループ */}
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
                ③ 方向グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※最大2つ選択可
              </span>
            </div>

            <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {directionOptions.map((dir) => {
                const isSelected = selection.directions.includes(dir);
                const { dragClass, cursorStyle, dragEvents } = getDragProps('direction', dir);
                return (
                  <button
                    key={dir}
                    type="button"
                    className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      handleDirectionToggle(dir);
                    }}
                    {...dragEvents}
                    style={{ height: '48px', fontSize: '1.05rem', ...cursorStyle }}
                  >
                    {dir}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ④ 傾斜用 部位グループ */}
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
              <Box size={18} />
              ④ 部位グループ
            </div>

            {renderUnifiedCategoryButtons('部位', DEFAULT_PART_OPTIONS, partOptions, 'part', { height: '48px', fontSize: '0.95rem', padding: '4px' }, 'repeat(4, 1fr)') || (
              <p style={{ fontSize: '0.85rem', color: '#888', margin: 0, padding: '8px 0', textAlign: 'center' }}>
                部位ボタンが登録されていません。下エリアから追加してください。
              </p>
            )}
          </section>

          {/* ④ 傾斜数値入力セクション（数値1 / 数値2） */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={18} color="#16a34a" />
                傾斜数値入力（傾斜値）
              </span>
              <button
                type="button"
                onClick={handleClearInclinationValues}
                style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#64748b' }}
              >
                数値クリア
              </button>
            </div>

            {[0, 1].map((idx) => {
              const item = currentInclinationValues[idx] || { name: `傾斜${idx + 1}`, valueW: 0, valueL: 0, directions: [] };
              const dirs = item.directions || [];
              const isNegative = (item.valueW || 0) < 0;

              const dirButtons = idx === 0 ? ['南', '北'] : ['東', '西'];
              const isSouthNorthBoth = idx === 0 && dirs.includes('南') && dirs.includes('北');
              const isEastWestBoth = idx === 1 && dirs.includes('東') && dirs.includes('西');
              const isBoth = isSouthNorthBoth || isEastWestBoth;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    backgroundColor: isBoth ? '#fef2f2' : '#ffffff',
                    borderRadius: '6px',
                    border: isBoth ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '46px', color: isBoth ? '#991b1b' : '#166534', flexShrink: 0 }}>
                    数値{idx + 1}:
                  </span>

                  {/* 方向ボタン（数値1: 南/北, 数値2: 東/西） */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {dirButtons.map((dir) => {
                      const isDirSelected = dirs.includes(dir);
                      return (
                        <button
                          key={dir}
                          type="button"
                          className={`btn ${isDirSelected ? 'selected' : ''}`}
                          onClick={() => handleInclinationDirectionToggle(idx, dir)}
                          style={{
                            height: '36px',
                            minWidth: '36px',
                            padding: '0 8px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {dir}
                        </button>
                      );
                    })}
                  </div>

                  {/* マイナス (－) 切り替えボタン */}
                  <button
                    type="button"
                    className={`btn ${isNegative ? 'selected' : ''}`}
                    onClick={() => handleInclinationMinusToggle(idx)}
                    disabled={isBoth}
                    style={{
                      height: '36px',
                      width: '36px',
                      fontSize: '1.1rem',
                      padding: 0,
                      fontWeight: 'bold',
                      flexShrink: 0,
                      opacity: isBoth ? 0.4 : 1,
                      cursor: isBoth ? 'not-allowed' : 'pointer',
                    }}
                    title="マイナス符号 (－) を切り替え"
                  >
                    －
                  </button>

                  <div className="number-stepper" style={{ flex: 1, gap: '4px', opacity: isBoth ? 0.4 : 1 }}>
                    <button
                      type="button"
                      className="btn stepper-btn"
                      onClick={() => handleInclinationValueChange(idx, -1.0)}
                      disabled={isBoth}
                      style={{ flex: 1, height: '36px', padding: 0, fontSize: '0.85rem', fontWeight: 'bold', cursor: isBoth ? 'not-allowed' : 'pointer' }}
                    >
                      -1.0
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      className="stepper-input"
                      disabled={isBoth}
                      value={isBoth ? '' : (item.valueW !== undefined && item.valueW !== 0 ? item.valueW : (item.valueW === 0 ? '' : item.valueW))}
                      placeholder={isBoth ? (idx === 0 ? '南北0' : '東西0') : '0'}
                      onChange={(e) => handleInclinationValueInput(idx, e.target.value)}
                      style={{
                        height: '36px',
                        fontSize: '1rem',
                        width: '90px',
                        flexShrink: 0,
                        textAlign: 'center',
                        padding: '0 2px',
                        fontWeight: 'bold',
                        cursor: isBoth ? 'not-allowed' : 'text',
                        backgroundColor: isBoth ? '#f1f5f9' : '#ffffff',
                      }}
                    />
                    <button
                      type="button"
                      className="btn stepper-btn"
                      onClick={() => handleInclinationValueChange(idx, 1.0)}
                      disabled={isBoth}
                      style={{ flex: 1, height: '36px', padding: 0, fontSize: '0.85rem', fontWeight: 'bold', cursor: isBoth ? 'not-allowed' : 'pointer' }}
                    >
                      +1.0
                    </button>
                  </div>
                </div>
              );
            })}
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <button
                type="button"
                className={`btn ${selection.situationText === '現場より撮影' ? 'selected' : ''}`}
                onClick={() =>
                  onChangeSelection({
                    ...selection,
                    situationText: '現場より撮影',
                  })
                }
                style={{
                  height: '42px',
                  padding: '0 16px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                現場
              </button>
            </div>
          </section>

          {/* ⑥ 傾斜用カスタムボタン管理エリア */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#fafafa',
              marginTop: '8px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '10px' }}>
              傾斜用カスタムボタンの追加・編集
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  placeholder="新しいボタン名..."
                  style={{
                    flex: 1,
                    height: '36px',
                    padding: '0 8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '0.9rem',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomButton();
                  }}
                />
                <button
                  type="button"
                  className="btn selected"
                  onClick={handleAddCustomButton}
                  style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} />
                  追加
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>種類:</span>
                {(['部位', '場所', '階数'] as CustomButtonCategory[]).map((cat) => (
                  <label key={cat} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="newBtnCatInc"
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
                {customButtons.map((btnConfig, idx) => {
                  const isVoice = btnConfig.isVoice || btnConfig.name === '音声入力';

                  if (isVoice) {
                    return (
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
                          backgroundColor: '#f5f3ff',
                          borderRadius: '4px',
                          border: '1.5px solid #818cf8',
                          cursor: 'grab',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GripVertical size={16} color="#6366f1" />
                          <Mic size={15} color="#4f46e5" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#312e81' }}>{btnConfig.name}</span>
                          <span
                            className="category-badge"
                            style={{
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                            }}
                          >
                            音声 (固定)
                          </span>
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
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', padding: '0 4px' }}>
                            削除不可
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* サブタイトル */}
          <div className="survey-title">
            <span style={{ fontSize: '0.95rem' }}>ボタン選択（①階数 ②場所 ③方向 ④部位 ⑤損傷 ⑥状況）</span>
          </div>

          {/* ① 階数グループ */}
          <section
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: isFloorDisabled ? '#f0f0f0' : '#ffffff',
              opacity: isFloorDisabled ? 0.5 : 1,
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
              <Layers size={18} />
              ① 階数グループ
              {isFloorDisabled && (
                <span style={{ fontSize: '0.75rem', color: '#d9534f', marginLeft: 'auto' }}>
                  ※ 塀・土間選択中のため無効
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
              {/* 階数① */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階①</span>
                <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(-1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={selection.location.floor1 || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (!isFloorDisabled) {
                        onChangeSelection({
                          ...selection,
                          location: { ...selection.location, floor1: val },
                        });
                      }
                    }}
                    disabled={isFloorDisabled}
                    style={{ height: '38px', fontSize: '0.95rem', minWidth: 0, padding: '0 4px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor1Change(1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 階数② */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>階②</span>
                <div className="number-stepper" style={{ flex: 1, minWidth: 0, gap: '2px' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor2Change(-1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={selection.location.floor2 || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (!isFloorDisabled) {
                        onChangeSelection({
                          ...selection,
                          location: { ...selection.location, floor2: val },
                        });
                      }
                    }}
                    disabled={isFloorDisabled}
                    style={{ height: '38px', fontSize: '0.95rem', minWidth: 0, padding: '0 4px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleFloor2Change(1)}
                    disabled={isFloorDisabled}
                    style={{ width: '32px', height: '38px', flexShrink: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 階数カスタムボタン */}
            {renderCustomButtonsForCategory('階数', { height: '38px', fontSize: '0.9rem', fontWeight: 'bold' }, 'repeat(4, 1fr)', isFloorDisabled)}
          </section>

          {/* ② 場所グループ */}
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
                <MapPin size={18} />
                ② 場所グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※1つのみ選択
              </span>
            </div>

            {/* 場所ボタン */}
            {renderUnifiedCategoryButtons('場所', DEFAULT_LOCATION_OPTIONS, locationOptions, 'location', { height: '48px', fontSize: '0.95rem', padding: '4px', fontWeight: 'bold' }, 'repeat(6, 1fr)')}
          </section>

          {/* ③ 方向グループ */}
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
                ③ 方向グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※最大2つ選択可
              </span>
            </div>

            <div className="button-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {directionOptions.map((dir) => {
                const isSelected = selection.directions.includes(dir);
                const { dragClass, cursorStyle, dragEvents } = getDragProps('direction', dir);
                return (
                  <button
                    key={dir}
                    type="button"
                    className={`btn ${isSelected ? 'selected' : ''} ${dragClass}`}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      handleDirectionToggle(dir);
                    }}
                    {...dragEvents}
                    style={{ height: '48px', fontSize: '1.05rem', ...cursorStyle }}
                  >
                    {dir}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ④ 部位グループ */}
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
                ④ 部位グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※1つのみ選択
              </span>
            </div>

            {renderUnifiedCategoryButtons('部位', DEFAULT_PART_OPTIONS, partOptions, 'part', { height: '48px', fontSize: '0.95rem', padding: '4px' }, 'repeat(4, 1fr)')}
          </section>

          {/* ⑤ 損傷グループ */}
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
                ⑤ 損傷グループ
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                ※最大2つ選択可
              </span>
            </div>

            {renderUnifiedCategoryButtons('損傷', DEFAULT_DAMAGE_OPTIONS, damageOptions, 'damage', { height: '48px', fontSize: '1rem' }, 'repeat(5, 1fr)')}

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
                          className={`btn ${dmg.isLessThan ? 'selected' : ''}`}
                          onClick={() => handleDamageLessThanToggle(idx)}
                          style={{ height: '28px', fontSize: '0.8rem', padding: '0 8px', fontWeight: 'bold' }}
                          title="以下 (＜) を指定"
                        >
                          &lt;
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

                    {/* 「全般」が未選択の場合のみ数値(W/L)入力ボックスを表示（「多数」選択時も入力可能） */}
                    {dmg.preset !== '全般' && (
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



          {/* ⑥ 状況グループ */}
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
                ⑥ 状況グループ
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <button
                type="button"
                className={`btn ${selection.situationText === '現場より撮影' ? 'selected' : ''}`}
                onClick={() =>
                  onChangeSelection({
                    ...selection,
                    situationText: '現場より撮影',
                  })
                }
                style={{
                  height: '42px',
                  padding: '0 16px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                現場
              </button>
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
                {customButtons.map((btnConfig, idx) => {
                  const isVoice = btnConfig.isVoice || btnConfig.name === '音声入力';

                  if (isVoice) {
                    return (
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
                          backgroundColor: '#f5f3ff',
                          borderRadius: '4px',
                          border: '1.5px solid #818cf8',
                          cursor: 'grab',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GripVertical size={16} color="#6366f1" />
                          <Mic size={15} color="#4f46e5" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#312e81' }}>{btnConfig.name}</span>
                          <span
                            className="category-badge"
                            style={{
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                            }}
                          >
                            音声 (固定)
                          </span>
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
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', padding: '0 4px' }}>
                            削除不可
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
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
                  );
                })}
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

      {/* 音声入力モーダル */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onRegister={handleRegisterVoiceText}
      />
    </main>
  );
};
