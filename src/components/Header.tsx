import React from 'react';
import { TabData } from '../types';
import { getTabName } from '../utils/tabUtils';
import { generateLineText } from '../utils/textGenerator';
import { Settings, Trash2, Plus, ChevronLeft, ChevronRight, Eye, Copy } from 'lucide-react';

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
  canPrev: boolean;
  canCopyPrev: boolean;
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
  canPrev,
  canCopyPrev,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const currentLine = activeTab?.lines[activeTab.currentLineIndex];
  const currentLineText = currentLine ? generateLineText(currentLine.selection) : '';

  const totalLines = activeTab?.lines.length || 1;
  const currentLineNum = (activeTab?.currentLineIndex || 0) + 1;

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

      {/* 2行目: 前へ / 文字列表示 / 次へ / 確認ボタン */}
      <div className="header-row-2">
        <button
          type="button"
          className="nav-btn"
          onClick={onPrevLine}
          disabled={!canPrev}
        >
          <ChevronLeft size={18} />
          前へ
        </button>

        <div className="generated-text-box" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'normal', lineHeight: '1' }}>
            行 {currentLineNum} / {totalLines}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflowX: 'auto', width: '100%' }}>
            {currentLineText || <span style={{ color: '#aaa', fontWeight: 'normal' }}>（ボタンを選択してください）</span>}
          </div>
        </div>

        <button
          type="button"
          className="nav-btn"
          onClick={onNextLine}
        >
          次へ
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          className="nav-btn selected"
          onClick={onOpenAllText}
          style={{ padding: '8px 10px' }}
        >
          <Eye size={16} />
          確認
        </button>
      </div>

      {/* 3行目: 基本情報サマリー ＆ 「＋」挿入ボタン & 「前回と同じ」ボタン */}
      {activeTab && (
        <div className="header-row-3">
          <div className="status-badges-group">
            <div className="status-badge">
              家屋: <strong>#{activeTab.basicInfo.houseNumber}</strong>
            </div>
            <div className="status-badge">
              種別: <strong>{activeTab.basicInfo.surveyType}</strong>
            </div>
            <div className="status-badge">
              担当: <strong>{activeTab.basicInfo.investigator}</strong>
            </div>
            <div className="status-badge">
              フォルダ: <strong>#{activeTab.basicInfo.folderNumber}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
