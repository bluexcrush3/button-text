import { LineSelection, CustomButtonConfig, DamageItem } from '../types';

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
  if (val <= 0) return '';
  if (Number.isInteger(val)) {
    return `${val}.0`;
  }
  return `${val}`;
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

export function getLineComponents(
  selection: LineSelection,
  customButtonsInput: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] } = []
): LineComponents {
  let customButtons: CustomButtonConfig[] = [];
  if (Array.isArray(customButtonsInput)) {
    customButtons = customButtonsInput;
  } else if (customButtonsInput && typeof customButtonsInput === 'object') {
    customButtons = selection.mode === '内部' ? (customButtonsInput.internal || []) : (customButtonsInput.external || []);
  }

  const isInternal = selection.mode === '内部';

  const direction = formatDirections(selection.directions || []);

  const situationParts: string[] = [];
  if (selection.situationButton) situationParts.push(selection.situationButton);
  if (selection.situationText && selection.situationText.trim()) {
    situationParts.push(selection.situationText.trim());
  }
  const situation = (selection.situationText && selection.situationText.trim()) || '';

  const selectedBtnNames = isInternal
    ? (selection.internalSelections || [])
    : (selection.externalSelections || []);

  const selectedDamages = isInternal
    ? (selection.internalDamages || [])
    : (selection.externalDamages || []);

  const locationNames: string[] = [];
  const floorNames: string[] = [];
  const partNames: string[] = [];
  const customDamageStrings: string[] = [];
  const customDamageItemsList: DamageItem[] = [];

  selectedBtnNames.forEach((btnName) => {
    const baseName = btnName.replace(/[①-⑳]/g, '');
    const btnConfig = customButtons.find((b) => b.name === btnName || b.name === baseName);
    const cat = btnConfig?.category || '損傷';

    if (cat === '場所') {
      locationNames.push(btnName);
    } else if (cat === '階数') {
      floorNames.push(btnName);
    } else if (cat === '部位') {
      partNames.push(btnName);
    } else if (cat === '損傷') {
      const dmgInfo = selectedDamages.find((d) => d.name === btnName);
      const itemToPush: DamageItem = dmgInfo ? { ...dmgInfo } : { name: btnName, valueW: 0, valueL: 0 };
      customDamageItemsList.push(itemToPush);

      if (!dmgInfo) {
        customDamageStrings.push(btnName);
      } else if (dmgInfo.preset) {
        customDamageStrings.push(`${btnName}${dmgInfo.preset}`);
      } else {
        const wVal = dmgInfo.valueW ?? 0;
        const lVal = dmgInfo.valueL ?? 0;
        let valStr = '';
        if (wVal > 0 && lVal > 0) {
          valStr = `W${formatDamageValue(wVal)}L${formatDamageValue(lVal)}`;
        } else if (wVal > 0) {
          valStr = `W${formatDamageValue(wVal)}`;
        } else if (lVal > 0) {
          valStr = `L${formatDamageValue(lVal)}`;
        }
        customDamageStrings.push(`${btnName}${valStr}`);
      }
    }
  });

  if (isInternal) {
    const buildingStr = selection.location?.isBuilding ? '建物' : '';
    const location = [buildingStr, ...locationNames].filter(Boolean).join('');

    const { floor1, floor2 } = selection.location || {};
    const stepperFloor = formatFloor(floor1, floor2);
    const floor = floorNames.length > 0 ? floorNames.join('') : stepperFloor;

    return {
      location,
      floor,
      direction,
      part: partNames.join(''),
      damages: customDamageStrings,
      damageItems: customDamageItemsList,
      situation,
    };
  } else {
    // 外部モード
    let location = '';
    let floor = '';

    if (selection.part !== '塀' && selection.part !== '土間') {
      const buildingStr = selection.location?.isBuilding ? '建物' : '';
      location = [buildingStr, ...locationNames].filter(Boolean).join('');

      const { floor1, floor2 } = selection.location || {};
      const stepperFloor = formatFloor(floor1, floor2);
      floor = floorNames.length > 0 ? floorNames.join('') : stepperFloor;
    }

    const part = [selection.part, ...partNames].filter(Boolean).join('');

    const standardDamageStrings: string[] = [];
    const standardDamageItemsList: DamageItem[] = selection.damages || [];

    if (selection.damages && selection.damages.length > 0) {
      selection.damages.forEach((d) => {
        if (d.preset) {
          standardDamageStrings.push(`${d.name}${d.preset}`);
        } else {
          const wVal = d.valueW ?? d.value ?? 0;
          const lVal = d.valueL ?? 0;
          let valStr = '';
          if (wVal > 0 && lVal > 0) {
            valStr = `W${formatDamageValue(wVal)}L${formatDamageValue(lVal)}`;
          } else if (wVal > 0) {
            valStr = `W${formatDamageValue(wVal)}`;
          } else if (lVal > 0) {
            valStr = `L${formatDamageValue(lVal)}`;
          }
          standardDamageStrings.push(`${d.name}${valStr}`);
        }
      });
    }

    const allDamages = [...standardDamageStrings, ...customDamageStrings];
    const allDamageItems = [...standardDamageItemsList, ...customDamageItemsList];

    return {
      location,
      floor,
      direction,
      part,
      damages: allDamages,
      damageItems: allDamageItems,
      situation,
    };
  }
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
 * ダメージ項目の数値/プリセット部分をフォーマット (例: W=1.0mm　L=2.0mm)
 */
export function formatDamageValueDetail(item: DamageItem): string {
  if (item.preset) {
    return item.preset;
  }
  const wVal = item.valueW ?? item.value ?? 0;
  const lVal = item.valueL ?? 0;

  if (wVal > 0 && lVal > 0) {
    return `W=${formatDamageValue(wVal)}mm　L=${formatDamageValue(lVal)}mm`;
  } else if (wVal > 0) {
    return `W=${formatDamageValue(wVal)}mm`;
  } else if (lVal > 0) {
    return `L=${formatDamageValue(lVal)}mm`;
  }
  return '';
}

/**
 * クリップボード（スプレッドシート貼付）用フォーマット（全6列タブ区切り）
 * ① "場所"あり / 損傷1つ
 * ② "場所"あり / 損傷異なる2つ
 * ③ "場所"あり / 損傷同名2つ
 * ④ "場所"なし / 損傷1つ
 * ⑤ "場所"なし / 損傷異なる2つ
 * ⑥ "場所"なし / 損傷同名2つ
 */
export function generateLineTextForSpreadsheet(
  selection: LineSelection,
  customButtonsInput: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] } = []
): string {
  const comp = getLineComponents(selection, customButtonsInput);

  const hasLocation = Boolean(comp.location && comp.location.trim().length > 0);
  const locationAndFloor = [comp.location, comp.floor].filter(Boolean).join('　');

  const direction = comp.direction;
  const part = comp.part;

  // 現況・全景ボタンは損傷と同じ扱いとして第3列に結合
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
    const { baseName } = parseDamageName(items[0].name);
    const valDetail = formatDamageValueDetail(items[0]);
    const damagePartText = sitBtn ? `${baseName}・${sitBtn}` : baseName;

    if (hasLocation) {
      // ① "場所"あり / 損傷1つ
      col1 = locationAndFloor;
      col3 = [part, damagePartText].filter(Boolean).join('　');
      col4 = valDetail;
      col5 = '';
    } else {
      // ④ "場所"なし / 損傷1つ
      col1 = part;
      col3 = damagePartText;
      col4 = valDetail;
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

    const isSameName = parsed1.baseName === parsed2.baseName;

    if (isSameName) {
      // 同名２つ（③, ⑥）
      const prefix1 = parsed1.prefix || '左';
      const prefix2 = parsed2.prefix || '右';

      col4 = valDetail1 ? `${prefix1}${valDetail1}` : '';
      col5 = valDetail2 ? `${prefix2}${valDetail2}` : '';

      const damagePartText = sitBtn ? `${parsed1.baseName}・${sitBtn}` : parsed1.baseName;

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
      // 異なる２つ（②, ⑤）
      const damage1Text = parsed1.baseName;
      const damage2Text = parsed2.baseName;

      col4 = valDetail1 ? `${damage1Text}　${valDetail1}` : '';
      col5 = valDetail2 ? `${damage2Text}　${valDetail2}` : '';

      const damagePartText = sitBtn ? `${damage1Text}・${damage2Text}・${sitBtn}` : `${damage1Text}・${damage2Text}`;

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

  return `${col1}\t${col2}\t${col3}\t${col4}\t${col5}\t${col6}`;
}

export function generateLineText(
  selection: LineSelection,
  customButtonsInput: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] } = [],
  delimiter: string = ' / '
): string {
  if (delimiter === '\t') {
    return generateLineTextForSpreadsheet(selection, customButtonsInput);
  }

  const tabText = generateLineTextForSpreadsheet(selection, customButtonsInput);
  return tabText
    .split('\t')
    .filter((t) => t.trim().length > 0)
    .join(' / ');
}

