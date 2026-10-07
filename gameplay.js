// ゲーム内の事件・個別チャット・資料。試合情報と登場人物の役割は創作です。
export const PEERS = {
  vice: { name: '副将', initial: '副', color: '#a56d47', subtitle: '個別チャット' },
  analyst: { name: '分析班', initial: '分', color: '#7767a4', subtitle: '個別チャット' },
  junior: { name: '後輩', initial: '後', color: '#5f8fa3', subtitle: '個別チャット' },
};

export const INCIDENTS = [
  {
    id: 'press', name: '相手がバックパスしない',
    teaser: '映像見直した。バックパス、ほとんどしてないかも。',
    messages: ['あ、ごめん、映像見直した。', '学習院、バックパス待ってても来ないかも。\nそのときどうする？？'],
    choices: [
      { text: '大きいトラップも合図にします。外へ誘導する約束は残します。', good: true },
      { text: 'バックパスが来るまで待ちます。', good: false },
      { text: 'それは当日、臨機応変にやります！', good: false },
    ],
    hint: '映像メモ：中央へのパスが多い想定。バックパスだけを合図にするとプレスが始まらない。大きいトラップも合図にするとどう？',
    documentFix: { key: 'trigger', value: 'touch', label: 'プレスの合図を「大きいトラップ」に変更' },
  },
  {
    id: 'cover', name: 'MFが１人遅れてくる',
    teaser: '来週の学習院戦でMFが１人、開始に間に合わない想定で考えないと。',
    messages: ['今、連絡来た。\n来週の学習院戦でMFが１人、最初から出られない想定にして。', '同じ配置のままいけるの？\n誰がその穴埋める？？'],
    choices: [
      { text: 'FWを１人下げて中央を埋めます。守備の役割と共有メモを直します。', good: true },
      { text: '残った人が２人分走ります！', good: false },
      { text: 'たぶん間に合うと思います！', good: false },
    ],
    hint: '副将メモ：MFが１人遅れる想定。FWを１人下げて中央を埋める案が出てる。まず役割を組み替えて共有しよう。',
    documentFix: { key: 'defence', value: 'cover', label: '守備を「FWを１人下げて中央をカバー」に変更' },
  },
  {
    id: 'outlet', name: 'サイドの出口が塞がる',
    teaser: '映像メモ追加。サイドに出したところを狙われる可能性ある。',
    messages: ['サイドから運ぶって話だったけど', 'そこに相手が２人来たら？\n最初の案が通らなかったときの話もして欲しいかな'],
    choices: [
      { text: '無理に縦へ出さずDFに戻し、逆サイドへ展開します。メモにも残します。', good: true },
      { text: 'もっと速いパスで抜きます！', good: false },
      { text: '通らなかったら気持ちで押し切ります。', good: false },
    ],
    hint: '映像メモ：サイドの出口が２人に塞がる想定。無理に縦へ入れず、DFに戻して逆へ展開する逃げ道を作ろう。',
    documentFix: { key: 'transition', value: 'reverse', label: '詰まった時の対応を「DFに戻して逆へ展開」に変更' },
  },
];

export function createSession(random = Math.random) {
  return {
    incident: INCIDENTS[Math.floor(random() * INCIDENTS.length)], phoneAt: random() < .5 ? 2 : 3,
    seen: [], phone: '未着信', callAnswers: 0, shared: false, helpUsed: false,
    document: { version: 0, attempts: 0, approved: false, final: false, reviews: [] },
    draft: { goal: '', defence: 'linked', trigger: 'backpass', transition: 'cover', audience: 'all', deadline: 'tonight' },
    answers: {}, dmReplies: {}, unread: { vice: 0, analyst: 0, junior: 0 },
    chats: { vice: [], analyst: [], junior: [] }, active: null, eventAttempts: 0,
  };
}

export function nextEvent(state, game) {
  const seen = new Set(game.seen);
  if (!seen.has('phone') && (state.stage >= game.phoneAt || state.turns >= 4)) return 'phone';
  if (!seen.has('document') && (state.stage >= 3 || state.turns >= 5)) return 'document';
  if (!seen.has('incident') && (state.stage >= 5 || state.turns >= 9)) return 'incident';
  if (!seen.has('final-document') && state.stage >= 7) return 'final-document';
  return null;
}

export function shouldReceiveJunior(state, game) {
  return state.stage >= 6 && !state.completed && !game.active && game.seen.includes('phone')
    && ['応答', '折り返し', '不在着信'].includes(game.phone) && !game.seen.includes('junior-dm');
}

export function reviewDocument(draft, incident = null) {
  const issues = [];
  if (!draft.goal || draft.goal.trim().length < 12) issues.push('勝ち筋が短すぎる。「どこを止めて、どこから攻めるか」まで書いて。');
  if (draft.defence === 'ball') issues.push('全員がボールに寄せたら、中央と裏は誰が守るの？');
  if (draft.trigger === 'feeling') issues.push('「行けそうなとき」は合図になってない。全員が同じものを見て判断できる？');
  if (draft.transition === 'none') issues.push('外されたら誰が戻る？ うまくいかなかったときの約束がない。');
  if (draft.audience !== 'all') issues.push('幹部だけわかってても意味ないので、全員に共有して。');
  if (draft.deadline !== 'tonight') issues.push('試合直前に初めて見せて、全員理解できるの？？ 今夜中に共有して、次の練習で役割と動きを確認しよう。');
  if (incident && draft[incident.documentFix.key] !== incident.documentFix.value) issues.push(`さっきの修正が入ってない。${incident.documentFix.label}して。`);
  return issues;
}

export function applyEventImpact(state, mental, trust) {
  const result = { ...state, mental: Math.max(0, Math.min(100, state.mental + mental)), trust: Math.max(0, Math.min(100, state.trust + trust)) };
  result.completed = result.mental === 0 || result.stage >= 8;
  return result;
}

export const PHONE_ROUNDS = [
  {
    text: '文字だとよくわからんので、電話しました。\n今の戦術、結論と理由で説明してもらえるかな？',
    choices: [
      { text: '中央を閉め、奪ったらサイドへ。相手の中央の前進を止めたいからです。', good: true },
      { text: 'えっと、さっきLINEで送った通りです…。', good: false },
      { text: 'すみません、電波が…聞こえな…', good: false },
    ],
  },
  {
    text: 'で、全員それわかってる？\n俺がわかるのと、みんなが動けるのは別の話だからね。',
    choices: [
      { text: '副将に役割の確認を頼み、今夜メモを共有します。次の練習で役割と動きを確認します。', good: true },
      { text: '「了解」ってスタンプは来てます！', good: false },
      { text: 'みんな、なんとなくわかってると思います。', good: false },
    ],
  },
];

export const DM_OPTIONS = {
  vice: ['役割の確認をお願い！', '戦術メモのたたき台をお願い！', '全員への共有をお願い！', 'いまの決定事項を確認したい！', 'ありがとう、こっちで考える！', '当日の雰囲気で伝えよう！'],
  analyst: ['映像の根拠を教えて！', '監督にも共有してほしい！', 'たぶん大丈夫、今の案でいく！'],
  junior: ['了解。部活前に話そう', 'それはもう決まってる？もう一回考え直してもらえないかな…？', '一旦持ち帰って幹部と相談させてください'],
};
