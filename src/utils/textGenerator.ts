import { LineSelection, LineData, SurveyType, CustomButtonConfig, DamageItem, BasicInfo, getTodayDateString } from '../types';

/**
 * 基本情報設定のヘッダー文字列を生成
 * 仕様: 家屋番号(2桁数字のみ) ＋ 調査員名 ＋ 調査日付 ＋ 調査種別 ＋ 調査番号 ＋ フォルダ番号
 * 例: 01 畦地 2026-09-27 外部 ① #100
 */
export function formatBasicInfoHeader(basicInfo?: BasicInfo): string {
  if (!basicInfo) return '';
  const houseStr = String(basicInfo.houseNumber || 1).padStart(2, '0');
  const investigator = basicInfo.investigator || '';
  const surveyDate = basicInfo.surveyDate || getTodayDateString();
  const surveyType = basicInfo.surveyType || '';
  const surveyNum = basicInfo.surveyNumber || '';
  const folderNum = basicInfo.folderNumber ? `#${basicInfo.folderNumber}` : '';

  return [houseStr, investigator, surveyDate, surveyType, surveyNum, folderNum].filter(Boolean).join(' ');
}

/**
 * 方向グループの2要素を結合表記に変換
 */
export function formatDirections(dirs: string[]): string {
  if (!dirs || dirs.length === 0) return '';
  if (dirs.length === 1) return dirs[0];

  const set = new Set(dirs);

  if (set.has('北') && set.has('西')) return '北西';
  if (set.has('北') && set.has('東')) return '北東';
  if (set.has('南') && set.has('西')) return '南西';
  if (set.has('南') && set.has('東')) return '南東';
  if (set.has('東') && set.has('西')) return '東西';
  if (set.has('南') && set.has('北')) return '南北';

  return dirs.join('');
}

/**
 * 数値をフォーマット (1 -> 1.0, 1.5 -> 1.5)
 */
export function formatDamageValue(val: number): string {
  if (val === 0 || isNaN(val)) return '';
  const isNeg = val < 0;
  const abs = Math.abs(val);
  const formatted = Number.isInteger(abs) ? `${abs}.0` : `${abs}`;
  return isNeg ? `-${formatted}` : formatted;
}

/**
 * 階数のテキストフォーマット
 * ・隣り合わせの数字の場合: 1・2階
 * ・隣り合わせの数字でない場合: 1～3階
 * ・単一数字の場合: 1階
 */
export function formatFloor(floor1: number, floor2: number): string {
  if (floor1 > 0 && floor2 > 0) {
    if (floor1 === floor2) return `${floor1}階`;
    const min = Math.min(floor1, floor2);
    const max = Math.max(floor1, floor2);
    if (max - min === 1) {
      return `${min}・${max}階`;
    } else {
      return `${min}～${max}階`;
    }
  } else if (floor1 > 0) {
    return `${floor1}階`;
  } else if (floor2 > 0) {
    return `${floor2}階`;
  }
  return '';
}

export interface LineComponents {
  location: string;
  floor: string;
  direction: string;
  part: string;
  damages: string[];
  damageItems: DamageItem[];
  situation: string;
}

export type CustomButtonsInput =
  | CustomButtonConfig[]
  | {
    internal?: CustomButtonConfig[];
    external?: CustomButtonConfig[];
    inclination?: CustomButtonConfig[];
  };

