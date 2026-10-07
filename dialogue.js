// 添付ログの口調を参考にした創作。戦術・相手の特徴はゲーム用の仮定です。
export const OPENING_REJECTION = ['I reject.', 'リジェクトされた理由は自分で考えて。'];
export const OPENING_CHOICES = [
  { text: '今幹部で話し合ってるところです！', kind: 'vague' },
  { text: '気持ちで勝ちます', kind: 'dodge' },
  { text: '１年生を入れようと思っています', kind: 'vague' },
];

export const STAGES = [
  {
    id: 'overview', title: '戦術の全体像',
    opening: ['戦術決まった？', '来週の学習院戦のやつ'],
    choices: [
      { text: '中央を閉めて、奪ったらサイドから運びます。', kind: 'specific' },
      { text: 'いま幹部で話し合っているところです！', kind: 'vague' },
      { text: '気持ちで勝ちます！！', kind: 'dodge' },
    ],
    keywords: [/中央|守備|プレス|守る|閉め|ブロック/, /サイド|奪|攻撃|カウンター|運び|運ぶ|展開/],
    good: ['なるほど', 'じゃあ、なんでその戦術？\nどういう準備をしたら勝てるか、逆算しなきゃね。'],
    vague: ['それは、決まってないってこと？？', '話し合ってるのはわかったけど、今の案を教えて欲しいかな'],
    dodge: ['I reject.', 'リジェクトされた理由は自分で考えて。\n気持ちはあっていいけど、それ戦術じゃなくない？'],
    retry: '今の時点の案でいいから、守り方と攻め方をセットで教えて。',
    hint: '例えば、どこを守って、奪ったあとどこから攻めるか。\nまずはそこを言葉にしてみて。',
  },
  {
    id: 'purpose', title: '勝ち方と狙い',
    opening: ['学習院結構強いわ。\nちゃんと見ておいた方がよさそう', 'で、その戦術の目的は？\n相手の何を見て、そうしたいと思った？'],
    choices: [
      { text: '中央の前進を止めて、相手が広がったところをサイドから攻めたいです。', kind: 'specific' },
      { text: '去年もこの形でやっていたので…。', kind: 'vague' },
      { text: 'なんとなく、いけそうです！', kind: 'dodge' },
    ],
    keywords: [/相手|学習院|映像|中央|サイド/, /止め|狙|広が|スペース|弱|空い|抑え|数的|引き|誘/],
    good: ['あい', '目的がそうなら、守り方と攻め方がつながるね。\n実際どう動くかまで決めよう。'],
    vague: ['なんで？', '去年やってたから、今年もそれでいいってこと？\n相手も自分たちも変わってるじゃん。'],
    dodge: ['まぁ、なんとなくでも理由はあると思うけど', 'ようは納得を得られることがポイントです。\n俺がわかるように説明して欲しいかな'],
    retry: '相手のどこを止めて、どこでチャンスを作る想定？',
    hint: '映像で見た事実と、そこからの仮説を分けて説明してみて。\nこのゲームでは「中央を止めて、サイドのスペースを使う」みたいな仮定でいいよ。',
  },
  {
    id: 'defence', title: '守備の約束',
    opening: ['中央を閉めるのは、誰がどうやるの？', '「みんなで頑張る」はなしで。\nFWとMFとDF、それぞれ何する？'],
    choices: [
      { text: 'FWが外へ誘導、MFが中央のパスを切って、DFは裏をカバーします。', kind: 'specific' },
      { text: '全員で声を出してマークを確認します。', kind: 'vague' },
      { text: 'DF陣がなんとかしてくれると思います。', kind: 'dodge' },
    ],
    keywords: [/fw|mf|df|前線|中盤|ディフェンス/i, /誘導|切|カバー|マーク|裏|閉め|絞|担当/],
    good: ['よいと思います。', 'その約束を全員が同じように理解できてるかが大事だね'],
    vague: ['声を出すのはいいけどさ', '何を確認するの？\nその声を聞いた人は、どう動けばいいの？？'],
    dodge: ['つーかさ、それDFに丸投げじゃん', '前から何を制限するか決めてないと、後ろは考えようがないと思うけど'],
    retry: '誰がボールに行って、誰がパスコースを切って、誰が後ろをカバーする？',
    hint: '例えばFWが外へ誘導して、MFが中を閉めて、DFが裏をカバーする。\n役割が重なってないかも確認してね。',
  },
  {
    id: 'press', title: 'プレスの合図',
    opening: ['で、いつプレス行くの？', '全員が違うタイミングで行ってたら、穴あくよね？'],
    choices: [
      { text: '相手のバックパスを合図にFWが寄せ、MFも連動します。外されたら中央に戻ります。', kind: 'specific' },
      { text: '行けそうなタイミングで行きます！', kind: 'vague' },
      { text: 'ずっと全力で追いかけます！！', kind: 'dodge' },
    ],
    keywords: [/バックパス|トラップ|タッチ|合図|サイド|ミス/, /fw|mf|連動|寄せ|切|戻|絞|追/i],
    good: ['うん', '行く合図と、行けなかったときの約束があるなら、共有しやすいと思います。'],
    vague: ['その「行けそう」って何？', 'みんなが同じ判断できるように、整理して説明してほしいと思ってるだけです。'],
    dodge: ['60分それやるの？？', '追いかけることが目的になってない？\n奪うために、どこへ追い込みたいのか考えて欲しいかな'],
    retry: '何を見たら行く？ そのとき周りは何する？ 外されたらどうする？',
    hint: '例えばバックパスや相手の大きいトラップを合図にして、FWが寄せ、MFが連動する。\n外されたときに戻る場所も決めよう。',
  },
  {
    id: 'build', title: 'ボールの運び方',
    opening: ['こっちのBupは？\n相手が前から来たら、どうやって外す？', 'ボール回しできました、で終わらないでね。\n相手陣地に運ぶのが目的なので。'],
    choices: [
      { text: 'DFで相手を引きつけ、MFが斜めに受けます。詰まったら逆サイドへ展開します。', kind: 'specific' },
      { text: 'とりあえずパスを回します。', kind: 'vague' },
      { text: '困ったら前に強く打ちます！', kind: 'dodge' },
    ],
    keywords: [/df|mf|斜め|三角|引きつけ|サイド|裏/i, /受け|展開|逆|運|外す|空い|リード|つな/],
    good: ['なるほど', 'DFとMFが、いつどこでもらうかまで合わせてね。\n出し手だけの問題にしないこと。'],
    vague: ['回す目的は？', '回してるだけで前に進めないなら、相手は困らないよね？？'],
    dodge: ['それ、誰が拾うの？', '打った先に味方がいないなら、相手に返してるだけにならない？'],
    retry: '誰が相手を引きつけて、誰がどこで受ける？ 詰まったときの次の手は？',
    hint: 'Bupはビルドアップのこと。\n例えばDFが引きつけてMFが斜めに受け、無理なら逆へ展開する。パスを出す人と受ける人、両方の判断が必要です。',
  },
  {
    id: 'attack', title: 'サークルへの入り方',
    opening: ['そこからどう点取るの？', 'サークルに入れました、でもシュートできませんでした。\nってなったら何が原因？'],
    choices: [
      { text: 'サイドから運んで、FWがニアとファーにリード。受ける位置とパスのタイミングを合わせます。', kind: 'specific' },
      { text: 'シュート練を増やします！', kind: 'vague' },
      { text: 'FWの決定力に期待します。', kind: 'dodge' },
    ],
    keywords: [/fw|ニア|ファー|リード|サイド|サークル/i, /パス|受け|タイミング|シュート|レシーブ|走|合わせ/],
    good: ['そうそう', 'パス、レシーブ、リード、シュート。\nどこがうまくいかなかったか分けて考えようね。'],
    vague: ['シュートが原因だって、どこで判断した？', 'その前のパスとか、レシーブとか、リードの問題かもしれないじゃん。'],
    dodge: ['FWだけの責任になってない？', 'ちゃんと打てる状態で渡せてるかも見ようよ。\n事実に対する解像度が低いと、詰められるので。'],
    retry: '誰がどこにリードして、いつパスする？ シュートまでつながる形を教えて。',
    hint: '例えばFWがニアとファーにリードして、出し手がタイミングを合わせる。\n打てない原因は決定力だけとは限らないよね。',
  },
  {
    id: 'risk', title: 'PC・リスク対応',
    opening: ['PCはどうする？', 'あと、攻めてて取られたとき。\nそこも決めておかないと怖いと思うけど'],
    choices: [
      { text: 'PCの役割を確認します。ロスト時は近い人が遅らせ、後ろは中央と人数を確保します。', kind: 'specific' },
      { text: 'PCはいつも通りで、切り替えを速くします。', kind: 'vague' },
      { text: '取られなければ大丈夫です！', kind: 'dodge' },
    ],
    keywords: [/pc|ペナルティ|コーナー/i, /ロスト|取られ|失っ|切り替え|戻|カバー|遅らせ|中央|リスク/],
    good: ['あい、いいと思う', 'PCはペナルティコーナーね。役割はグラウンドでも確認して。\nうまくいかなかったときの準備までしよう。'],
    vague: ['「いつも通り」って全員わかってる？', '切り替え速く、だけだと、みんなボールに行っちゃわない？？'],
    dodge: ['取られない前提なの？？', 'うまくいかなかったとき、何をするかの話をしてるんだけど'],
    retry: 'PCの役割と、失った直後の役割。両方確認できる？',
    hint: 'PCはペナルティコーナー。誰がどの役割か確認しておこう。\nロストしたら近い人が遅らせ、後ろの人は中央をカバーする、みたいに分担する。',
  },
  {
    id: 'share', title: '共有と確認',
    opening: ['で、これ誰がいつ共有する？', '幹部だけわかってても、全員が動けなかったら意味ないからね'],
    choices: [
      { text: '幹部で今夜中に1枚にまとめて全員に共有し、次の練習で役割と動きを確認します。', kind: 'specific' },
      { text: 'あとでグループLINEに送っておきます！', kind: 'vague' },
      { text: '当日の雰囲気で伝えます！', kind: 'dodge' },
    ],
    keywords: [/幹部|副将|主将|私|自分|担当|キャプテン/, /今夜|今日|明日|時|まで|アップ前|試合前|練習|来週|一週間|1週間|次回/],
    good: ['よいと思います。ありがとう。', '全員が同じ絵を持てるように確認してね。\nまぁ任せます。'],
    vague: ['いつ送ってくれるのかな？？', '直前になるならなるとか言おうね。\n報告連絡相談はちゃんとやろう。'],
    dodge: ['それだと、ぶっつけじゃん', '人は前提が省かれていきなり答えを言われても理解できない！\n俺も話術がごみなので、よくやりがちなのですが、、、'],
    retry: '誰が、いつまでにまとめる？ 全員が理解したかは、どう確認する？',
    hint: '担当と期限を決めて共有しよう。\n例えば幹部が今夜まとめ、次の練習でみんなの役割と動きを確認する。',
  },
];

