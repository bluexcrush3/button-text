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
  customButtons: CustomButtonConfig[] = []
): LineComponents {
  const isInternal = selection.mode === '内部';

  const direction = formatDirections(selection.directions || []);

  const situationParts: string[] = [];
  if (selection.situationButton) situationParts.push(selection.situationButton);
  if (selection.situationText && selection.situationText.trim()) {
    situationParts.push(selection.situationText.trim());
  }
  const situation = situationParts.join(' ');

  if (isInternal) {
    const selectedBtnNames = selection.internalSelections || [];
    const locationNames: string[] = [];
    const floorNames: string[] = [];
    const partNames: string[] = [];
    const damageStrings: string[] = [];

    selectedBtnNames.forEach((btnName) => {
      const btnConfig = customButtons.find((b) => b.name === btnName);
      const cat = btnConfig?.category || '損傷';

      if (cat === '場所') {
        locationNames.push(btnName);
      } else if (cat === '階数') {
        floorNames.push(btnName);
      } else if (cat === '箇所') {
        partNames.push(btnName);
      } else if (cat === '損傷') {
        const dmgInfo = (selection.internalDamages || []).find((d) => d.name === btnName);
        if (!dmgInfo) {
          damageStrings.push(btnName);
        } else if (dmgInfo.preset) {
          damageStrings.push(`${btnName}${dmgInfo.preset}`);
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
          damageStrings.push(`${btnName}${valStr}`);
        }
      }
    });

    let location = locationNames.join('');
    let floor = floorNames.join('');

    // モード内未指定で既存の建物/階数情報があれば補完
    if (!location && !floor && (selection.part !== '塀' && selection.part !== '土間')) {
      if (selection.location?.isBuilding && locationNames.length === 0) {
        // 必要に応じて
      }
      const { floor1, floor2 } = selection.location || {};
      if (floor1 > 0 && floor2 > 0) floor = `${floor1}-${floor2}階`;
      else if (floor1 > 0) floor = `${floor1}階`;
      else if (floor2 > 0) floor = `${floor2}階`;
    }

    return {
      location,
      floor,
      direction,
      part: partNames.join(''),
      damages: damageStrings,
      situation,
    };
  } else {
    // 外部モード
    let location = '';
    let floor = '';

    if (selection.part !== '塀' && selection.part !== '土間') {
      if (selection.location?.isBuilding) {
        location = '建物';
      }
      const { floor1, floor2 } = selection.location || {};
      if (floor1 > 0 && floor2 > 0) floor = `${floor1}-${floor2}階`;
      else if (floor1 > 0) floor = `${floor1}階`;
      else if (floor2 > 0) floor = `${floor2}階`;
    }

    const part = selection.part || '';

    const damageStrings: string[] = [];
    if (selection.damages && selection.damages.length > 0) {
      selection.damages.forEach((d) => {
        if (d.preset) {
          damageStrings.push(`${d.name}${d.preset}`);
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
          damageStrings.push(`${d.name}${valStr}`);
        }
      });
    }

    return {
      location,
      floor,
      direction,
      part,
      damages: damageStrings,
      situation,
    };
  }
}

/**
 * クリップボード（スプレッドシート貼付）用フォーマット
 * Col 1: 【場所】+半角空白+【階数】
 * Col 2: 【方位】
 * Col 3: 【箇所】+半角空白+【損傷①】+・【損傷②】(損傷②があった場合のみ)
 */
export function generateLineTextForSpreadsheet(
  selection: LineSelection,
  customButtons: CustomButtonConfig[] = []
): string {
  const comp = getLineComponents(selection, customButtons);

  // Col 1: 【場所】 +半角空白+ 【階数】
  const col1 = [comp.location, comp.floor].filter(Boolean).join(' ');

  // Col 2: 【方位】
  const col2 = comp.direction;

  // Col 3: 【箇所】 +半角空白+ 【損傷①】・【損傷②】
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
  customButtons: CustomButtonConfig[] = [],
  delimiter: string = '/'
): string {
  if (delimiter === '\t') {
    return generateLineTextForSpreadsheet(selection, customButtons);
  }

  const comp = getLineComponents(selection, customButtons);

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
