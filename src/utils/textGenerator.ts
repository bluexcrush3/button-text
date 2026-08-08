import { LineSelection } from '../types';

/**
 * 方向グループの2要素を結合表記に変換
 */
export function formatDirections(dirs: string[]): string {
  if (dirs.length === 0) return '';
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
 * 場所グループの文字列をフォーマット
 */
export function formatLocation(selection: LineSelection): string {
  // 「塀」または「土間」が選択されている場合は「場所」グループを出力しない
  if (selection.part === '塀' || selection.part === '土間') {
    return '';
  }

  const { isBuilding, floor1, floor2 } = selection.location;
  let buildingText = isBuilding ? '建物' : '';
  let floorText = '';

  if (floor1 > 0 && floor2 > 0) {
    floorText = `${floor1}-${floor2}階`;
  } else if (floor1 > 0) {
    floorText = `${floor1}階`;
  } else if (floor2 > 0) {
    floorText = `${floor2}階`;
  }

  return `${buildingText}${floorText}`;
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
 * 全選択情報からグループ間をスラッシュ '/' で連結した文字列を生成
 * (①場所 / ②方向 / ③箇所 / ④損傷)
 */
export function generateLineText(selection: LineSelection): string {
  const parts: string[] = [];

  // ① 場所グループ
  const locationText = formatLocation(selection);
  if (locationText) {
    parts.push(locationText);
  }

  // ② 方向グループ
  const directionText = formatDirections(selection.directions);
  if (directionText) {
    parts.push(directionText);
  }

  // ③ 箇所グループ
  if (selection.part) {
    parts.push(selection.part);
  }

  // ④ 損傷グループ (最大2つ、各数値(W/L)または「全般」「多数」付き)
  if (selection.damages && selection.damages.length > 0) {
    const damageText = selection.damages
      .map((d) => {
        if (d.preset) {
          return `${d.name}${d.preset}`;
        }
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
        return `${d.name}${valStr}`;
      })
      .join('');
    if (damageText) {
      parts.push(damageText);
    }
  }

  // ⑤ 状況グループ (末尾に追加)
  if (selection.situationButton) {
    parts.push(selection.situationButton);
  }
  if (selection.situationText && selection.situationText.trim()) {
    parts.push(selection.situationText.trim());
  }

  // グループ間をスラッシュ '/' で結合
  return parts.join('/');
}