const DODGE = /気合|気持ちで|根性|なんとなく|雰囲気で|丸投げ|知らん|知らない|適当|寝ます|おやすみ|なんとかなる|監督が決め|しもへい.*決め/;
const QUESTION = /どう(したら|すれば)|教えて(ください|下さい|ほしい|欲しい)|とは何|って何|意味(ですか|は)|ヒント/;
const NONCOMMITTAL = /わから(ない|ん)|分から(ない|ん)|未定|まだ決ま|考えてません|してません|しません|やりません|決めてません|閉め(ない|ません)|守らない|攻め(ない|ません)|運ばない|切らない|共有しない/;

export function classifyReply(stage, reply) {
  const text = String(reply).normalize('NFKC').trim();
  if (!text || text.length > 500) throw new Error('1〜500文字で返信してください。');
  const candidate = stage.choices.find(choice => choice.text.normalize('NFKC') === text);
  if (candidate) return candidate.kind;
  if (DODGE.test(text)) return 'dodge';
  if (QUESTION.test(text)) return 'question';
  if (NONCOMMITTAL.test(text)) return 'vague';
  if (text.length >= 14 && stage.keywords.every(pattern => pattern.test(text))) return 'specific';
  if (/はい|了解|承知|すみません|申し訳|検討|話し合|考え|頑張|します|です|戦術|守|攻|パス|ホッケー/.test(text)) return 'vague';
  return 'offtopic';
}

