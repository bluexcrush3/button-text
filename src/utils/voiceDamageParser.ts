/**
 * 音声認識テキストから損傷のW数値およびプリセット（全般/多数/50）を解析・抽出するユーティリティ
 */

export interface ParsedDamageW {
  valueW: number;
  preset: '全般' | '多数' | null;
  isLessThan?: boolean;
}

export interface VoiceDamageParseResult {
  success: boolean;
  damages: ParsedDamageW[];
  rawText: string;
  feedbackText: string;
  hasEndCommand: boolean; // 「確定」「以上」などの終了キーワードが含まれていたか
}

/** 終了を知らせるボイスコマンドキーワード */
export const VOICE_END_COMMANDS_REGEX =
  /(?:確定|かくてい|決定|けってい|以上|いじょう|完了|かんりょう|終わり|おわり|登録|とうろく|ストップ|すっとっぷ|オーケー|OK)$/i;

/**
 * 漢数字・全角数字・ひらがなの数詞・小数点を半角アラビア数字文字列に変換する
 */
export function normalizeJapaneseNumbers(text: string): string {
  let s = text;

  // 全角英数・記号の半角化
  s = s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/　/g, ' ');

  // 50の読み
  s = s.replace(/ごじゅう|五十|五〇|５０/gi, '50');

  // 小数点の表現 ("0点3", "零点三", "れいてんさん", "0てん3", "点3" など)
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:ゼロ|ぜろ|零|0)/gi, '0.0');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:いち|一|1)/gi, '0.1');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:に|二|2)/gi, '0.2');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:さん|三|3)/gi, '0.3');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:よん|四|4)/gi, '0.4');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:ご|五|5)/gi, '0.5');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:ろく|六|6)/gi, '0.6');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:なな|七|7)/gi, '0.7');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:はち|八|8)/gi, '0.8');
  s = s.replace(/(?:ゼロ|ぜろ|零|0)\s*(?:点|てん)\s*(?:きゅう|九|9)/gi, '0.9');

  // 数字 + 点/てん + 数字 (例: "1点5" -> "1.5", "0点25" -> "0.25")
  s = s.replace(/(\d+)\s*(?:点|てん)\s*(\d+)/gi, '$1.$2');

  // 単独の ".3" や ".5" を "0.3", "0.5" に補正
  s = s.replace(/(^|[^\d])\.(\d+)/g, '$1 0.$2');

  // 単一の漢数字/カタカナ/ひらがな数詞変換 (安全な文脈で置換)
  s = s.replace(/零|ゼロ|ぜろ/g, '0');
  s = s.replace(/一|イチ|いち/g, '1');
  s = s.replace(/二|ニ|に/g, '2');
  s = s.replace(/三|サン|さん/g, '3');
  s = s.replace(/四|ヨン|よん/g, '4');
  s = s.replace(/五|ゴ|ご/g, '5');
  s = s.replace(/六|ロク|ろく/g, '6');
  s = s.replace(/七|ナナ|なな|しち/g, '7');
  s = s.replace(/八|ハチ|はち/g, '8');
  s = s.replace(/九|キュウ|きゅう/g, '9');

  return s;
}

/**
 * 1つの文字列セグメントから Damage W 情報（valueW または preset、および isLessThan）をパースする
 */