export function getLineComponents(
  selection: LineSelection,
  customButtonsInput: CustomButtonsInput = []
): LineComponents {
  let customButtons: CustomButtonConfig[] = [];
  if (Array.isArray(customButtonsInput)) {
    customButtons = customButtonsInput;
  } else if (customButtonsInput && typeof customButtonsInput === 'object') {
    if (selection.mode === '内部') {
      customButtons = customButtonsInput.internal || [];
    } else if (selection.mode === '傾斜') {
      const incBtns = customButtonsInput.inclination || [];
      const locationBtns: CustomButtonConfig[] = [];
      const seenNames = new Set(incBtns.map((b) => b.name));

      [...(customButtonsInput.internal || []), ...(customButtonsInput.external || [])].forEach((b) => {
        if (b.category === '場所' && !seenNames.has(b.name)) {
          seenNames.add(b.name);
          locationBtns.push(b);
        }
      });
      customButtons = [...incBtns, ...locationBtns];
    } else {
      customButtons = customButtonsInput.external || [];
    }
  }

  const isInternal = selection.mode === '内部';
  const isInclination = selection.mode === '傾斜';

  const direction = formatDirections(selection.directions || []);

  const situationParts: string[] = [];
  if (selection.situationButton) situationParts.push(selection.situationButton);
  if (selection.situationText && selection.situationText.trim()) {
    situationParts.push(selection.situationText.trim());
  }
  const situation = (selection.situationText && selection.situationText.trim()) || '';

  const selectedBtnNames = isInternal
    ? (selection.internalSelections || [])
    : isInclination
      ? (selection.inclinationSelections || [])
      : (selection.externalSelections || []);

  const selectedDamages = isInternal
    ? (selection.internalDamages || [])
    : isInclination
      ? (selection.inclinationValues || selection.damages || [])
      : (selection.externalDamages || []);

  const locationNames: string[] = [];
  const floorNames: string[] = [];
  const partNames: string[] = [];
  const customDamageStrings: string[] = [];
  const customDamageItemsList: DamageItem[] = [];

  selectedBtnNames.forEach((btnName) => {
    const baseName = btnName.replace(/[①-⑳]/g, '').replace(/^[左右上下]/, '');
    const btnConfig =
      customButtons.find((b) => b.name === btnName) ||
      customButtons.find((b) => b.name === btnName.replace(/[①-⑳]/g, '')) ||
      customButtons.find((b) => b.name === baseName);
    const cat = btnConfig?.category || '未定義';

    if (cat === '場所') {
      locationNames.push(btnName);
    } else if (cat === '階数') {
      floorNames.push(btnName);
    } else if (cat === '部位') {
      partNames.push(btnName);
    } else if (cat === '損傷') {
      const dmgInfo =
        selectedDamages.find((d) => d.name === btnName) ||
        selectedDamages.find((d) => d.name === baseName || d.name.replace(/^[左右上下]/, '') === baseName);
      const itemToPush: DamageItem = dmgInfo ? { ...dmgInfo, name: btnName } : { name: btnName, valueW: 0, valueL: 0 };
      customDamageItemsList.push(itemToPush);

      if (!dmgInfo) {
        customDamageStrings.push(btnName);
      } else {
        customDamageStrings.push(buildDamageItemString(itemToPush, btnName));
      }
    }
  });

  // 音声入力によって登録された文字列の合流
  const voiceDamageItems: DamageItem[] = [];
  if (selection.voiceItems && selection.voiceItems.length > 0) {
    selection.voiceItems.forEach((vItem) => {
      const text = vItem.text?.trim();
      if (!text) return;
      if (vItem.category === '場所') {
        locationNames.push(text);
      } else if (vItem.category === '階数') {
        floorNames.push(text);
      } else if (vItem.category === '部位') {
        partNames.push(text);
      } else if (vItem.category === '損傷') {
        voiceDamageItems.push({ name: text, valueW: 0, valueL: 0 });
      }
    });
  }

  const baseLocationStr = selection.location?.selectedLocation ?? (selection.location?.isBuilding ? '建物' : '');
  const location = [baseLocationStr, ...locationNames].filter(Boolean).join('');

  const { floor1, floor2 } = selection.location || {};
  const isFloorDisabled = baseLocationStr === '塀' || baseLocationStr === '土間';
  const stepperFloor = isFloorDisabled ? '' : formatFloor(floor1, floor2);
  const floor = floorNames.length > 0 ? floorNames.join('') : stepperFloor;

  const part = [selection.part, ...partNames].filter(Boolean).join('');

  if (isInclination) {
    // 傾斜モードの数値リスト（inclinationValues）
    const inclinationValuesList = (selection.inclinationValues && selection.inclinationValues.length > 0)
      ? selection.inclinationValues
      : (selection.damages || []);

    const inclinationValueStrings: string[] = [];
    inclinationValuesList.forEach((item) => {
      const valStr = formatDamageValueDetail(item, true);
      if (valStr) {
        inclinationValueStrings.push(valStr);
      }
    });

    return {
      location,
      floor,
      direction,
      part,
      damages: inclinationValueStrings,
      damageItems: inclinationValuesList,
      situation,
    };
  }

  // 損傷アイテムリストの構築:
  // 1. selection.damages（標準損傷ボタン・カスタム損傷ボタンから選択された項目）
  // 2. または selectedBtnNames 由来の customDamageItemsList
  // 3. 音声入力による「損傷」項目（重複しないよう合流）
  const baseDamageItems: DamageItem[] = (selection.damages && selection.damages.length > 0)
    ? [...selection.damages]
    : [...customDamageItemsList];

  const allDamageItems: DamageItem[] = [...baseDamageItems];
  voiceDamageItems.forEach((vItem) => {
    if (!allDamageItems.some((d) => d.name === vItem.name)) {
      allDamageItems.push(vItem);
    }
  });

  const allDamageStrings = allDamageItems.map((d) => buildDamageItemString(d));

  return {
    location,
    floor,
    direction,
    part,
    damages: allDamageStrings,
    damageItems: allDamageItems,
    situation,
  };
}

