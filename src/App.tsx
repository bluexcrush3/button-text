import React, { useState, useEffect } from 'react';
import { TabData, BasicInfo, LineData, LineSelection, SurveyType, CustomButtonConfig, getTodayDateString } from './types';
import { Header } from './components/Header';
import { MainArea } from './components/MainArea';
import { BasicInfoModal } from './components/BasicInfoModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AllTextModal } from './components/AllTextModal';
import { AllTextPreviewPanel } from './components/AllTextPreviewPanel';
import { getTabName } from './utils/tabUtils';

const STORAGE_KEY_TABS = 'btn_text_gen_tabs_v4';
const STORAGE_KEY_ACTIVE = 'btn_text_gen_active_v4';
const STORAGE_KEY_CUSTOM_BUTTONS = 'btn_text_gen_custom_buttons_v5';
const STORAGE_KEY_INTERNAL_CUSTOM_BUTTONS = 'btn_text_gen_internal_custom_buttons_v8';
const STORAGE_KEY_EXTERNAL_CUSTOM_BUTTONS = 'btn_text_gen_external_custom_buttons_v3';
const STORAGE_KEY_INCLINATION_CUSTOM_BUTTONS = 'btn_text_gen_inclination_custom_buttons_v1';

export const VOICE_INPUT_INTERNAL_CONFIG: CustomButtonConfig = {
  id: 'btn-voice-internal',
  name: '音声入力',
  category: '損傷',
  isVoice: true,
};

export const VOICE_INPUT_EXTERNAL_CONFIG: CustomButtonConfig = {
  id: 'ext-btn-voice-external',
  name: '音声入力',
  category: '損傷',
  isVoice: true,
};

export const VOICE_INPUT_INCLINATION_CONFIG: CustomButtonConfig = {
  id: 'inc-btn-voice-inclination',
  name: '音声入力',
  category: '部位',
  isVoice: true,
};

const DEFAULT_INTERNAL_CUSTOM_BUTTONS: CustomButtonConfig[] = [
  VOICE_INPUT_INTERNAL_CONFIG,
  { id: 'btn-1', name: '和室', category: '場所' },
  { id: 'btn-2', name: 'クロス切', category: '損傷' },
  { id: 'btn-3', name: '壁', category: '部位' },
  { id: 'btn-4', name: '1階', category: '階数' },
];

const DEFAULT_EXTERNAL_CUSTOM_BUTTONS: CustomButtonConfig[] = [
  VOICE_INPUT_EXTERNAL_CONFIG,
  { id: 'ext-btn-1', name: 'グラツキ', category: '損傷' },
];

const DEFAULT_INCLINATION_CUSTOM_BUTTONS: CustomButtonConfig[] = [
  VOICE_INPUT_INCLINATION_CONFIG,
  { id: 'inc-btn-1', name: '柱', category: '部位' },
  { id: 'inc-btn-2', name: '床', category: '部位' },
];

const ensureVoiceButton = (buttons: CustomButtonConfig[], voiceConfig: CustomButtonConfig): CustomButtonConfig[] => {
  const hasVoice = buttons.some((b) => b.isVoice || b.name === '音声入力');
  if (!hasVoice) {
    return [voiceConfig, ...buttons];
  }
  // isVoiceプロパティが付与されていることを保証
  return buttons.map((b) => (b.name === '音声入力' || b.id === voiceConfig.id ? { ...b, isVoice: true } : b));
};

interface InitialFloor {
  floor1: number;
  floor2: number;
}

interface InitialLocation {
  selectedLocation: string | null;
  isBuilding: boolean;
  internalLocationSelections?: string[];
}

const createInitialSelection = (
  defaultMode: SurveyType = '外部',
  initialFloor?: InitialFloor,
  initialLocation?: InitialLocation
): LineSelection => ({
  mode: defaultMode,
  location: {
    isBuilding: initialLocation?.isBuilding ?? false,
    selectedLocation: initialLocation?.selectedLocation ?? null,
    floor1: initialFloor?.floor1 ?? 0,        // 内部モード等で引き継がれた階数 (0 = 未入力)
    floor2: initialFloor?.floor2 ?? 0,
  },
  directions: [],
  part: null,
  damages: [],
  situationButton: null, // デフォルト未選択
  situationText: '',
  memo: '',
  internalSelections: initialLocation?.internalLocationSelections ? [...initialLocation.internalLocationSelections] : [],
  internalDamages: [],
  externalSelections: [],
  externalDamages: [],
  inclinationSelections: [],
  inclinationValues: [],
  voiceItems: [],
});

