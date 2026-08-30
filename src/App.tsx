import React, { useState, useEffect } from 'react';
import { TabData, BasicInfo, LineData, LineSelection, SurveyType, CustomButtonConfig } from './types';
import { Header } from './components/Header';
import { MainArea } from './components/MainArea';
import { BasicInfoModal } from './components/BasicInfoModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AllTextModal } from './components/AllTextModal';
import { AllTextPreviewPanel } from './components/AllTextPreviewPanel';

const STORAGE_KEY_TABS = 'btn_text_gen_tabs_v4';
const STORAGE_KEY_ACTIVE = 'btn_text_gen_active_v4';
const STORAGE_KEY_CUSTOM_BUTTONS = 'btn_text_gen_custom_buttons_v5';
const STORAGE_KEY_INTERNAL_CUSTOM_BUTTONS = 'btn_text_gen_internal_custom_buttons_v8';
const STORAGE_KEY_EXTERNAL_CUSTOM_BUTTONS = 'btn_text_gen_external_custom_buttons_v3';

const DEFAULT_INTERNAL_CUSTOM_BUTTONS: CustomButtonConfig[] = [
  { id: 'btn-1', name: '和室', category: '場所' },
  { id: 'btn-2', name: 'クロス切', category: '損傷' },
  { id: 'btn-3', name: '壁', category: '部位' },
  { id: 'btn-4', name: '1階', category: '階数' },
];

const DEFAULT_EXTERNAL_CUSTOM_BUTTONS: CustomButtonConfig[] = [
  { id: 'ext-btn-1', name: 'グラツキ', category: '損傷' },
];

const createInitialSelection = (defaultMode: SurveyType = '外部'): LineSelection => ({
  mode: defaultMode,
  location: {
    isBuilding: false, // デフォルト未選択
    floor1: 0,        // デフォルト未選択 (0)
    floor2: 0,
  },
  directions: [],
  part: null,
  damages: [],
  situationButton: null, // デフォルト未選択
  situationText: '',
  internalSelections: [],
  internalDamages: [],
  externalSelections: [],
  externalDamages: [],
});

const createInitialLine = (defaultMode: SurveyType = '外部'): LineData => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  selection: createInitialSelection(defaultMode),
});

const createInitialTab = (id: string = 'tab-1', basicInfo?: BasicInfo): TabData => {
  const defaultMode = basicInfo?.surveyType || '外部';
  return {
    id,
    basicInfo: basicInfo || {
      houseNumber: 1,
      surveyType: '外部',
      investigator: '山本',
      folderNumber: 1,
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
          if (typeof parsed[0] === 'string') {
            return parsed.map((name: string, i: number) => ({
              id: `btn-${Date.now()}-${i}`,
              name,
              category: '損傷',
            }));
          }
          return parsed;
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
          if (typeof parsed[0] === 'string') {
            return parsed.map((name: string, i: number) => ({
              id: `ext-btn-${Date.now()}-${i}`,
              name,
              category: '損傷',
            }));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load external custom buttons', e);
    }
    return DEFAULT_EXTERNAL_CUSTOM_BUTTONS;
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
    internalSelections: currentLine.selection.internalSelections || [],
    internalDamages: currentLine.selection.internalDamages || [],
  };

  // タブ追加
  const handleAddTab = (inheritBasicInfo: boolean) => {
    const newId = `tab-${Date.now()}`;
    let newBasicInfo: BasicInfo;

    if (inheritBasicInfo && activeTab) {
      newBasicInfo = { ...activeTab.basicInfo };
    } else {
      const maxHouseNum = Math.max(...tabs.map((t) => t.basicInfo.houseNumber), 0);
      newBasicInfo = {
        houseNumber: maxHouseNum + 1,
        surveyType: '外部',
        investigator: '山本',
        folderNumber: 1,
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
      setTabs([
        {
          ...activeTab,
          lines: [createInitialLine(activeTab?.basicInfo.surveyType)],
          currentLineIndex: 0,
        },
      ]);
    }
    setIsDeleteModalOpen(false);
  };

  // 基本情報保存
  const handleSaveBasicInfo = (newInfo: BasicInfo) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, basicInfo: newInfo } : t))
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

  // 1行前（前回）の選択情報をコピー
  const handleCopyPrevLine = () => {
    if (!activeTab || activeTab.currentLineIndex <= 0) return;

    const prevSelection = activeTab.lines[activeTab.currentLineIndex - 1].selection;
    // ディープコピー
    const copiedSelection: LineSelection = JSON.parse(JSON.stringify(prevSelection));

    handleChangeSelection(copiedSelection);
  };

  // 現在行の直後に行（ページ）を挿入して移動
  const handleInsertLineAfterCurrent = () => {
    if (!activeTab) return;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;

        const newLine = createInitialLine(t.basicInfo.surveyType);
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
          const newLine = createInitialLine(t.basicInfo.surveyType);
          return {
            ...t,
            lines: [...t.lines, newLine],
            currentLineIndex: t.lines.length,
          };
        } else {
          return {
            ...t,
            currentLineIndex: t.currentLineIndex + 1,
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
        onInsertLine={handleInsertLineAfterCurrent}
        onDeleteLine={handleDeleteCurrentLine}
        canPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
        canCopyPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
        customButtons={{ internal: internalCustomButtons, external: externalCustomButtons }}
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
            onChangeInternalCustomButtons={setInternalCustomButtons}
            onChangeExternalCustomButtons={setExternalCustomButtons}
          />
          {/* TOP画面最下部: 全行プレビューエリア */}
          <AllTextPreviewPanel
            lines={activeTab.lines}
            currentLineIndex={activeTab.currentLineIndex}
            onNavigateToLine={handleNavigateToLine}
            customButtons={{ internal: internalCustomButtons, external: externalCustomButtons }}
          />
        </>
      )}

      {/* モーダル: 基本情報 */}
      {activeTab && (
        <BasicInfoModal
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
        message="現在選択中のタブの「基本情報」（家屋番号・調査種別・調査員名・フォルダ番号）を新しいタブに引き継ぎますか？"
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
            ? `現在のタブ「家屋${activeTab?.basicInfo.houseNumber}」を削除します。よろしいですか？`
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
          customButtons={{ internal: internalCustomButtons, external: externalCustomButtons }}
        />
      )}
    </>
  );
};