/**
 * 損傷アイテムの簡易文字列フォーマット
 */
export function buildDamageItemString(d: DamageItem, btnName?: string): string {
  const name = btnName || d.name;
  const wVal = d.valueW ?? d.value ?? 0;
  const lVal = d.valueL ?? 0;
  const hasL = Boolean(d.hasL || lVal > 0);
  const wPrefix = d.isLessThan ? '<' : '';

  let valStr = '';
  if (wVal > 0 && hasL) {
    const lStr = lVal > 0 ? `L${formatDamageValue(lVal)}` : 'L全長';
    valStr = `W${wPrefix}${formatDamageValue(wVal)}${lStr}`;
  } else if (wVal > 0) {
    valStr = `W${wPrefix}${formatDamageValue(wVal)}`;
  } else if (hasL) {
    const lStr = lVal > 0 ? `L${formatDamageValue(lVal)}` : 'L全長';
    valStr = `${lStr}`;
  }

  let presetText = '';
  if (d.preset) {
    if (d.preset === '全体') presetText = '全体';
    else if (d.preset === '多数') presetText = '多数';
    else if (d.preset === '全般') presetText = '全般';
    else presetText = d.preset;
  }
  if (presetText) {
    valStr = valStr ? `${valStr}${presetText}` : presetText;
  }
  return `${name}${valStr}`;
}

/**
 * ダメージ名からプレフィックス（左・右・上・下）とベース名に分解
 */
export function parseDamageName(name: string): { prefix: string; baseName: string } {
  const match = name.match(/^([左右上下])?(.*)$/);
  if (match) {
    return {
      prefix: match[1] || '',
      baseName: match[2] || name,
    };
  }
  return { prefix: '', baseName: name };
}

/**
 * ダメージ項目の数値/プリセット部分をフォーマット (例: W=1.0mm　L=2.0mm、傾斜モード時は 2.5)
 */
