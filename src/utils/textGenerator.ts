import { LineSelection, CustomButtonConfig } from '../types';

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
  const situation = situationParts.join(' ');

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

    return {
      location,
      floor,
      direction,
      part,
      damages: allDamages,
      situation,
    };
  }
}

/**
 * クリップボード（スプレッドシート貼付）用フォーマット
 * Col 1: 【場所】+半角空白+【階数】
 * Col 2: 【方位】
 * Col 3: 【部位】+半角空白+【損傷①】+・【損傷②】(損傷②があった場合のみ)
 */
export function generateLineTextForSpreadsheet(
  selection: LineSelection,
  customButtonsInput: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] } = []
): string {
  const comp = getLineComponents(selection, customButtonsInput);

  // Col 1: 【場所】 +半角空白+ 【階数】
  const col1 = [comp.location, comp.floor].filter(Boolean).join(' ');

  // Col 2: 【方位】
  const col2 = comp.direction;

  // Col 3: 【部位】 +半角空白+ 【損傷①】・【損傷②】
  const damageCombined = comp.damages.join('・');
  let damageAndSit = damageCombined;
  if (comp.situation) {
    if (damageAndSit) {
      damageAndSit += `/${comp.situation}`;
    } else {
      damageAndSit = comp.situation;
    }
  }

  const col3 = [comp.part, damageAndSit].filter(Boolean).join(' ');

  return `${col1}\t${col2}\t${col3}`;
}

export function generateLineText(
  selection: LineSelection,
  customButtonsInput: CustomButtonConfig[] | { internal: CustomButtonConfig[]; external: CustomButtonConfig[] } = [],
  delimiter: string = '/'
): string {
  if (delimiter === '\t') {
    return generateLineTextForSpreadsheet(selection, customButtonsInput);
  }

  const comp = getLineComponents(selection, customButtonsInput);

  const col1 = [comp.location, comp.floor].filter(Boolean).join(' ');
  const col2 = comp.direction;

  const damageCombined = comp.damages.join('・');
  let damageAndSit = damageCombined;
  if (comp.situation) {
    if (damageAndSit) {
      damageAndSit += `/${comp.situation}`;
    } else {
      damageAndSit = comp.situation;
    }
  }

  const col3 = [comp.part, damageAndSit].filter(Boolean).join(' ');

  return [col1, col2, col3].filter(Boolean).join(' / ');
}
