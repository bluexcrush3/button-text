import React from 'react';
import { TabData, LineSelection } from '../types';
import { getTabName } from '../utils/tabUtils';
import { generateLineText, CustomButtonsInput } from '../utils/textGenerator';
import { Settings, Trash2, Plus, ChevronLeft, ChevronRight, Eye, Copy, X } from 'lucide-react';
import { VoiceDamageWButton } from './VoiceDamageWButton';
import { VoiceInclinationButton } from './VoiceInclinationButton';

interface HeaderProps {
  tabs: TabData[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTabClick: () => void;
  onOpenBasicInfo: () => void;
  onDeleteAllClick: () => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  onOpenAllText: () => void;
  onCopyPrevLine: () => void;
  onInsertLine: () => void;
  onDeleteLine: () => void;
  canPrev: boolean;
  canCopyPrev: boolean;
  customButtons?: CustomButtonsInput;
  currentSelection?: LineSelection;
  onChangeSelection?: (newSelection: LineSelection) => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTabClick,
  onOpenBasicInfo,
  onDeleteAllClick,
  onPrevLine,
  onNextLine,
  onOpenAllText,
  onCopyPrevLine,
  onInsertLine,
  onDeleteLine,
  canPrev,
  canCopyPrev,
  customButtons = [],
  currentSelection,
  onChangeSelection,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const currentLine = activeTab?.lines[activeTab.currentLineIndex];
  const currentLineText = currentLine ? generateLineText(currentLine.selection, customButtons) : '';

  const totalLines = activeTab?.lines.length || 1;
  const currentLineNum = (activeTab?.currentLineIndex || 0) + 1;
  const currentMode = currentSelection?.mode || activeTab?.basicInfo.surveyType || '外部';

  return (
    <header className="sticky-header">
      {/* 1行目: タブエリア (左右スクロール) & 基本情報 & 全削除ボタン */}
      <div className="header-row-1">
        <div className="tab-list-container">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const title = getTabName(tab, tabs);
            return (
              <button
                key={tab.id}
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
              >
                {title}
              </button>
            );
          })}
          <button
            type="button"
            className="add-tab-btn"
            onClick={onAddTabClick}
            title="タブを追加"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="header-actions-right">
          <button type="button" className="btn-info" onClick={onOpenBasicInfo}>
            <Settings size={14} />
            基本情報
          </button>
          <button
            type="button"
            className="btn-danger btn-delete-all"
            onClick={onDeleteAllClick}
            title="対象タブ削除・情報削除"
          >
            <Trash2 size={14} />
            全削除
          </button>
        </div>
      </div>

      {/* 2行目: テキスト表示エリア単体 */}
      <div className="header-row-text">
        <div className="generated-text-box" style={{ width: '100%' }}>
          {currentLineText || <span style={{ color: '#aaa', fontWeight: 'normal' }}>（ボタンを選択してください）</span>}
        </div>
      </div>

      {/* 3行目: 前へ / 次へ / 確認ボタン & 現在地表示 */}
      <div className="header-row-navigation">
        <button
          type="button"
          className="nav-btn"
          onClick={onPrevLine}
          disabled={!canPrev}
          style={{ flex: 1 }}
        >
          <ChevronLeft size={18} />
          前へ
        </button>

        <div className="line-indicator">
          行 {currentLineNum} / {totalLines}
        </div>

        <button
          type="button"
          className="nav-btn"
          onClick={onNextLine}
          style={{ flex: 1 }}
        >
          次へ
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          className="nav-btn selected confirm-btn"
          onClick={onOpenAllText}
        >
          <Eye size={16} />
          確認
        </button>
      </div>

      {/* 3行目: 基本情報サマリー ＆ 「＋」「×」「前回と同じ」ボタン */}
      {activeTab && (
        <div className="header-row-3">
          <div className="status-badges-group">
            <div className="status-badge" style={{ fontWeight: 'bold' }}>
              #{activeTab.basicInfo.houseNumber} {activeTab.basicInfo.surveyType} {activeTab.basicInfo.investigator} #{activeTab.basicInfo.folderNumber}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* 一括音声入力ボタン（傾斜モードなら傾音声、それ以外はW音声） */}
            {currentSelection && onChangeSelection && (
              currentMode === '傾斜' ? (
                <VoiceInclinationButton
                  selection={currentSelection}
                  onChangeSelection={onChangeSelection}
                />
              ) : (
                <VoiceDamageWButton
                  selection={currentSelection}
                  onChangeSelection={onChangeSelection}
                />
              )
            )}

            {/* 「＋」行挿入ボタン */}
            <button
              type="button"
              className="btn-copy-prev"
              onClick={onInsertLine}
              title="現在の行の直後に行（ページ）を挿入"
              style={{ backgroundColor: '#eef6ff', borderColor: '#0d6efd', padding: '4px 8px' }}
            >
              <Plus size={16} />
            </button>

            {/* 「×」現在の行削除ボタン */}
            <button
              type="button"
              className="btn-copy-prev"
              onClick={onDeleteLine}
              title="現在の行（ページ）を削除"
              style={{ backgroundColor: '#fff5f5', borderColor: '#dc3545', color: '#dc3545', padding: '4px 8px' }}
            >
              <X size={16} />
            </button>

            {/* 「前回と同じ」ボタン */}
            <button
              type="button"
              className="btn-copy-prev"
              onClick={onCopyPrevLine}
              disabled={!canCopyPrev}
              title="1つ前の行のボタン選択をそのままコピー"
            >
              <Copy size={13} />
              前回と同じ
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