export function formatDamageValueDetail(item: DamageItem, isInclination: boolean = false): string {
  if (isInclination) {
    if (item.preset) {
      return (item.preset === '全般' || item.preset === '全体') ? '全体' : item.preset;
    }
    const dirs = item.directions || [];
    const nameStr = item.name || '';
    const hasSouth = dirs.includes('南') || nameStr.includes('南');
    const hasNorth = dirs.includes('北') || nameStr.includes('北');
    const hasEast = dirs.includes('東') || nameStr.includes('東');
    const hasWest = dirs.includes('西') || nameStr.includes('西');

    if ((hasSouth && hasNorth) || nameStr.includes('南北0')) {
      return '南北±0㎜/M';
    }
    if ((hasEast && hasWest) || nameStr.includes('東西0')) {
      return '東西±0㎜/M';
    }

    let dirPrefix = '';
    if (hasSouth) dirPrefix = '南';
    else if (hasNorth) dirPrefix = '北';
    else if (hasEast) dirPrefix = '東';
    else if (hasWest) dirPrefix = '西';

    const wVal = item.valueW ?? item.value ?? 0;
    const wPrefix = item.isLessThan ? '<' : '';

    if (wVal !== 0) {
      return `${dirPrefix}${wPrefix}${wVal}㎜/M`;
    }
    if (dirPrefix) {
      return `${dirPrefix}0㎜/M`;
    }
    return '';
  }

  const wVal = item.valueW ?? item.value ?? 0;
  const lVal = item.valueL ?? 0;
  const hasL = Boolean(item.hasL || lVal > 0);
  const wPrefix = item.isLessThan ? '<' : '';

  let numStr = '';
  if (wVal > 0 && hasL) {
    const lStr = lVal > 0 ? `${formatDamageValue(lVal)}mm` : '全長';
    numStr = `W=${wPrefix}${formatDamageValue(wVal)}mm　L=${lStr}`;
  } else if (wVal > 0) {
    numStr = `W=${wPrefix}${formatDamageValue(wVal)}mm`;
  } else if (hasL) {
    const lStr = lVal > 0 ? `${formatDamageValue(lVal)}mm` : '全長';
    numStr = `L=${lStr}`;
  }

  let presetText = '';
  if (item.preset) {
    if (item.preset === '全体') presetText = '全体';
    else if (item.preset === '多数') presetText = '多数';
    else if (item.preset === '全般') presetText = '全般';
    else presetText = item.preset;
  }
  if (presetText) {
    return numStr ? `${numStr}　${presetText}` : presetText;
  }

  return numStr;
}

/**
 * クリップボード（スプレッドシート貼付）用フォーマット（全6列タブ区切り）
 */
/**
 * 0ベースのインデックスから全角アルファベットを取得 (0 = Ａ, 1 = Ｂ, ..., 25 = Ｚ, 26 = ａ, ...)
 */
export function getAlphabetFromIndex(index: number): string {
  if (index < 0) return '';
  if (index < 26) {
    return String.fromCharCode(0xFF21 + index); // 全角 Ａ〜Ｚ
  } else {
    const smallIdx = (index - 26) % 26;
    return String.fromCharCode(0xFF41 + smallIdx); // 全角 ａ〜ｚ
  }
}

/**
 * 文字列（半角または全角）から全角アルファベットに変換
 */
export function toFullWidthAlphabet(char: string): string {
  if (!char) return '';
  const trimmed = char.trim();
  if (!trimmed) return '';
  const code = trimmed.charCodeAt(0);
  // 半角 A-Z (0x41 - 0x5A) -> 全角 Ａ-Ｚ (0xFF21 - 0xFF3A)
  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCharCode(code - 0x41 + 0xff21);
  }
  // 半角 a-z (0x61 - 0x7a) -> 全角 ａ-ｚ (0xff41 - 0xff5a)
  if (code >= 0x61 && code <= 0x7a) {
    return String.fromCharCode(code - 0x61 + 0xff41);
  }
  return trimmed.charAt(0);
}

/**
 * ページ番号に応じた傾斜用アルファベット（Ａ〜Ｚ、ａ〜ｚ）を生成
 */
export function getInclinationAlphabet(pageNumber: number): string {
  if (pageNumber <= 0) return '';
  return getAlphabetFromIndex(pageNumber - 1);
}

