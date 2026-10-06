import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, classifyReply, initialState, applyReply, getEnding } from '../dialogue.js';

test('具体的な自由入力で全話題を完了し、納得エンドになる', () => {
  let state = initialState();
  for (const stage of STAGES) {
    const reply = stage.choices.find(choice => choice.kind === 'specific').text;
    assert.equal(classifyReply(stage, reply), 'specific', stage.id);
    state = applyReply(state, 'specific');
  }
  assert.equal(state.completed, true);
  assert.equal(state.resolved.filter(Boolean).length, 8);
  assert.equal(getEnding(state).id, 'approved');
  assert.equal(state.trust, 100);
});

test('曖昧な返信は最初に追及し、2回で宿題として次の話題へ進む', () => {
  let state = applyReply(initialState(), 'vague');
  assert.equal(state.stage, 0);
  assert.equal(state.attempts, 1);
  state = applyReply(state, 'vague');
  assert.equal(state.stage, 1);
  assert.equal(state.resolved[0], false);
  assert.equal(state.mental, 76);
});

test('精神論を続けるとメンタルが0で止まり、数値は範囲を超えない', () => {
  let state = initialState();
  while (!state.completed) state = applyReply(state, 'dodge');
  assert.equal(state.mental, 0);
  assert.equal(getEnding(state).id, 'exhausted');
  assert.ok(state.trust >= 0);
  assert.throws(() => applyReply(state, 'specific'));
});

test('自由入力で否定・質問・無関係な話・精神論を区別する', () => {
  assert.equal(classifyReply(STAGES[0], '中央は閉めません。サイドからも攻撃しません。'), 'vague');
  assert.equal(classifyReply(STAGES[0], '中央は閉めない。サイドからも攻めないです。'), 'vague');
  assert.equal(classifyReply(STAGES[0], 'どうすればいいか教えてください。'), 'question');
  assert.equal(classifyReply(STAGES[0], '明日の天気は晴れかな？'), 'offtopic');
  assert.equal(classifyReply(STAGES[0], '気持ちで勝ちます！！'), 'dodge');
  assert.equal(classifyReply(STAGES[0], 'はい'), 'vague');
  assert.throws(() => classifyReply(STAGES[0], '   '));
  assert.throws(() => classifyReply(STAGES[0], 'あ'.repeat(501)));
});

test('質問でスコアを稼げず、未決事項が残れば宿題エンドになる', () => {
  const start = initialState();
  const question = applyReply(start, 'question');
  assert.equal(question.trust, start.trust);
  assert.equal(question.stage, start.stage);
  const state = { ...start, stage: 8, mental: 30, trust: 40, resolved: [true, false, true, false, true, false, true, false], completed: true };
  assert.equal(getEnding(state).id, 'homework');
  assert.equal(start.resolved.length, 0);
});
