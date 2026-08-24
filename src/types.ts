export type SurveyType = '外部' | '内部' | '傾斜';

export interface BasicInfo {
  houseNumber: number;
  surveyType: SurveyType;
  investigator: string;
  folderNumber: number;
}

/**
 * ① 場所グループデータ
 */
export interface LocationData {
  isBuilding: boolean; // 「建物」ボタン (デフォルト true)
  floor1: number;      // 階数① (0 = 未入力)
  floor2: number;      // 階数② (0 = 未入力)
}

/**
 * ④ 損傷グループの各項目
 */
export interface DamageItem {
  name: string;  // '亀裂', '隙間', 'HC', '欠落', '目地切れ', '剥離'
  valueW: number; // 数値W (W寸法, 0 = 入力なし)
  valueL: number; // 数値L (L寸法, 0 = 入力なし)
  preset?: '全般' | '多数' | null; // 全般 / 多数 選択肢
  value?: number; // 互換性用
}

export type CustomButtonCategory = '場所' | '損傷';

export interface CustomButtonConfig {
  id: string;
  name: string;
  category: CustomButtonCategory;
}

export interface LineSelection {
  location: LocationData;
  directions: string[];   // 方向: 最大2つ
  part: string | null;     // 箇所: 単一選択 ('壁' | '腰' | '軒' | '塀' | '土間')
  damages: DamageItem[];   // 損傷: 最大2つ、各数値(W/L)保持
  situationButton?: '全景' | '現況' | null; // 状況ボタン選択
  situationText?: string;                  // 状況テキスト入力
  internalSelections?: string[]; // 内部モード用の選択されたカスタム文字列リスト
  internalDamages?: DamageItem[]; // 内部モード用の損傷詳細情報
  mode?: SurveyType;           // この行の個別調査モード
}

export interface LineData {
  id: string;
  selection: LineSelection;
}

export interface TabData {
  id: string;
  basicInfo: BasicInfo;
  lines: LineData[];
  currentLineIndex: number;
}

export const INVESTIGATOR_OPTIONS = ['山本', '佐藤', '田中', '鈴木'];