const createInitialLine = (
  defaultMode: SurveyType = '外部',
  initialFloor?: InitialFloor,
  initialLocation?: InitialLocation
): LineData => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  selection: createInitialSelection(defaultMode, initialFloor, initialLocation),
});

// 直前（または直近）の内部モードで入力されていた階数を取得
const getPreviousInternalFloor = (
  lines: LineData[],
  fromIndex: number,
  surveyType: SurveyType
): { floor1: number; floor2: number } => {
  for (let i = fromIndex; i >= 0; i--) {
    const line = lines[i];
    if (line) {
      const mode = line.selection.mode || surveyType;
      if (mode === '内部') {
        const f1 = line.selection.location?.floor1 || 0;
        const f2 = line.selection.location?.floor2 || 0;
        if (f1 > 0 || f2 > 0) {
          return { floor1: f1, floor2: f2 };
        }
      }
    }
  }
  return { floor1: 0, floor2: 0 };
};

// 直前（または直近）の内部モードで入力されていた場所を取得
const getPreviousInternalLocation = (
  lines: LineData[],
  fromIndex: number,
  surveyType: SurveyType,
  internalCustomButtons: CustomButtonConfig[]
): InitialLocation => {
  const locationBtnNames = new Set(
    internalCustomButtons.filter((b) => b.category === '場所').map((b) => b.name)
  );

  for (let i = fromIndex; i >= 0; i--) {
    const line = lines[i];
    if (line) {
      const mode = line.selection.mode || surveyType;
      if (mode === '内部') {
        // 1. 固定場所のチェック
        const selLoc = line.selection.location?.selectedLocation;
        const isBld = !!line.selection.location?.isBuilding;
        if (selLoc || isBld) {
          return {
            selectedLocation: selLoc || (isBld ? '建物' : null),
            isBuilding: isBld,
            internalLocationSelections: [],
          };
        }

        // 2. カスタム場所のチェック
        const customLocs = (line.selection.internalSelections || []).filter((item) => {
          const baseName = item.replace(/[①-⑳]/g, '');
          return locationBtnNames.has(item) || locationBtnNames.has(baseName);
        });

        if (customLocs.length > 0) {
          return {
            selectedLocation: null,
            isBuilding: false,
            internalLocationSelections: customLocs,
          };
        }
      }
    }
  }

  return {
    selectedLocation: null,
    isBuilding: false,
    internalLocationSelections: [],
  };
};

const createInitialTab = (id: string = 'tab-1', basicInfo?: BasicInfo): TabData => {
  const defaultMode = basicInfo?.surveyType || '外部';
  return {
    id,
    basicInfo: basicInfo || {
      projectNumber: '',
      houseNumber: 1,
      surveyType: '外部',
      surveyNumber: '',
      surveyDate: getTodayDateString(),
      investigator: '畦地',
      folderNumber: 100,
    },
    lines: [createInitialLine(defaultMode)],
    currentLineIndex: 0,
  };
};

