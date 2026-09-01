/**
 * 音声認識テキストから損傷のW数値およびプリセット（全般/多数/50）を解析・抽出するユーティリティ
 */

export interface ParsedDamageW {
  valueW: number;
  preset: '全般' | '多数' | null;
}

export interface VoiceDamageParseResult {
  success: boolean;
  damages: ParsedDamageW[];
  rawText: string;
  feedbackText: string;
}

/**
 * 漢数字・全角数字・ひらがなの数詞・小数点を半角アラビア数字文字列に変換する
 */
export function normalizeJapaneseNumbers(text: string): string {
  let s = text;

  // 全角英数・記号の半角化
  s = s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/　/g, ' ');

  // 50の読み
  s = s.replace(/ごじゅう|五十/gi, '50');
  // 小数点の表現
  s = s.replace(/れいてん|ぜろてん|ゼロ点|零点|れい点/gi, '0.');
  s = s.replace(/てん|点/gi, '.');

  // 単独の「.3」「.5」等を「0.3」「0.5」に補正
  s = s.replace(/(^|[^\d])\.(\d+)/g, '$1 0.$2');

  // ひらがな数字・漢数字変換テーブル
  const kanjiMap: { [key: string]: number } = {
    'ぜろ': 0, 'ゼロ': 0, '〇': 0, '零': 0,
    'いち': 1, 'イチ': 1, '一': 1, '壱': 1,
    'に': 2, 'ニ': 2, '二': 2, '弐': 2,
    'さん': 3, 'サン': 3, '三': 3, '参': 3,
    'よん': 4, 'ヨン': 4, 'し': 4, '四': 4,
    'ご': 5, 'ゴ': 5, '五': 5,
    'ろく': 6, 'ロク': 6, '六': 6,
    'なな': 7, 'ナナ': 7, 'しち': 7, '七': 7,
    'はち': 8, 'ハチ': 8, '八': 8,
    'きゅう': 9, 'キュウ': 9, 'く': 9, '九': 9,
  };

  for (const [k, v] of Object.entries(kanjiMap)) {
    s = s.split(k).join(v.toString());
  }

  // 「十」を含む数値の簡単な処理 (例: 十五 -> 15, 二十 -> 20, 三十 -> 30)
  s = s.replace(/(\d*)十(\d*)/g, (_, tens, ones) => {
    const t = tens ? parseInt(tens, 10) : 1;
    const o = ones ? parseInt(ones, 10) : 0;
    return (t * 10 + o).toString();
  });

  return s;
}

/**
 * 1つの文字列セグメントから Damage W 情報（valueW または preset）をパースする
 */
function parseSingleDamageItem(segment: string): ParsedDamageW | null {
  const cleaned = segment.trim();
  if (!cleaned) return null;

  // 1. クリア / ゼロ
  if (/^(?:クリア|リセット|ゼロ|なし|消去|0)$/i.test(cleaned)) {
    return { valueW: 0, preset: null };
  }

  // 2. プリセット: 全般
  if (/全般|ぜんぱん/i.test(cleaned)) {
    return { valueW: 0, preset: '全般' };
  }

  // 3. プリセット: 多数
  if (/多数|たすう/i.test(cleaned)) {
    return { valueW: 0, preset: '多数' };
  }

  // 4. 50
  if (/\b50\b|50/.test(cleaned)) {
    return { valueW: 50, preset: null };
  }

  // 5. 数値（小数含む）の抽出 (例: 0.3, 1.5, 2, 0.25 など)
  const numMatch = cleaned.match(/\b\d+(?:\.\d+)?\b/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (!isNaN(val)) {
      return { valueW: val, preset: null };
    }
  }

  return null;
}

/**
 * 音声認識テキストを解析して、最大2つの損傷に対するW値またはプリセットを抽出する
 * @param rawTranscript Web Speech APIからの音声認識テキスト
 * @param damageCount 現在選択されている損傷の数（1 または 2）
 */
