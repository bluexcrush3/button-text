import React, { useState, useEffect } from 'react';
import { TabData, BasicInfo, LineData, LineSelection } from './types';
import { Header } from './components/Header';
import { MainArea } from './components/MainArea';
import { BasicInfoModal } from './components/BasicInfoModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AllTextModal } from './components/AllTextModal';

const STORAGE_KEY_TABS = 'btn_text_gen_tabs_v4';
const STORAGE_KEY_ACTIVE = 'btn_text_gen_active_v4';

const createInitialSelection = (): LineSelection => ({
  location: {
    isBuilding: true, // 建物ボタンはデフォルトで選択状態
    floor1: 1,        // デフォルトで 1
    floor2: 0,
  },
  directions: [],
  part: null,
  damages: [],
  situationButton: '現況', // デフォルトで 現況
  situationText: '',
});

const createInitialLine = (): LineData => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  selection: createInitialSelection(),
});

const createInitialTab = (id: string = 'tab-1', basicInfo?: BasicInfo): TabData => ({
  id,
  basicInfo: basicInfo || {
    houseNumber: 1,
    surveyType: '外部',
    investigator: '山本',
    folderNumber: 1,
  },
  lines: [createInitialLine()],
  currentLineIndex: 0,
});

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
          lines: [createInitialLine()],
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

        const newLine = createInitialLine();
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
          selection: createInitialSelection(),
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
          const newLine = createInitialLine();
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
        canPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
        canCopyPrev={activeTab ? activeTab.currentLineIndex > 0 : false}
      />

      {/* メイン操作エリア */}
      {activeTab && (
        <MainArea
          surveyType={activeTab.basicInfo.surveyType}
          selection={currentLine.selection}
          onChangeSelection={handleChangeSelection}
          onClearCurrentLine={handleClearCurrentLine}
        />
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
        />
      )}
    </>
  );
};
