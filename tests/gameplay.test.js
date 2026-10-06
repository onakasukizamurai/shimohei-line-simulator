import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, nextEvent, reviewDocument, INCIDENTS, applyEventImpact } from '../gameplay.js';
import { initialState } from '../dialogue.js';

const goodDraft = { goal: '中央の前進を止め、奪ったらサイドへ運んで攻める。', defence: 'linked', trigger: 'backpass', transition: 'cover', audience: 'all', deadline: 'tonight' };

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
  first.chats.vice.push({ text: '秘密のメモ' }); first.document.reviews.push({ version: 1 });
  assert.equal(second.chats.vice.length, 0); assert.equal(second.document.reviews.length, 0);
  assert.notEqual(first.incident.id, second.incident.id);
  const failed = applyEventImpact(initialState(), -200, 200);
  assert.equal(failed.mental, 0); assert.equal(failed.trust, 100); assert.equal(failed.completed, true);
});
