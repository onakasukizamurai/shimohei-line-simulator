import test from 'node:test';
import assert from 'node:assert/strict';
import { PEERS, DM_OPTIONS, createSession, nextEvent, reviewDocument, INCIDENTS, applyEventImpact } from '../gameplay.js';
import { initialState } from '../dialogue.js';

const goodDraft = { goal: '中央の前進を止め、奪ったらサイドへ運んで攻める。', defence: 'linked', trigger: 'backpass', transition: 'cover', audience: 'all', deadline: 'tonight' };

test('個別チャットは副将と分析班に統一し、副将から共有や決定事項の確認も頼める', () => {
  const peers = Object.keys(PEERS);
  const game = createSession(() => 0);
  assert.deepEqual(peers, ['vice', 'analyst']);
  assert.equal(PEERS.analyst.name, '分析班');
  assert.equal(PEERS.analyst.initial, '分');
  assert.deepEqual(Object.keys(game.chats), peers);
  assert.deepEqual(Object.keys(game.unread), peers);
  assert.deepEqual(Object.keys(DM_OPTIONS), peers);
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
