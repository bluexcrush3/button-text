import { TabData } from '../types';

export interface TabNameInfo {
  projectNumber?: string; // 1行目: 工番（入力されている場合のみ）
  mainTitle: string;     // 2行目: 「家屋」+ 家屋番号(2桁0埋め) + 調査番号 + 重複連番 (2)
  fullText: string;      // 結合文字列
}

/**
 * タブの表示情報（1行目:工番、2行目:家屋番号+調査番号+重複番号）を生成する
 * 
 * ルール:
 * 1行目: 工番 (入力されている場合のみ)
 * 2行目: 「家屋」+ 家屋番号(1桁は0埋めで2桁) + 調査番号 (①～④)
 * 重複時: 全く同一のタブ名称（工番・家屋番号・調査番号が全て同一）が複数存在する場合、
 *        2つ目以降の末尾に (2), (3) などの連番を付与（1つ目のタブには (1) は付かない）
 */
export function getTabNameInfo(tab: TabData, allTabs: TabData[]): TabNameInfo {
  const projectNumber = (tab.basicInfo.projectNumber || '').trim();
  const houseNum = tab.basicInfo.houseNumber || 1;
  const houseNumStr = `家屋${String(houseNum).padStart(2, '0')}`;
  const surveyNumStr = tab.basicInfo.surveyNumber || '';
  const baseMainTitle = `${houseNumStr}${surveyNumStr}`;

  // 重複判定用キー（工番 + 家屋番号 + 調査番号）
  const baseKey = `${projectNumber}___${baseMainTitle}`;

  // 同じキーを持つタブを全タブから抽出
  const sameKeyTabs = allTabs.filter((t) => {
    const p = (t.basicInfo.projectNumber || '').trim();
    const h = t.basicInfo.houseNumber || 1;
    const s = t.basicInfo.surveyNumber || '';
    const k = `${p}___家屋${String(h).padStart(2, '0')}${s}`;
    return k === baseKey;
  });

  let duplicateSuffix = '';
  if (sameKeyTabs.length > 1) {
    const matchIndex = sameKeyTabs.findIndex((t) => t.id === tab.id);
    if (matchIndex > 0) {
      // 2つ目以降に末尾に(2)のように連番が付く。1つ目は付かない。
      duplicateSuffix = `(${matchIndex + 1})`;
    }
  }

  const mainTitle = `${baseMainTitle}${duplicateSuffix}`;
  const fullText = projectNumber ? `${projectNumber} ${mainTitle}` : mainTitle;

  return {
    projectNumber: projectNumber || undefined,
    mainTitle,
    fullText,
  };
}

/**
 * 従来の互換性用（文字列として取得）
 */
export function getTabName(tab: TabData, allTabs: TabData[]): string {
  const info = getTabNameInfo(tab, allTabs);
  return info.fullText;
}