export function parseVoiceDamageW(
  rawTranscript: string,
  damageCount: number = 1
): VoiceDamageParseResult {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      success: false,
      damages: [],
      rawText: rawTranscript,
      feedbackText: '音声が聞き取れませんでした。',
    };
  }

  let text = normalizeJapaneseNumbers(rawTranscript);

  // 不要語の除去
  text = text.replace(/ダブリュー|ダブル|だぶりゅー|\bW\b|\bw\b|幅|はば|巾/gi, ' ');
  text = text.replace(/ミリ|mm|センチ|cm|メートル|m/gi, ' ');
  text = text.replace(/数値|すうち|あたい|値|寸法/gi, ' ');
  text = text.replace(/です|ます|登録|設定|入力|お願い|にして/gi, ' ');

  text = text.trim();

  // 1. 特殊ケース: 「両方 〇〇」「同じく 〇〇」「共に 〇〇」
  const bothMatch = text.match(/(?:両方|両方とも|両者|同じく|同じ|ともに)\s*(.*)/i);
  if (bothMatch) {
    const item = parseSingleDamageItem(bothMatch[1]);
    if (item) {
      const damages = damageCount >= 2 ? [item, { ...item }] : [item];
      return {
        success: true,
        damages,
        rawText: rawTranscript,
        feedbackText: formatFeedbackText(damages),
      };
    }
  }

  // 2. 「1つめ/1番」「2つめ/2番」などの明示的な指定の抽出
  const firstMatch = text.match(/(?:1つめ|1個め|1番目|1番|1)\s*[:：はが]?\s*([^2２]+)/);
  const secondMatch = text.match(/(?:2つめ|2個め|2番目|2番|2)\s*[:：はが]?\s*(.+)/);
  if (firstMatch || secondMatch) {
    const item1 = firstMatch ? parseSingleDamageItem(firstMatch[1]) : null;
    const item2 = secondMatch ? parseSingleDamageItem(secondMatch[1]) : null;

    const damages: ParsedDamageW[] = [];
    if (item1) damages.push(item1);
    if (item2 && damageCount >= 2) damages.push(item2);

    if (damages.length > 0) {
      return {
        success: true,
        damages,
        rawText: rawTranscript,
        feedbackText: formatFeedbackText(damages),
      };
    }
  }

  // 3. 区切り文字（「と」「、」「,」「スペース」「および」「アンド」）による分割
  const splitPattern = /(?:[\s,、\/／]+|(?<=[^\d])と(?=[^\d])|(?<=\d)と(?=\d)|および|アンド|&)+/;
  const parts = text.split(splitPattern).filter(Boolean);

  const parsedItems: ParsedDamageW[] = [];
  for (const part of parts) {
    const item = parseSingleDamageItem(part);
    if (item) {
      parsedItems.push(item);
      if (parsedItems.length >= Math.max(1, damageCount)) {
        break;
      }
    }
  }

  // もし分割で取れなかった場合、テキスト全体から数値をすべて抽出
  if (parsedItems.length === 0) {
    const allNums = text.match(/\b\d+(?:\.\d+)?\b/g);
    if (allNums && allNums.length > 0) {
      for (let i = 0; i < Math.min(allNums.length, damageCount); i++) {
        parsedItems.push({
          valueW: parseFloat(allNums[i]),
          preset: null,
        });
      }
    }
  }

  if (parsedItems.length > 0) {
    return {
      success: true,
      damages: parsedItems,
      rawText: rawTranscript,
      feedbackText: formatFeedbackText(parsedItems),
    };
  }

  return {
    success: false,
    damages: [],
    rawText: rawTranscript,
    feedbackText: `認識できませんでした（発話:「${rawTranscript}」）。「0.3」や「0.3と0.5」のように話してください。`,
  };
}

/**
 * 認識結果の確認用テキストを生成
 */
function formatFeedbackText(items: ParsedDamageW[]): string {
  if (items.length === 1) {
    const item = items[0];
    const desc = item.preset ? `【${item.preset}】` : `W = ${item.valueW}`;
    return `損傷1: ${desc}`;
  }
  return items
    .map((item, idx) => {
      const desc = item.preset ? `【${item.preset}】` : `W = ${item.valueW}`;
      return `損傷${idx + 1}: ${desc}`;
    })
    .join(' / ');
}