export function generateLineTextForSpreadsheet(
  selection: LineSelection,
  customButtonsInput: CustomButtonsInput = [],
  delimiter: string = '\t',
  lineNumber?: number,
  options?: {
    startRowNo?: number;
    inclinationLetter?: string;
  }
): string {
  const comp = getLineComponents(selection, customButtonsInput);

  const isInclination = selection.mode === '傾斜';
  const hasLocation = Boolean(comp.location && comp.location.trim().length > 0);
  const locationAndFloor = [comp.location, comp.floor].filter(Boolean).join('　');

  const direction = comp.direction;
  const part = comp.part;

  // 現況・全景ボタン
  const sitBtn = selection.situationButton || null; // '全景' | '現況' | null

  // 第6列は自由入力テキストのみ
  const col6 = (selection.situationText && selection.situationText.trim()) || '';

  const items = comp.damageItems || [];
  const count = items.length;

  let col1 = '';
  let col2 = direction;
  let col3 = '';
  let col4 = '';
  let col5 = '';

  if (isInclination) {
    // 傾斜モードの列振り分け（1ページに対して必ず3行出力）
    if (hasLocation) {
      col1 = locationAndFloor;
      col3 = [part, sitBtn].filter(Boolean).join('　');
    } else {
      col1 = part;
      col3 = sitBtn || '';
    }

    const val1 = items[0] ? formatDamageValueDetail(items[0], true) : '';
    const val2 = items[1] ? formatDamageValueDetail(items[1], true) : '';

    // 2行目 2列目:
    // ・数値1が入力されている場合: 数値1
    // ・数値1未入力で数値2が入力されている場合: 数値2
    // ・両方未入力の場合: 表示なし
    const line2Col2 = val1 ? val1 : (val2 ? val2 : '');

    // 3行目 2列目:
    // ・数値1と2が両方入力されている場合: 数値2
    // ・それ以外: 表示なし
    const line3Col2 = (val1 && val2) ? val2 : '';

    const hasStartRowNo = options?.startRowNo !== undefined;
    const hasLineNumber = hasStartRowNo || Boolean(lineNumber && lineNumber > 0);

    const startNo = hasStartRowNo
      ? options!.startRowNo!
      : (hasLineNumber ? (lineNumber! - 1) * 3 + 1 : 0);

    const incLetter = options?.inclinationLetter
      ? toFullWidthAlphabet(options.inclinationLetter)
      : (hasLineNumber ? getInclinationAlphabet(lineNumber!) : '');

    const line1Prefix = hasLineNumber ? [`${startNo}`, `傾斜${incLetter}`] : [];
    const line2Prefix = hasLineNumber ? [`${startNo + 1}`, ''] : [];
    const line3Prefix = hasLineNumber ? [`${startNo + 2}`, ''] : [];

    const line1 = [...line1Prefix, col1, col2, col3, '', '', col6].join(delimiter);
    const line2 = [...line2Prefix, '', line2Col2, '', '', '', ''].join(delimiter);
    const line3 = [...line3Prefix, '', line3Col2, '', '', '', ''].join(delimiter);

    return `${line1}\n${line2}\n${line3}`;
  }

  if (count === 0) {
    const damagePartText = sitBtn || '';
    if (hasLocation) {
      col1 = locationAndFloor;
      col3 = [part, damagePartText].filter(Boolean).join('　');
    } else {
      col1 = part;
      col3 = damagePartText;
    }
  } else if (count === 1) {
    const { prefix, baseName } = parseDamageName(items[0].name);
    const valDetail = formatDamageValueDetail(items[0]);
    const damagePartText = sitBtn ? `${baseName}・${sitBtn}` : baseName;
    const formattedVal = prefix && valDetail ? `${prefix}${valDetail}` : valDetail;

    if (hasLocation) {
      // ① "場所"あり / 損傷1つ
      col1 = locationAndFloor;
      col3 = [part, damagePartText].filter(Boolean).join('　');
      col4 = formattedVal;
      col5 = '';
    } else {
      // ④ "場所"なし / 損傷1つ
      col1 = part;
      col3 = damagePartText;
      col4 = formattedVal;
      col5 = '';
    }
  } else {
    // 2つ以上（基本は最大2つ想定）
    const item1 = items[0];
    const item2 = items[1];
    const parsed1 = parseDamageName(item1.name);
    const parsed2 = parseDamageName(item2.name);
    const valDetail1 = formatDamageValueDetail(item1);
    const valDetail2 = formatDamageValueDetail(item2);

    const baseNames = Array.from(new Set(items.map((it) => parseDamageName(it.name).baseName).filter(Boolean)));
    const isSameName = baseNames.length === 1;

    if (isSameName) {
      // 同名２つ以上（③, ⑥）
      const prefix1 = parsed1.prefix || '右';
      const prefix2 = parsed2.prefix || '左';

      col4 = valDetail1 ? `${prefix1}${valDetail1}` : '';
      col5 = valDetail2 ? `${prefix2}${valDetail2}` : '';

      const damagePartText = sitBtn ? `${baseNames[0]}・${sitBtn}` : baseNames[0];

      if (hasLocation) {
        // ③ "場所"あり / 同名2つ
        col1 = locationAndFloor;
        col3 = [part, damagePartText].filter(Boolean).join('　');
      } else {
        // ⑥ "場所"なし / 同名2つ
        col1 = part;
        col3 = damagePartText;
      }
    } else {
      // 異なる２つ以上（②, ⑤）
      const damage1Text = parsed1.baseName;
      const damage2Text = parsed2.baseName;

      col4 = valDetail1 ? `${damage1Text}　${valDetail1}` : '';
      col5 = valDetail2 ? `${damage2Text}　${valDetail2}` : '';

      const allDamageNameStr = baseNames.join('・');
      const damagePartText = sitBtn ? `${allDamageNameStr}・${sitBtn}` : allDamageNameStr;

      if (hasLocation) {
        // ② "場所"あり / 異なる2つ
        col1 = locationAndFloor;
        col3 = [part, damagePartText].filter(Boolean).join('　');
      } else {
        // ⑤ "場所"なし / 異なる2つ
        col1 = part;
        col3 = damagePartText;
      }
    }
  }

  // 第4列が空欄で第5列に内容がある場合、第5列を第4列に繰り上げる
  if (!col4 && col5) {
    col4 = col5;
    col5 = '';
  }

  const hasStartRowNo = options?.startRowNo !== undefined;
  const targetNo = hasStartRowNo ? options!.startRowNo! : lineNumber;
  const prefixCols = (targetNo && targetNo > 0) ? [`${targetNo}`, ''] : [];
  return [...prefixCols, col1, col2, col3, col4, col5, col6].join(delimiter);
}