export function initialState() {
  return { stage: 0, mental: 100, trust: 20, attempts: 0, turns: 0, resolved: [], completed: false, openingRejected: false, specialEnding: null };
}

export function isOpeningRejection(state) {
  return state.stage === 0 && !state.openingRejected;
}

export function replyChoices(state) {
  if (state.completed) return [];
  return isOpeningRejection(state) ? OPENING_CHOICES : STAGES[state.stage].choices;
}

const clamp = n => Math.max(0, Math.min(100, n));
export function applyReply(state, kind) {
  if (state.completed) throw new Error('会議は終了しています。');
  if (!['specific', 'vague', 'dodge', 'offtopic', 'question'].includes(kind)) throw new Error('返信の種類が不正です。');
  const next = { ...state, resolved: [...state.resolved], turns: state.turns + 1 };
  if (isOpeningRejection(state)) {
    next.openingRejected = true;
    next.mental = clamp(next.mental - 6);
    next.trust = clamp(next.trust - 3);
  } else if (kind === 'specific') {
    next.mental = clamp(next.mental - 2);
    next.trust = clamp(next.trust + 11);
    next.resolved[state.stage] = true;
    next.stage++;
    next.attempts = 0;
  } else if (kind === 'question') {
    // 質問で数値を稼ぐことはできない。
  } else {
    next.mental = clamp(next.mental - ({ vague: 12, dodge: 23, offtopic: 18 }[kind]));
    next.trust = clamp(next.trust - ({ vague: 5, dodge: 12, offtopic: 8 }[kind]));
    next.attempts++;
    if (next.attempts >= 2) {
      next.resolved[state.stage] = false;
      next.stage++;
      next.attempts = 0;
    }
  }
  next.completed = next.mental === 0 || next.stage >= STAGES.length;
  return next;
}

