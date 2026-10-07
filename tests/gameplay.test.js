import test from 'node:test';
import assert from 'node:assert/strict';
import { PEERS, DM_OPTIONS, createSession, nextEvent, shouldReceiveJunior, reviewDocument, INCIDENTS, applyEventImpact } from '../gameplay.js';
import { initialState } from '../dialogue.js';

const goodDraft = { goal: '中央の前進を止め、奪ったらサイドへ運んで攻める。', defence: 'linked', trigger: 'backpass', transition: 'cover', audience: 'all', deadline: 'tonight' };

test('個別チャットに副将・ひな・後輩を用意し、副将から共有や決定事項の確認も頼める', () => {
  const peers = Object.keys(PEERS);
  const game = createSession(() => 0);
  assert.deepEqual(peers, ['vice', 'analyst', 'junior']);
  assert.equal(PEERS.analyst.name, '樋野菜々子（ひな）');
  assert.equal(PEERS.analyst.initial, '樋');
  assert.equal(PEERS.analyst.avatar, './assets/hina-avatar.png');
  assert.equal(PEERS.junior.name, '後輩');
  assert.equal(PEERS.junior.initial, '後');
  assert.deepEqual(game.chats.junior, []);
  assert.equal(game.unread.junior, 0);
  assert.deepEqual(Object.keys(game.chats), peers);
  assert.deepEqual(Object.keys(game.unread), peers);
  assert.deepEqual(Object.keys(DM_OPTIONS), peers);
  assert.deepEqual(DM_OPTIONS.junior, ['了解。部活前に話そう', 'それはもう決まってる？もう一回考え直してもらえないかな…？', '一旦持ち帰って幹部と相談させてください']);
  for (const option of ['役割の確認をお願い！', '戦術メモのたたき台をお願い！', '全員への共有をお願い！', 'いまの決定事項を確認したい！', 'ありがとう、こっちで考える！', '当日の雰囲気で伝えよう！']) {
    assert.ok(DM_OPTIONS.vice.includes(option), option);
  }
  assert.ok(INCIDENTS.find(incident => incident.id === 'cover').hint.startsWith('副将メモ：'));
});

test('通常の進行で電話、初稿、前提変更、最終提出が一度ずつ発生する', () => {
  const game = createSession(() => 0);
  const state = { ...initialState(), stage: 2, turns: 2 };
  assert.equal(nextEvent(state, game), 'phone'); game.seen.push('phone');
  state.stage = 3; assert.equal(nextEvent(state, game), 'document'); game.seen.push('document');
  state.stage = 5; assert.equal(nextEvent(state, game), 'incident'); game.seen.push('incident');
  state.stage = 7; assert.equal(nextEvent(state, game), 'final-document'); game.seen.push('final-document');
  assert.equal(nextEvent(state, game), null);
});

test('後輩の通知は電話対応が終わった後半で、他のイベント対応中を避けて届く', () => {
  const state = { ...initialState(), stage: 6 };
  const game = createSession(() => 0);
  game.seen.push('phone'); game.phone = '応答';
  for (const phone of ['応答', '折り返し', '不在着信']) {
    assert.equal(shouldReceiveJunior(state, { ...game, phone }), true, phone);
  }
  assert.equal(shouldReceiveJunior({ ...state, stage: 5 }, game), false);
  assert.equal(shouldReceiveJunior({ ...state, completed: true }, game), false);
  assert.equal(shouldReceiveJunior(state, { ...game, active: 'phone' }), false);
  assert.equal(shouldReceiveJunior(state, { ...game, active: 'incident' }), false);
  assert.equal(shouldReceiveJunior(state, { ...game, active: 'final-document' }), false);
  assert.equal(shouldReceiveJunior(state, { ...game, seen: [] }), false);
  assert.equal(shouldReceiveJunior(state, { ...game, phone: '未着信' }), false);
  assert.equal(shouldReceiveJunior(state, { ...game, phone: '着信中' }), false);
  assert.deepEqual(game.seen, ['phone']);
});

test('後輩の通知は受信済みのプレイで繰り返さず、再プレイでは独立して判定する', () => {
  const state = { ...initialState(), stage: 6 };
  const first = createSession(() => 0); const second = createSession(() => .9);
  first.seen.push('phone', 'junior-dm'); first.phone = '応答';
  second.seen.push('phone'); second.phone = '折り返し';
  assert.equal(shouldReceiveJunior(state, first), false);
  assert.equal(shouldReceiveJunior(state, second), true);
  assert.equal(shouldReceiveJunior(state, createSession(() => 0)), false);
});

test('メモの共有先・合図・役割を誤ると具体的に差し戻される', () => {
  assert.deepEqual(reviewDocument(goodDraft), []);
  const bad = { ...goodDraft, goal: '', defence: 'ball', trigger: 'feeling', transition: 'none', audience: 'leaders', deadline: 'match' };
  assert.equal(reviewDocument(bad).length, 6);
});

test('前提変更の後で旧版を再提出しても通らず、該当する約束を直すと通る', () => {
  for (const incident of INCIDENTS) {
    assert.ok(reviewDocument(goodDraft, incident).length > 0, incident.id);
    const fixed = { ...goodDraft, [incident.documentFix.key]: incident.documentFix.value };
    assert.deepEqual(reviewDocument(fixed, incident), [], incident.id);
  }
});

test('再プレイの個別チャットと提出履歴は前のプレイから独立し、スコアは範囲内', () => {
  const first = createSession(() => 0); const second = createSession(() => .9);
  for (const peer of Object.keys(PEERS)) {
    first.chats[peer].push({ text: '秘密のメモ' }); first.unread[peer]++;
    assert.equal(second.chats[peer].length, 0); assert.equal(second.unread[peer], 0);
  }
  first.document.reviews.push({ version: 1 });
  assert.equal(second.document.reviews.length, 0);
  assert.notEqual(first.incident.id, second.incident.id);
  const failed = applyEventImpact(initialState(), -200, 200);
  assert.equal(failed.mental, 0); assert.equal(failed.trust, 100); assert.equal(failed.completed, true);
});