export function generateLineText(
  selection: LineSelection,
  customButtonsInput: CustomButtonsInput = [],
  delimiter: string = ' / '
): string {
  if (delimiter === '\t') {
    return generateLineTextForSpreadsheet(selection, customButtonsInput);
  }

  const tabText = generateLineTextForSpreadsheet(selection, customButtonsInput);
  return tabText
    .split(/[\t\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join(delimiter);
}
export function hasLineInput(
  selection: LineSelection,
  customButtonsInput: CustomButtonsInput = []
): boolean {
  const text = generateLineText(selection, customButtonsInput);
  return text.trim().length > 0;
}

export interface CopyNumberOptions {
  startNo: number;
  startInclination: string;
}

/**
 * 有効な行データ一覧から、開始No.および開始傾斜点に基づいてスプレッドシート用テキスト配列を生成
 */
export function generateAllLinesTextForSpreadsheet(
  validLines: LineData[],
  customButtonsInput: CustomButtonsInput = [],
  delimiter: string = '\t',
  copyOptions: CopyNumberOptions = { startNo: 1, startInclination: 'A' },
  defaultSurveyType?: SurveyType
): string[] {
  let currentRowNo = Math.max(1, copyOptions.startNo || 1);

  // 開始アルファベットのインデックス（A=0, B=1, ...）を計算
  const startLetter = copyOptions.startInclination ? copyOptions.startInclination.trim().toUpperCase() : 'A';
  const charCode = startLetter.charCodeAt(0);
  const startAlphabetIdx = (charCode >= 65 && charCode <= 90) ? charCode - 65 : 0;
  let currentInclinationIdx = startAlphabetIdx;

  return validLines.map((line) => {
    const isInc = line.selection.mode === '傾斜' || (!line.selection.mode && defaultSurveyType === '傾斜');
    const thisRowNo = currentRowNo;
    const thisLetter = isInc ? getAlphabetFromIndex(currentInclinationIdx) : '';

    if (isInc) {
      currentRowNo += 3;
      currentInclinationIdx += 1;
    } else {
      currentRowNo += 1;
    }

    return generateLineTextForSpreadsheet(
      line.selection,
      customButtonsInput,
      delimiter,
      undefined,
      {
        startRowNo: thisRowNo,
        inclinationLetter: thisLetter,
      }
    );
  });
}