export function getEnding(state) {
  if (state.specialEnding === 'aoi') return {
    id: 'aoi', title: 'あおいの一声で、満場一致。',
    description: 'Aoi Kobayashiが強化グループに登場。戦術の提案にしもへい。が全面賛成し、ご機嫌で会議が終わった。',
    messages: ['あおいが言うなら絶対それがいいです。', '全面的に賛成です。これで決まり！！', '末長く頼むよアミーゴ！！'],
  };
  const count = state.resolved.filter(Boolean).length;
  if (state.mental === 0) return {
    id: 'exhausted', title: 'いったん、脳が限界。',
    description: '戦術会議から一時撤退。次は「誰が・いつ・どう動くか」を具体的にして、もう一回。',
    messages: ['大丈夫？', '何がわからないかの仮説はもとうよ。\nいったん整理して、また話しましょう。'],
  };
  if (count >= 6 && state.trust >= 65) return {
    id: 'approved', title: 'いったん、納得。',
    description: 'しもへい。の詰めをくぐり抜け、戦術の共有までたどり着いた。あとはグラウンドで確認するだけ。',
    messages: ['まぁ色々言ったけど、最高の秋リーグにするために俺も全力尽くすから', 'ホッケー楽しんで、やってこう。\nありがとう。', '末長く頼むよアミーゴ！！'],
  };
  return {
    id: 'homework', title: '宿題つき、会議終了。',
    description: `決まったのは${count}項目。まだ曖昧なところは、前提と理由を整理してから全員に共有しよう。`,
    messages: ['まぁ任せます。', 'ただ、まだ決まってないところは整理して送ってね。\n報告連絡相談はちゃんとやろう。'],
  };
}