function parseSingleDamageItem(segment: string): ParsedDamageW | null {
  const cleaned = segment.trim();
  if (!cleaned) return null;

  const isLessThan = /(?:以下|いか|未満|みまん|<|＜)/i.test(cleaned);

  // 1. クリア / ゼロ / なし
  if (/^(?:クリア|リセット|ゼロ|なし|消去|0)$/i.test(cleaned)) {
    return { valueW: 0, preset: null, isLessThan: false };
  }

  // 2. プリセット: 全般
  if (/全般|ぜんぱん/i.test(cleaned)) {
    return { valueW: 0, preset: '全般', isLessThan: false };
  }

  // 3. プリセット: 多数
  if (/多数|たすう/i.test(cleaned)) {
    return { valueW: 0, preset: '多数', isLessThan: false };
  }

  // 4. 50
  if (/\b50\b|50/.test(cleaned)) {
    return { valueW: 50, preset: null, isLessThan: false };
  }

  // 5. 数値（小数含む）の抽出 (例: 0.3, 1.5, 2, 0.25 など)
  const numMatch = cleaned.match(/\b\d+(?:\.\d+)?\b/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (!isNaN(val)) {
      return { valueW: val, preset: null, isLessThan };
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
      hasEndCommand: false,
    };
  }

  const rawTrimmed = rawTranscript.trim();

  // 終了コマンドの検知
  let hasEndCommand = false;
  let textForParsing = rawTrimmed;

  // 終了キーワードのチェックと除去
  if (VOICE_END_COMMANDS_REGEX.test(textForParsing)) {
    hasEndCommand = true;
    textForParsing = textForParsing.replace(VOICE_END_COMMANDS_REGEX, '').trim();
  }

  let text = normalizeJapaneseNumbers(textForParsing || rawTrimmed);

  // 不要語の除去
  text = text.replace(/ダブリュー|ダブル|だぶりゅー|\bW\b|\bw\b|幅|はば|巾/gi, ' ');
  text = text.replace(/ミリ|mm|センチ|cm|メートル|m/gi, ' ');
  text = text.replace(/数値|すうち|あたい|値|寸法/gi, ' ');
  text = text.replace(/です|ます|登録|設定|入力|お願い|にして|で/gi, ' ');

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
        hasEndCommand,
      };
    }
  }

  // 2. 「1つ目/1番/左/上/前」「2つ目/2番/右/下/後」などの明確な位置・順番指定の抽出
  const firstMatch = text.match(/(?:1つ目|1つめ|1個目|1個め|1番目|1番|ひとつめ|左|上|前)\s*[:：はがで]?\s*([^2２ふた右上後]+)/);
  const secondMatch = text.match(/(?:2つ目|2つめ|2個目|2個め|2番目|2番|ふたつめ|右|下|後)\s*[:：はがで]?\s*(.+)/);
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
        hasEndCommand,
      };
    }
  }

  // 3. 全体からのアイテム（数値、全般、多数、50、クリア）抽出
  // テキスト全体を走査して項目を順番に取得
  const parsedItems: ParsedDamageW[] = [];

  // 区切り文字（「と」「、」「,」「スペース」「および」「アンド」「&」「/」）による分割
  const splitPattern = /(?:[\s,、\/／&]+|(?<=[^\d])と(?=[^\d])|(?<=\d)と(?=\d)|および|アンド)+/;
  const parts = text.split(splitPattern).filter(Boolean);

  for (const part of parts) {
    const item = parseSingleDamageItem(part);
    if (item) {
      parsedItems.push(item);
      if (parsedItems.length >= Math.max(1, damageCount)) {
        break;
      }
    }
  }

  // 4. もし分割で取れなかった場合、テキスト全体から数値を順番にすべて抽出
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
      hasEndCommand,
    };
  }

  return {
    success: false,
    damages: [],
    rawText: rawTranscript,
    feedbackText: `認識できませんでした（発話:「${rawTranscript}」）。「0.3」や「以下1.0」「0.3と0.5」のように話してください。`,
    hasEndCommand,
  };
}

/**
 * 認識結果の確認用テキストを生成
 */
function formatFeedbackText(items: ParsedDamageW[]): string {
  const formatItem = (item: ParsedDamageW) => {
    if (item.preset) return `【${item.preset}】`;
    const prefix = item.isLessThan ? '<' : '';
    return `W = ${prefix}${item.valueW}`;
  };

  if (items.length === 1) {
    return `損傷1: ${formatItem(items[0])}`;
  }
  return items
    .map((item, idx) => `損傷${idx + 1}: ${formatItem(item)}`)
    .join(' / ');
}