export const App: React.FC = () => {
  // localStorageからの復元
  const [tabs, setTabs] = useState<TabData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load tabs from localStorage', e);
    }
    return [createInitialTab()];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved) return saved;
    } catch (e) {
      console.error('Failed to load activeTabId', e);
    }
    return 'tab-1';
  });

  const [internalCustomButtons, setInternalCustomButtons] = useState<CustomButtonConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INTERNAL_CUSTOM_BUTTONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let list: CustomButtonConfig[];
          if (typeof parsed[0] === 'string') {
            list = parsed.map((name: string, i: number) => ({
              id: `btn-${Date.now()}-${i}`,
              name,
              category: '未定義',
            }));
          } else {
            list = parsed.map((b: Partial<CustomButtonConfig>) => ({
              id: b.id || `btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: b.name || '',
              category: b.category || '未定義',
              isVoice: b.isVoice,
            }));
          }
          return ensureVoiceButton(list, VOICE_INPUT_INTERNAL_CONFIG);
        }
      }
    } catch (e) {
      console.error('Failed to load internal custom buttons', e);
    }
    return DEFAULT_INTERNAL_CUSTOM_BUTTONS;
  });

  const [externalCustomButtons, setExternalCustomButtons] = useState<CustomButtonConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXTERNAL_CUSTOM_BUTTONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let list: CustomButtonConfig[];
          if (typeof parsed[0] === 'string') {
            list = parsed.map((name: string, i: number) => ({
              id: `ext-btn-${Date.now()}-${i}`,
              name,
              category: '未定義',
            }));
          } else {
            list = parsed.map((b: Partial<CustomButtonConfig>) => ({
              id: b.id || `ext-btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: b.name || '',
              category: b.category || '未定義',
              isVoice: b.isVoice,
            }));
          }
          return ensureVoiceButton(list, VOICE_INPUT_EXTERNAL_CONFIG);
        }
      }
    } catch (e) {
      console.error('Failed to load external custom buttons', e);
    }
    return DEFAULT_EXTERNAL_CUSTOM_BUTTONS;
  });

  const [inclinationCustomButtons, setInclinationCustomButtons] = useState<CustomButtonConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INCLINATION_CUSTOM_BUTTONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.map((b: Partial<CustomButtonConfig>) => ({
            id: b.id || `inc-btn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: b.name || '',
            category: b.category || '未定義',
            isVoice: b.isVoice,
          }));
          return ensureVoiceButton(list, VOICE_INPUT_INCLINATION_CONFIG);
        }
      }
    } catch (e) {
      console.error('Failed to load inclination custom buttons', e);
    }
    return DEFAULT_INCLINATION_CUSTOM_BUTTONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INTERNAL_CUSTOM_BUTTONS, JSON.stringify(internalCustomButtons));
    } catch (e) {
      console.error('Failed to save internal custom buttons', e);
    }
  }, [internalCustomButtons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXTERNAL_CUSTOM_BUTTONS, JSON.stringify(externalCustomButtons));
    } catch (e) {
      console.error('Failed to save external custom buttons', e);
    }
  }, [externalCustomButtons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INCLINATION_CUSTOM_BUTTONS, JSON.stringify(inclinationCustomButtons));
    } catch (e) {
      console.error('Failed to save inclination custom buttons', e);
    }
  }, [inclinationCustomButtons]);

  // モーダル表示状態
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAllTextOpen, setIsAllTextOpen] = useState(false);

  // localStorage 同期
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
    } catch (e) {
      console.error('Failed to save tabs', e);
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeTabId);
    } catch (e) {
      console.error('Failed to save activeTabId', e);
    }
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const currentLine = activeTab?.lines[activeTab.currentLineIndex] || {
    id: 'default',
    selection: createInitialSelection(),
  };

  const currentSelection: LineSelection = {
    ...currentLine.selection,
    mode: currentLine.selection.mode || activeTab?.basicInfo.surveyType || '外部',
    memo: currentLine.selection.memo || '',
    internalSelections: currentLine.selection.internalSelections || [],
    internalDamages: currentLine.selection.internalDamages || [],
    externalSelections: currentLine.selection.externalSelections || [],
    externalDamages: currentLine.selection.externalDamages || [],
    inclinationSelections: currentLine.selection.inclinationSelections || [],
    inclinationValues: currentLine.selection.inclinationValues || [],
  };

  // タブ追加
  const handleAddTab = (inheritBasicInfo: boolean) => {
    const newId = `tab-${Date.now()}`;
    let newBasicInfo: BasicInfo;

    if (inheritBasicInfo && activeTab) {
      newBasicInfo = { ...activeTab.basicInfo };
    } else {
      newBasicInfo = {
        projectNumber: '',
        houseNumber: 1,
        surveyType: '外部',
        surveyNumber: '',
        surveyDate: getTodayDateString(),
        investigator: '畦地',
        folderNumber: 100,
      };
    }

    const newTab = createInitialTab(newId, newBasicInfo);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setIsAddTabModalOpen(false);
  };

  // 全削除実行
  const handleConfirmDeleteAll = () => {
    if (tabs.length > 1) {
      const newTabs = tabs.filter((t) => t.id !== activeTabId);
      setTabs(newTabs);
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else {
      setTabs([createInitialTab('tab-1')]);
    }
    setIsDeleteModalOpen(false);
  };

  // 基本情報保存
  const handleSaveBasicInfo = (newInfo: BasicInfo) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const updatedLines = [...t.lines];
        if (updatedLines[t.currentLineIndex]) {
          const currentLine = updatedLines[t.currentLineIndex];
          updatedLines[t.currentLineIndex] = {
            ...currentLine,
            selection: {
              ...currentLine.selection,
              mode: newInfo.surveyType,
            },
          };
        }

        return {
          ...t,
          basicInfo: newInfo,
          lines: updatedLines,
        };
      })
    );
  };

  // 選択状態の更新
  const handleChangeSelection = (newSelection: LineSelection) => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const updatedLines = [...t.lines];
        updatedLines[t.currentLineIndex] = {
          ...updatedLines[t.currentLineIndex],
          selection: newSelection,
        };

        return {
          ...t,
          lines: updatedLines,
        };
      })
    );
  };

  // 1行前（前回）の選択情報をコピー（excludeDirections: true の場合は方位を引き継がない「部屋同じ」）
  const copyPrevLineSelection = (excludeDirections: boolean = false) => {
    if (!activeTab || activeTab.currentLineIndex <= 0) return;

    const prevSelection = activeTab.lines[activeTab.currentLineIndex - 1].selection;
    // ディープコピー
    const copiedSelection: LineSelection = JSON.parse(JSON.stringify(prevSelection));

    // 「損傷」グループのボタン情報は引き継がない
    copiedSelection.damages = [];
    copiedSelection.internalDamages = [];
    copiedSelection.externalDamages = [];
    copiedSelection.inclinationValues = [];

    // 「部屋同じ」ボタンは方位のみ引き継がない
    if (excludeDirections) {
      copiedSelection.directions = [];
    }

    // 「現況」ボタンのみはそのまま情報を引き継ぐ（それ以外の「全景」などは引き継がない）
    if (copiedSelection.situationButton !== '現況') {
      copiedSelection.situationButton = null;
    }

    // 「損傷」カテゴリーのカスタムボタン選択を除外
    const internalDamageBtnNames = new Set(
      internalCustomButtons.filter((b) => b.category === '損傷').map((b) => b.name)
    );
    const externalDamageBtnNames = new Set(
      externalCustomButtons.filter((b) => b.category === '損傷').map((b) => b.name)
    );
    const inclinationDamageBtnNames = new Set(
      inclinationCustomButtons.filter((b) => b.category === '損傷').map((b) => b.name)
    );

    const filterCustomSelections = (selections: string[] = [], damageNames: Set<string>) => {
      return selections.filter((name) => {
        const baseName = name.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
        return !damageNames.has(name) && !damageNames.has(baseName);
      });
    };

    copiedSelection.internalSelections = filterCustomSelections(
      copiedSelection.internalSelections,
      internalDamageBtnNames
    );
    copiedSelection.externalSelections = filterCustomSelections(
      copiedSelection.externalSelections,
      externalDamageBtnNames
    );
    copiedSelection.inclinationSelections = filterCustomSelections(
      copiedSelection.inclinationSelections,
      inclinationDamageBtnNames
    );

    // 音声入力項目のうち「損傷」カテゴリーを除外
    if (copiedSelection.voiceItems) {
      copiedSelection.voiceItems = copiedSelection.voiceItems.filter(
        (item) => item.category !== '損傷'
      );
    }

    handleChangeSelection(copiedSelection);
  };

  const handleCopyPrevLine = () => copyPrevLineSelection(false);
  const handleCopySameRoom = () => copyPrevLineSelection(true);

  // 現在行の直後に行（ページ）を挿入して移動
  const handleInsertLineAfterCurrent = () => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const currentMode = t.lines[t.currentLineIndex]?.selection.mode || t.basicInfo.surveyType;
        const isInternal = currentMode === '内部';

        const initialFloor = isInternal
          ? getPreviousInternalFloor(t.lines, t.currentLineIndex, t.basicInfo.surveyType)
          : undefined;

        const initialLocation = isInternal
          ? getPreviousInternalLocation(t.lines, t.currentLineIndex, t.basicInfo.surveyType, internalCustomButtons)
          : undefined;

        const newLine = createInitialLine(t.basicInfo.surveyType, initialFloor, initialLocation);
        const updatedLines = [...t.lines];
        const insertIndex = t.currentLineIndex + 1;
        updatedLines.splice(insertIndex, 0, newLine);

        return {
          ...t,
          lines: updatedLines,
          currentLineIndex: insertIndex,
        };
      })
    );
  };

  // 現在の行（ページ）を削除
  const handleDeleteCurrentLine = () => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        if (t.lines.length > 1) {
          const updatedLines = t.lines.filter((_, idx) => idx !== t.currentLineIndex);
          const nextIndex = Math.min(t.currentLineIndex, updatedLines.length - 1);
          return {
            ...t,
            lines: updatedLines,
            currentLineIndex: Math.max(0, nextIndex),
          };
        } else {
          // 1行しかない場合は入力選択をクリア
          const updatedLines = [createInitialLine(t.basicInfo.surveyType)];
          return {
            ...t,
            lines: updatedLines,
            currentLineIndex: 0,
          };
        }
      })
    );
  };

  // 指定の行へ移動
  const handleNavigateToLine = (index: number) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, currentLineIndex: index } : t))
    );
  };

  // 現在の行の選択解除・リセット
  const handleClearCurrentLine = () => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const updatedLines = [...t.lines];
        updatedLines[t.currentLineIndex] = {
          ...updatedLines[t.currentLineIndex],
          selection: createInitialSelection(t.basicInfo.surveyType),
        };

        return {
          ...t,
          lines: updatedLines,
        };
      })
    );
  };

  // 前の行へ
  const handlePrevLine = () => {
    if (!activeTab || activeTab.currentLineIndex <= 0) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
            ...t,
            currentLineIndex: t.currentLineIndex - 1,
          }
          : t
      )
    );
  };

  // 次の行へ（末尾の場合は新しい空行を追記して移動）
  const handleNextLine = () => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const isLastLine = t.currentLineIndex === t.lines.length - 1;
        if (isLastLine) {
          const currentMode = t.lines[t.currentLineIndex]?.selection.mode || t.basicInfo.surveyType;
          const isInternal = currentMode === '内部';

          const initialFloor = isInternal
            ? getPreviousInternalFloor(t.lines, t.currentLineIndex, t.basicInfo.surveyType)
            : undefined;

          const initialLocation = isInternal
            ? getPreviousInternalLocation(t.lines, t.currentLineIndex, t.basicInfo.surveyType, internalCustomButtons)
            : undefined;

          const newLine = createInitialLine(t.basicInfo.surveyType, initialFloor, initialLocation);
          return {
            ...t,
            lines: [...t.lines, newLine],
            currentLineIndex: t.lines.length,
          };
        } else {
          const nextIndex = t.currentLineIndex + 1;
          const nextLine = t.lines[nextIndex];
          const nextMode = nextLine?.selection.mode || t.basicInfo.surveyType;

          // 内部モードで、かつ進み先の行が完全に未入力の場合、前ページの階数・場所を初期値として適用
          const isNextLineEmpty =
            nextMode === '内部' &&
            nextLine &&
            (nextLine.selection.location?.floor1 === 0 || !nextLine.selection.location?.floor1) &&
            (nextLine.selection.location?.floor2 === 0 || !nextLine.selection.location?.floor2) &&
            !nextLine.selection.location?.selectedLocation &&
            !nextLine.selection.location?.isBuilding &&
            (!nextLine.selection.internalSelections || nextLine.selection.internalSelections.length === 0) &&
            (!nextLine.selection.directions || nextLine.selection.directions.length === 0) &&
            !nextLine.selection.part &&
            (!nextLine.selection.damages || nextLine.selection.damages.length === 0) &&
            !nextLine.selection.situationButton &&
            !nextLine.selection.situationText &&
            !nextLine.selection.memo;

          if (isNextLineEmpty) {
            const initialFloor = getPreviousInternalFloor(t.lines, t.currentLineIndex, t.basicInfo.surveyType);
            const initialLocation = getPreviousInternalLocation(
              t.lines,
              t.currentLineIndex,
              t.basicInfo.surveyType,
              internalCustomButtons
            );

            const hasFloor = initialFloor.floor1 > 0 || initialFloor.floor2 > 0;
            const hasLocation =
              !!initialLocation.selectedLocation ||
              initialLocation.isBuilding ||
              (initialLocation.internalLocationSelections && initialLocation.internalLocationSelections.length > 0);

            if (hasFloor || hasLocation) {
              const updatedLines = [...t.lines];
              updatedLines[nextIndex] = {
                ...nextLine,
                selection: {
                  ...nextLine.selection,
                  location: {
                    ...nextLine.selection.location,
                    floor1: hasFloor ? initialFloor.floor1 : (nextLine.selection.location?.floor1 ?? 0),
                    floor2: hasFloor ? initialFloor.floor2 : (nextLine.selection.location?.floor2 ?? 0),
                    selectedLocation: initialLocation.selectedLocation,
                    isBuilding: initialLocation.isBuilding,
                  },
                  internalSelections: [
                    ...(nextLine.selection.internalSelections || []),
                    ...(initialLocation.internalLocationSelections || []),
                  ],
                },
              };
              return {
                ...t,
                lines: updatedLines,
                currentLineIndex: nextIndex,
              };
            }
          }

          return {
            ...t,
            currentLineIndex: nextIndex,
          };
        }
      })
    );
  };

  return (
    <>
      {/* 3行固定ヘッダー */}
      <Header
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onAddTabClick={() => setIsAddTabModalOpen(true)}
        onOpenBasicInfo={() => setIsBasicInfoOpen(true)}
        onDeleteAllClick={() => setIsDeleteModalOpen(true)}
        onPrevLine={handlePrevLine}
        onNextLine={handleNextLine}
        onOpenAllText={() => setIsAllTextOpen(true)}
        onCopyPrevLine={handleCopyPrevLine}
        onCopySameRoom={handleCopySameRoom}
        onInsertLine={handleInsertLineAfterCurrent}
        onDeleteLine={handleDeleteCurrentLine}
        canPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
        canCopyPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
        customButtons={{
          internal: internalCustomButtons,
          external: externalCustomButtons,
          inclination: inclinationCustomButtons,
        }}
        currentSelection={currentSelection}
        onChangeSelection={handleChangeSelection}
      />

      {/* メイン操作エリア */}
      {activeTab && (
        <>
          <MainArea
            surveyType={activeTab.basicInfo.surveyType}
            selection={currentSelection}
            onChangeSelection={handleChangeSelection}
            onClearCurrentLine={handleClearCurrentLine}
            internalCustomButtons={internalCustomButtons}
            externalCustomButtons={externalCustomButtons}
            inclinationCustomButtons={inclinationCustomButtons}
            onChangeInternalCustomButtons={setInternalCustomButtons}
            onChangeExternalCustomButtons={setExternalCustomButtons}
            onChangeInclinationCustomButtons={setInclinationCustomButtons}
          />
          {/* TOP画面最下部: 全行プレビューエリア */}
          <AllTextPreviewPanel
            lines={activeTab.lines}
            currentLineIndex={activeTab.currentLineIndex}
            onNavigateToLine={handleNavigateToLine}
            customButtons={{
              internal: internalCustomButtons,
              external: externalCustomButtons,
              inclination: inclinationCustomButtons,
            }}
            basicInfo={activeTab.basicInfo}
          />
        </>
      )}

      {/* モーダル: 基本情報 */}
      {activeTab && (
        <BasicInfoModal
          key={activeTab.id}
          isOpen={isBasicInfoOpen}
          onClose={() => setIsBasicInfoOpen(false)}
          basicInfo={activeTab.basicInfo}
          onSave={handleSaveBasicInfo}
        />
      )}

      {/* モーダル: タブ追加時の基本情報引き継ぎ確認 */}
      <ConfirmModal
        isOpen={isAddTabModalOpen}
        title="新規タブ追加"
        message="現在選択中のタブの「基本情報」（家屋番号・調査種別・調査日付・調査員名・フォルダ番号）を新しいタブに引き継ぎますか？"
        confirmText="引き継ぐ"
        cancelText="新規作成"
        onConfirm={() => handleAddTab(true)}
        onCancel={() => handleAddTab(false)}
      />

      {/* モーダル: 全削除確認 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="全削除の確認"
        message={
          tabs.length > 1
            ? `現在のタブ「${activeTab ? getTabName(activeTab, tabs) : ''}」を削除します。よろしいですか？`
            : '現在の入力情報（生成文字列および全行データ）をすべて削除します。よろしいですか？'
        }
        confirmText="全削除を実行"
        cancelText="キャンセル"
        isDanger={true}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* モーダル: 全文字列の複数行確認・コピー ＆ 各行へのジャンプ */}
      {activeTab && (
        <AllTextModal
          isOpen={isAllTextOpen}
          onClose={() => setIsAllTextOpen(false)}
          lines={activeTab.lines}
          houseNumber={activeTab.basicInfo.houseNumber}
          currentLineIndex={activeTab.currentLineIndex}
          onNavigateToLine={handleNavigateToLine}
          customButtons={{
            internal: internalCustomButtons,
            external: externalCustomButtons,
            inclination: inclinationCustomButtons,
          }}
          basicInfo={activeTab.basicInfo}
        />
      )}
    </>
  );
};
