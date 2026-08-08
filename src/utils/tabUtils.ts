import { TabData } from '../types';

const CIRCLED_NUMBERS = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/**
 * 家屋番号と全タブ情報を元に、タブ表示名を決定する（重複時に①, ②などを付与）
 */
export function getTabName(tab: TabData, allTabs: TabData[]): string {
  const houseNumStr = `家屋${tab.basicInfo.houseNumber}`;
  
  // 同じ家屋番号を持つタブのリストを取得（タブの作成順/配列順）
  const sameHouseTabs = allTabs.filter(t => t.basicInfo.houseNumber === tab.basicInfo.houseNumber);
  
  if (sameHouseTabs.length <= 1) {
    return houseNumStr;
  }
  
  // 対象タブが同番の中で何番目かインデックスを取得
  const index = sameHouseTabs.findIndex(t => t.id === tab.id);
  const suffix = CIRCLED_NUMBERS[index] || `(${index + 1})`;
  
  return `${houseNumStr}${suffix}`;
}
